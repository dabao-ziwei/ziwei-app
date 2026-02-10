import React, { useState } from 'react';
import { LuckyDivinationGame } from '../components/LuckyDivinationGame';
import { usePaywall } from '../hooks/usePaywall';
import { issueGuestToken, consumeFeature } from '../db';
import { Sparkles, ArrowRight, Globe, Loader2 } from 'lucide-react';

const FEATURE_KEY = 'lucky_divination';

export const LuckyPage = () => {
  const [view, setView] = useState<'LANDING' | 'GAME'>('LANDING');
  const { runtime, loading } = usePaywall(FEATURE_KEY);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleStart = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      let token = localStorage.getItem('dabao_guest_token');
      if (!token) {
        const res = await issueGuestToken();
        if (res.success && res.token) {
          token = res.token;
          localStorage.setItem('dabao_guest_token', token);
        } else {
          throw new Error('無法初始化訪客身份');
        }
      }

      const result = await consumeFeature(FEATURE_KEY, token);

      if (result.success) {
        setView('GAME');
      } else {
        if (result.mode === 'LOGIN_REQUIRED') {
            setMessage('免費次數已用完，請登入或註冊以繼續使用。');
        } else if (result.mode === 'TOKEN_REQUIRED') {
            setMessage('系統驗證失敗，請重整頁面後再試。');
        } else {
            setMessage(result.message || '暫無法使用此功能');
        }
      }
    } catch (e: any) {
      setMessage(e.message || '發生未知錯誤');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-white"/></div>;

  if (view === 'GAME') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 h-[100dvh]">
        <LuckyDivinationGame onClose={() => setView('LANDING')} isPublicPage={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
      <div className="relative z-10 space-y-8 animate-in fade-in duration-700 max-w-sm w-full">
        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-purple-500/50">
          <Sparkles size={40} className="text-purple-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-widest mb-4">吉凶占卜</h1>
          {runtime?.announcement?.enabled && (
             <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-sm mb-4 text-left">
               <p className="font-bold text-amber-400 mb-1">{runtime.announcement.title}</p>
               <p className="opacity-80 leading-relaxed">{runtime.announcement.body}</p>
             </div>
          )}
          <p className="text-slate-400 leading-relaxed">
            誠心想著你要詢問的事情，<br/>透過星曜感應，取得當下的指引。
          </p>
        </div>

        <div className="space-y-4">
            {message && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-200">
                    {message}
                </div>
            )}

            {message === '免費次數已用完，請登入或註冊以繼續使用。' ? (
                 <button onClick={() => window.location.href='/login'} className="w-full py-4 bg-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/30">
                    註冊掌握完整運勢 <ArrowRight size={20}/>
                 </button>
            ) : (
                <button 
                  onClick={handleStart} 
                  disabled={actionLoading}
                  className="w-full py-4 bg-purple-600 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {actionLoading ? <Loader2 className="animate-spin"/> : <>開始占卜 <ArrowRight size={20}/></>}
                </button>
            )}
        </div>

        <a href="https://www.dabao.life" className="flex items-center justify-center gap-2 text-slate-500 text-sm hover:text-slate-300 transition-colors">
            <Globe size={14} /> 返回大寶官網
        </a>
      </div>
    </div>
  );
};