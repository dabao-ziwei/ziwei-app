import React, { useState, useEffect, useMemo } from 'react';
import { X, Heart, Briefcase, Wallet, Activity, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { GAN, ZHI } from '../logic/constants';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'CATEGORY' | 'BREATHING' | 'BUBBLE' | 'RESULT';
type Category = '感情' | '工作' | '理財' | '健康' | '交友';
type CeremonyState = 'black' | 'light_in' | 'incense_show' | 'light_out' | 'igniting' | 'smoking' | 'text_typing' | 'ready';

// UI 修正: 放大 Icon, 移除 desc
const CATEGORIES: { id: Category; icon: any; color: string; desc: string }[] = [
    { id: '感情', icon: Heart, color: 'text-pink-400', desc: '愛情、婚姻、曖昧' },
    { id: '工作', icon: Briefcase, color: 'text-blue-400', desc: '事業、轉職、升遷' },
    { id: '理財', icon: Wallet, color: 'text-yellow-400', desc: '投資、財運、偏財' },
    { id: '健康', icon: Activity, color: 'text-green-400', desc: '身心、疾病、養生' },
    { id: '交友', icon: Users, color: 'text-purple-400', desc: '人際、貴人、小人' },
];

// --- 路徑定義 ---
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

const SmokeStyles = () => (
    <style>{`
        /* --- 1. 聚光燈 --- */
        .spotlight {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: 100vh;
            background: radial-gradient(ellipse at top, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 35%, transparent 75%);
            filter: blur(12px);
            opacity: 0;
            transition: opacity 2s ease-in-out;
            pointer-events: none;
            z-index: 5;
            clip-path: polygon(42% 0, 58% 0, 100% 100%, 0% 100%);
        }
        .spotlight.active { opacity: 1; }

        /* --- 場景容器 --- */
        .incense-scene {
            position: relative;
            width: 200px;
            height: 280px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: center;
            z-index: 10;
        }

        /* --- 香枝 --- */
        .stick {
            position: absolute;
            bottom: 0;
            width: 3px;
            height: 70px;
            background: #5d4037;
            border-radius: 2px 2px 0 0;
            opacity: 0;
            transition: opacity 2s ease;
        }
        .stick.visible { opacity: 1; }

        /* --- 香頭 --- */
        .tip {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 6px;
            background: #2d2d2d;
            border-radius: 2px 2px 0 0;
            transition: background-color 0.5s ease, box-shadow 0.5s ease;
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

        /* --- 2. 煙霧容器 --- */
        .smoke-stream-container {
            position: absolute;
            bottom: 68px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px; 
            height: 280px;
            pointer-events: none;
            opacity: 0;
            mask-image: linear-gradient(to top, black 0%, black 10%, black 75%, transparent 95%);
            -webkit-mask-image: linear-gradient(to top, black 0%, black 10%, black 75%, transparent 95%);
        }
        .smoke-stream-container.visible { opacity: 1.0; }

        /* --- 3. 煙霧樣式 --- */
        .smoke-layer-glow {
            fill: none;
            stroke: rgba(255, 255, 255, 0.15); 
            stroke-width: 6px; 
            stroke-linecap: round;
            filter: blur(6px); 
        }
        .smoke-layer-core {
            fill: none;
            stroke: rgba(255, 255, 255, 0.75); 
            stroke-width: 1.5px; 
            stroke-linecap: round;
            filter: blur(2px); 
        }
    `}</style>
);

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
            { x: 35, y: 28 }, { x: 65, y: 28 },
            { x: 20, y: 44 }, { x: 50, y: 44 }, { x: 80, y: 44 },
            { x: 35, y: 60 }, { x: 65, y: 60 },
            { x: 20, y: 76 }, { x: 50, y: 76 }, { x: 80, y: 76 }
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
                val: num,
                x: pos.x + noiseX,
                y: pos.y + noiseY,
                scale: 1, 
                delay: Math.random() * 1.0 
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

            // [修正] 文字打字時間：15000 -> 15500 (延後 0.5秒)
            // 讓煙霧完全到位後，停頓一瞬間，文字再出現
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

            // [修正] 按鈕出現時間：29000 -> 29500 (同步延後 0.5秒)
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
        setStep('CATEGORY'); setSelectedCat(null); setSelections([]);
        setRound(0); setHasZeroBeenSelected(false); setBreathingText(''); setSceneState('black');
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

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden text-white font-sans animate-in fade-in duration-300 h-[100dvh] touch-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <SmokeStyles />
            {step !== 'BREATHING' && (
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
                                    
                                    {/* UI: 放大 Icon (size=48) */}
                                    <div className={`p-4 sm:p-5 rounded-full bg-slate-900/50 ${cat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                                        <cat.icon size={48} className="w-10 h-10 sm:w-14 sm:h-14" />
                                    </div>
                                    
                                    {/* UI: 移除 desc, 只保留 ID */}
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
                        
                        {/* 1. 聚光燈 */}
                        <div className={`spotlight ${isSpotlightOn ? 'active' : ''}`}></div>
                        
                        <div className="h-32 flex items-end justify-center text-center px-4 sm:px-8 z-30">
                            <p className="text-base sm:text-xl font-medium text-slate-200 tracking-[0.15em] leading-relaxed min-h-[3em] text-shadow-sm opacity-90">{breathingText}</p>
                        </div>
                        
                        <div className="incense-scene">
                            <div className={`smoke-stream-container ${isSmoking ? 'visible' : ''}`}>
                                <svg viewBox="0 0 100 280" className="w-full h-full overflow-visible">
                                    <motion.path 
                                        className="smoke-layer-glow"
                                        initial={{ pathLength: 0, opacity: 0, d: pStraight }}
                                        animate={getSmokeAnimation()}
                                        transition={getSmokeTransition()}
                                    />
                                    <motion.path 
                                        className="smoke-layer-core"
                                        initial={{ pathLength: 0, opacity: 0, d: pStraight }}
                                        animate={getSmokeAnimation()}
                                        transition={getSmokeTransition()}
                                    />
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
                                key={`${round}-${b.val}`} 
                                initial={{ scale: 0, opacity: 0 }} 
                                animate={{ 
                                    scale: b.scale, 
                                    opacity: 1, 
                                    y: [0, -4, 0] 
                                }} 
                                transition={{ 
                                    scale: { duration: 0.4, type: 'spring' }, 
                                    opacity: { duration: 0.4 }, 
                                    y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: b.delay } 
                                }}
                                onClick={() => handleBubbleClick(b.val)} 
                                className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center text-2xl sm:text-3xl font-bold text-white active:scale-90"
                                style={{ left: `${b.x}%`, top: `${b.y}%`, marginLeft: '-32px', marginTop: '-32px' }}
                            >
                                {b.val}
                            </motion.button>
                        ))}
                    </div>
                )}
                {step === 'RESULT' && result && (
                    <div className="w-full max-w-md text-center animate-in zoom-in duration-500 pb-10">
                        <h2 className="text-3xl font-bold mb-6 text-white">{selectedCat}運勢</h2>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><div className="text-xs text-slate-500 mb-1">命宮位置</div><div className="text-2xl font-bold text-amber-400">{result.mingNum} ({result.mingZhi})</div></div>
                            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><div className="text-xs text-slate-500 mb-1">四化天干</div><div className="text-2xl font-bold text-purple-400">{result.sihuaNum} ({result.sihuaGan})</div></div>
                        </div>
                        <button onClick={reset} className="w-full px-8 py-3.5 bg-white text-slate-900 rounded-xl font-bold">再次占卜</button>
                    </div>
                )}
            </div>
        </div>
    );
};