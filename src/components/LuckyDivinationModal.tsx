import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { X, Heart, Briefcase, Wallet, Activity, Users, Sparkles, Share2, AlertCircle, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { toBlob } from 'html-to-image';
import { getDivinationResult } from '../db';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Float, PerspectiveCamera, useGLTF, Center, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

// 常數定義
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'CATEGORY' | 'BREATHING' | 'BUBBLE' | 'RESULT';
type Category = '感情' | '工作' | '理財' | '健康' | '交友';
type CeremonyState = 'black' | 'light_in' | 'incense_show' | 'light_out' | 'igniting' | 'smoking' | 'text_typing' | 'ready';
type LuckType = '吉' | '凶' | '平' | '無結果'; 

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
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.1) transparent; }
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 20px; }
    `}</style>
);

const SmokeStyles = () => (
    <style>{`
        .spotlight { position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 120px; height: 100vh; background: radial-gradient(ellipse at top, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 35%, transparent 75%); filter: blur(12px); opacity: 0; transition: opacity 2s ease-in-out; pointer-events: none; z-index: 5; clip-path: polygon(42% 0, 58% 0, 100% 100%, 0% 100%); }
        .spotlight.active { opacity: 1; }
        .incense-scene { position: relative; width: 200px; height: 280px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; z-index: 10; }
        .stick { position: absolute; bottom: 0; width: 3px; height: 70px; background: #5d4037; border-radius: 2px 2px 0 0; opacity: 0; transition: opacity 2s ease; }
        .stick.visible { opacity: 1; }
        .tip { position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: #2d2d2d; border-radius: 2px 2px 0 0; transition: background-color 0.5s ease, box-shadow 0.5s ease; }
        .tip.ignited { background-color: #ff4500; box-shadow: 0 0 4px #fff, 0 0 12px #ff4500, 0 -4px 20px rgba(255, 69, 0, 0.8); animation: ember-glow 2s infinite alternate ease-in-out; }
        @keyframes ember-glow { 0% { opacity: 0.85; filter: brightness(1); } 100% { opacity: 1; filter: brightness(1.3); } }
        .smoke-stream-container { position: absolute; bottom: 68px; left: 50%; transform: translateX(-50%); width: 120px; height: 280px; pointer-events: none; opacity: 0; mask-image: linear-gradient(to top, black 0%, black 10%, black 75%, transparent 95%); -webkit-mask-image: linear-gradient(to top, black 0%, black 10%, black 75%, transparent 95%); }
        .smoke-stream-container.visible { opacity: 1.0; }
        .smoke-layer-glow { fill: none; stroke: rgba(255, 255, 255, 0.15); stroke-width: 6px; stroke-linecap: round; filter: blur(6px); }
        .smoke-layer-core { fill: none; stroke: rgba(255, 255, 255, 0.75); stroke-width: 1.5px; stroke-linecap: round; filter: blur(2px); }
    `}</style>
);

function Loader() {
  const { progress } = useProgress()
  return <Html center><div className="text-white font-bold whitespace-nowrap">{Math.floor(progress)} % 讀取中...</div></Html>
}

// 3D 筊杯元件
const JiaoBlock3D = ({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) => {
    const meshRef = useRef<THREE.Group>(null);
    const { scene } = useGLTF('/jiaobei.glb'); 
    
    const clone = useMemo(() => scene.clone(), [scene]);

    const lacquerMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#9f1239"), 
        roughness: 0.35, 
        metalness: 0.0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
        reflectivity: 0.2,
        sheen: 0.8,
        sheenColor: new THREE.Color("#ffb3b3"), 
        side: THREE.DoubleSide
    }), []);

    useEffect(() => {
        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.material = lacquerMaterial; 
            }
        });
    }, [clone, lacquerMaterial]);

    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Center>
                <primitive 
                    ref={meshRef} 
                    object={clone} 
                    position={position} 
                    rotation={rotation} 
                    scale={[3, 3, 3]} 
                />
            </Center>
        </Float>
    );
};

// [安全修正] 暫時移除預先載入，避免檔案問題導致全站當機
// useGLTF.preload('/jiaobei.glb');

const SacredJiaoScene3D = ({ luck }: { luck: string }) => {
    if (luck === '無結果') {
        return (
             <div className="relative w-64 h-44 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full border-4 border-dashed border-slate-700/50 flex items-center justify-center relative">
                    <span className="text-6xl font-bold text-slate-500">無</span>
                </div>
            </div>
        );
    }

    const randomWobble = () => (Math.random() - 0.5) * 0.2;

    let leftRot: [number, number, number] = [0, Math.PI / 2, 0];
    let rightRot: [number, number, number] = [0, -Math.PI / 2, 0];

    if (luck === '吉') {
        leftRot = [randomWobble(), Math.PI / 2 + randomWobble(), 0];
        rightRot = [Math.PI + randomWobble(), -Math.PI / 2 + randomWobble(), 0]; 
    }
    else if (luck === '凶') {
        leftRot = [randomWobble(), Math.PI / 2 + randomWobble(), 0];
        rightRot = [randomWobble(), -Math.PI / 2 + randomWobble(), 0];
    }
    else if (luck === '平' || luck === '吉凶參半') {
        leftRot = [Math.PI + randomWobble(), Math.PI / 2 + randomWobble(), 0];
        rightRot = [Math.PI + randomWobble(), -Math.PI / 2 + randomWobble(), 0];
    }

    return (
        <div className="relative w-full h-36">
            <Canvas shadows dpr={[1, 2]} className="w-full h-full z-20">
                {/* [安全修正] 移除 onUpdate，改用固定設置，避免可能的循環問題 */}
                <PerspectiveCamera makeDefault position={[0.5, 3, 4]} fov={35} /> 
                
                {/* [手動調整視角小技巧] 
                  如果畫面出來了但沒對準，您可以暫時把下面這行 OrbitControls 打開 (拿掉註解)，
                  用滑鼠轉到滿意後，告訴我大概的方位，我再幫您鎖定。
                */}
                {/* <OrbitControls makeDefault /> */}

                <ambientLight intensity={0.5} color="#ffdad4" />
                <directionalLight position={[-2, 5, 2]} intensity={2} castShadow color="#fff0e0" />
                <spotLight position={[5, 8, 5]} angle={0.5} penumbra={1} intensity={3} color="#fff0e0" castShadow />
                <pointLight position={[-5, -5, 5]} intensity={0.5} color="#d32f2f" />

                {/* 增加 onLookAt 確保相機看向中心 */}
                <CameraRig />

                <Suspense fallback={<Loader />}>
                    <Environment preset="sunset" blur={0.8} background={false} />
                    <group position={[0, 0, 0]}>
                        <group position={[-1.2, 0, 0]}>
                             <JiaoBlock3D position={[0, 0, 0]} rotation={leftRot} />
                        </group>
                        <group position={[1.2, 0, 0]}>
                             <JiaoBlock3D position={[0, 0, 0]} rotation={rightRot} />
                        </group>
                    </group>
                    <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={12} blur={2} far={4} color="#1a0505" />
                </Suspense>
            </Canvas>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/20 rounded-full blur-[80px] z-10 pointer-events-none"></div>
        </div>
    );
};

// 新增一個簡單的組件來處理相機目標
function CameraRig() {
    useFrame((state) => {
        state.camera.lookAt(0, 0, 0);
    });
    return null;
}

export const LuckyDivinationModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [step, setStep] = useState<Step>('CATEGORY');
    const [selectedCat, setSelectedCat] = useState<Category | null>(null);
    const [breathingText, setBreathingText] = useState('');
    const [canProceed, setCanProceed] = useState(false);
    const [sceneState, setSceneState] = useState<CeremonyState>('black');
    const [skipAnimation, setSkipAnimation] = useState(true);
    const [round, setRound] = useState(0); 
    const [selections, setSelections] = useState<number[]>([]);
    const [bubbles, setBubbles] = useState<{val: number, x: number, y: number, scale: number, delay: number}[]>([]);
    const [finalContent, setFinalContent] = useState<string>('');
    const [finalLuck, setFinalLuck] = useState<string>('平');
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [isLoadingResult, setIsLoadingResult] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (step === 'BUBBLE') { generateBubbles(); } }, [step, round]);

    const generateBubbles = () => {
        const availableNums = [];
        let isZeroForbidden = false;
        if (round === 1 && selections[0] === 0) isZeroForbidden = true;
        if (round === 3 && selections[2] === 0) isZeroForbidden = true;
        const start = isZeroForbidden ? 1 : 0;
        for (let i = start; i <= 9; i++) availableNums.push(i);
        const newBubbles: any[] = [];
        const safePositions = [ { x: 35, y: 28 }, { x: 65, y: 28 }, { x: 20, y: 44 }, { x: 50, y: 44 }, { x: 80, y: 44 }, { x: 35, y: 60 }, { x: 65, y: 60 }, { x: 20, y: 76 }, { x: 50, y: 76 }, { x: 80, y: 76 } ];
        const shuffledIndices = Array.from({length: 10}, (_, i) => i);
        for (let i = shuffledIndices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]]; }
        availableNums.forEach((num, idx) => { const pos = safePositions[shuffledIndices[idx]]; const noiseX = (Math.random() - 0.5) * 2; const noiseY = (Math.random() - 0.5) * 2; newBubbles.push({ val: num, x: pos.x + noiseX, y: pos.y + noiseY, scale: 1, delay: Math.random() * 1.0 }); });
        setBubbles(newBubbles);
    };

    const handleBubbleClick = (val: number) => { const newSels = [...selections, val]; setSelections(newSels); if (newSels.length === 4) setStep('RESULT'); else setRound(prev => prev + 1); };

    const handleCategorySelect = (catId: Category) => { setSelectedCat(catId); if (skipAnimation) { setStep('BUBBLE'); } else { setStep('BREATHING'); } };

    useEffect(() => {
        if (step === 'BREATHING') {
            setCanProceed(false); setBreathingText(''); setSceneState('black');
            const fullText = "心裡想著想詢問的問題，然後閉眼做三次深呼吸，呼吸務必緩慢且深長...";
            const timers = [ setTimeout(() => setSceneState('light_in'), 500), setTimeout(() => setSceneState('incense_show'), 1000), setTimeout(() => setSceneState('light_out'), 3500), setTimeout(() => setSceneState('igniting'), 4000), setTimeout(() => setSceneState('smoking'), 5000), setTimeout(() => { setSceneState('ready'); setCanProceed(true); }, 29500) ];
            let textInterval: NodeJS.Timeout;
            const textTimer = setTimeout(() => { setSceneState('text_typing'); let i = 0; textInterval = setInterval(() => { setBreathingText(fullText.slice(0, i + 1)); i++; if (i === fullText.length) clearInterval(textInterval); }, 450); }, 15500); 
            return () => { timers.forEach(t => clearTimeout(t)); clearTimeout(textTimer); if (textInterval) clearInterval(textInterval); };
        }
    }, [step]);

    const reset = () => { onClose(); setTimeout(() => { setStep('CATEGORY'); setSelectedCat(null); setSelections([]); setRound(0); setBreathingText(''); setSceneState('black'); }, 500); };

    const result = useMemo(() => { if (selections.length !== 4) return null; const numAB = parseInt(`${selections[0]}${selections[1]}`); const finalAB = getRecursiveSum(numAB); const numCD = parseInt(`${selections[2]}${selections[3]}`); const finalCD = getRecursiveSum(numCD); const ganIdx = getDivinationStem(finalCD); return { mingNum: finalAB, mingZhi: ZHI[finalAB - 1], sihuaNum: finalCD, sihuaGan: GAN[ganIdx] }; }, [selections]);

    useEffect(() => {
        if (step === 'RESULT' && result && selectedCat) {
            const fetchData = async () => {
                setIsLoadingResult(true);
                try { const data = await getDivinationResult(selectedCat, result.mingZhi, result.sihuaGan); if (data) { setFinalContent(data.content); setFinalLuck(data.luck); } else { setFinalContent("星象混沌，天機未顯。此時心緒尚不穩，建議靜待時機，改日誠心再占。"); setFinalLuck('無結果'); } } catch (e) { console.error("Fetch Error:", e); setFinalContent("連線異常，無法讀取星象資料。"); setFinalLuck('無結果'); } finally { setIsLoadingResult(false); }
            };
            fetchData();
        }
    }, [step, result, selectedCat]);

    const handleShare = async () => { if (!resultRef.current) return; setIsGeneratingImg(true); try { const blob = await toBlob(resultRef.current, { pixelRatio: 3, backgroundColor: '#09090b', width: 360, style: { height: 'auto', minHeight: '640px' } }); if (blob) { const link = document.createElement('a'); link.download = `紫微占卜-${selectedCat}-${new Date().getTime()}.png`; link.href = URL.createObjectURL(blob); link.click(); } } catch (e) { console.error(e); alert('圖片生成失敗，請稍後再試'); } finally { setIsGeneratingImg(false); } };

    if (!isOpen) return null;

    const isIncenseVisible = ['incense_show', 'light_out', 'igniting', 'smoking', 'text_typing', 'ready'].includes(sceneState);
    const isSpotlightOn = ['light_in', 'incense_show'].includes(sceneState);
    const isIgnited = ['igniting', 'smoking', 'text_typing', 'ready'].includes(sceneState);
    const isSmoking = ['smoking', 'text_typing', 'ready'].includes(sceneState);

    const getSmokeAnimation = () => { if (!isSmoking) return { pathLength: 0, opacity: 0 }; if (sceneState === 'ready') return { pathLength: 1, opacity: 1, d: pStraight }; return { pathLength: 1, opacity: 1, d: [p1, p2, p4, p3, p1] }; };
    const getSmokeTransition = () => { if (sceneState === 'ready') return { d: { duration: 3, ease: "easeInOut" } }; return { pathLength: { duration: 14, ease: "easeOut" }, opacity: { duration: 0.5 }, d: { duration: 14, ease: "easeInOut", repeat: Infinity } }; };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col overflow-hidden text-white font-sans animate-in fade-in duration-300 h-[100dvh] touch-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <SmokeStyles />
            <SacredStyles />
            
            {step !== 'BREATHING' && step !== 'RESULT' && (
                <div className="p-4 flex justify-between items-center z-50 shrink-0">
                    <div className="flex items-center gap-2 text-slate-400"><Sparkles size={18} /><span className="text-sm font-bold tracking-widest">吉凶占卜</span></div>
                    <div className="flex items-center gap-4">{step === 'CATEGORY' && (<button onClick={() => setSkipAnimation(!skipAnimation)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${skipAnimation ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}><Zap size={14} className={skipAnimation ? "fill-current" : ""} /><span>速測</span></button>)}<button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button></div>
                </div>
            )}

            <div className="flex-1 relative w-full p-2 overflow-y-auto pb-safe">
                {step === 'CATEGORY' && (
                    <div className="w-full h-full flex flex-col items-center justify-center max-w-5xl mx-auto animate-in slide-in-from-bottom-8 duration-500">
                        <div className="text-center mb-6 sm:mb-10">
                            <h2 className="text-2xl sm:text-4xl font-bold mb-2">想問什麼？</h2>
                            <p className="text-slate-400 text-sm sm:text-base">請選擇一個占卜面向</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 w-full max-w-md md:max-w-none md:flex md:flex-row md:justify-center md:gap-6">
                            {CATEGORIES.map(cat => (
                                <button key={cat.id} onClick={() => handleCategorySelect(cat.id)} className={`group relative overflow-hidden p-4 sm:p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm active:scale-95 transition-all hover:bg-white/10 hover:border-white/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10 flex flex-col items-center justify-center gap-3 sm:gap-5 ${cat.id === '交友' ? 'col-span-2 md:col-span-1' : 'col-span-1'} md:w-48 md:aspect-[4/5]`}>
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${cat.color.replace('text-', 'from-').replace('-400', '-500')} to-transparent`} />
                                    <div className={`p-4 sm:p-5 rounded-full bg-slate-900/50 ${cat.color} group-hover:scale-110 transition-transform shadow-inner`}>
                                        <cat.icon size={48} className="w-10 h-10 sm:w-14 sm:h-14" />
                                    </div>
                                    <div className="text-center z-10"><div className="text-xl sm:text-2xl font-bold tracking-widest">{cat.id}</div></div>
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
                    <div className="w-full h-full relative max-w-md mx-auto min-h-[60vh]">
                        <div className="absolute top-0 left-0 w-full text-center py-2 z-20 pointer-events-none">
                            <div className="text-xs font-mono text-slate-500 mb-1">ROUND {round + 1} / 4</div>
                            <div className="text-xl font-bold tracking-widest text-white">請直覺選數</div>
                            <div className="flex justify-center gap-2 mt-2">{[0, 1, 2, 3].map(i => (<div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < round ? 'bg-white' : 'bg-white/20'}`} />))}</div>
                        </div>
                        {bubbles.map(b => (
                            <motion.button key={`${round}-${b.val}`} initial={{ scale: 0, opacity: 0 }} animate={{ scale: b.scale, opacity: 1, y: [0, -4, 0] }} transition={{ scale: { duration: 0.4, type: 'spring' }, opacity: { duration: 0.4 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: b.delay } }} onClick={() => handleBubbleClick(b.val)} className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center text-2xl sm:text-3xl font-bold text-white active:scale-90" style={{ left: `${b.x}%`, top: `${b.y}%`, marginLeft: '-32px', marginTop: '-32px' }}>{b.val}</motion.button>
                        ))}
                    </div>
                )}
                
                {step === 'RESULT' && result && (
                    <div className="w-full h-full flex flex-col items-center animate-in fade-in duration-1000 relative p-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] max-h-[92dvh]">
                        <div ref={resultRef} className="flex-1 bg-[#09090b] w-full max-w-sm mx-auto rounded-2xl border border-white/10 p-5 flex flex-col items-center relative overflow-hidden shadow-2xl h-auto max-h-[92dvh]">
                            <div className="absolute top-[-50px] left-[-50px] w-[200px] h-[200px] bg-purple-900/20 rounded-full blur-[80px]"></div>
                            <div className="absolute bottom-[-50px] right-[-50px] w-[200px] h-[200px] bg-blue-900/20 rounded-full blur-[80px]"></div>
                            
                            <div className="flex flex-col items-center mt-4 mb-2 relative z-10 shrink-0">
                                <h2 className="text-2xl font-bold text-slate-300 tracking-widest flex items-center gap-2"><Sparkles size={20} className="text-amber-400" />{selectedCat}運勢<Sparkles size={20} className="text-amber-400" /></h2>
                            </div>

                            <div className="relative z-10 flex flex-col items-center shrink-0 w-full"><SacredJiaoScene3D luck={finalLuck} /></div>
                            
                            <div className="flex-1 w-full px-5 pb-3 relative z-10 min-h-0 overflow-hidden flex flex-col">
                                <div className="flex-1 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm rounded-xl overflow-hidden flex flex-col">
                                    <div className="flex-1 p-5 text-slate-300 text-sm leading-relaxed text-justify font-medium tracking-wide overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                        {isLoadingResult ? <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-500" /></div> : (finalContent || <span className="text-slate-500 italic flex items-center justify-center h-full">(暫無詳細說明文案)</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-2 shrink-0 px-1">
                            <div className="flex items-start gap-2 text-[10px] text-slate-500 w-full justify-center"><AlertCircle size={12} className="shrink-0 mt-0.5" /><p>占卜結果僅供參考，若需準確分析請預約大寶老師諮詢。</p></div>
                        </div>

                        <div className="mt-2 flex flex-row w-full max-w-sm mx-auto gap-3 shrink-0 pb-1">
                            <button onClick={handleShare} disabled={isGeneratingImg} className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70">{isGeneratingImg ? <Loader2 className="animate-spin" size={20}/> : <Share2 size={20} />}分享</button>
                            <button onClick={reset} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"><X size={20} />關閉</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};