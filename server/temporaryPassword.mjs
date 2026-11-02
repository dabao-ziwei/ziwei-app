import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const OWNER_ID = '198a5af8-ea33-42bd-b810-422216a935e0';
export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}
export function matchesPassword(password, encoded) {
  if (!encoded) return false;
  const [salt, digest] = encoded.split(':');
  const actual = Buffer.from(hashPassword(password, salt).split(':')[1], 'hex');
  const expected = Buffer.from(digest || '', 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function validPassword(password) {
  return typeof password === 'string' && password.length >= 12 && password.length <= 128
    && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }

// Dependency injection permits offline tests without resetting any real account.
export function createPasswordHandler({ admin, userClient, enabled = true }) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: '只接受 POST' }); }
    try {
      if (!enabled) fail('臨時密碼功能尚未啟用', 503);
      const authorization = req.headers.authorization;
      if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) fail('請重新登入', 401);
      const token = authorization.slice(7);
      const { data: auth, error: authError } = await admin.auth.getUser(token);
      if (authError || !auth?.user) fail('請重新登入', 401);
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || JSON.stringify(body).length > 4096) fail('請求格式不正確');
      const actor = auth.user.id;
      const scoped = userClient(token);
      const transition = async (user, reset, action, hash = null) => {
        const { error } = await admin.rpc('password_reset_transition', {
          p_user: user, p_reset: reset, p_action: action, p_hash: hash, p_actor: actor,
        });
        if (error) fail('密碼狀態更新失敗或正在處理，請稍後重試', 409);
      };
      if (body.action === 'issue' || body.action === 'status') {
        if (actor !== OWNER_ID) fail('僅擁有者可以操作', 403);
        if (!uuid.test(body.userId || '') || body.userId === OWNER_ID) fail('不可重設此帳號', 403);
        const { data: target, error } = await admin.auth.admin.getUserById(body.userId);
        if (error || !target?.user) fail('找不到使用者', 404);
        if (body.action === 'status') {
          const { data, error: readError } = await admin.from('password_reset_state')
            .select('state,expires_at,issued_at').eq('user_id', body.userId).maybeSingle();
          if (readError) fail('無法讀取密碼狀態', 503);
          return res.status(200).json(data || { state: 'normal' });
        }
        if (!target.user.email_confirmed_at || (target.user.banned_until && Date.parse(target.user.banned_until) > Date.now())) {
          fail('請先確認此帳號已驗證信箱且未停權');
        }
        const password = `T!${randomBytes(18).toString('base64url')}9a`;
        const resetId = randomUUID();
        // Lock member data before changing the Auth credential; errors intentionally fail closed.
        await transition(body.userId, resetId, 'issue', hashPassword(password));
        const { error: updateError } = await admin.auth.admin.updateUserById(body.userId, { password });
        if (updateError) fail('臨時密碼設定失敗，帳號已暫停存取；請稍後重新核發', 503);
        await transition(body.userId, resetId, 'ready');
        return res.status(200).json({ password, email: target.user.email, expiresInHours: 24 });
      }
      if (body.action !== 'complete') fail('不支援的操作');
      if (!uuid.test(body.resetId || '') || !validPassword(body.password)) fail('新密碼需 12–128 個字元，並包含英文字母與數字');
      const { data: status, error: statusError } = await scoped.rpc('password_reset_status');
      if (statusError) fail('無法驗證密碼狀態', 503);
      if (status?.state !== 'required' || !status.fresh_session || status.expired || status.reset_id !== body.resetId) {
        fail('臨時登入已失效或密碼已過期，請重新登入或聯絡管理者', 403);
      }
      const { data: state, error: readError } = await admin.from('password_reset_state')
        .select('temporary_hash').eq('user_id', actor).eq('reset_id', body.resetId).single();
      if (readError || !state) fail('無法驗證密碼狀態', 409);
      if (matchesPassword(body.password, state.temporary_hash)) fail('新密碼不可與臨時密碼相同');
      await transition(actor, body.resetId, 'claim');
      const { error: updateError } = await admin.auth.admin.updateUserById(actor, { password: body.password });
      if (updateError) {
        await transition(actor, body.resetId, 'retry');
        fail('密碼未變更成功，請檢查密碼要求後重試');
      }
      await transition(actor, body.resetId, 'complete');
      // Access is already denied to old session IDs even if global refresh-token revocation fails.
      const { error: revokeError } = await admin.auth.admin.signOut(token, 'global');
      return res.status(200).json({ success: true, reauthenticationRequired: true, sessionsRevoked: !revokeError });
    } catch (error) {
      // Never log request bodies, tokens, passwords or upstream error payloads.
      return res.status(error.status || 503).json({ error: error.status ? error.message : '密碼服務暫時無法使用，請稍後重試' });
    }
  };
}

export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || process.env.TEMP_PASSWORD_RESET_ENABLED !== 'true') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ error: '臨時密碼服務尚未設定完成' });
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } };
  const admin = createClient(url, key, options);
  return createPasswordHandler({ admin, userClient: token => createClient(url, key, {
    ...options, global: { ...options.global, headers: { Authorization: `Bearer ${token}` } },
  }) })(req, res);
}
