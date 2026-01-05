import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Heart, Briefcase, Wallet, Activity, Users, Sparkles, Share2, Download, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toBlob } from 'html-to-image';
// [關鍵] 引入剛剛在 db.ts 新增的讀取函式
import { getDivinationResult } from '../db';

// [關鍵] 鎖死常數定義，確保與後台一致
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'CATEGORY' | 'BREATHING' | 'BUBBLE' | 'RESULT';
type Category = '感情' | '工作' | '理財' | '健康' | '交友';
type CeremonyState = 'black' | 'light_in' | 'incense_show' | 'light_out' | 'igniting' | 'smoking' | 'text_typing' | 'ready';
type LuckType = '吉' | '凶' | '吉凶參半' | '無結果';

const CATEGORIES: { id: Category; icon: any; color: string; desc: string }[] = [
    { id: '感情', icon: Heart, color: 'text-pink-400', desc: '愛情、婚姻、曖昧' },
    { id: '工作', icon: Briefcase, color: 'text-blue-400', desc: '事業、轉職、升遷' },
    { id: '理財', icon: Wallet, color: 'text-yellow-400', desc: '投資、財運、偏財' },
    { id: '健康', icon: Activity, color: 'text-green-400', desc: '身心、疾病、養生' },
    { id: '交友', icon: Users, color: 'text-purple-400', desc: '人際、貴人、小人' },
];

const pStraight = "M50,280 C50,220 50,100 50,0"; 
const p1 = "M50,280 C50,220 60,100 50,0";
const p2 = "M50,280 C20,200 45,80 50,0";
const p3 = "M50,280 C80,200 55,80 50,0";
const p4 = "M50,280 C30,220 70,60 50,0";

const getRecursiveSum = (n: number): number => {
    let sum = n;
    while (sum > 12) {
        let tempSum = 0;
        const digits = sum.toString().split('').map(Number);
        digits.forEach(d => tempSum += d);
        sum = tempSum;
    }
    return sum;
};
const getDivinationStem = (n: number): number => (n - 3 + 10) % 10;

const SacredStyles = () => (
    <style>{`
        @keyframes sacred-pulse-red {
            0% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.4), inset 0 0 20px rgba(220, 38, 38, 0.2); }
            50% { box-shadow: 0 0 40px rgba(220, 38, 38, 0.7), inset 0 0 40px rgba(220, 38, 38, 0.4); }
            100% { box-shadow: 0 0 20px rgba(220, 38, 38, 0.4), inset 0 0 20px rgba(220, 38, 38, 0.2); }
        }
        @keyframes sacred-pulse-green {
            0% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), inset 0 0 20px rgba(16, 185, 129, 0.1); }
            50% { box-shadow: 0 0 40px rgba(16, 185, 129, 0.6), inset 0 0 40px rgba(16, 185, 129, 0.3); }
            100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.3), inset 0 0 20px rgba(16, 185, 129, 0.1); }
        }
        @keyframes sacred-pulse-yellow {
            0% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3), inset 0 0 20px rgba(245, 158, 11, 0.1); }
            50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.6), inset 0 0 40px rgba(245, 158, 11, 0.3); }
            100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3), inset 0 0 20px rgba(245, 158, 11, 0.1); }
        }
        
        .sacred-seal {
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            letter-spacing: 0.2em;
            position: relative;
            backdrop-filter: blur(10px);
        }
        
        .seal-lucky { 
            border: 4px solid #ef4444; color: #ef4444; background: rgba(239, 68, 68, 0.1);
            animation: sacred-pulse-red 3s infinite ease-in-out;
        }
        .seal-bad { 
            border: 4px solid #10b981; color: #10b981; background: rgba(16, 185, 129, 0.1);
            animation: sacred-pulse-green 4s infinite ease-in-out;
        }
        .seal-mixed { 
            border: 4px solid #f59e0b; color: #f59e0b; background: rgba(245, 158, 11, 0.1);
            animation: sacred-pulse-yellow 3s infinite ease-in-out;
        }
        .seal-void { 
            border: 2px dashed #64748b; color: #64748b; background: transparent;
        }
        .content-blur-mask {
            mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
        }
    `}</style>
);

const SmokeStyles = () => (
    <style>{`
        .spotlight {
            position: absolute; top: 0; left: 50%; transform: translateX(-50%);
            width: 120px; height: 100vh;
            background: radial-gradient(ellipse at top, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 35%, transparent 75%);
            filter: blur(12px); opacity: 0; transition: opacity 2s ease-in-out; pointer-events: none; z-index: 5;
            clip-path: polygon(42% 0, 58% 0, 100% 100%, 0% 100%);
        }
        .spotlight.active { opacity: 1; }
        .incense-scene {
            position: relative; width: 200px; height: 280px;
            display: flex; flex-direction: column; justify-content: flex-end; align-items: center; z-index: 10;
        }
        .stick {
            position: absolute; bottom: 0; width: 3px; height: 70px; background: #5d4037;
            border-radius: 2px 2px 0 0; opacity: 0; transition: opacity 2s ease;
        }
        .stick.visible { opacity: 1; }
        .tip {
            position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: #2d2d2d;
            border-radius: 2px 2px 0 0; transition: background-color 0.5s ease, box-shadow 0.5s ease;
        }
        .tip.ignited {
            background-color: #ff4500;
            box-shadow: 0 0 4px #fff, 0 0 12px #ff4500, 0 -4px 20px rgba(255, 69, 0, 0.8);
            animation: ember-glow 2s infinite alternate ease-in-out;
        }
        @keyframes ember-glow {
            0% { opacity: 0.85; filter: brightness(1); }
            100% { opacity: 1; filter: brightness(1.3); }
        }
        .smoke-stream-container {
            position: absolute; bottom: 68px; left: 50%; transform: translateX(-50%);
            width: 120px; height: 280px; pointer-events: none; opacity: 0;
            mask-image: linear-gradient(to top, black 0%, black 10%, black 75%, transparent 95%);
            -webkit-mask-image: linear-gradient(to top, black 0%, black 10%, black 75%, transparent 95%);
        }
        .smoke-stream-container.visible { opacity: 1.0; }
        .smoke-layer-glow { fill: none; stroke: rgba(255, 255, 255, 0.15); stroke-width: 6px; stroke-linecap: round; filter: blur(6px); }
        .smoke-layer-core { fill: none; stroke: rgba(255, 255, 255, 0.75); stroke-width: 1.5px; stroke-linecap: round; filter: blur(2px); }
    `}</style>
);

// [關鍵] 匯出元件，解決 "does not provide an export" 錯誤
export const LuckyDivinationModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<Step>('CATEGORY');
    const [selectedCat, setSelectedCat] = useState<Category | null>(null);
    const [breathingText, setBreathingText] = useState('');
    const [canProceed, setCanProceed] = useState(false);
    const [sceneState, setSceneState] = useState<CeremonyState>('black');
    const [round, setRound] = useState(0); 
    const [selections, setSelections] = useState<number[]>([]);
    const [bubbles, setBubbles] = useState<{val: number, x: number, y: number, scale: number, delay: number}[]>([]);
    const [hasZeroBeenSelected, setHasZeroBeenSelected] = useState(false);

    // 結果頁狀態
    const [finalContent, setFinalContent] = useState<string>('');
    const [finalLuck, setFinalLuck] = useState<LuckType>('吉凶參半');
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [isLoadingResult, setIsLoadingResult] = useState(false);
    
    // Debug 資訊
    const [debugKey, setDebugKey] = useState<string>('');
    const [dbStatus, setDbStatus] = useState<string>('');

    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (step === 'BUBBLE') {
            generateBubbles();
        }
    }, [step, round]);

    const generateBubbles = () => {
        const availableNums = [];
        const start = hasZeroBeenSelected ? 1 : 0;
        for (let i = start; i <= 9; i++) availableNums.push(i);
        const newBubbles: any[] = [];
        const safePositions = [
            { x: 35, y: 28 }, { x: 65, y: 28 }, { x: 20, y: 44 }, { x: 50, y: 44 }, { x: 80, y: 44 },
            { x: 35, y: 60 }, { x: 65, y: 60 }, { x: 20, y: 76 }, { x: 50, y: 76 }, { x: 80, y: 76 }
        ];
        const shuffledIndices = Array.from({length: 10}, (_, i) => i);
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }
        availableNums.forEach((num, idx) => {
            const pos = safePositions[shuffledIndices[idx]];
            const noiseX = (Math.random() - 0.5) * 2;
            const noiseY = (Math.random() - 0.5) * 2;
            newBubbles.push({
                val: num, x: pos.x + noiseX, y: pos.y + noiseY, scale: 1, delay: Math.random() * 1.0 
            });
        });
        setBubbles(newBubbles);
    };

    const handleBubbleClick = (val: number) => {
        const newSels = [...selections, val];
        setSelections(newSels);
        if (val === 0) setHasZeroBeenSelected(true);
        if (newSels.length === 4) setStep('RESULT');
        else setRound(prev => prev + 1);
    };

    useEffect(() => {
        if (step === 'BREATHING') {
            setCanProceed(false); setBreathingText(''); setSceneState('black');
            const fullText = "心裡想著想詢問的問題，然後閉眼做三次深呼吸，呼吸務必緩慢且深長...";
            
            const timer1 = setTimeout(() => setSceneState('light_in'), 500);
            const timer2 = setTimeout(() => setSceneState('incense_show'), 1000); 
            const timer3 = setTimeout(() => setSceneState('light_out'), 3500);   
            const timer4 = setTimeout(() => setSceneState('igniting'), 4000); 
            const timer5 = setTimeout(() => setSceneState('smoking'), 5000);     

            let textInterval: NodeJS.Timeout;
            const timer6 = setTimeout(() => {
                setSceneState('text_typing');
                let i = 0;
                textInterval = setInterval(() => {
                    setBreathingText(fullText.slice(0, i + 1));
                    i++;
                    if (i === fullText.length) clearInterval(textInterval);
                }, 450); 
            }, 15500); 

            const timer7 = setTimeout(() => {
                setSceneState('ready'); setCanProceed(true);
            }, 29500);

            return () => {
                [timer1, timer2, timer3, timer4, timer5, timer6, timer7].forEach(t => clearTimeout(t));
                if (textInterval) clearInterval(textInterval);
            };
        }
    }, [step]);

    const reset = () => {
        onClose();
        setTimeout(() => {
            setStep('CATEGORY'); setSelectedCat(null); setSelections([]);
            setRound(0); setHasZeroBeenSelected(false); setBreathingText(''); setSceneState('black');
        }, 500);
    };

    const result = useMemo(() => {
        if (selections.length !== 4) return null;
        const numAB = parseInt(`${selections[0]}${selections[1]}`);
        const finalAB = getRecursiveSum(numAB); 
        const numCD = parseInt(`${selections[2]}${selections[3]}`);
        const finalCD = getRecursiveSum(numCD); 
        const ganIdx = getDivinationStem(finalCD); 
        return { mingNum: finalAB, mingZhi: ZHI[finalAB - 1], sihuaNum: finalCD, sihuaGan: GAN[ganIdx] };
    }, [selections]);

    // [修正] 讀取資料邏輯，改用 Supabase
    useEffect(() => {
        if (step === 'RESULT' && result && selectedCat) {
            const fetchData = async () => {
                setIsLoadingResult(true);
                const debugStr = `${selectedCat}-${result.mingZhi}-${result.sihuaGan}`;
                setDebugKey(debugStr);
                
                try {
                    setDbStatus('Fetching from Cloud...');
                    // 從 Supabase 讀取
                    const data = await getDivinationResult(selectedCat, result.mingZhi, result.sihuaGan);
                    
                    if (data) {
                        setFinalContent(data.content);
                        setFinalLuck(data.luck as LuckType);
                        setDbStatus('Found');
                    } else {
                        setFinalContent("星象混沌，天機未顯。此時心緒尚不穩，建議靜待時機，改日誠心再占。");
                        setFinalLuck('無結果');
                        setDbStatus('Not Found');
                    }
                } catch (e) {
                    console.error("Fetch Error:", e);
                    setFinalContent("連線異常，無法讀取星象資料。");
                    setFinalLuck('無結果');
                    setDbStatus('Error');
                } finally {
                    setIsLoadingResult(false);
                }
            };

            fetchData();
        }
    }, [step, result, selectedCat]);

    const handleShare = async () => {
        if (!resultRef.current) return;
        setIsGeneratingImg(true);
        try {
            const blob = await toBlob(resultRef.current, { 
                pixelRatio: 3, 
                backgroundColor: '#09090b',
                width: 360, 
                style: { height: 'auto', minHeight: '640px' }
            });
            
            if (blob) {
                const link = document.createElement('a');
                link.download = `紫微占卜-${selectedCat}-${new Date().getTime()}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
            }
        } catch (e) {
            console.error(e);
            alert('圖片生成失敗，請稍後再試');
        } finally {
            setIsGeneratingImg(false);
        }
    };

    if (!isOpen) return null;

    const isIncenseVisible = ['incense_show', 'light_out', 'igniting', 'smoking', 'text_typing', 'ready'].includes(sceneState);
    const isSpotlightOn = ['light_in', 'incense_show'].includes(sceneState);
    const isIgnited = ['igniting', 'smoking', 'text_typing', 'ready'].includes(sceneState);
    const isSmoking = ['smoking', 'text_typing', 'ready'].includes(sceneState);
    const isReady = sceneState === 'ready';

    const getSmokeAnimation = () => {
        if (!isSmoking) return { pathLength: 0, opacity: 0 };
        if (isReady) return { pathLength: 1, opacity: 1, d: pStraight };
        return { pathLength: 1, opacity: 1, d: [p1, p2, p4, p3, p1] };
    };

    const getSmokeTransition = () => {
        if (isReady) return { d: { duration: 3, ease: "easeInOut" } };
        return {
            pathLength: { duration: 14, ease: "easeOut" },
            opacity: { duration: 0.5 },
            d: { duration: 14, ease: "easeInOut", repeat: Infinity }
        };
    };

    const getSealClass = (luck: LuckType) => {
        switch (luck) {
            case '吉': return 'seal-lucky';
            case '凶': return 'seal-bad';
            case '吉凶參半': return 'seal-mixed';
            case '無結果': return 'seal-void';
            default: return 'seal-mixed';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden text-white font-sans animate-in fade-in duration-300 h-[100dvh] touch-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <SmokeStyles />
            <SacredStyles />
            
            {step !== 'BREATHING' && step !== 'RESULT' && (
                <div className="p-4 flex justify-between items-center z-50 shrink-0">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Sparkles size={18} />
                        <span className="text-sm font-bold tracking-widest">吉凶占卜</span>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
                </div>
            )}

            <div className="flex-1 relative flex items-center justify-center p-6 min-h-0 overflow-y-auto pb-safe">
                {step === 'CATEGORY' && (
                    <div className="w-full max-w-5xl flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500">
                        <div className="text-center mb-6 sm:mb-10">
                            <h2 className="text-2xl sm:text-4xl font-bold mb-2">想問什麼？</h2>
                            <p className="text-slate-400 text-sm sm:text-base">請選擇一個占卜面向</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full max-w-md md:max-w-none md:flex md:flex-row md:justify-center md:gap-6">
                            {CATEGORIES.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => { setSelectedCat(cat.id); setStep('BREATHING'); }}
                                    className={`
                                        group relative overflow-hidden
                                        p-4 sm:p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm
                                        active:scale-95 transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10
                                        flex flex-col items-center justify-center gap-3 sm:gap-5
                                        ${cat.id === '交友' ? 'col-span-2 md:col-span-1' : 'col-span-1'}
                                        md:w-48 md:aspect-[4/5]
                                    `}
                                >
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${cat.color.replace('text-', 'from-').replace('-400', '-500')} to-transparent`} />
                                    <div className={`p-4 sm:p-5 rounded-full bg-slate-900/50 ${cat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                                        <cat.icon size={48} className="w-10 h-10 sm:w-14 sm:h-14" />
                                    </div>
                                    <div className="text-center z-10">
                                        <div className="text-xl sm:text-2xl font-bold tracking-widest">{cat.id}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {step === 'BREATHING' && (
                    <div className="flex flex-col items-center justify-between w-full h-full relative py-10 overflow-hidden">
                        <div className={`spotlight ${isSpotlightOn ? 'active' : ''}`}></div>
                        <div className="h-32 flex items-end justify-center text-center px-4 sm:px-8 z-30">
                            <p className="text-base sm:text-xl font-medium text-slate-200 tracking-[0.15em] leading-relaxed min-h-[3em] text-shadow-sm opacity-90">{breathingText}</p>
                        </div>
                        <div className="incense-scene">
                            <div className={`smoke-stream-container ${isSmoking ? 'visible' : ''}`}>
                                <svg viewBox="0 0 100 280" className="w-full h-full overflow-visible">
                                    <motion.path className="smoke-layer-glow" initial={{ pathLength: 0, opacity: 0, d: pStraight }} animate={getSmokeAnimation()} transition={getSmokeTransition()} />
                                    <motion.path className="smoke-layer-core" initial={{ pathLength: 0, opacity: 0, d: pStraight }} animate={getSmokeAnimation()} transition={getSmokeTransition()} />
                                </svg>
                            </div>
                            <div className={`stick ${isIncenseVisible ? 'visible' : ''}`}>
                                <div className={`tip ${isIgnited ? 'ignited' : ''}`}></div>
                            </div>
                        </div>
                        <div className={`absolute bottom-10 left-0 w-full flex justify-center z-40 transition-opacity duration-1000 ${canProceed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                            <button onClick={() => setStep('BUBBLE')} className="px-10 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 rounded-full font-bold tracking-widest backdrop-blur-sm">開始感應</button>
                        </div>
                    </div>
                )}
                {step === 'BUBBLE' && (
                    <div className="w-full h-full relative max-w-md mx-auto">
                        <div className="absolute top-0 left-0 w-full text-center py-2 z-20 pointer-events-none">
                            <div className="text-xs font-mono text-slate-500 mb-1">ROUND {round + 1} / 4</div>
                            <div className="text-xl font-bold tracking-widest text-white">請直覺選數</div>
                            <div className="flex justify-center gap-2 mt-2">{[0, 1, 2, 3].map(i => (<div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < round ? 'bg-white' : 'bg-white/20'}`} />))}</div>
                        </div>
                        {bubbles.map(b => (
                            <motion.button 
                                key={`${round}-${b.val}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: b.scale, opacity: 1, y: [0, -4, 0] }} transition={{ scale: { duration: 0.4, type: 'spring' }, opacity: { duration: 0.4 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: b.delay } }}
                                onClick={() => handleBubbleClick(b.val)} className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center text-2xl sm:text-3xl font-bold text-white active:scale-90"
                                style={{ left: `${b.x}%`, top: `${b.y}%`, marginLeft: '-32px', marginTop: '-32px' }}>{b.val}
                            </motion.button>
                        ))}
                    </div>
                )}
                
                {step === 'RESULT' && result && (
                    <div className="w-full h-full flex flex-col items-center animate-in fade-in duration-1000 relative">
                        <div 
                            ref={resultRef}
                            className="bg-[#09090b] w-full max-w-sm rounded-2xl border border-slate-800 p-6 flex flex-col items-center relative overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-[-50px] left-[-50px] w-[200px] h-[200px] bg-purple-900/20 rounded-full blur-[80px]"></div>
                            <div className="absolute bottom-[-50px] right-[-50px] w-[200px] h-[200px] bg-blue-900/20 rounded-full blur-[80px]"></div>

                            <div className="flex flex-col items-center mb-8 relative z-10">
                                <div className="text-slate-500 text-xs font-mono tracking-[0.2em] mb-2 uppercase">Divine Guidance</div>
                                <h2 className="text-2xl font-bold text-white tracking-widest flex items-center gap-2">
                                    <Sparkles size={20} className="text-amber-400" />
                                    {selectedCat}運勢
                                    <Sparkles size={20} className="text-amber-400" />
                                </h2>
                            </div>

                            <div className="mb-8 relative z-10 flex flex-col items-center">
                                {isLoadingResult ? (
                                    <Loader2 className="w-12 h-12 text-slate-500 animate-spin" />
                                ) : (
                                    <div className={`w-32 h-32 sacred-seal text-4xl ${getSealClass(finalLuck)}`}>
                                        {finalLuck === '無結果' ? '' : finalLuck.substring(0, 2)}
                                    </div>
                                )}
                            </div>

                            <div className="w-full bg-slate-900/50 rounded-xl p-5 border border-slate-800 mb-6 relative z-10 min-h-[160px]">
                                {/* Debug 資訊 (紅色，測試完可刪) */}
                                <div className="text-[9px] text-red-400 font-mono mb-2 p-1 border border-red-900/50 bg-red-950/30 rounded opacity-70">
                                    Key: {debugKey} | {dbStatus}
                                </div>

                                <div className="text-slate-300 text-sm leading-relaxed text-justify font-medium tracking-wide">
                                    {isLoadingResult ? "正在解讀星象..." : finalContent}
                                </div>
                            </div>

                            <div className="flex flex-col w-full">
                                <div className="flex items-start gap-2 text-[10px] text-slate-500 border-t border-slate-800/50 pt-4 w-full">
                                    <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                    <p>占卜結果僅供參考，若需準確分析請預約大寶老師諮詢。短期內不建議針對同問題重複占卜。</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col w-full max-w-sm gap-3 px-4">
                            <button 
                                onClick={handleShare}
                                disabled={isGeneratingImg}
                                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {isGeneratingImg ? <Loader2 className="animate-spin" size={20}/> : <Share2 size={20} />}
                                下載占卜結果
                            </button>
                            
                            <button 
                                onClick={reset}
                                className="w-full py-3.5 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                                <X size={20} />
                                離開 (回到首頁)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};