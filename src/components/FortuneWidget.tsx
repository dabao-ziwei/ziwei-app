import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Thermometer, Activity, Bug, AlertTriangle, X, Terminal, MessageCircle, ScanLine, Lock, Sparkles, Share2, HelpCircle, Download, Smartphone, Loader2, RefreshCw, Layout, Palette, Quote } from 'lucide-react';
import { calculateDailyFortune } from '../logic/fortune';
import type { UserProfile, Client } from '../db';
import { FortuneThermometer } from './FortuneThermometer';
import { FocusTrendChart } from './FocusTrendChart'; 
import { ZiWeiEngine } from '../logic/engine';
import { toBlob } from 'html-to-image';

const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';
const LINE_ID = '@653jrxjt'; 
const ADD_FRIEND_URL = 'https://line.me/R/ti/p/@653jrxjt?oat_content=url&ts=03241123';

// ----------------------------------------------------------------------
// CSS 樣式
// ----------------------------------------------------------------------
const CustomScrollbarStyles = () => (
    <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(71, 85, 105, 0.5);
            border-radius: 20px;
            border: 2px solid transparent;
            background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(148, 163, 184, 0.8); }
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(71, 85, 105, 0.5) transparent; }
        
        /* 緩慢流動的內部光影 (Jelly Flow) */
        @keyframes jelly-flow {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
        }
        .jelly-texture {
            background-size: 200% 200%;
            animation: jelly-flow 8s ease infinite;
        }
        
        /* 側面高光動畫 (Glossy Shine) */
        @keyframes shine-slide {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateX(200%) translateY(200%) rotate(45deg); opacity: 0; }
        }
        .shine-overlay::after {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 55%, transparent);
            transform: rotate(30deg);
            animation: shine-slide 6s infinite;
            pointer-events: none;
        }

        @keyframes glitch-anim-1 {
          0% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 1px); }
          20% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); }
          40% { clip-path: inset(40% 0 50% 0); transform: translate(-2px, 2px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }
          80% { clip-path: inset(10% 0 70% 0); transform: translate(-1px, 1px); }
          100% { clip-path: inset(30% 0 50% 0); transform: translate(1px, -1px); }
        }
        .glitch-text::before, .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: #0f172a;
        }
        .glitch-text::before {
          left: 2px; text-shadow: -1px 0 #ff00c1; clip-path: inset(0); animation: glitch-anim-1 2s infinite linear alternate-reverse;
        }
        .glitch-text::after {
          left: -2px; text-shadow: -1px 0 #00fff9; clip-path: inset(0); animation: glitch-anim-1 3s infinite linear alternate-reverse;
        }
    `}</style>
);

// ... (BaseScoreTooltip 保持不變) ...
const BaseScoreTooltip = () => (
  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50 animate-in fade-in zoom-in duration-200 border border-slate-700">
    <div className="font-bold text-amber-400 mb-1 flex items-center gap-1"><Sparkles size={12}/> 關於基礎運勢</div>
    <p className="leading-relaxed opacity-90 text-slate-200">
      這是命盤的「先天體質」分數。
      <br/>
      <span className="text-amber-200">• 高分者：</span> 抗壓強，但也易因大意而失荊州。
      <br/>
      <span className="text-amber-200">• 低分者：</span> 敏感度高，善用流日運勢也能創造佳績。
    </p>
    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-t border-l border-slate-700 rotate-45"></div>
  </div>
);

// ----------------------------------------------------------------------
// [核心] Share Card Factory
// ----------------------------------------------------------------------
type LayoutType = 'dashboard' | 'radar' | 'core' | 'oracle';
type ThemeType = 'normal' | 'overload' | 'glitch';

interface ShareCardProps {
    data: any; 
    baseScore: number;
    layout: LayoutType;
    theme: ThemeType;
}

const ShareCardRenderer: React.FC<ShareCardProps> = ({ data, baseScore, layout, theme }) => {
    const dateStr = new Date().toISOString().split('T')[0];

    const themes = {
        normal: {
            bg: 'bg-[#0B1120]',
            textMain: 'text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600',
            textSub: 'text-slate-400',
            accent: 'bg-blue-600',
            border: 'border-slate-800',
            glow: 'shadow-[0_0_30px_rgba(56,189,248,0.3)]'
        },
        overload: { 
            bg: 'bg-gradient-to-b from-amber-950 to-red-950',
            textMain: 'text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-orange-500 to-red-600',
            textSub: 'text-amber-200/70',
            accent: 'bg-amber-600',
            border: 'border-amber-700/50',
            glow: 'shadow-[0_0_50px_rgba(245,158,11,0.6)] animate-pulse'
        },
        glitch: { 
            bg: 'bg-slate-900',
            textMain: 'text-slate-200 glitch-text',
            textSub: 'text-slate-500 font-mono',
            accent: 'bg-slate-700',
            border: 'border-slate-700 dashed',
            glow: ''
        }
    };

    const t = themes[theme];

    // [版面策略] Safe Zone Header
    const Header = () => (
        <div className="flex justify-between items-start z-10 w-full mb-4 relative shrink-0">
            <div>
                <h2 className={`text-lg font-bold ${theme === 'overload' ? 'text-amber-100' : 'text-slate-300'}`}>今日運勢</h2>
                <p className={`text-xs ${t.textSub} mt-1 font-mono`}>{dateStr}</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-full px-3 py-1 border border-slate-700/50 backdrop-blur-sm shadow-sm">
                 <Sparkles size={12} className={theme==='overload'?'text-amber-400':'text-purple-400'}/>
                <div className={`text-xs font-bold ${theme === 'overload' ? 'text-amber-100' : 'text-slate-300'}`}>本命基數 <span className="font-mono text-base text-white">{baseScore}</span></div>
            </div>
        </div>
    );

    // [版面策略] Footer
    const Footer = () => (
        <div className={`absolute bottom-6 left-0 w-full flex items-center justify-center opacity-50 z-0`}>
            <div className={`text-[10px] ${t.textSub} font-mono tracking-[0.2em] uppercase`}>
                ziweiapp.dabao.life
            </div>
        </div>
    );

    // --- Layout A: Dashboard (Pure Transparent Jelly / Safe Zone 4:5) ---
    if (layout === 'dashboard') {
        return (
            <div className={`w-[400px] h-[711px] ${t.bg} relative overflow-hidden text-white font-sans flex flex-col items-center justify-center`}>
                {/* 全域背景光 */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_70%)] z-0"></div>
                
                {/* [關鍵] 4:5 安全區域容器 (Safe Zone Container) */}
                <div className="w-full h-[520px] z-10 flex flex-col px-8 relative">
                    
                    <Header />
                    
                    {/* 能量柱容器 - 帶有 shine-overlay 動畫 */}
                    <div className="flex-1 w-full flex items-end justify-between gap-4 py-2 shine-overlay relative">
                        {['self', 'wealth', 'social', 'travel', 'love'].map((k, i) => {
                            const val = data.scores[k];
                            const labels = ['工作', '理財', '交友', '外出', '感情'];
                            const hPercent = Math.min(Math.max(val, 5), 100); 
                            
                            // [最終確認配色] 暖亮活力工作色 + 鮮果凍色
                            const colors = [
                                { main: '#fb923c', light: '#ffedd5', shadow: '#c2410c' }, // Coral Orange (工作 - 暖亮)
                                { main: '#10b981', light: '#d1fae5', shadow: '#047857' }, // Emerald (理財)
                                { main: '#fbbf24', light: '#fef3c7', shadow: '#b45309' }, // Amber (交友)
                                { main: '#f43f5e', light: '#ffe4e6', shadow: '#be123c' }, // Rose (外出)
                                { main: '#a855f7', light: '#f3e8ff', shadow: '#7e22ce' }, // Purple (感情)
                            ];
                            const c = colors[i];
                            
                            // 永遠使用果凍色，不再被 Theme 覆蓋
                            let mainColor = c.main;
                            let lightColor = c.light;
                            let shadowColor = c.shadow;

                            return (
                                <div key={k} className="flex flex-col items-center h-full w-full relative group">
                                    {/* Label - text-sm (14px), 80% opacity */}
                                    <div className={`text-sm font-bold tracking-wider ${t.textSub} mb-2 opacity-80 uppercase text-center group-hover:text-white transition-colors`}>{labels[i]}</div>
                                    
                                    {/* Score Bubble */}
                                    <div className={`mb-2 px-1.5 py-0.5 rounded-md border border-white/20 shadow-lg backdrop-blur-md bg-slate-900/40 transition-all`}>
                                         <span className={`font-mono font-black text-sm leading-none`} style={{ color: lightColor, textShadow: `0 0 10px ${mainColor}` }}>{val}</span>
                                    </div>

                                    {/* Pillar Container (Glass Tube) */}
                                    <div className="flex-1 w-full relative rounded-full border border-white/10 overflow-hidden bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_15px_rgba(0,0,0,0.3)]">
                                        
                                        {/* 基準線 (Laser Line) - 純白發光 */}
                                        <div 
                                            className="absolute left-0 w-full h-[1.5px] z-40"
                                            style={{ 
                                                bottom: `${baseScore}%`,
                                                background: 'linear-gradient(90deg, transparent, #fff, transparent)',
                                                boxShadow: '0 0 8px #fff, 0 0 4px cyan',
                                                opacity: 0.9
                                            }}
                                        ></div>

                                        {/* [核心修正] The Jelly (Fill) - 徹底移除內部所有額外的 div，只靠 CSS 呈現質感 */}
                                        <div 
                                            className="absolute bottom-0 left-0 w-full rounded-full transition-all duration-1000 ease-out z-20 jelly-texture overflow-hidden"
                                            style={{ 
                                                height: `${hPercent}%`,
                                                // 使用帶透明度的漸層，模擬透光感
                                                background: `linear-gradient(to top, ${shadowColor}DD, ${mainColor}AA, ${lightColor}DD)`,
                                                // 內發光製造立體感 (左右暗邊 + 中心亮)。不再嘗試用 inset shadow 做頂部高光，避免出現橫線風險。
                                                boxShadow: `
                                                    0 0 20px ${mainColor}66, 
                                                    inset 3px 0 5px rgba(255,255,255,0.3),
                                                    inset -3px 0 5px rgba(0,0,0,0.2)
                                                `,
                                                mixBlendMode: 'screen' // 讓顏色更鮮豔透亮
                                            }}
                                        >
                                            {/* [已刪除] 這裡原本有一個造成橫線的 div，現在已經被徹底移除了 */}
                                        </div>
                                    </div>
                                    
                                    {/* 底部柔和光暈 */}
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[120%] h-3 blur-lg z-0 opacity-40" style={{ background: mainColor }}></div>
                                </div>
                            )
                        })}
                    </div>

                    {/* 指引文字區塊 */}
                    <div className={`mt-5 w-full p-5 rounded-2xl backdrop-blur-xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent shadow-2xl relative z-10 shrink-0`}>
                        <div className="flex items-center gap-2 mb-2 opacity-90 border-b border-white/10 pb-2">
                            <Quote size={12} className={theme==='overload'?'text-amber-300':'text-cyan-300'}/>
                            <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${t.textSub} text-white/80`}>Daily Guidance</span>
                        </div>
                        <p className={`text-sm text-center leading-relaxed font-medium ${theme==='overload'?'text-amber-50':'text-white/95'} px-1 line-clamp-3 drop-shadow-md`}>
                            "{data.advice.self}"
                        </p>
                    </div>

                </div>
                
                <Footer />
            </div>
        );
    }
    
    return null; 
}

// ... (SharePreviewModal, ConsultationModal, AdvicePanel, DebugLogBlock, SparklesIcon, ArrowRightIcon components remain unchanged) ...
// (確保以下輔助元件代碼完整)
interface SharePreviewModalProps { isOpen: boolean; onClose: () => void; imageUrl: string | null; onDownload: () => void; onSystemShare: () => void; }
const SharePreviewModal: React.FC<SharePreviewModalProps> = ({ isOpen, onClose, imageUrl, onDownload, onSystemShare }) => {
    if (!isOpen || !imageUrl) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700"><h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={18} className="text-purple-400"/> 分享運勢卡片</h3><button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button></div>
                <div className="p-6 flex justify-center bg-[#020617]"><div className="relative shadow-[0_0_30px_rgba(139,92,246,0.3)] rounded-lg overflow-hidden"><img src={imageUrl} alt="Daily Fortune Card" className="max-h-[50vh] object-contain rounded-lg" /></div></div>
                <div className="p-4 bg-slate-900 border-t border-slate-700 flex flex-col gap-3"><button onClick={onDownload} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"><Download size={18} /> 下載圖片 (推薦)</button>{navigator.share && (<button onClick={onSystemShare} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-700"><Smartphone size={18} /> 呼叫系統分享 (手機用)</button>)}<p className="text-center text-[10px] text-slate-500 mt-1">下載後可發佈至 Instagram 限時動態或 Threads</p></div>
            </div>
        </div>
    );
};
interface ConsultationModalProps { isOpen: boolean; onClose: () => void; reason: string; }
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
                    <h3 className="font-bold flex items-center gap-2"><ScanLine size={20} /> 掃描預約諮詢</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8 flex flex-col items-center text-center space-y-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-white p-2 rounded-xl border border-gray-100 shadow-lg"><img src={qrCodeUrl} alt="LINE QR Code" className="w-48 h-48 object-contain"/></div>
                    </div>
                    <div className="space-y-2"><p className="font-bold text-gray-800 text-lg">拿出手機掃描 QR Code</p><p className="text-gray-500 text-sm">系統將自動開啟 LINE<br/>並為您帶入諮詢預約文字</p></div>
                    <a href={ADD_FRIEND_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:text-amber-700 underline">或是點此直接加入好友</a>
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
        { key: 'self', label: '工作', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
        { key: 'wealth', label: '理財', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
        { key: 'love', label: '感情', color: 'text-pink-500', bg: 'bg-pink-500/10 border-pink-500/20' },
        { key: 'social', label: '交友', color: 'text-lime-500', bg: 'bg-lime-500/10 border-lime-500/20' },
        { key: 'travel', label: '外出', color: 'text-cyan-500', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    ];
    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden relative">
            <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 shrink-0"><h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><SparklesIcon /> 今日指引{!isVip && <span className="ml-auto text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">試閱模式</span>}</h3></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[500px] lg:max-h-[400px] custom-scrollbar">
                {fortune.consultationHook && fortune.consultationHook.show && (
                    <div className="p-4 bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl animate-in slide-in-from-top-2 shadow-lg shadow-amber-900/10 shrink-0">
                        <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 bg-amber-500/20 rounded-full shrink-0 animate-pulse"><MessageCircle size={18} className="text-amber-400" /></div>
                            <div><p className="text-xs font-bold text-amber-400 mb-1 tracking-wide">{fortune.consultationHook.reason}</p><p className="text-xs text-amber-100/80 leading-relaxed">{fortune.consultationHook.text}</p></div>
                        </div>
                        <button onClick={onConsultClick} className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02]">{fortune.consultationHook.linkText} <ArrowRightIcon /></button>
                    </div>
                )}
                {categories.map((cat) => (
                    <div key={cat.key} className={`rounded-xl border p-3 ${cat.bg} shrink-0`}>
                        <div className="flex items-center gap-2 mb-2"><span className={`text-xs font-black ${cat.color} uppercase tracking-widest`}>{cat.label}</span><div className={`h-[1px] flex-1 ${cat.color} opacity-20`}></div></div>
                        <div className="relative"><p className={`text-sm text-slate-300 leading-relaxed font-medium ${!isVip ? 'blur-[4px] select-none opacity-60' : ''}`}>{fortune.advice[cat.key]}</p>{!isVip && (<div className="absolute inset-0 flex items-center justify-center"><div className="bg-slate-900/80 backdrop-blur-[1px] px-3 py-1.5 rounded-full border border-slate-600 flex items-center gap-2 shadow-xl"><Lock size={12} className="text-amber-400" /><span className="text-[10px] text-slate-300 font-bold">會員限定</span></div></div>)}</div>
                    </div>
                ))}
                <div className="h-2"></div>
            </div>
        </div>
    );
};
const SparklesIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" /><path d="M17 4a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 2 -2" /><path d="M19 11h2m-1 -1v2" /></svg>);
const ArrowRightIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12l14 0" /><path d="M13 18l6 -6" /><path d="M13 6l6 6" /></svg>);
const DebugLogBlock = ({ title, score, logs }: { title: string, score: number, logs: string[] }) => (<div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 flex flex-col gap-2 h-full"><div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1"><span className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider">{title}</span><span className={`font-mono font-bold text-sm ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>{score}</span></div><div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[120px]">{logs && logs.length > 0 ? (<ul className="space-y-1">{logs.map((log, i) => (<li key={i} className="text-[10px] text-slate-300 font-mono leading-relaxed border-l-2 border-slate-700 pl-2 hover:border-cyan-500 transition-colors">{log}</li>))}</ul>) : (<div className="text-[10px] text-slate-600 italic">無特殊星曜影響</div>)}</div></div>);

// ----------------------------------------------------------------------
// 主組件 FortuneWidget
// ----------------------------------------------------------------------
export const FortuneWidget: React.FC<Props> = ({ userProfile, client, clientName }) => {
  const [activeTab, setActiveTab] = useState<'thermometer' | 'trend'>('thermometer');
  const [showDebug, setShowDebug] = useState(false); 
  const [demoMode, setDemoMode] = useState<'real' | 'hot' | 'cold'>('real'); 
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [showBaseScoreTip, setShowBaseScoreTip] = useState(false);
  
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  
  const [forceLayout, setForceLayout] = useState<LayoutType | 'auto'>('auto');
  const [forceTheme, setForceTheme] = useState<ThemeType | 'auto'>('auto');

  const shareCardRef = useRef<HTMLDivElement>(null);

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

  const shareConfig = useMemo(() => {
      if (!todayFortune || !userProfile) return { layout: 'dashboard' as LayoutType, theme: 'normal' as ThemeType };
      const dateStr = new Date().toISOString().split('T')[0];
      const dailyConfig = (userProfile && todayFortune) ? (() => {
           let hash = 0;
           const str = userProfile.id + dateStr;
           for (let i = 0; i < str.length; i++) {
               hash = str.charCodeAt(i) + ((hash << 5) - hash);
           }
           
           let theme: ThemeType = 'normal';
           if (todayFortune.score >= 85) theme = 'overload';
           if (todayFortune.score < 50) theme = 'glitch';

           const layout: LayoutType = 'dashboard';
           return { theme, layout };
      })() : { layout: 'dashboard' as LayoutType, theme: 'normal' as ThemeType };
      
      return {
          layout: forceLayout !== 'auto' ? forceLayout : dailyConfig.layout,
          theme: forceTheme !== 'auto' ? forceTheme : dailyConfig.theme
      };
  }, [todayFortune, userProfile, forceLayout, forceTheme]);

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

  const handleShareClick = async () => {
    if (!shareCardRef.current || !todayFortune) return;
    setIsGeneratingShare(true);
    setTimeout(async () => {
        try {
            const blob = await toBlob(shareCardRef.current!, { cacheBust: true, pixelRatio: 3 });
            if (!blob) throw new Error('Image generation failed');
            const url = URL.createObjectURL(blob);
            setShareBlob(blob);
            setShareImageUrl(url);
        } catch (err) {
            console.error('Share generation failed:', err);
            alert('圖片生成失敗，請稍後再試。');
        } finally {
            setIsGeneratingShare(false);
        }
    }, 100);
  };

  const handleDownloadImage = () => {
      if (!shareImageUrl) return;
      const link = document.createElement('a');
      link.download = `fortune-${new Date().toISOString().split('T')[0]}.png`;
      link.href = shareImageUrl;
      link.click();
  };

  const handleSystemShare = async () => {
      if (!shareBlob || !navigator.share) return;
      const file = new File([shareBlob], 'daily-fortune.png', { type: 'image/png' });
      const shareText = `🔮 ${clientName || '我'}的今日運勢\n🌡️ 能量指數：${todayFortune?.score}\n🏯 本命基數：${todayFortune?.devInfo.baseScore}\n\n👉 立即查看完整解析：https://www.dabao.life`;
      try {
          await navigator.share({ title: 'AI紫微斗數 - 今日運勢', text: shareText, files: [file] });
      } catch (err) { console.log('Share canceled or failed', err); }
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
    <div className="w-full flex flex-col gap-4 relative">
        <CustomScrollbarStyles />

        {/* 隱藏的分享卡片容器 (動態渲染) */}
        <div className="fixed left-[-9999px] top-0 pointer-events-none">
            <div ref={shareCardRef}>
                <ShareCardRenderer 
                    data={todayFortune} 
                    baseScore={baseScore} 
                    layout={shareConfig.layout} 
                    theme={shareConfig.theme} 
                />
            </div>
        </div>

        {/* 主要儀表板容器 */}
        <div className="w-full bg-[#0B1120] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative group min-h-[500px] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80 shadow-[0_0_15px_#22d3ee] z-20" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0B1120] to-[#020617] opacity-90 z-0" />

            <div className="relative w-full p-4 sm:p-6 z-30 flex flex-wrap gap-4 justify-between items-start shrink-0">
                <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-lg pointer-events-auto">
                    <button onClick={() => setActiveTab('thermometer')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'thermometer' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Thermometer size={14} /> 今日運勢
                    </button>
                    <button onClick={() => setActiveTab('trend')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'trend' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                        <Activity size={14} /> 一週運勢
                    </button>
                </div>
                <div className="relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50 cursor-help hover:bg-slate-800 transition-colors pointer-events-auto" onClick={() => setShowBaseScoreTip(!showBaseScoreTip)} onMouseEnter={() => setShowBaseScoreTip(true)} onMouseLeave={() => setShowBaseScoreTip(false)}>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">本命基數</span>
                        <span className="text-sm font-black text-amber-400 font-mono">{baseScore}</span>
                        <HelpCircle size={12} className="text-slate-500" />
                    </div>
                    {showBaseScoreTip && <BaseScoreTooltip />}
                </div>
                <div className="flex gap-2 ml-auto">
                    <button onClick={handleShareClick} disabled={isGeneratingShare} className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg shadow-purple-900/50 hover:shadow-purple-600/30 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed pointer-events-auto">
                        {isGeneratingShare ? <Loader2 size={14} className="animate-spin"/> : <Share2 size={14} />}
                        <span className="hidden sm:inline">分享</span>
                    </button>
                    {isSuperAdmin && (
                        <>
                            <div className="flex bg-slate-800 rounded p-1 gap-1 border border-slate-700">
                                <button onClick={() => setDemoMode('real')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'real' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Real</button>
                                <button onClick={() => setDemoMode('hot')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'hot' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Hot</button>
                                <button onClick={() => setDemoMode('cold')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'cold' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>Cold</button>
                            </div>
                            <button onClick={() => setShowDebug(!showDebug)} className={`p-1.5 rounded border transition-colors ${showDebug ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                                <Bug size={14}/>
                            </button>
                        </>
                    )}
                </div>
            </div>

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
                            <AdvicePanel fortune={todayFortune} userProfile={userProfile} onConsultClick={handleConsultTrigger} />
                         </div>
                    </div>
                )}
            </div>

            {showDebug && isSuperAdmin && (
                <div className="absolute inset-x-0 bottom-0 z-50 bg-[#020617]/95 border-t border-green-500/30 backdrop-blur-md h-[350px] flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-green-400"><Terminal size={14} /><span className="text-xs font-mono font-bold">DEV_CONSOLE</span></div>
                            <div className="flex items-center gap-2 border-l border-slate-700 pl-4">
                                <div className="flex items-center gap-1">
                                    <Layout size={12} className="text-purple-400"/>
                                    <select className="bg-slate-800 text-xs text-white border border-slate-600 rounded px-1 outline-none focus:border-purple-400" value={forceLayout} onChange={e => setForceLayout(e.target.value as any)}>
                                        <option value="auto">Auto Layout</option>
                                        <option value="dashboard">Dashboard</option>
                                        <option value="radar">Radar</option>
                                        <option value="core">Core</option>
                                        <option value="oracle">Oracle</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Palette size={12} className="text-pink-400"/>
                                    <select className="bg-slate-800 text-xs text-white border border-slate-600 rounded px-1 outline-none focus:border-pink-400" value={forceTheme} onChange={e => setForceTheme(e.target.value as any)}>
                                        <option value="auto">Auto Theme</option>
                                        <option value="normal">Normal</option>
                                        <option value="overload">Overload (Hot)</option>
                                        <option value="glitch">Glitch (Cold)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                     <span className="text-[10px] text-slate-500">Seed: {shareConfig.layout}/{shareConfig.theme}</span>
                                     <button onClick={() => { setForceLayout('auto'); setForceTheme('auto'); }} className="p-1 hover:bg-slate-700 rounded" title="Reset"><RefreshCw size={10} className="text-slate-400"/></button>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setShowDebug(!showDebug)} className="text-slate-400 hover:text-white"><X size={14} /></button>
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
            
            <ConsultationModal isOpen={isConsultModalOpen} onClose={() => setIsConsultModalOpen(false)} reason={todayFortune.consultationHook?.reason || ''} />
            <SharePreviewModal isOpen={!!shareImageUrl} onClose={() => { setShareImageUrl(null); setShareBlob(null); }} imageUrl={shareImageUrl} onDownload={handleDownloadImage} onSystemShare={handleSystemShare} />
        </div>
    </div>
  );
};