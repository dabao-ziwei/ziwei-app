import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom'; // [新增] 引入 Portal
import { type Client, type UserProfile } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, calculateWeeklyFortune, type DailyFortune, type WeeklyFortune, getFortuneLevel } from '../logic/fortune';
import { Loader2, HelpCircle, Moon, Sun, Sparkles, Info, ChevronRight, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface FortuneWidgetProps {
    userProfile: UserProfile | null;
    client: Client;
    clientName: string;
}

const SCORES = [
    { key: 'total', label: '綜合', color: 'from-blue-500 to-indigo-600', icon: Sparkles },
    { key: 'wealth', label: '財運', color: 'from-amber-400 to-orange-500', icon: Sun },
    { key: 'career', label: '事業', color: 'from-green-400 to-teal-500', icon: Moon },
    { key: 'travel', label: '外出', color: 'from-sky-400 to-cyan-500', icon: Sun },
    { key: 'love', label: '感情', color: 'from-pink-400 to-rose-500', icon: Moon },
] as const;

export const FortuneWidget: React.FC<FortuneWidgetProps> = ({ userProfile, client, clientName }) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'daily' | 'weekly'>('daily');
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);

    const engine = useMemo(() => {
        try {
            return new ZiWeiEngine(client.birthYear, client.birthMonth, client.birthDay, client.birthHour, client.birthMinute, client.gender);
        } catch (e) { console.error(e); return null; }
    }, [client]);

    const dailyFortune = useMemo(() => engine ? calculateDailyFortune(engine) : null, [engine]);
    const weeklyFortune = useMemo(() => engine ? calculateWeeklyFortune(engine) : null, [engine]);

    if (!engine || !dailyFortune || !weeklyFortune) return null;

    const currentData = mode === 'daily' ? dailyFortune : weeklyFortune;
    const baseScore = dailyFortune.baseScore;

    return (
        <div className="w-full bg-[#1A2332] rounded-3xl p-4 sm:p-6 text-white shadow-xl shadow-blue-900/20 border border-blue-900/30 relative font-sans">
            
            {/* 背景層 */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[80px] mix-blend-screen animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[80px] mix-blend-screen animate-pulse-slow delay-1000"></div>
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex flex-row flex-nowrap justify-between items-center gap-2 sm:gap-3 mb-6">
                    
                    {/* Tab Buttons */}
                    <div className="flex bg-[#252D3D] rounded-xl p-1 shadow-inner relative overflow-hidden shrink-0 flex-1 sm:flex-none">
                        <motion.div 
                            className="absolute top-1 bottom-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md z-0"
                            initial={false}
                            animate={{ 
                                left: mode === 'daily' ? '4px' : '50%', 
                                width: 'calc(50% - 4px)',
                                x: mode === 'daily' ? 0 : 0
                             }}
                             transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                        {/* 手機版縮小 Padding (px-2 py-1.5) 與字體 */}
                        <button 
                            onClick={() => setMode('daily')} 
                            className={`relative z-10 flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 font-bold text-xs sm:text-base ${mode === 'daily' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Sun size={14} className={`sm:w-4 sm:h-4 ${mode === 'daily' ? 'animate-spin-slow' : ''}`} /> <span className="whitespace-nowrap">今日</span><span className="hidden sm:inline">運勢</span>
                        </button>
                        <button 
                            onClick={() => setMode('weekly')} 
                            className={`relative z-10 flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 font-bold text-xs sm:text-base ${mode === 'weekly' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Activity size={14} className="sm:w-4 sm:h-4" /> <span className="whitespace-nowrap">本週</span><span className="hidden sm:inline">運勢</span>
                        </button>
                    </div>
                    
                    {/* Base Score Button */}
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setIsTooltipOpen(!isTooltipOpen)}
                            className="bg-[#2A3441] hover:bg-[#333F50] transition-colors rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 flex items-center gap-1.5 text-sm cursor-help select-none"
                        >
                             <span className="text-amber-400 font-bold text-lg leading-none">{baseScore}</span>
                             {/* 手機版隱藏文字 */}
                             <span className="text-slate-400 hidden sm:inline whitespace-nowrap">本命基數</span>
                             <HelpCircle size={14} className="text-slate-500" />
                        </button>

                        {/* Desktop Tooltip (維持原本的 Absolute Positioning) */}
                        <AnimatePresence>
                            {isTooltipOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="hidden sm:block absolute top-full right-0 mt-2 w-64 z-50 p-3 rounded-xl shadow-xl bg-[#252D3D] border border-slate-600/50 text-slate-300 text-xs leading-relaxed"
                                >
                                    <div className="font-bold text-amber-400 mb-1 text-xs">什麼是本命基數？</div>
                                    <div className="mb-1">這是您命盤的「先天體質」分數。</div>
                                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                                        <li><span className="text-slate-200">高分</span>：抗壓強，但易因大意失荊州。</li>
                                        <li><span className="text-slate-200">低分</span>：敏感度高，善用運勢能創造成就。</li>
                                    </ul>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Mobile Tooltip (使用 Portal 傳送到 body 層，解決所有被遮擋問題) */}
                {isTooltipOpen && createPortal(
                    <AnimatePresence>
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:hidden"
                        >
                            {/* 遮罩 */}
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={() => setIsTooltipOpen(false)}></div>
                            
                            {/* 內容卡片 */}
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative bg-[#252D3D] w-full max-w-xs rounded-2xl shadow-2xl border border-slate-600/50 p-5 text-slate-300 text-sm leading-relaxed overflow-y-auto max-h-[80vh]"
                            >
                                <button onClick={() => setIsTooltipOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-white p-1">
                                    <X size={20}/>
                                </button>

                                <div className="font-bold text-amber-400 mb-3 text-base flex items-center gap-2">
                                    <HelpCircle size={18}/> 
                                    本命基數說明
                                </div>
                                <div className="mb-3 text-slate-200">這是您命盤的「先天體質」分數，代表您天生對抗環境變動的抗壓性。</div>
                                <ul className="list-disc list-inside space-y-2 text-slate-400 bg-black/20 p-3 rounded-xl">
                                    <li><span className="text-amber-200 font-bold">分數較高</span>：<br/>先天抗壓性強，運勢波動對您的影響較小。但也需注意不要因過於自信大意而失荊州。</li>
                                    <li><span className="text-amber-200 font-bold">分數較低</span>：<br/>先天敏感度高，容易察覺環境變化。雖然易受波動影響，但若能善用流日運勢趨吉避凶，也能創造非凡成就。</li>
                                </ul>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 md:grid-cols-12 gap-6"
                    >
                         <div className="md:col-span-7 grid grid-cols-5 gap-2 sm:gap-4 h-64 sm:h-72 items-end pb-2 relative">
                             {SCORES.map((scoreItem, index) => {
                                 const scoreValue = currentData.scores[scoreItem.key as keyof typeof currentData.scores] as number;
                                 const level = getFortuneLevel(scoreValue);
                                 const heightPercent = Math.max(15, Math.min(100, scoreValue));
 
                                 return (
                                     <div key={scoreItem.key} className="flex flex-col items-center justify-end h-full group relative">
                                         <div className="mb-2 text-center relative z-10">
                                             <div className="text-[10px] sm:text-xs text-slate-400 mb-0.5">{scoreItem.label}</div>
                                             <div className={`text-xl sm:text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-b ${scoreItem.color} leading-none filter drop-shadow-sm`}>
                                                 <CountUp end={scoreValue} duration={1} />
                                             </div>
                                         </div>
 
                                         <div className="relative w-full max-w-[40px] sm:max-w-[48px] h-[70%] sm:h-[75%] bg-[#111827] rounded-2xl border-2 border-blue-900/50 overflow-hidden shadow-inner">
                                             <div className="absolute inset-0 flex flex-col justify-between p-1 pointer-events-none z-20 opacity-30">
                                                 {[...Array(9)].map((_, i) => <div key={i} className="w-full h-px bg-blue-500/30"></div>)}
                                             </div>
                                             <motion.div
                                                 className="absolute bottom-0 left-0 right-0 bg-gradient-to-t transition-all duration-1000 ease-out relative overflow-hidden"
                                                 style={{ height: `${heightPercent}%` }}
                                                 initial={{ height: 0 }}
                                                 animate={{ height: `${heightPercent}%` }}
                                             >
                                                 <div className={`absolute inset-0 bg-gradient-to-t ${scoreItem.color} opacity-80`}></div>
                                                 <div className="absolute inset-0 animate-pulse-slow mix-blend-overlay opacity-50 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI0MCIgY3k9IjQwIiByPSIxLjUiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjQiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMjAiIHI9IjEiIGZpbGw9IndoaXRlIiBvcGFjaXR5PSIwLjMiLz48Y2lyY2xlIGN4PSIxNjAiIGN5PSI2MCIgcj0iMS4yIiBmaWxsPSJ3aGl0ZSIgb3BhY2lXR5PSIwLjUiLz48L3N2Zz4=')] bg-repeat"></div>
                                                 <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${scoreItem.color} filter brightness-150 shadow-[0_-2px_4px_rgba(255,255,255,0.3)]`}></div>
                                             </motion.div>
                                         </div>
 
                                         <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 hidden sm:block">
                                             <div className={`px-3 py-1.5 rounded-lg bg-gradient-to-r ${scoreItem.color} text-white text-xs font-bold shadow-lg whitespace-nowrap`}>
                                                 {level.label}
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>

                        <div className="md:col-span-5 flex flex-col gap-4">
                             <GuidanceCard 
                                 icon={Moon} 
                                 title={`${mode === 'daily' ? '今日' : '本週'}指引`} 
                                 content={currentData.guidance.summary} 
                                 type="general"
                             />
                             <GuidanceCard 
                                 icon={Sparkles} 
                                 title="幸運提醒" 
                                 content={currentData.guidance.luckyTips} 
                                 type="lucky"
                             />
 
                             <button 
                                 onClick={() => navigate(mode === 'daily' ? `/daily/${client.id}` : `/weekly/${client.id}`)} 
                                 className="mt-auto w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group transition-all duration-200 active:scale-[0.98]"
                             >
                                 <span>查看完整{mode === 'daily' ? '今日' : '本週'}運勢報告</span>
                                 <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                             </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

const CountUp = ({ end, duration }: { end: number, duration: number }) => {
    const [count, setCount] = useState(0);
    React.useEffect(() => {
        let start = 0;
        const increment = end / (duration * 60);
        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                clearInterval(timer);
                setCount(end);
            } else {
                setCount(Math.floor(start));
            }
        }, 1000 / 60);
        return () => clearInterval(timer);
    }, [end, duration]);
    return <>{count}</>;
};

const GuidanceCard = ({ icon: Icon, title, content, type }: { icon: any, title: string, content: string, type: 'general' | 'lucky' }) => (
    <div className={`rounded-2xl p-4 border ${type === 'general' ? 'bg-blue-900/20 border-blue-800/50' : 'bg-amber-900/20 border-amber-800/50'} relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${type === 'general' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
        <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full shrink-0 ${type === 'general' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                <Icon size={18} />
            </div>
            <div>
                <h4 className={`font-bold mb-1 text-sm ${type === 'general' ? 'text-blue-300' : 'text-amber-300'}`}>{title}</h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed opacity-90">{content}</p>
            </div>
        </div>
    </div>
);