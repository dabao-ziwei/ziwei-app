import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../supabase';
import { temporaryPasswordEnabled } from '../logic/temporaryPassword';
import { UpdatePassword } from './UpdatePassword';

export function PasswordResetGate({ session, children }: { session: any; children: ReactNode }) {
  const [result, setResult] = useState<{ token: string; status?: any; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const token = session?.access_token;
  useEffect(() => {
    if (!temporaryPasswordEnabled || !token) return;
    let active = true;
    const check = async () => {
      try {
        const { data, error } = await supabase.rpc('password_reset_status').abortSignal(AbortSignal.timeout(15000));
        if (error || !data) throw new Error('無法確認登入狀態，請重試或重新登入');
        if (active) setResult({ token, status: data });
      } catch {
        if (active) setResult({ token, error: '無法確認登入狀態，請重試或重新登入' });
      }
    };
    check();
    // Keep the form mounted on window focus, so switching apps does not erase typed passwords.
    const refresh = () => { setAttempt(n => n + 1); };
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [token, attempt]);
  const logout = async () => {
    sessionStorage.removeItem('redirectTarget');
    await supabase.auth.signOut({ scope: 'local' });
    window.location.replace('/login');
  };
  if (!temporaryPasswordEnabled || !token) return <>{children}</>;
  if (!result || result.token !== token) return <div className="p-8 text-center">正在確認登入狀態…</div>;
  const s = result.status;
  if (s?.state === 'normal' || (s?.state === 'complete' && s.fresh_session)) return <>{children}</>;
  if (s?.state === 'required' && s.fresh_session && !s.expired) {
    return <UpdatePassword forcedResetId={s.reset_id} onComplete={logout} onLogout={logout} />;
  }
  const message = result.error || (s?.state === 'complete' || !s?.fresh_session
    ? '此登入已失效，請登出並使用最新密碼重新登入。'
    : s?.expired ? '臨時密碼已過期，請聯絡管理者重新核發。' : '密碼正在處理中，請稍後重試；若持續無法使用，請聯絡管理者。');
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
    <div className="bg-white rounded-xl p-8 max-w-md space-y-4">
      <h1 className="text-xl font-bold">登入安全確認</h1><p role="alert">{message}</p>
      <button className="px-4 py-2 border rounded" onClick={() => { setResult(null); setAttempt(n => n + 1); }}>重試</button>
      <button className="ml-3 px-4 py-2 border rounded" onClick={logout}>登出</button>
    </div>
  </div>;
}
