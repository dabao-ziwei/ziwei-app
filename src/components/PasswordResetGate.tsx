import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabase';
import { temporaryPasswordEnabled } from '../logic/temporaryPassword';
import { UpdatePassword } from './UpdatePassword';
import { authSessionIdentity } from '../logic/authSessionIdentity';

const isAllowed = (status: any) => status?.state === 'normal'
  || (status?.state === 'complete' && status.fresh_session === true);

export function PasswordResetGate({ session, children }: { session: any; children: ReactNode }) {
  const [result, setResult] = useState<{ identity: string; status?: any; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const token = session?.access_token;
  const identity = authSessionIdentity(session);
  useEffect(() => {
    if (!temporaryPasswordEnabled || !token || !identity) return;
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    const check = async () => {
      try {
        const { data, error } = await supabase.rpc('password_reset_status').abortSignal(controller.signal);
        if (error || !data) throw new Error('無法確認登入狀態，請重試或重新登入');
        if (active) setResult({ identity, status: data });
      } catch {
        if (active) setResult(previous => ({
          identity,
          // Preserve an already-authorized chart in memory on a transient failure,
          // but hide it and block interaction until a successful retry. Never fail open.
          status: previous?.identity === identity && isAllowed(previous.status) ? previous.status : undefined,
          error: '無法確認登入狀態，請重試或重新登入',
        }));
      } finally {
        window.clearTimeout(timeout);
      }
    };
    check();
    // Keep the form mounted on window focus, so switching apps does not erase typed passwords.
    const refresh = () => { setAttempt(n => n + 1); };
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [token, identity, attempt]);
  const logout = async () => {
    sessionStorage.removeItem('redirectTarget');
    await supabase.auth.signOut({ scope: 'local' });
    window.location.replace('/login');
  };
  if (!temporaryPasswordEnabled || !token) return <>{children}</>;
  const current = identity && result?.identity === identity ? result : null;
  const s = current?.status;
  const allowed = isAllowed(s);
  const message = current?.error || (s?.state === 'complete' || !s?.fresh_session
    ? '此登入已失效，請登出並使用最新密碼重新登入。'
    : s?.expired ? '臨時密碼已過期，請聯絡管理者重新核發。' : '密碼正在處理中，請稍後重試；若持續無法使用，請聯絡管理者。');
  let screen: ReactNode = null;
  if (!current) {
    screen = <div className="p-8 text-center">正在確認登入狀態…</div>;
  } else if (current.error || !allowed) {
    screen = s?.state === 'required' && s.fresh_session && !s.expired && !current.error
      ? <UpdatePassword forcedResetId={s.reset_id} onComplete={logout} onLogout={logout} />
      : <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-xl p-8 max-w-md space-y-4">
          <h1 className="text-xl font-bold">登入安全確認</h1><p role="alert">{message}</p>
          <button className="px-4 py-2 border rounded" onClick={() => setAttempt(n => n + 1)}>重試</button>
          <button className="ml-3 px-4 py-2 border rounded" onClick={logout}>登出</button>
        </div>
      </div>;
  }
  return <>
    {/* Stable wrapper preserves the chart during same-session background checks.
        Different accounts/logins and confirmed denial never reuse the previous tree. */}
    <div style={{ display: current?.error ? 'none' : 'contents' }}>
      {allowed ? children : null}
    </div>
    {screen}
  </>;
}
