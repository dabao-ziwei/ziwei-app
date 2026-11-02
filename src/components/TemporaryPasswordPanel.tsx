import { useEffect, useState } from 'react';
import { passwordRequest, temporaryPasswordEnabled } from '../logic/temporaryPassword';

export function TemporaryPasswordPanel({ userId, email }: { userId: string; email?: string }) {
  const [status, setStatus] = useState<any>(null);
  const [issued, setIssued] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (temporaryPasswordEnabled) passwordRequest({ action: 'status', userId })
      .then(data => { if (active) setStatus(data); })
      .catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [userId]);
  const issue = async () => {
    if (!window.confirm(`為 ${email} 產生臨時密碼？原密碼會立即失效，舊登入將無法存取會員資料。請確認是本人提出的重設要求。`)) return;
    setBusy(true); setError(''); setIssued(null);
    try {
      const data = await passwordRequest({ action: 'issue', userId });
      setIssued(data); setStatus({ state: 'required' });
    } catch (err: any) { setError(err.message); }
    finally { setBusy(false); }
  };
  const labels: Record<string, string> = { normal: '不需強制改密碼', required: '等待使用者改密碼',
    issuing: '核發中／需重新核發', changing: '變更中／如持續未完成請重新核發', complete: '已完成改密碼，需重新登入' };
  return <section className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
    <h4 className="font-bold text-sm">登入密碼管理</h4>
    {!temporaryPasswordEnabled ? <p className="text-sm text-gray-500">臨時密碼服務尚未啟用，需先完成後端與資料庫設定。</p> : <>
      <p className="text-sm text-gray-600">{status ? labels[status.state] || status.state : '讀取中…'}
        {status?.expires_at && status.state !== 'complete' && `（期限：${new Date(status.expires_at).toLocaleString()}）`}</p>
      <button type="button" disabled={busy} onClick={issue} className="border border-orange-300 text-orange-700 rounded-lg px-4 py-2 disabled:opacity-50">{busy ? '處理中…' : '產生隨機臨時密碼'}</button>
      {issued && <div className="bg-orange-50 p-3 rounded-lg space-y-2">
        <p className="text-sm">{issued.email}：僅本次顯示，24 小時有效。請私下提供本人，勿貼到公開群組。</p>
        <code className="block break-all select-text">{issued.password}</code>
        <button type="button" className="underline text-sm" onClick={async () => {
          try { await navigator.clipboard.writeText(issued.password); }
          catch { setError('無法複製，請手動選取密碼'); }
        }}>複製密碼</button>
      </div>}
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
    </>}
  </section>;
}
