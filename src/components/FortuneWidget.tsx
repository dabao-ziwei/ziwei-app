import React, { useMemo, useState, useRef } from 'react';
import { toBlob } from 'html-to-image';
import { type Client, type UserProfile } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, calculateWeeklyFortune } from '../logic/fortune';
import { 
    Loader2, HelpCircle, Moon, Sun, Sparkles, Activity, Share2, Download, Smartphone, X, 
    MessageCircle, Lock, ChevronRight, Bug, Terminal, Calendar, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FocusTrendChart } from './FocusTrendChart';

const ADD_FRIEND_URL = 'https://line.me/R/ti/p/@653jrxjt?oat_content=url&ts=03241123';
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';
const WEBSITE_URL = 'ziweiapp.dabao.life';

interface FortuneWidgetProps {
    userProfile: UserProfile | null;
    client: Client;
    clientName: string;
}

// ----------------------------------------------------------------------
// CSS 樣式
// ----------------------------------------------------------------------
const CustomScrollbarStyles = () => (
    <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.4); }
        
        @keyframes jelly-pulse {
            0% { transform: scaleX(1); }
            50% { transform: scaleX(1.05); }
            100% { transform: scaleX(1); }
        }
        .jelly-active {
            animation: jelly-pulse 3s infinite ease-in-out;
        }
    `}</style>
);

const DebugLogBlock = ({ title, score, logs }: { title: string, score: number, logs: string[] }) => (
    <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 flex flex-col gap-2 h-full min-h-[120px]">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
            <span className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider">{title}</span>
            <span className={`font-mono font-bold text-sm ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>{score}</span>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[100px]">
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
// [核心] 相對能量果凍圖
// ----------------------------------------------------------------------
const JellyBarChart = ({ data, baseScore, isShareMode }: { data: any, baseScore: number, isShareMode?: boolean }) => {
    const safeBase = isNaN(baseScore) ? 60 : baseScore;

    return (
        // [修正重點] 
        // 1. 移除 flex-1: 避免在高度不足時被壓縮
        // 2. 加入 shrink-0: 強制保留指定高度，不可縮小
        // 3. 確保 h-[320px] 是硬性指標
        <div className={`w-full flex items-end justify-between relative shrink-0 py-2
            ${isShareMode 
                ? 'h-[320px] gap-3 px-2 mb-2' 
                : 'h-[320px] sm:h-[380px] gap-2 sm:gap-4'
            }`}
        >
            
            {['self', 'wealth', 'social', 'travel', 'love'].map((k, i) => {
                const val = data.scores[k];
                const labels = ['工作', '理財', '交友', '外出', '感情'];
                
                const isPositive = val >= safeBase;
                const diff = Math.abs(val - safeBase);
                
                // 高度計算
                const hPercent = Math.min(6 + diff * 1.2, 48);

                const colors = [
                    { main: '#FF9E9E', light: '#FFE4E1', shadow: '#E55B5B' },
                    { main: '#6EE7B7', light: '#D1FAE5', shadow: '#059669' },
                    { main: '#FCD34D', light: '#FEF3C7', shadow: '#D97706' },
                    { main: '#F472B6', light: '#FBCFE8', shadow: '#DB2777' },
                    { main: '#C084FC', light: '#E9D5FF', shadow: '#9333EA' },
                ];
                const c = colors[i];
                const isLastItem = i === 4;

                return (
                    <div key={k} className={`flex flex-col items-center h-full w-full relative group ${isShareMode ? 'gap-3' : 'gap-4'}`}>
                        
                        {/* 1. 上方資訊區 */}
                        <div className="flex flex-col items-center justify-end z-20 shrink-0 transition-transform duration-300 group-hover:-translate-y-1">
                            <span className={`font-bold mb-1 tracking-wider opacity-80 ${isShareMode ? 'text-xs text-amber-100/60 font-serif' : 'text-xs sm:text-sm text-slate-400'}`}>{labels[i]}</span>
                            <div className={`px-2 py-0.5 rounded-md border border-white/10 shadow-sm backdrop-blur-md ${isPositive ? 'bg-slate-800/80 text-white' : 'bg-slate-900/80 text-slate-400'}`}>
                                <span className="font-mono font-black text-sm">{val}</span>
                            </div>
                        </div>

                        {/* 2. 下方軌道區 */}
                        <div className={`flex-1 w-full relative rounded-full overflow-visible ${isShareMode ? '' : 'border border-white/5 bg-white/5'}`}>
                            
                            <div className="absolute inset-0 rounded-full overflow-hidden z-0">
                                {/* 基準線 */}
                                <div 
                                    className="absolute left-0 w-full h-[1px] z-50 pointer-events-none"
                                    style={{ 
                                        top: '50%',
                                        background: isShareMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.8)', 
                                        boxShadow: isShareMode ? '0 0 8px rgba(255,255,255,0.8), 0 0 15px cyan' : '0 0 4px #fff, 0 0 8px cyan'
                                    }}
                                />

                                {/* 3. 果凍柱 */}
                                {isShareMode ? (
                                    <div 
                                        className="absolute left-0 w-full z-10"
                                        style={{
                                            height: `${hPercent}%`,
                                            bottom: isPositive ? '50%' : 'auto',
                                            top: isPositive ? 'auto' : '50%',
                                            borderRadius: isPositive ? '20px 20px 0 0' : '0 0 20px 20px',
                                            background: `linear-gradient(${isPositive ? 'to top' : 'to bottom'}, ${c.shadow} 0%, ${c.main} 60%, ${c.light} 100%)`,
                                            boxShadow: `0 0 25px ${c.main}, inset 0 0 15px rgba(255,255,255,0.4)`
                                        }}
                                    >
                                        <div className={`absolute left-1/4 right-1/4 h-[2px] bg-white/60 rounded-full blur-[1px] ${isPositive ? 'top-1' : 'bottom-1'}`} />
                                    </div>
                                ) : (
                                    <motion.div 
                                        className="absolute left-0 w-full jelly-active z-10"
                                        initial={{ height: 0 }}
                                        animate={{ height: `${hPercent}%` }}
                                        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                                        style={{
                                            bottom: isPositive ? '50%' : 'auto',
                                            top: isPositive ? 'auto' : '50%',
                                            borderRadius: isPositive ? '20px 20px 0 0' : '0 0 20px 20px',
                                            background: `linear-gradient(${isPositive ? 'to top' : 'to bottom'}, ${c.shadow} 0%, ${c.main} 60%, ${c.light} 100%)`,
                                            boxShadow: `0 0 15px ${c.main}, inset 0 0 10px rgba(255,255,255,0.3)`
                                        }}
                                    >
                                        <div className={`absolute left-1/4 right-1/4 h-[2px] bg-white/60 rounded-full blur-[1px] ${isPositive ? 'top-1' : 'bottom-1'}`} />
                                    </motion.div>
                                )}
                            </div>
                            
                            {/* 基準分標籤 */}
                            {isLastItem && (
                                <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-3 font-mono whitespace-nowrap z-50 flex items-center ${isShareMode ? 'text-[10px] text-amber-200/60' : 'text-[9px] text-white/40'}`}>
                                    <div className={`w-2 h-[1px] mr-2 ${isShareMode ? 'bg-amber-200/40' : 'bg-white/30'}`}></div>
                                    {safeBase}
                                </div>
                            )}

                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ----------------------------------------------------------------------
// 主組件
// ----------------------------------------------------------------------
export const FortuneWidget: React.FC<FortuneWidgetProps> = ({ userProfile, client, clientName }) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [isGeneratingShare, setIsGeneratingShare] = useState(false);
    const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
    const [shareBlob, setShareBlob] = useState<Blob | null>(null);
    const shareCardRef = useRef<HTMLDivElement>(null);

    const isSuperAdmin = useMemo(() => userProfile?.email === SUPER_ADMIN_EMAIL, [userProfile]);

    const engine = useMemo(() => {
        try {
            return new ZiWeiEngine(client.birthYear, client.birthMonth, client.birthDay, client.birthHour, client.birthMinute, client.gender);
        } catch (e) { console.error(e); return null; }
    }, [client]);

    const dailyFortune = useMemo(() => engine ? calculateDailyFortune(engine) : null, [engine]);
    
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
        } catch (e) { return []; }
    }, [engine]);

    if (!engine || !dailyFortune) return null;

    const currentData = dailyFortune;
    const baseScore = dailyFortune.devInfo?.baseScore || 60;
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '.');
    const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][today.getDay()];

    const handleShareClick = async () => {
        if (!shareCardRef.current) return;
        setIsGeneratingShare(true);
        
        setTimeout(async () => {
            try {
                const blob = await toBlob(shareCardRef.current!, { pixelRatio: 3, backgroundColor: '#09090b' });
                if (!blob) throw new Error('Image generation failed');
                const url = URL.createObjectURL(blob);
                setShareBlob(blob);
                setShareImageUrl(url);
            } catch (err) { alert('圖片生成失敗，請稍後再試。'); } 
            finally { setIsGeneratingShare(false); }
        }, 800);
    };

    const handleDownloadImage = () => {
        if (!shareImageUrl) return;
        const link = document.createElement('a');
        link.download = `fortune-${clientName}-${dateStr}.png`;
        link.href = shareImageUrl;
        link.click();
    };

    const handleSystemShare = async () => {
        if (!shareBlob || !navigator.share) return;
        const file = new File([shareBlob], 'daily-fortune.png', { type: 'image/png' });
        try { await navigator.share({ title: 'AI紫微斗數運勢', text: `這是 ${clientName} 的運勢分析`, files: [file] }); } catch (err) {}
    };

    const handleConsultTrigger = () => {
         if (!dailyFortune?.consultationHook) return;
         window.open(ADD_FRIEND_URL, '_blank');
    };

    return (
        <div className="w-full relative flex flex-col items-center">
            <CustomScrollbarStyles />
            
            <div 
                ref={shareCardRef} 
                className={`
                    relative font-sans overflow-hidden transition-all duration-500 ease-out
                    ${isGeneratingShare 
                        ? 'w-[375px] h-auto p-6 rounded-2xl border border-amber-500/30 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),inset_0_0_80px_rgba(0,0,0,0.9),0_0_20px_rgba(217,119,6,0.1)] bg-[#09090b]' 
                        : 'w-full bg-[#0B1120] rounded-3xl p-4 text-white shadow-xl border border-slate-800' 
                    }
                `}
            >
                <div className={`absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none transition-opacity duration-500 ${isGeneratingShare ? 'opacity-40' : 'opacity-100'}`}></div>
                <div className={`absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none transition-opacity duration-500 ${isGeneratingShare ? 'opacity-40' : 'opacity-100'}`}></div>
                <div className={`absolute inset-0 bg-[linear-gradient(rgba(255,255,255,${isGeneratingShare ? '0.02' : '0.05'})_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,${isGeneratingShare ? '0.02' : '0.05'})_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none`}></div>

                <div className={`relative z-10 flex flex-col ${isGeneratingShare ? 'h-auto' : 'h-full'}`}>
                    
                    {isGeneratingShare ? (
                        <div className="flex flex-col items-center justify-center mb-2 pt-2">
                            <div className="flex items-center gap-3 mb-1 opacity-80">
                                <Sparkles className="text-amber-400" size={16} />
                                <span className="text-base font-serif font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-100">
                                    今日運勢
                                </span>
                                <Sparkles className="text-amber-400" size={16} />
                            </div>
                            <div className="flex flex-col items-center mt-1">
                                <div className="flex items-center gap-3 text-amber-200/50 text-[10px] font-mono tracking-[0.2em] uppercase mb-1">
                                    <span>{dateStr}</span>
                                    <span className="text-amber-500/40">•</span>
                                    <span>{dayOfWeek}</span>
                                </div>
                                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-200 tracking-widest drop-shadow-sm">
                                    {clientName}
                                </h2>
                                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent mt-2"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-row flex-nowrap justify-between items-center gap-2 sm:gap-4 mb-4">
                            <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-lg shrink-0 flex-1 sm:flex-none">
                                <button onClick={() => setMode('daily')} className={`flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 rounded-md transition-all font-bold text-xs sm:text-sm flex-1 sm:flex-auto ${mode === 'daily' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                    <Sun size={16} className={`sm:w-4 sm:h-4 ${mode === 'daily' ? 'animate-spin-slow' : ''}`} /> <span className="whitespace-nowrap">今日</span>
                                </button>
                                <button onClick={() => setMode('weekly')} className={`flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 rounded-md transition-all font-bold text-xs sm:text-sm flex-1 sm:flex-auto ${mode === 'weekly' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                    <Activity size={16} className="sm:w-4 sm:h-4" /> <span className="whitespace-nowrap">一週</span>
                                </button>
                            </div>
                            <div className="flex gap-3 shrink-0 items-center">
                                <button onClick={handleShareClick} disabled={isGeneratingShare} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-sm border border-slate-700 transition-all disabled:opacity-50">
                                    {isGeneratingShare ? <Loader2 size={16} className="animate-spin"/> : <Share2 size={16} />} <span className="hidden sm:inline whitespace-nowrap">分享</span>
                                </button>
                                <div className="relative">
                                    <button onClick={() => setIsTooltipOpen(!isTooltipOpen)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/80 rounded-full border border-slate-700 cursor-help hover:bg-slate-700 transition-colors select-none">
                                        <span className="text-amber-400 font-black text-base font-mono leading-none">{baseScore}</span>
                                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden sm:inline whitespace-nowrap">本命基數</span>
                                        <HelpCircle size={16} className="text-slate-500" />
                                    </button>
                                    <AnimatePresence>
                                        {isTooltipOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[60] sm:hidden" onClick={() => setIsTooltipOpen(false)}></div>
                                                <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute z-[70] p-4 rounded-xl shadow-2xl bg-slate-900 border border-slate-700 text-white text-xs leading-relaxed whitespace-normal break-words sm:top-full sm:right-0 sm:mt-3 sm:w-64 top-full right-0 mt-3 w-[220px] sm:max-w-none">
                                                    <button onClick={() => setIsTooltipOpen(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white sm:hidden"><X size={14}/></button>
                                                    <div className="font-bold text-amber-400 mb-2 flex items-center gap-1"><Sparkles size={14}/> 關於基礎運勢</div>
                                                    <p className="opacity-90 text-slate-300">這是命盤的「先天體質」分數。<br/><span className="text-amber-200 font-bold">• 高分者 (80+)：</span> 抗壓強，但也易因大意而失荊州。<br/><span className="text-amber-200 font-bold">• 低分者 (60-)：</span> 敏感度高，善用流日運勢也能創造佳績。</p>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {isSuperAdmin && (
                                    <button onClick={() => setShowDebug(!showDebug)} className={`p-2 rounded-lg border transition-colors ${showDebug ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                                        <Bug size={16}/>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={`relative flex-1 w-full flex ${isGeneratingShare ? 'flex-col' : 'flex-col lg:flex-row'} items-stretch z-10 ${isGeneratingShare ? 'gap-2' : 'gap-3 lg:gap-6'}`}>
                        <div className={`flex flex-col items-center justify-center ${mode === 'weekly' ? 'w-full' : 'flex-1'}`}>
                             {mode === 'daily' ? (
                                <div className={`w-full max-w-3xl flex flex-col ${isGeneratingShare ? 'h-auto' : 'w-full'}`}>
                                    <JellyBarChart data={currentData} baseScore={baseScore} isShareMode={isGeneratingShare} />
                                    
                                    {isGeneratingShare && (
                                        <div className="mt-2 flex flex-col items-center gap-2">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-amber-200/40 uppercase tracking-[0.2em] mb-1">Base Energy</span>
                                                <div className="flex items-center justify-center gap-2 bg-gradient-to-b from-amber-900/30 to-transparent px-6 py-1 rounded-full border border-amber-500/20 shadow-[inset_0_0_10px_rgba(251,191,36,0.1)]">
                                                    <span className="text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-100 to-amber-400">{baseScore}</span>
                                                </div>
                                            </div>
                                            <div className="w-3/4 flex items-center gap-2 opacity-30 mt-1">
                                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                                            </div>
                                            <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-200/30 font-mono tracking-[0.3em] uppercase">
                                                <Sparkles size={8} className="text-amber-500/40" />
                                                <span>{WEBSITE_URL}</span>
                                                <Sparkles size={8} className="text-amber-500/40" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                             ) : (
                                <div className="w-full h-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-full h-[350px]"> 
                                        <FocusTrendChart data={weeklyDetailedData} />
                                    </div>
                                </div>
                             )}
                        </div>

                        {mode === 'daily' && !isGeneratingShare && (
                             <div className="w-full lg:w-[340px] shrink-0 animate-in slide-in-from-right-4 duration-500 delay-150">
                                  <AdvicePanel fortune={dailyFortune} userProfile={userProfile} onConsultClick={handleConsultTrigger} />
                             </div>
                        )}
                    </div>
                </div>
            </div>

            <SharePreviewModal isOpen={!!shareImageUrl} onClose={() => { setShareImageUrl(null); setShareBlob(null); }} imageUrl={shareImageUrl} onDownload={handleDownloadImage} onSystemShare={handleSystemShare} />
            {showDebug && isSuperAdmin && (
                <div className="relative mt-4 z-50 bg-[#020617]/95 border border-green-500/30 backdrop-blur-md rounded-xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 w-full max-w-4xl">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                        <div className="flex items-center gap-2 text-green-400"><Terminal size={14} /><span className="text-xs font-mono font-bold">DEV_CONSOLE</span></div>
                        <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Time Params" score={0} logs={[dailyFortune.devInfo.lunarDateStr, `流年:${dailyFortune.devInfo.flowYearZhi}`, `流月:${dailyFortune.devInfo.flowMonthZhi}`, `流日:${dailyFortune.devInfo.flowDayZhi}`]} />
                            <DebugLogBlock title="Base Score" score={dailyFortune.devInfo.baseScore} logs={dailyFortune.devInfo.formulas.base} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Work" score={dailyFortune.scores.self} logs={dailyFortune.devInfo.formulas.self} />
                            <DebugLogBlock title="Wealth" score={dailyFortune.scores.wealth} logs={dailyFortune.devInfo.formulas.wealth} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Social" score={dailyFortune.scores.social} logs={dailyFortune.devInfo.formulas.social} />
                            <DebugLogBlock title="Travel" score={dailyFortune.scores.travel} logs={dailyFortune.devInfo.formulas.travel} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Love" score={dailyFortune.scores.love} logs={dailyFortune.devInfo.formulas.love} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface SharePreviewModalProps { isOpen: boolean; onClose: () => void; imageUrl: string | null; onDownload: () => void; onSystemShare: () => void; }
const SharePreviewModal: React.FC<SharePreviewModalProps> = ({ isOpen, onClose, imageUrl, onDownload, onSystemShare }) => {
    if (!isOpen || !imageUrl) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={18} className="text-purple-400"/> 分享運勢卡片</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6 flex justify-center bg-[#020617]"><div className="relative shadow-[0_0_30px_rgba(139,92,246,0.3)] rounded-lg overflow-hidden"><img src={imageUrl} alt="Daily Fortune Card" className="max-h-[50vh] object-contain rounded-lg" /></div></div>
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex flex-col gap-3">
                    <button onClick={onDownload} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"><Download size={18} /> 下載圖片 (推薦)</button>
                    {navigator.share && (<button onClick={onSystemShare} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-700"><Smartphone size={18} /> 呼叫系統分享 (手機用)</button>)}
                </div>
            </div>
        </div>
    );
};

const AdvicePanel = ({ fortune, userProfile, onConsultClick }: { fortune: any, userProfile: UserProfile | null, onConsultClick: () => void }) => {
    const isVip = useMemo(() => {
        if (!userProfile) return false;
        if (['admin', 'student'].includes(userProfile.role)) return true;
        if (userProfile.accessExpiry && new Date(userProfile.accessExpiry) > new Date()) return true;
        return false;
    }, [userProfile]);
    const categories = [
        { key: 'self', label: '工作', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', icon: Sun },
        { key: 'wealth', label: '理財', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/20', icon: Activity },
        { key: 'love', label: '感情', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20', icon: Moon },
        { key: 'social', label: '交友', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', icon: Sparkles },
        { key: 'travel', label: '外出', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20', icon: Sun },
    ];
    return (
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden relative shadow-lg h-[350px] sm:h-[410px]">
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 shrink-0 flex justify-between items-center"><h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><SparklesIcon /> 今日指引{!isVip && <span className="text-[10px] bg-slate-700/80 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600">試閱模式</span>}</h3></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {fortune.consultationHook && fortune.consultationHook.show && (
                    <div className="p-4 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/30 rounded-xl shadow-lg shadow-amber-900/10 shrink-0 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
                        <div className="flex items-start gap-3 mb-3 relative z-10"><div className="p-2 bg-amber-500/20 rounded-full shrink-0"><MessageCircle size={20} className="text-amber-400" /></div><div><p className="text-sm font-bold text-amber-400 mb-1 tracking-wide">{fortune.consultationHook.reason}</p><p className="text-xs text-amber-100/80 leading-relaxed">{fortune.consultationHook.text}</p></div></div>
                        <button onClick={onConsultClick} className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 relative z-10 group-hover:shadow-lg hover:brightness-110">{fortune.consultationHook.linkText} <ChevronRight size={14} /></button>
                    </div>
                )}
                {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                    <div key={cat.key} className={`rounded-xl border p-4 ${cat.bg} shrink-0 transition-all hover:bg-opacity-70`}>
                        <div className="flex items-center gap-2 mb-3"><Icon size={14} className={cat.color} /><span className={`text-xs font-black ${cat.color} uppercase tracking-widest`}>{cat.label}</span><div className={`h-[1px] flex-1 ${cat.color} opacity-20`}></div></div>
                        <div className="relative min-h-[40px] flex items-center"><p className={`text-sm text-slate-300 leading-relaxed font-medium ${!isVip ? 'blur-[4px] select-none opacity-60' : ''}`}>{fortune.advice[cat.key]}</p>{!isVip && (<div className="absolute inset-0 flex items-center justify-center"><div className="bg-slate-900/80 backdrop-blur-[2px] px-4 py-2 rounded-full border border-slate-600/50 flex items-center gap-2 shadow-xl"><Lock size={14} className="text-amber-400" /><span className="text-xs text-slate-300 font-bold">會員限定觀看</span></div></div>)}</div>
                    </div>
                )})}
            </div>
        </div>
    );
};
const SparklesIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /><path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 2 -2" /><path d="M19 11h2m-1 -1v2" /></svg>);