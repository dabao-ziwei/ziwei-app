import React, { useMemo, useState } from 'react';
import { Thermometer, Activity, Bug, AlertTriangle, X, Terminal, MessageCircle, ScanLine, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { calculateDailyFortune } from '../logic/fortune';
import type { UserProfile, Client } from '../db';
import { FortuneThermometer } from './FortuneThermometer';
import { FocusTrendChart } from './FocusTrendChart'; 
import { ZiWeiEngine } from '../logic/engine';

const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';
const LINE_ID = '@653jrxjt'; 
const ADD_FRIEND_URL = 'https://line.me/R/ti/p/@653jrxjt?oat_content=url&ts=03241123';

// ----------------------------------------------------------------------
// [新增] CSS 樣式：美化捲軸 (Dark Scrollbar)
// ----------------------------------------------------------------------
const CustomScrollbarStyles = () => (
    <style>{`
        /* Webkit (Chrome, Edge, Safari) */
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px; /* 極細寬度 */
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent; /* 軌道透明 */
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(71, 85, 105, 0.5); /* Slate-600 半透明 */
            border-radius: 20px; /* 圓角 */
            border: 2px solid transparent; /* 增加邊距感 */
            background-clip: content-box;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: rgba(148, 163, 184, 0.8); /* Slate-400 懸停變亮 */
        }

        /* Firefox */
        .custom-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
        }
    `}</style>
);

// ----------------------------------------------------------------------
// 輔助組件：預約諮詢 QR Code Modal
// ----------------------------------------------------------------------
interface ConsultationModalProps {
    isOpen: boolean;
    onClose: () => void;
    reason: string;
}

const ConsultationModal: React.FC<ConsultationModalProps> = ({ isOpen, onClose, reason }) => {
    if (!isOpen) return null;

    const message = `大寶老師好，我看到今日運勢提示「${reason}」，想預約諮詢...`;
    const encodedMessage = encodeURIComponent(message);
    const lineActionUrl = `https://line.me/R/oaMessage/${LINE_ID}/?${encodedMessage}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(lineActionUrl)}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden relative flex flex-col items-center">
                <div className="w-full bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <ScanLine size={20} /> 掃描預約諮詢
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-white p-2 rounded-xl border border-gray-100 shadow-lg">
                            <img src={qrCodeUrl} alt="LINE QR Code" className="w-48 h-48 object-contain"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="font-bold text-gray-800 text-lg">拿出手機掃描 QR Code</p>
                        <p className="text-gray-500 text-sm">系統將自動開啟 LINE<br/>並為您帶入諮詢預約文字</p>
                    </div>
                    <a href={ADD_FRIEND_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:text-amber-700 underline">
                        或是點此直接加入好友
                    </a>
                </div>
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// 輔助組件：建議面板 (Advice Panel)
// ----------------------------------------------------------------------
const AdvicePanel = ({ fortune, userProfile, onConsultClick }: { fortune: any, userProfile: UserProfile | null, onConsultClick: () => void }) => {
    
    const isVip = useMemo(() => {
        if (!userProfile) return false;
        if (['admin', 'student'].includes(userProfile.role)) return true;
        if (userProfile.accessExpiry && new Date(userProfile.accessExpiry) > new Date()) return true;
        return false;
    }, [userProfile]);

    const categories = [
        { key: 'self', label: '工作', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
        { key: 'wealth', label: '理財', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
        { key: 'love', label: '感情', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' },
        { key: 'social', label: '交友', color: 'text-lime-500', bg: 'bg-lime-500/10 border-lime-500/20' },
        { key: 'travel', label: '外出', color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden relative">
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <SparklesIcon /> 今日指引
                    {!isVip && <span className="ml-auto text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">試閱模式</span>}
                </h3>
            </div>
            
            {/* [修正] 應用 custom-scrollbar 樣式類別 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[500px] lg:max-h-[400px] custom-scrollbar">
                
                {fortune.consultationHook && fortune.consultationHook.show && (
                    <div className="p-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl animate-in slide-in-from-top-2 shadow-lg shadow-amber-900/10 shrink-0">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-amber-500/20 rounded-full shrink-0 animate-pulse">
                                <MessageCircle size={18} className="text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-amber-400 mb-1 tracking-wide">
                                    {fortune.consultationHook.reason}
                                </p>
                                <p className="text-xs text-amber-100/80 leading-relaxed">
                                    {fortune.consultationHook.text}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={onConsultClick}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                        >
                            {fortune.consultationHook.linkText} <ArrowRightIcon />
                        </button>
                    </div>
                )}

                {categories.map((cat) => (
                    <div key={cat.key} className={`rounded-xl border p-3 ${cat.bg} shrink-0`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-black ${cat.color} uppercase tracking-widest`}>{cat.label}</span>
                            <div className={`h-[1px] flex-1 ${cat.color} opacity-20`}></div>
                        </div>
                        
                        <div className="relative">
                            <p className={`text-sm text-slate-300 leading-relaxed font-medium ${!isVip ? 'blur-[4px] select-none opacity-60' : ''}`}>
                                {fortune.advice[cat.key]}
                            </p>
                            
                            {!isVip && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-slate-900/80 backdrop-blur-[1px] px-3 py-1.5 rounded-full border border-slate-600 flex items-center gap-2 shadow-xl">
                                        <Lock size={12} className="text-amber-400" />
                                        <span className="text-[10px] text-slate-300 font-bold">會員限定</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                
                <div className="h-2"></div>
            </div>
        </div>
    );
};

const SparklesIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
        <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
        <path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2" />
        <path d="M19 11h2m-1 -1v2" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M5 12l14 0" /><path d="M13 18l6 -6" /><path d="M13 6l6 6" />
    </svg>
);


// ----------------------------------------------------------------------
// Debug 組件
// ----------------------------------------------------------------------
const DebugLogBlock = ({ title, score, logs }: { title: string, score: number, logs: string[] }) => (
    <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 flex flex-col gap-2 h-full">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
            <span className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider">{title}</span>
            <span className={`font-mono font-bold text-sm ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {score}
            </span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[120px]">
            {logs && logs.length > 0 ? (
                <ul className="space-y-1">
                    {logs.map((log, i) => (
                        <li key={i} className="text-[10px] text-slate-300 font-mono leading-relaxed border-l-2 border-slate-700 pl-2 hover:border-cyan-500 transition-colors">
                            {log}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-[10px] text-slate-600 italic">無特殊星曜影響</div>
            )}
        </div>
    </div>
);

// ----------------------------------------------------------------------
// 主組件
// ----------------------------------------------------------------------

interface Props {
  userProfile: UserProfile | null;
  client: Client;
  clientName?: string;
}

const DEMO_HOT = [ { label: '工作', value: 95 }, { label: '理財', value: 88 }, { label: '交友', value: 105 }, { label: '外出', value: 92 }, { label: '感情', value: 100 } ];
const DEMO_COLD = [ { label: '工作', value: 20 }, { label: '理財', value: 15 }, { label: '交友', value: 30 }, { label: '外出', value: 5 }, { label: '感情', value: 10 } ];

export const FortuneWidget: React.FC<Props> = ({ userProfile, client, clientName }) => {
  const [activeTab, setActiveTab] = useState<'thermometer' | 'trend'>('thermometer');
  const [showDebug, setShowDebug] = useState(false); 
  const [demoMode, setDemoMode] = useState<'real' | 'hot' | 'cold'>('real'); 
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);

  const isSuperAdmin = useMemo(() => {
      return userProfile?.email === SUPER_ADMIN_EMAIL;
  }, [userProfile]);

  const engine = useMemo(() => {
      if (!client) return null;
      try {
          return new ZiWeiEngine(
              client.birthYear, client.birthMonth, client.birthDay, 
              client.birthHour, client.birthMinute, client.gender
          );
      } catch (e) {
          console.error("Engine Init Failed", e);
          return null;
      }
  }, [client]);

  const todayFortune = useMemo(() => {
      if (!engine) return null;
      try {
        return calculateDailyFortune(engine);
      } catch (e) {
        console.error("Today calc failed", e);
        return null;
      }
  }, [engine]);

  const weeklyDetailedData = useMemo(() => {
      if (!engine) return [];
      try {
          const data = [];
          for(let i = 0; i < 7; i++) {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const f = calculateDailyFortune(engine, d);
              data.push({
                  label: `${d.getMonth()+1}/${d.getDate()}`,
                  scores: f.scores,
                  baseScore: f.devInfo.baseScore,
                  dateStr: `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
              });
          }
          return data;
      } catch (e) {
          console.error("Weekly calc error", e);
          return [];
      }
  }, [engine]);

  const handleConsultTrigger = () => {
      if (!todayFortune?.consultationHook) return;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const message = encodeURIComponent(`大寶老師好，我看到今日運勢提示「${todayFortune.consultationHook.reason}」，想預約諮詢...`);
      if (isMobile) {
          window.location.href = `https://line.me/R/oaMessage/${LINE_ID}/?${message}`;
      } else {
          setIsConsultModalOpen(true);
      }
  };

  if (!todayFortune || !engine) {
      return (
        <div className="w-full bg-[#0B1120] rounded-2xl border border-red-900/50 shadow-2xl p-6 flex items-center justify-center text-red-400 gap-3">
            <AlertTriangle size={24} />
            <div><h3 className="font-bold">運勢模組載入失敗</h3><p className="text-xs opacity-70">命盤資料可能缺損，無法進行運算。</p></div>
        </div>
      );
  }

  let displayData = [
    { label: '工作', value: todayFortune.scores.self },
    { label: '理財', value: todayFortune.scores.wealth },
    { label: '交友', value: todayFortune.scores.social },
    { label: '外出', value: todayFortune.scores.travel },
    { label: '感情', value: todayFortune.scores.love },
  ];
  const baseScore = todayFortune.devInfo.baseScore;

  if (demoMode === 'hot') displayData = DEMO_HOT;
  else if (demoMode === 'cold') displayData = DEMO_COLD;

  return (
    <div className="w-full flex flex-col gap-4">
        {/* [新增] 注入自定義捲軸 CSS */}
        <CustomScrollbarStyles />

        {/* 主要儀表板容器 */}
        <div className="w-full bg-[#0B1120] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative group min-h-[500px] flex flex-col">
        
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80 shadow-[0_0_15px_#22d3ee] z-20" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0B1120] to-[#020617] opacity-90 z-0" />

            {/* Header */}
            <div className="relative w-full p-4 sm:p-6 z-30 flex justify-between items-start shrink-0">
                <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-lg pointer-events-auto">
                    <button 
                        onClick={() => setActiveTab('thermometer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'thermometer' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Thermometer size={14} /> 今日運勢
                    </button>
                    <button 
                        onClick={() => setActiveTab('trend')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'trend' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Activity size={14} /> 一週運勢
                    </button>
                </div>
                {isSuperAdmin && (
                    <div className="flex gap-2 ml-auto">
                        <div className="flex bg-slate-800 rounded p-1 gap-1 border border-slate-700">
                            <button onClick={() => setDemoMode('real')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'real' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Real</button>
                            <button onClick={() => setDemoMode('hot')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'hot' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Hot</button>
                            <button onClick={() => setDemoMode('cold')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'cold' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>Cold</button>
                        </div>
                        <button onClick={() => setShowDebug(!showDebug)} className={`p-1.5 rounded border transition-colors ${showDebug ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                            <Bug size={14}/>
                        </button>
                    </div>
                )}
            </div>

            {/* Layout */}
            <div className="relative flex-1 w-full flex flex-col lg:flex-row items-stretch z-10 overflow-hidden">
                <div className={`flex flex-col items-center justify-center p-4 min-h-[350px] lg:border-r border-slate-800/50 ${activeTab === 'trend' ? 'w-full' : 'flex-1'}`}>
                    {activeTab === 'thermometer' ? (
                        <div className="w-full max-w-2xl h-[350px] lg:h-[400px] animate-in zoom-in duration-500">
                                <FortuneThermometer data={displayData} baseScore={baseScore} />
                        </div>
                    ) : (
                        <div className="w-full h-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="w-full h-[350px]"> 
                                <FocusTrendChart data={weeklyDetailedData} />
                             </div>
                        </div>
                    )}
                </div>

                {activeTab === 'thermometer' && (
                    <div className="w-full lg:w-[320px] shrink-0 p-4 lg:p-0 lg:border-l border-slate-800/50 bg-[#0B1120]/50 lg:bg-transparent">
                         <div className="h-full">
                            <AdvicePanel 
                                fortune={todayFortune} 
                                userProfile={userProfile}
                                onConsultClick={handleConsultTrigger} 
                            />
                         </div>
                    </div>
                )}
            </div>

            {/* Debug Console */}
            {showDebug && isSuperAdmin && (
                <div className="absolute inset-x-0 bottom-0 z-50 bg-[#020617]/95 border-t border-green-500/30 backdrop-blur-md h-[350px] flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                        <div className="flex items-center gap-2 text-green-400"><Terminal size={14} /><span className="text-xs font-mono font-bold">DEV_CONSOLE</span></div>
                        <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-4 custom-scrollbar">
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Time Params" score={0} logs={[todayFortune.devInfo.lunarDateStr, `流年:${todayFortune.devInfo.flowYearZhi}`, `流月:${todayFortune.devInfo.flowMonthZhi}`, `流日:${todayFortune.devInfo.flowDayZhi}`]} />
                            <DebugLogBlock title="Base Score" score={todayFortune.devInfo.baseScore} logs={todayFortune.devInfo.formulas.base} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Work" score={todayFortune.scores.self} logs={todayFortune.devInfo.formulas.self} />
                            <DebugLogBlock title="Wealth" score={todayFortune.scores.wealth} logs={todayFortune.devInfo.formulas.wealth} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Social" score={todayFortune.scores.social} logs={todayFortune.devInfo.formulas.social} />
                            <DebugLogBlock title="Travel" score={todayFortune.scores.travel} logs={todayFortune.devInfo.formulas.travel} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Love" score={todayFortune.scores.love} logs={todayFortune.devInfo.formulas.love} />
                        </div>
                    </div>
                </div>
            )}
            
            <ConsultationModal 
                isOpen={isConsultModalOpen}
                onClose={() => setIsConsultModalOpen(false)}
                reason={todayFortune.consultationHook?.reason || ''}
            />
        </div>
    </div>
  );
};