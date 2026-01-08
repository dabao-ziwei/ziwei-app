import React, { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { toBlob } from 'html-to-image';
import { type Client, type UserProfile } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune } from '../logic/fortune';
import { 
    Loader2, HelpCircle, Moon, Sun, Sparkles, Activity, Share2, Download, Smartphone, X, 
    MessageCircle, Lock, ChevronRight, Bug, Terminal, Users, Star, Quote
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
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
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

// ----------------------------------------------------------------------
// 設定與輔助元件
// ----------------------------------------------------------------------

const CATEGORY_CONFIG = [
    { key: 'self', label: '工作', color: 'text-amber-400', icon: Sun, barColor: { main: '#FF9E9E', shadow: '#E55B5B', light: '#FFE4E1' } },
    { key: 'wealth', label: '理財', color: 'text-emerald-400', icon: Activity, barColor: { main: '#6EE7B7', shadow: '#059669', light: '#D1FAE5' } },
    { key: 'social', label: '交友', color: 'text-blue-400', icon: Users, barColor: { main: '#FCD34D', shadow: '#D97706', light: '#FEF3C7' } },
    { key: 'travel', label: '外出', color: 'text-cyan-400', icon: Sun, barColor: { main: '#22d3ee', shadow: '#0891b2', light: '#cffafe' } },
    { key: 'love', label: '感情', color: 'text-pink-400', icon: Moon, barColor: { main: '#F472B6', shadow: '#DB2777', light: '#FBCFE8' } },
] as const;

// 單一卡片元件
const AdviceCard = ({ 
    catKey, 
    score, 
    advice, 
    isVip, 
    forwardRef 
}: { 
    catKey: string, 
    score: number, 
    advice: string, 
    isVip: boolean, 
    forwardRef?: React.Ref<HTMLDivElement> 
}) => {
    const config = CATEGORY_CONFIG.find(c => c.key === catKey)!;
    const Icon = config.icon;

    return (
        <div ref={forwardRef} className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/60 p-5 shadow-xl hover:bg-slate-800/90 hover:border-slate-600 hover:scale-[1.02] transition-all duration-300 flex flex-col justify-start relative z-20 w-full max-w-sm group">
            <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors">
                        <Icon size={18} className={config.color} />
                    </div>
                    <span className={`text-base font-bold ${config.color} tracking-widest`}>{config.label}</span>
                </div>
                <span className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-md bg-black/40 border border-white/10 ${config.color} shadow-inner`}>
                    {score}
                </span>
            </div>
            <div className="relative min-h-[48px]">
                <p className={`text-sm text-slate-300 leading-relaxed font-light tracking-wide ${!isVip ? 'blur-[4px] select-none opacity-60' : ''}`}>
                    {advice}
                </p>
                {!isVip && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 backdrop-blur-[2px] px-3 py-1 rounded-full border border-slate-600/50 flex items-center gap-1.5 shadow-xl">
                            <Lock size={12} className="text-amber-400" />
                            <span className="text-[10px] text-slate-300 font-bold">會員限定</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 果凍圖表
const JellyBarChart = ({ data, baseScore, isShareMode, containerRef }: { data: any, baseScore: number, isShareMode?: boolean, containerRef?: React.Ref<HTMLDivElement> }) => {
    const safeBase = isNaN(baseScore) ? 60 : baseScore;

    return (
        <div ref={containerRef} className={`w-full flex items-end justify-between relative shrink-0 py-2 ${isShareMode ? 'h-[280px] px-4' : 'h-[240px] px-2 pr-10'}`}>
            
            {CATEGORY_CONFIG.map((config, i) => {
                const val = data.scores[config.key];
                const isPositive = val >= safeBase;
                const diff = Math.abs(val - safeBase);
                const hPercent = Math.min(6 + diff * 1.5, 48);
                const c = config.barColor;

                return (
                    <div key={config.key} className={`flex flex-col items-center h-full w-full relative group gap-1`}>
                        
                        {/* 上方資訊區 */}
                        <div className="flex flex-col items-center justify-end z-20 shrink-0 mb-1">
                            <span className={`font-bold mb-1 tracking-wider opacity-90 ${isShareMode ? 'text-xs text-amber-100/80 font-serif' : 'text-xs text-slate-300'}`}>
                                {config.label}
                            </span>
                            <div className={`px-1.5 py-0.5 rounded-md border border-white/10 shadow-sm backdrop-blur-md ${isPositive ? 'bg-slate-800/80 text-white' : 'bg-slate-900/80 text-slate-400'}`}>
                                <span className="font-mono font-bold text-xs">{val}</span>
                            </div>
                        </div>

                        {/* 下方軌道區 */}
                        <div className={`flex-1 w-full relative rounded-full overflow-visible`}>
                            {i === 4 && (
                                <div className="absolute left-full top-[50%] -translate-y-1/2 ml-1 flex flex-col items-start leading-none z-50 opacity-60">
                                    <span className="text-[8px] text-slate-500 font-mono mb-0.5 tracking-wider">BASE</span>
                                    <span className="text-sm font-bold text-slate-300 font-mono border-b border-slate-600 pb-0.5">{safeBase}</span>
                                </div>
                            )}

                            <div className="absolute inset-0 rounded-full overflow-hidden z-0">
                                <div 
                                    className="absolute left-0 w-full h-[1px] z-50 pointer-events-none"
                                    style={{ 
                                        top: '50%',
                                        background: 'rgba(255, 255, 255, 0.2)', 
                                        boxShadow: '0 0 4px rgba(255,255,255,0.1)'
                                    }}
                                />

                                {isShareMode ? (
                                    <div 
                                        className="absolute left-0 w-full z-10"
                                        style={{
                                            height: `${hPercent}%`,
                                            bottom: isPositive ? '50%' : 'auto',
                                            top: isPositive ? 'auto' : '50%',
                                            borderRadius: isPositive ? '12px 12px 0 0' : '0 0 12px 12px',
                                            background: `linear-gradient(${isPositive ? 'to top' : 'to bottom'}, ${c.shadow} 0%, ${c.main} 60%, ${c.light} 100%)`,
                                            boxShadow: `0 0 25px ${c.main}, inset 0 0 15px rgba(255,255,255,0.4)`
                                        }}
                                    >
                                        <div className={`absolute left-1/4 right-1/4 h-[2px] bg-white/60 rounded-full blur-[1px] ${isPositive ? 'top-1' : 'bottom-1'}`} />
                                    </div>
                                ) : (
                                    <motion.div 
                                        className="absolute left-1 w-[calc(100%-8px)] jelly-active z-10"
                                        initial={{ height: 0 }}
                                        animate={{ height: `${hPercent}%` }}
                                        transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                                        style={{
                                            left: '4px',
                                            bottom: isPositive ? '50%' : 'auto',
                                            top: isPositive ? 'auto' : '50%',
                                            borderRadius: isPositive ? '8px 8px 0 0' : '0 0 8px 8px',
                                            background: `linear-gradient(${isPositive ? 'to top' : 'to bottom'}, ${c.shadow} 0%, ${c.main} 60%, ${c.light} 100%)`,
                                            boxShadow: `0 0 20px ${c.main}40, inset 0 0 10px rgba(255,255,255,0.3)`
                                        }}
                                    >
                                        <div className={`absolute left-1/4 right-1/4 h-[1px] bg-white/40 rounded-full blur-[0.5px] ${isPositive ? 'top-1' : 'bottom-1'}`} />
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// 分享 Modal
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

// Mobile List
const MobileAdviceList = ({ fortune, userProfile, onConsultClick }: any) => {
     const isVip = useMemo(() => {
        if (!userProfile) return false;
        if (['admin', 'student'].includes(userProfile.role)) return true;
        if (userProfile.accessExpiry && new Date(userProfile.accessExpiry) > new Date()) return true;
        return false;
    }, [userProfile]);

    return (
        <div className="flex flex-col gap-3 pb-24">
            {fortune.consultationHook && fortune.consultationHook.show && (
                <div className="p-4 bg-gradient-to-r from-amber-900/60 to-orange-900/60 border border-amber-500/30 rounded-xl shadow-lg relative overflow-hidden group mb-2">
                    <div className="absolute inset-0 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex items-start gap-3 mb-3 relative z-10">
                        <div className="p-2 bg-amber-500/20 rounded-full shrink-0"><MessageCircle size={20} className="text-amber-400" /></div>
                        <div>
                            <p className="text-sm font-bold text-amber-400 mb-1 tracking-wide">{fortune.consultationHook.reason}</p>
                            <p className="text-xs text-amber-100/80 leading-relaxed">{fortune.consultationHook.text}</p>
                        </div>
                    </div>
                    <button onClick={onConsultClick} className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 relative z-10 group-hover:shadow-lg hover:brightness-110">
                        {fortune.consultationHook.linkText} <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {CATEGORY_CONFIG.map(config => (
                <AdviceCard 
                    key={config.key}
                    catKey={config.key} 
                    score={fortune.scores[config.key]} 
                    advice={fortune.advice[config.key]} 
                    isVip={isVip} 
                />
            ))}
            
            <div className="text-center text-[10px] text-slate-600 font-mono mt-4 mb-8">
                Daily Guidance by ZiWei Engine
            </div>
        </div>
    );
};

// ----------------------------------------------------------------------
// [電腦版] 心智圖佈局 (Hub & Spoke Layout) - [拉開垂直間距]
// ----------------------------------------------------------------------
const MindMapLayout = ({ 
    fortune, 
    userProfile, 
    currentData, 
    baseScore, 
}: any) => {
    
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [lines, setLines] = useState<{ d: string, color: string }[]>([]);

    const isVip = useMemo(() => {
        if (!userProfile) return false;
        if (['admin', 'student'].includes(userProfile.role)) return true;
        if (userProfile.accessExpiry && new Date(userProfile.accessExpiry) > new Date()) return true;
        return false;
    }, [userProfile]);

    const calculateLines = () => {
        if (!containerRef.current || !chartRef.current) return;
        
        const containerRect = containerRef.current.getBoundingClientRect();
        const chartRect = chartRef.current.getBoundingClientRect();
        const newLines: { d: string, color: string }[] = [];

        CATEGORY_CONFIG.forEach((config, index) => {
            const cardEl = cardRefs.current[config.key];
            if (!cardEl) return;

            const cardRect = cardEl.getBoundingClientRect();
            
            // Bar 的寬度比例位置 (5根柱子)
            const barWidth = chartRect.width / 5;
            const barCenterX = barWidth * (index + 0.5);

            let startX, startY, endX, endY;

            // 1. 工作 (Self) - Index 0
            if (index === 0) {
                startX = chartRect.left - containerRect.left;
                startY = (chartRect.top - containerRect.top) + (chartRect.height / 2);
                endX = cardRect.right - containerRect.left;
                endY = (cardRect.top - containerRect.top) + (cardRect.height / 2);
            }
            // 2. 理財 (Wealth) - Index 1
            else if (index === 1) {
                startX = (chartRect.left - containerRect.left) + barCenterX;
                startY = chartRect.bottom - containerRect.top - 2;
                endX = cardRect.right - containerRect.left;
                endY = (cardRect.top - containerRect.top) + (cardRect.height / 2);
            }
            // 3. 交友 (Social) - Index 2
            else if (index === 2) {
                startX = (chartRect.left - containerRect.left) + barCenterX;
                startY = chartRect.bottom - containerRect.top - 2;
                endX = (cardRect.left - containerRect.left) + (cardRect.width / 2);
                endY = cardRect.top - containerRect.top;
            }
            // 4. 外出 (Travel) - Index 3
            else if (index === 3) {
                startX = (chartRect.left - containerRect.left) + barCenterX;
                startY = chartRect.bottom - containerRect.top - 2;
                endX = cardRect.left - containerRect.left;
                endY = (cardRect.top - containerRect.top) + (cardRect.height / 2);
            }
            // 5. 感情 (Love) - Index 4
            else {
                startX = chartRect.right - containerRect.left;
                startY = (chartRect.top - containerRect.top) + (chartRect.height / 2);
                endX = cardRect.left - containerRect.left;
                endY = (cardRect.top - containerRect.top) + (cardRect.height / 2);
            }

            const d = `M ${startX} ${startY} L ${endX} ${endY}`;
            newLines.push({ d, color: config.barColor.main });
        });

        setLines(newLines);
    };

    useLayoutEffect(() => {
        calculateLines();
        window.addEventListener('resize', calculateLines);
        const timer = setTimeout(calculateLines, 500);
        return () => {
            window.removeEventListener('resize', calculateLines);
            clearTimeout(timer);
        };
    }, [currentData]);

    return (
        // 增加 min-h 到 600px 確保容器夠高，讓 flex-col 有空間拉開距離
        <div ref={containerRef} className="relative w-full max-w-7xl mx-auto flex flex-col items-center justify-center py-4 min-h-[600px]">
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                {lines.map((line, i) => (
                    <g key={i}>
                        <path 
                            d={line.d} 
                            stroke={line.color} 
                            strokeWidth="2" 
                            fill="none" 
                            opacity="0.5" 
                        />
                    </g>
                ))}
            </svg>

            {/* [修正] gap-y-6 -> gap-y-28 拉開垂直距離 */}
            <div className="grid grid-cols-[1fr_500px_1fr] gap-x-12 gap-y-28 w-full relative z-10 items-center">
                
                {/* 1. 左側欄位 - 移除 mt-12 */}
                <div className="flex flex-col gap-28 items-end">
                    <AdviceCard 
                        catKey="self" 
                        score={currentData.scores.self} 
                        advice={fortune.advice.self} 
                        isVip={isVip} 
                        forwardRef={el => cardRefs.current['self'] = el}
                    />
                    <AdviceCard 
                        catKey="wealth" 
                        score={currentData.scores.wealth} 
                        advice={fortune.advice.wealth} 
                        isVip={isVip} 
                        forwardRef={el => cardRefs.current['wealth'] = el}
                    />
                </div>

                {/* 2. 中間欄位 - 增加高度 */}
                <div className="flex flex-col items-center h-full pt-4 min-h-[500px]">
                    <div className="w-full mb-12 scale-110 transform origin-top"> 
                        <JellyBarChart 
                            containerRef={chartRef}
                            data={currentData} 
                            baseScore={baseScore} 
                            isShareMode={false} 
                        />
                    </div>
                    {/* mt-auto 會自動把這個卡片推到底部，配合 min-h-[500px] 達成拉開效果 */}
                    <div className="w-full max-w-sm mt-auto">
                        <AdviceCard 
                            catKey="social" 
                            score={currentData.scores.social} 
                            advice={fortune.advice.social} 
                            isVip={isVip} 
                            forwardRef={el => cardRefs.current['social'] = el}
                        />
                    </div>
                </div>

                {/* 3. 右側欄位 - 移除 mt-12 */}
                <div className="flex flex-col gap-28 items-start">
                    <AdviceCard 
                        catKey="love" 
                        score={currentData.scores.love} 
                        advice={fortune.advice.love} 
                        isVip={isVip} 
                        forwardRef={el => cardRefs.current['love'] = el}
                    />
                     <AdviceCard 
                        catKey="travel" 
                        score={currentData.scores.travel} 
                        advice={fortune.advice.travel} 
                        isVip={isVip} 
                        forwardRef={el => cardRefs.current['travel'] = el}
                    />
                </div>

            </div>
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
            
            {/* --- 電腦版：心智圖佈局 (md:block) --- */}
            <div className="hidden md:block w-full">
                {mode === 'daily' ? (
                     <MindMapLayout 
                        fortune={dailyFortune}
                        userProfile={userProfile}
                        currentData={currentData}
                        baseScore={baseScore}
                     />
                ) : (
                    <div className="w-full h-[400px] max-w-5xl mx-auto bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6 shadow-xl backdrop-blur-md">
                        <div className="flex justify-end mb-4">
                            <button onClick={() => setMode('daily')} className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm font-bold transition-colors">返回今日</button>
                        </div>
                        <FocusTrendChart data={weeklyDetailedData} />
                    </div>
                )}
            </div>

            {/* --- 手機版：原有佈局 (md:hidden) --- */}
            <div 
                ref={shareCardRef} 
                className={`
                    relative font-sans overflow-hidden transition-all duration-500 ease-out md:hidden
                    ${isGeneratingShare 
                        ? 'w-[375px] h-auto p-6 rounded-2xl border border-amber-500/30 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8),inset_0_0_80px_rgba(0,0,0,0.9),0_0_20px_rgba(217,119,6,0.1)] bg-[#09090b] block' 
                        : 'w-full bg-transparent p-0 block' 
                    }
                `}
            >
                {isGeneratingShare && (
                    <>
                        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
                        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
                    </>
                )}

                <div className={`relative z-10 flex flex-col ${isGeneratingShare ? 'h-auto' : 'h-full'}`}>
                    
                    {/* Header (手機版) */}
                    <div className="flex flex-col items-center justify-center mb-2 pt-2">
                        {isGeneratingShare ? (
                            <>
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
                            </>
                        ) : (
                            <div className="w-full flex justify-between items-center px-2 mb-4">
                                <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-lg">
                                    <button onClick={() => setMode('daily')} className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md transition-all font-bold text-xs ${mode === 'daily' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                        <Sun size={14} className={mode === 'daily' ? 'animate-spin-slow' : ''} /> 今日
                                    </button>
                                    <button onClick={() => setMode('weekly')} className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md transition-all font-bold text-xs ${mode === 'weekly' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                                        <Activity size={14} /> 一週
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <button onClick={() => setIsTooltipOpen(!isTooltipOpen)} className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-full border border-slate-700 cursor-help hover:bg-slate-700 transition-colors select-none">
                                            <span className="text-amber-400 font-black text-sm font-mono leading-none">{baseScore}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider hidden sm:inline">BASE</span>
                                        </button>
                                    </div>
                                    <button onClick={handleShareClick} disabled={isGeneratingShare} className="p-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all border border-slate-700">
                                        {isGeneratingShare ? <Loader2 size={16} className="animate-spin"/> : <Share2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={`relative flex-1 w-full flex flex-col z-10`}>
                        
                        {/* 手機版：果凍圖 */}
                        <div className="w-full flex flex-col items-center mb-4">
                             {mode === 'daily' ? (
                                 <JellyBarChart data={currentData} baseScore={baseScore} isShareMode={isGeneratingShare} />
                             ) : (
                                 <div className="w-full h-[220px]">
                                     <FocusTrendChart data={weeklyDetailedData} />
                                 </div>
                             )}
                        </div>

                        {/* 分享圖專用的詳細資訊 */}
                        {isGeneratingShare && (
                            <div className="w-full mt-4 space-y-2">
                                <div className="text-center text-xs text-slate-400 mb-2 font-mono">BASE ENERGY: {baseScore}</div>
                                <div className="text-center text-xs text-amber-100/60 leading-relaxed px-4">{dailyFortune.guidance.luckyTips}</div>
                                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-amber-200/30 font-mono tracking-[0.2em] uppercase">
                                    <Sparkles size={8} className="text-amber-500/40" />
                                    <span>{WEBSITE_URL}</span>
                                    <Sparkles size={8} className="text-amber-500/40" />
                                </div>
                            </div>
                        )}

                        {/* 手機版：建議卡片列表 */}
                        {mode === 'daily' && !isGeneratingShare && (
                             <div className="w-full shrink-0 animate-in slide-in-from-bottom-4 duration-500">
                                  <MobileAdviceList fortune={dailyFortune} userProfile={userProfile} onConsultClick={handleConsultTrigger} />
                             </div>
                        )}

                    </div>
                </div>
            </div>

            <SharePreviewModal isOpen={!!shareImageUrl} onClose={() => { setShareImageUrl(null); setShareBlob(null); }} imageUrl={shareImageUrl} onDownload={handleDownloadImage} onSystemShare={handleSystemShare} />
            
            {showDebug && isSuperAdmin && (
                <div className="mt-10 p-4 bg-black text-green-500 font-mono text-xs w-full overflow-x-auto">Debug Mode Active</div>
            )}
        </div>
    );
};