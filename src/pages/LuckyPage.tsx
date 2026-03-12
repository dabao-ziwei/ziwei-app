// FILE: src/pages/LuckyPage.tsx
import React, { useState, useEffect } from 'react';
import { LuckyDivinationGame } from '../components/LuckyDivinationGame';
import { getMyProfile, getFeatureRuntime } from '../db';
import { Sparkles, ArrowRight, Globe, Loader2, Lock, ShoppingBag, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LuckyPage = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<'LANDING' | 'GAME'>('LANDING');
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [remainingTrials, setRemainingTrials] = useState(0);
  
  const [isPaidMode, setIsPaidMode] = useState(false);
  const [systemAnnouncement, setSystemAnnouncement] = useState<string | null>(null);

  useEffect(() => {
      const init = async () => {
          // 1. 讀取收費與公告設定
          const config = await getFeatureRuntime('lucky_divination');
          const paidMode = config ? config.is_paid : false; 
          setIsPaidMode(paidMode);
          
          if (config && config.announcement && config.announcement.trim() !== '') {
              setSystemAnnouncement(config.announcement);
          }

          // 2. 讀取 VIP 狀態
          const p = await getMyProfile();
          let vip = false;
          if (p && p.accessExpiry) {
              if (new Date(p.accessExpiry) > new Date()) {
                  vip = true;
              }
          }
          setIsVip(vip);

          // 3. 讀取免費次數 (僅在收費模式下有意義)
          const storageKey = 'dabao_divination_trials';
          const usedTrials = parseInt(localStorage.getItem(storageKey) || '0', 10);
          setRemainingTrials(Math.max(0, 3 - usedTrials));

          setLoading(false);
      };
      init();
  // 監聽 view 變化，當客人從遊戲畫面返回時，重新讀取剩餘次數
  }, [view]);

  const handleStart = () => {
      // 移除原有的提前扣次數邏輯，直接進入遊戲
      setView('GAME');
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
      <div className="relative z-10 space-y-6 animate-in fade-in duration-700 max-w-sm w-full">
        
        {/* 動態系統公告 (從後台抓取) */}
        {systemAnnouncement && (
            <div className="bg-blue-500/10 border border-blue-500/30 p-3.5 rounded-xl text-sm mb-2 text-blue-200 text-left flex items-start gap-2.5 shadow-lg animate-in slide-in-from-top-4">
               <BellRing size={18} className="shrink-0 mt-0.5 text-blue-400" />
               <p className="leading-relaxed">{systemAnnouncement}</p>
            </div>
        )}

        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto ring-1 ring-purple-500/50">
          <Sparkles size={40} className="text-purple-400" />
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-widest mb-4">吉凶占卜</h1>
          
          {/* 只有在「收費模式」且「非VIP」且「還有次數」時，才顯示剩餘次數提示 */}
          {isPaidMode && !isVip && remainingTrials > 0 && (
             <div className="bg-white/5 border border-purple-500/30 p-4 rounded-xl text-sm mb-4 text-left shadow-lg">
               <p className="font-bold text-amber-400 mb-2">🎁 免費體驗中</p>
               <p className="opacity-90 leading-relaxed text-slate-300">
                   您還有 <span className="font-bold text-white text-xl mx-1">{remainingTrials}</span> 次免費體驗機會。<br/>本功能將轉為訂閱制，請把握機會。
               </p>
             </div>
          )}
          
          <p className="text-slate-400 leading-relaxed">
            誠心想著你要詢問的事情，<br/>透過星曜感應，取得當下的指引。
          </p>
        </div>

        <div className="space-y-4">
            {/* 只有在「收費模式」且「非VIP」且「次數用盡」時，才顯示鎖頭與升級按鈕 */}
            {isPaidMode && !isVip && remainingTrials <= 0 ? (
                 <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-2xl mt-4">
                     <div className="w-12 h-12 bg-amber-100/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={24}/></div>
                     <h3 className="text-lg font-bold text-white mb-2">免費次數已用盡</h3>
                     <p className="text-slate-400 text-sm mb-6">升級訂閱方案，解鎖無限次數的吉凶占卜與完整命理解析。</p>
                     <button onClick={() => navigate('/store')} className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition-all"><ShoppingBag size={18}/> 前往升級</button>
                 </div>
            ) : (
                <button 
                  onClick={handleStart} 
                  className="w-full py-4 bg-purple-600 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-purple-900/30 transition-all active:scale-95"
                >
                    開始占卜 <ArrowRight size={20}/>
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