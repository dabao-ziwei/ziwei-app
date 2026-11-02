import { supabase } from '../supabase';

export const temporaryPasswordEnabled = import.meta.env.VITE_TEMP_PASSWORD_RESET_ENABLED === 'true';
export async function passwordRequest(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('請重新登入');
  const response = await fetch('/api/temporary-password', {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(45000),
  });
  const data = await response.json().catch(() => ({ error: '密碼服務尚未設定完成' }));
  if (!response.ok) throw new Error(data.error || '密碼服務暫時無法使用');
  return data;
}
