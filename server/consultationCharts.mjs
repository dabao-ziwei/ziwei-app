import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OWNER = '198a5af8-ea33-42bd-b810-422216a935e0';
const COLUMNS = 'id,name,gender,birth_year,birth_month,birth_day,birth_hour,birth_minute,type,created_at';
export class ExportError extends Error {
  constructor(status, code, message, extra = {}) { super(message); Object.assign(this, { status, code, extra }); }
}
const fail = (status, code, message, extra) => { throw new ExportError(status, code, message, extra); };
export const hash = value => createHash('sha256').update(value).digest('hex');
export function chartMetadata(row, canExport) {
  const birth = { calendar: 'gregorian', year: row.birth_year, month: row.birth_month, day: row.birth_day, hour: row.birth_hour, minute: row.birth_minute };
  const identity = { chart_id: row.id, name: row.name, gender: row.gender, birth };
  return { ...identity, category: row.type || null, created_at: row.created_at || null,
    source_revision: hash(JSON.stringify(identity)), can_export: canExport };
}
export function assertPublicKey(key) {
  if (key?.startsWith('sb_publishable_')) return;
  try {
    if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon') return;
  } catch { /* Fail closed: never bootstrap this API with service_role. */ }
  fail(503, 'EXPORT_UNAVAILABLE', '串接公開金鑰尚未正確設定');
}
const dbResult = result => {
  if (result.error) fail(503, 'EXPORT_UNAVAILABLE', '資料服務暫時無法使用');
  return result.data;
};
export function createConsultationHandler({ resource, enabled, publicAuth, createUserClient, canExportProfile, renderPNG }) {
  return async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Request-Id', requestId);
    try {
      if (!enabled) fail(503, 'EXPORT_UNAVAILABLE', '諮詢命盤串接尚未啟用');
      const method = resource === 'charts' ? 'GET' : 'POST';
      if (req.method !== method) {
        res.setHeader('Allow', method);
        fail(405, 'METHOD_NOT_ALLOWED', `僅接受 ${method}`);
      }
      const params = new URL(req.url, 'http://request.invalid').searchParams;
      if ([...params.keys()].some(k => params.getAll(k).length !== 1)) fail(400, 'INVALID_REQUEST', '查詢欄位不可重複');
      if (resource === 'charts' && params.get('operation') === 'capabilities') {
        if ([...params.keys()].some(k => k !== 'operation')) fail(400, 'INVALID_REQUEST', '不支援此查詢欄位');
        return res.status(200).json({ contract_version: '1', authentication: { provider: 'supabase', ...publicAuth, grant: 'password' },
          image: { format: 'png', width: 2560, height: 1920, mode: 'pure-natal', synchronous: true },
          search_path: '/api/consultation-charts', export_path: '/api/consultation-chart-export' });
      }
      const authorization = req.headers.authorization;
      if (typeof authorization !== 'string' || !/^Bearer \S+$/i.test(authorization) || authorization.length > 16384) fail(401, 'AUTH_REQUIRED', '請先登入排盤帳號');
      const token = authorization.slice(7);
      const client = createUserClient(token);
      let callerId;
      const authorize = async () => {
        const { data, error } = await client.auth.getUser(token);
        if (error || !data?.user) {
          if (error?.status >= 500 || error?.name === 'AuthRetryableFetchError') fail(503, 'EXPORT_UNAVAILABLE', '登入服務暫時無法使用');
          fail(401, 'AUTH_REQUIRED', '登入已失效，請更新憑證或重新登入');
        }
        callerId = data.user.id;
        const state = dbResult(await client.rpc('password_reset_status'));
        if (!state || !(state.state === 'normal' || (state.state === 'complete' && state.fresh_session === true))) {
          fail(403, 'PASSWORD_CHANGE_REQUIRED', '請到排盤網站完成密碼變更後重新登入', { password_change_url: 'https://ziweiapp.dabao.life/login' });
        }
        const profile = dbResult(await client.from('profiles').select('id,role,is_banned,access_expiry,feature_flags').eq('id', data.user.id).maybeSingle());
        if (!profile || profile.id !== data.user.id) fail(503, 'EXPORT_UNAVAILABLE', '無法確認會員權限');
        if (profile.is_banned) fail(403, 'ACCOUNT_DISABLED', '帳號目前無法使用');
        if (profile.id !== OWNER && profile.access_expiry && Date.parse(profile.access_expiry) <= Date.now()) fail(403, 'ACCOUNT_EXPIRED', '帳號使用期限已到');
        return Boolean(await canExportProfile(profile));
      };
      let exportAllowed = await authorize();
      const getChart = async id => {
        const row = dbResult(await client.from('clients').select(COLUMNS).eq('id', id).eq('is_deleted', false).maybeSingle());
        if (!row) fail(404, 'CHART_NOT_FOUND', '命盤不存在或目前無權存取');
        return row;
      };
      if (resource === 'charts') {
        if ([...params.keys()].some(k => !['q', 'limit', 'cursor', 'chart_id'].includes(k))) fail(400, 'INVALID_REQUEST', '不支援此查詢欄位');
        if (params.has('chart_id')) {
          const id = params.get('chart_id');
          if (!UUID.test(id) || [...params.keys()].some(k => k !== 'chart_id')) fail(400, 'INVALID_REQUEST', '命盤識別碼不正確');
          return res.status(200).json({ contract_version: '1', chart: chartMetadata(await getChart(id), exportAllowed) });
        }
        const q = (params.get('q') || '').trim();
        const limitString = params.get('limit') || '20';
        const limit = Number(limitString);
        const cursor = params.get('cursor');
        if (q.length > 100 || /[\u0000-\u001f\u007f]/.test(q) || !/^\d+$/.test(limitString) || limit < 1 || limit > 100 || (cursor && !UUID.test(cursor))) fail(400, 'INVALID_REQUEST', '搜尋或分頁參數不正確');
        let query = client.from('clients').select(COLUMNS).eq('is_deleted', false).order('id', { ascending: true }).limit(limit + 1);
        if (q) query = query.ilike('name', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
        if (cursor) query = query.gt('id', cursor);
        const rows = dbResult(await query) || [];
        const hasMore = rows.length > limit;
        const charts = rows.slice(0, limit).map(row => chartMetadata(row, exportAllowed));
        return res.status(200).json({ contract_version: '1', charts, has_more: hasMore, next_cursor: hasMore ? charts.at(-1).chart_id : null });
      }
      if ([...params.keys()].length) fail(400, 'INVALID_REQUEST', '產圖不接受 URL 參數');
      if (!exportAllowed) fail(403, 'EXPORT_FORBIDDEN', '帳號的截圖功能未開放');
      let body = req.body;
      if (Number(req.headers['content-length']) > 4096 || Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body) || '') > 4096) fail(413, 'REQUEST_TOO_LARGE', '請求內容過大');
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { fail(400, 'INVALID_REQUEST', 'JSON 格式不正確'); } }
      if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => !['chart_id','expected_revision'].includes(k))
        || typeof body.chart_id !== 'string' || !UUID.test(body.chart_id)
        || (body.expected_revision !== undefined && (typeof body.expected_revision !== 'string' || !/^[a-f0-9]{64}$/.test(body.expected_revision)))) fail(400, 'INVALID_REQUEST', '請使用有效命盤 UUID 與 revision');
      const row = await getChart(body.chart_id);
      const metadata = chartMetadata(row, exportAllowed);
      if (body.expected_revision && body.expected_revision !== metadata.source_revision) fail(409, 'CHART_CHANGED', '命盤資料已變更，請重新確認', { current_revision: metadata.source_revision });
      let rendered;
      try { rendered = await renderPNG(row, hash(callerId)); }
      catch (error) {
        if (error instanceof ExportError) throw error;
        fail(error?.name === 'TimeoutError' ? 504 : 502, error?.name === 'TimeoutError' ? 'RENDER_TIMEOUT' : 'RENDER_FAILED', '無法完成純本命盤產圖，請稍後重試');
      }
      // Never deliver a buffered image if the caller lost access or the stored data changed meanwhile.
      exportAllowed = await authorize();
      if (!exportAllowed) fail(403, 'EXPORT_FORBIDDEN', '帳號的截圖功能未開放');
      const current = chartMetadata(await getChart(body.chart_id), exportAllowed);
      if (current.source_revision !== metadata.source_revision) fail(409, 'CHART_CHANGED', '產圖期間命盤資料已變更', { current_revision: current.source_revision });
      const png = Buffer.from(rendered.png);
      if (png.length > 4 * 1024 * 1024 || png.length < 24 || png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a'
        || png.readUInt32BE(16) !== 2560 || png.readUInt32BE(20) !== 1920) fail(502, 'RENDER_FAILED', '產圖格式不正確');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="natal-${row.id}.png"`);
      res.setHeader('Content-Length', png.length);
      res.setHeader('X-Chart-Id', row.id);
      res.setHeader('X-Chart-Source-Revision', metadata.source_revision);
      res.setHeader('X-Chart-Renderer-Revision', rendered.rendererRevision);
      res.setHeader('X-Content-SHA256', hash(png));
      return res.status(200).send(png);
    } catch (error) {
      // Do not log raw request, Auth/database errors, personal data or rendered HTML.
      if (error?.code === 'EXPORT_BUSY') res.setHeader('Retry-After', String(error.extra?.retry_after || 5));
      const known = error instanceof ExportError;
      return res.status(known ? error.status : 503).json({ error: { code: known ? error.code : 'EXPORT_UNAVAILABLE',
        message: known ? error.message : '諮詢命盤服務暫時無法使用', ...(known ? error.extra : {}) }, request_id: requestId });
    }
  };
}
export function productionHandler(resource, environment = process.env) {
  return async (req, res) => {
    const url = environment.SUPABASE_URL || environment.VITE_SUPABASE_URL;
    const key = environment.SUPABASE_ANON_KEY || environment.VITE_SUPABASE_KEY;
    try {
      if (!url || !key) fail(503, 'EXPORT_UNAVAILABLE', '串接服務尚未設定完成');
      assertPublicKey(key);
      const handler = createConsultationHandler({ resource, enabled: environment.CONSULTATION_EXPORT_ENABLED === 'true',
        publicAuth: { url, publishable_key: key },
        createUserClient: token => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(3500) }) } }),
        canExportProfile: async profile => (await import('./generated/natal-render.mjs')).canExportProfile(profile),
        renderPNG: async (row, caller) => (await import('./consultationRenderer.mjs')).renderNatalPNG(row, caller, environment),
      });
      return handler(req, res);
    } catch {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(503).json({ error: { code: 'EXPORT_UNAVAILABLE', message: '串接服務尚未設定完成' }, request_id: randomUUID() });
    }
  };
}
