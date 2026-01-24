import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Briefcase, Wallet, Activity, Users, Sparkles, Share2, AlertCircle, Loader2, Zap, MessageCircle, ArrowRight, Download, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { getDivinationResult } from '../db';
import { supabase } from '../supabase';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, Float, PerspectiveCamera, useGLTF, Center, useProgress, Html } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

// --- [樣式設定] ---
const GlobalStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700;900&display=swap');
        .font-serif-tc { font-family: 'Noto Serif TC', serif; }
        .bg-noise { 
            background-color: #09090b;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
        }
        .keyword-glow { text-shadow: 0 0 20px rgba(255, 215, 0, 0.3), 0 0 40px rgba(255, 215, 0, 0.1); }
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

// --- [資料定義] ---
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

type Step = 'CATEGORY' | 'BREATHING' | 'BUBBLE' | 'RESULT';
type Category = '感情' | '工作' | '理財' | '健康' | '交友';
type CeremonyState = 'black' | 'light_in' | 'incense_show' | 'light_out' | 'igniting' | 'smoking' | 'text_typing' | 'ready';

const CATEGORIES: { id: Category; icon: any; color: string; desc: string }[] = [
    { id: '感情', icon: Heart, color: 'text-pink-400', desc: '愛情、婚姻、曖昧' },
    { id: '工作', icon: Briefcase, color: 'text-blue-400', desc: '事業、轉職、升遷' },
    { id: '理財', icon: Wallet, color: 'text-yellow-400', desc: '投資、財運、偏財' },
    { id: '健康', icon: Activity, color: 'text-green-400', desc: '身心、疾病、養生' },
    { id: '交友', icon: Users, color: 'text-purple-400', desc: '人際、貴人、小人' },
];

const LINE_OA_URL = "https://line.me/R/ti/p/@653jrxjt?oat_content=url&ts=03241123";
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

const LUCK_PHRASES: Record<string, string> = {
    '吉': '順運',
    '平': '靜待',
    '吉凶參半': '靜待',
    '凶': '沉潛',
    '無結果': '待觀'
};

const getKeyword = (luck: string): string => LUCK_PHRASES[luck] || '靜待';

const getArtisticDate = () => {
    const date = new Date();
    const map = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    const y = date.getFullYear().toString().split('').map(d => map[parseInt(d)]).join('');
    const m = (date.getMonth() + 1);
    const mStr = m <= 10 ? map[m] : `十${map[m % 10 === 0 ? 0 : m % 10]}`.replace('十〇', '十');
    const d = date.getDate();
    let dStr = '';
    if (d <= 10) dStr = map[d];
    else if (d < 20) dStr = `十${d % 10 === 0 ? '' : map[d % 10]}`;
    else if (d < 30) dStr = `二十${d % 10 === 0 ? '' : map[d % 10]}`;
    else dStr = `三十${d % 10 === 0 ? '' : map[d % 10]}`;
    return `${y}年 ‧ ${mStr}月 ‧ ${dStr}日`;
};

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
        roughness: 0.35, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.4,
        reflectivity: 0.2, sheen: 0.8, sheenColor: new THREE.Color("#ffb3b3"), side: THREE.DoubleSide
    }), []);

    useEffect(() => {
        clone.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true; mesh.receiveShadow = true; mesh.material = lacquerMaterial; 
            }
        });
    }, [clone, lacquerMaterial]);

    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
            <Center>
                <primitive ref={meshRef} object={clone} position={position} rotation={rotation} scale={[3, 3, 3]} />
            </Center>
        </Float>
    );
};

// 顯示用元件
const SacredJiaoScene3D = ({ luck, staticImage }: { luck: string, staticImage?: string | null }) => {
    if (luck === '無結果') {
        return (
             <div className="relative w-64 h-44 flex items-center justify-center">
                <div className="w-40 h-40 rounded-full border-4 border-dashed border-slate-700/50 flex items-center justify-center relative">
                    <span className="text-6xl font-bold text-slate-500">無</span>
                </div>
            </div>
        );
    }

    if (staticImage) {
        return (
            <div className="relative w-full h-36 flex items-center justify-center">
                <img src={staticImage} alt="Jiao Snapshot" className="h-full object-contain pointer-events-none" />
            </div>
        );
    }

    const randomWobble = () => (Math.random() - 0.5) * 0.2;
    let leftRot: [number, number, number] = [0, Math.PI / 2, 0];
    let rightRot: [number, number, number] = [0, -Math.PI / 2, 0];

    if (luck === '吉') {
        leftRot = [randomWobble(), Math.PI / 2 + randomWobble(), 0];
        rightRot = [Math.PI + randomWobble(), -Math.PI / 2 + randomWobble(), 0]; 
    } else if (luck === '凶') {
        leftRot = [randomWobble(), Math.PI / 2 + randomWobble(), 0];
        rightRot = [randomWobble(), -Math.PI / 2 + randomWobble(), 0];
    } else if (luck === '平' || luck === '吉凶參半') {
        leftRot = [Math.PI + randomWobble(), Math.PI / 2 + randomWobble(), 0];
        rightRot = [Math.PI + randomWobble(), -Math.PI / 2 + randomWobble(), 0];
    }

    return (
        <div className="relative w-full h-36" id="jiao-container">
            <Canvas 
                shadows 
                dpr={[1, 2]} 
                className="w-full h-full z-20" 
                gl={{ preserveDrawingBuffer: true }} 
                id="jiao-canvas"
            >
                <PerspectiveCamera makeDefault position={[0, 1.5, 6]} fov={35} /> 
                <ambientLight intensity={0.5} color="#ffdad4" />
                <directionalLight position={[-2, 5, 2]} intensity={2} castShadow color="#fff0e0" />
                <spotLight position={[5, 8, 5]} angle={0.5} penumbra={1} intensity={3} color="#fff0e0" castShadow />
                <pointLight position={[-5, -5, 5]} intensity={0.5} color="#d32f2f" />
                <CameraRig />
                <Suspense fallback={<Loader />}>
                    <Environment preset="sunset" blur={0.8} background={false} />
                    <group position={[0, 0, 0]}>
                        <group position={[-1.2, 0, 0]}><JiaoBlock3D position={[0, 0, 0]} rotation={leftRot} /></group>
                        <group position={[1.2, 0, 0]}><JiaoBlock3D position={[0, 0, 0]} rotation={rightRot} /></group>
                    </group>
                    <ContactShadows position={[0, -1.5, 0]} opacity={0.5} scale={12} blur={2} far={4} color="#1a0505" />
                </Suspense>
            </Canvas>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] z-10 pointer-events-none"></div>
        </div>
    );
};

function CameraRig() {
    useFrame((state) => { state.camera.lookAt(0, 0, 0); });
    return null;
}

// Seal 元件
const Seal = () => (
    <img 
        src="/image_1bd31c.png" 
        alt="大寶印章" 
        className="h-10 w-auto object-contain flex-shrink-0 block"
        style={{ filter: 'none', boxShadow: 'none' }}
    />
);

// --- 靜態擲筊圖片 ---
const JiaoResultImage = ({ luck }: { luck: string }) => {
    if (luck === '無結果') {
        return (
             <div className="relative w-64 h-32 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border-4 border-dashed border-slate-700/50 flex items-center justify-center relative">
                    <span className="text-4xl font-bold text-slate-500">無</span>
                </div>
            </div>
        );
    }

    let src = '/jiao-ping.png'; 
    if (luck === '吉') src = '/jiao-ji.png';
    else if (luck === '凶') src = '/jiao-xiong.png';

    return (
        <div className="relative w-full h-24 flex items-center justify-center animate-in zoom-in duration-500">
            <img 
                src={src} 
                alt={`${luck}筊`} 
                className="h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<div class="text-white font-bold text-2xl border-2 border-white rounded-full w-20 h-20 flex items-center justify-center">${luck}</div>`;
                }}
            />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] z-[-1] pointer-events-none"></div>
        </div>
    );
};

// --- 預覽視窗 ---
interface SharePreviewModalProps { isOpen: boolean; onClose: () => void; imageUrl: string | null; onDownload: () => void; onSystemShare: () => void; }
const SharePreviewModal: React.FC<SharePreviewModalProps> = ({ isOpen, onClose, imageUrl, onDownload, onSystemShare }) => {
    if (!isOpen) return null;
    
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={18} className="text-purple-400"/> 分享運勢卡片</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                </div>
                
                <div className="p-6 flex justify-center bg-[#020617] min-h-[300px] items-center">
                    {imageUrl ? (
                        <div className="relative shadow-[0_0_30px_rgba(139,92,246,0.3)] rounded-lg overflow-hidden animate-in zoom-in duration-300">
                            <img src={imageUrl} alt="Daily Fortune Card" className="max-h-[50vh] object-contain rounded-lg" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                            <span className="text-sm font-mono tracking-widest animate-pulse">正在繪製卡片...</span>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-700 flex flex-col gap-3">
                    {imageUrl ? (
                        <>
                            <button onClick={onDownload} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"><Download size={18} /> 下載圖片</button>
                            {navigator.share && (<button onClick={onSystemShare} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-slate-700"><Smartphone size={18} /> 系統分享</button>)}
                        </>
                    ) : (
                        <button disabled className="w-full py-3 bg-slate-800 text-slate-500 rounded-xl font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                            準備中...
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- [隱藏的截圖專用卡片] ---
const HiddenCaptureCard = React.forwardRef<HTMLDivElement, { selectedCat: string | null, finalLuck: string, finalKeyword: string, finalContent: string, qrCodeDataUrl: string }>(
    ({ selectedCat, finalLuck, finalKeyword, finalContent, qrCodeDataUrl }, ref) => {
    
    return (
        <div ref={ref} className="bg-[#09090b] w-[380px] rounded-xl border border-white/20 flex flex-col items-center relative overflow-hidden shadow-2xl shrink-0" style={{aspectRatio: '4/5'}}>
            <div className="flex flex-col items-center mt-4 z-10 w-full px-4 shrink-0">
                <div className="text-[9px] text-amber-500/70 font-serif-tc tracking-[0.2em] mb-1">{getArtisticDate()}</div>
                <div className="flex items-center gap-3">
                    <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-500/50"></div>
                    <h2 className="text-lg font-bold text-slate-200 font-serif-tc tracking-widest">{selectedCat}運勢</h2>
                    <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-500/50"></div>
                </div>
            </div>

            <div className="relative z-10 w-full h-24 shrink-0 -my-1 flex items-center justify-center">
                 <JiaoResultImage luck={finalLuck} />
            </div>
            
            <div className="z-10 flex flex-col items-center justify-center shrink-0 mb-2">
                <div className="text-3xl font-black text-white font-serif-tc keyword-glow tracking-[0.2em] ml-2">
                    {finalKeyword}
                </div>
            </div>

            <div className="flex-1 w-full px-6 relative z-10 flex flex-col items-center justify-start overflow-hidden">
                <div className="w-full text-slate-300 text-xs leading-relaxed text-justify font-serif-tc tracking-wide opacity-90 line-clamp-[12]">
                    {finalContent || "暫無說明"}
                </div>
            </div>

            <div className="w-full px-5 py-4 z-10 flex items-end justify-between mt-auto bg-[#09090b] shrink-0">
                <div className="flex items-center gap-2">
                    <div className="bg-white p-1 rounded-md shadow-lg opacity-90 relative overflow-hidden flex items-center justify-center">
                        {/* [終極修正] 將 QR Code 改為 background-image，徹底解決 iOS 下圖片解碼延遲問題 */}
                        <div 
                            style={{
                                width: '36px', 
                                height: '36px', 
                                backgroundImage: `url(${qrCodeDataUrl})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center',
                                // 強制讓瀏覽器認為這是有內容的區塊
                                display: 'block',
                            }} 
                        />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[7px] text-slate-400 font-sans tracking-wider uppercase">SCAN TO PLAY</span>
                        <div className="text-[8px] font-serif-tc tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-100 opacity-90 drop-shadow-[0_1px_2px_rgba(251,191,36,0.3)]">
                            ziweiapp.dabao.life/lucky
                        </div>
                    </div>
                </div>
                <div className="transform scale-90 origin-bottom-right">
                    <Seal />
                </div>
            </div>
        </div>
    );
});


interface LuckyGameProps {
    onClose: () => void;
    isPublicPage?: boolean;
}

export const LuckyDivinationGame: React.FC<LuckyGameProps> = ({ onClose, isPublicPage = false }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('CATEGORY');
    const [selectedCat, setSelectedCat] = useState<Category | null>(null);
    const [breathingText, setBreathingText] = useState('');
    const [canProceed, setCanProceed] = useState(false);
    const [sceneState, setSceneState] = useState<CeremonyState>('black');
    const [skipAnimation, setSkipAnimation] = useState(false);
    const [round, setRound] = useState(0); 
    const [selections, setSelections] = useState<number[]>([]);
    const [bubbles, setBubbles] = useState<{val: number, x: number, y: number, scale: number, delay: number}[]>([]);
    const [finalContent, setFinalContent] = useState<string>('');
    const [finalLuck, setFinalLuck] = useState<string>('平');
    const [finalKeyword, setFinalKeyword] = useState<string>('');
    
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [isLoadingResult, setIsLoadingResult] = useState(false);
    
    const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
    const [shareBlob, setShareBlob] = useState<Blob | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    
    // 儲存 QR Code 的 Base64 字串
    const [qrCodeBase64, setQrCodeBase64] = useState<string>('/qr-lucky.png');

    const [isAdmin, setIsAdmin] = useState(false);

    const hiddenCaptureRef = useRef<HTMLDivElement>(null);
    const resultRef = useRef<HTMLDivElement>(null);

    // 預先載入圖片轉 Base64
    useEffect(() => {
        const loadQrCode = async () => {
            try {
                const response = await fetch('/qr-lucky.png');
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                        setQrCodeBase64(reader.result);
                    }
                };
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error("Failed to preload QR code:", error);
            }
        };
        loadQrCode();

        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email === SUPER_ADMIN_EMAIL) setIsAdmin(true);
        };
        checkAdmin();
    }, []);

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

    const reset = () => { 
        if (isPublicPage) {
            navigate('/');
        } else {
            onClose(); 
            setTimeout(() => { setStep('CATEGORY'); setSelectedCat(null); setSelections([]); setRound(0); setBreathingText(''); setSceneState('black'); }, 500); 
        }
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

    useEffect(() => {
        if (step === 'RESULT' && result && selectedCat) {
            const fetchData = async () => {
                setIsLoadingResult(true);
                try { 
                    const data = await getDivinationResult(selectedCat, result.mingZhi, result.sihuaGan); 
                    if (data) { 
                        setFinalContent(data.content); 
                        setFinalLuck(data.luck); 
                        setFinalKeyword(getKeyword(data.luck)); 
                    } else { 
                        setFinalContent("星象混沌，天機未顯。此時心緒尚不穩，建議靜待時機，改日誠心再占。"); 
                        setFinalLuck('無結果'); 
                        setFinalKeyword(getKeyword('無結果'));
                    } 
                } catch (e) { 
                    console.error("Fetch Error:", e); 
                    setFinalContent("連線異常，無法讀取星象資料。"); 
                    setFinalLuck('無結果');
                    setFinalKeyword('異常'); 
                } finally { setIsLoadingResult(false); }
            };
            fetchData();
        }
    }, [step, result, selectedCat]);

    const handleShare = async () => { 
        setShareImageUrl(null);
        setShareBlob(null);
        setIsShareModalOpen(true);
        setIsGeneratingImg(true); 

        // [iPhone/iOS 修復邏輯]
        setTimeout(async () => {
            try {
                if (!hiddenCaptureRef.current) throw new Error("Hidden card not found");
                
                await document.fonts.ready;

                const images = hiddenCaptureRef.current.querySelectorAll('img');
                await Promise.all(Array.from(images).map(img => {
                    if (img.complete) {
                        return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
                    }
                    return new Promise(resolve => { 
                        img.onload = async () => {
                            if (img.decode) await img.decode().catch(() => {});
                            resolve(null);
                        }; 
                        img.onerror = resolve; 
                    });
                }));

                const options = {
                    pixelRatio: 2, 
                    backgroundColor: '#09090b',
                    width: 380, 
                    style: {
                        opacity: 1, 
                        transform: 'scale(1)',
                    }
                };

                // 4. iOS 緩衝 
                await new Promise(resolve => setTimeout(resolve, 300));

                const dataUrl = await toPng(hiddenCaptureRef.current, options);
                
                const blob = await (await fetch(dataUrl)).blob();
                setShareImageUrl(dataUrl);
                setShareBlob(blob);

            } catch (e) { 
                console.error("Screenshot failed:", e); 
                alert('圖片生成失敗，請稍後再試'); 
                setIsShareModalOpen(false);
            } finally { 
                setIsGeneratingImg(false); 
            }
        }, 100);
    };

    const handleDownload = () => {
        if (!shareImageUrl) return;
        const link = document.createElement('a');
        link.download = `紫微占卜-${selectedCat}-${new Date().getTime()}.png`;
        link.href = shareImageUrl;
        link.click();
    };

    const handleSystemShare = async () => {
        if (!shareBlob || !navigator.share) return;
        const file = new File([shareBlob], 'fortune.png', { type: 'image/png' });
        try { await navigator.share({ title: '紫微占卜結果', files: [file] }); } catch (err) {}
    };

    const isIncenseVisible = ['incense_show', 'light_out', 'igniting', 'smoking', 'text_typing', 'ready'].includes(sceneState);
    const isSpotlightOn = ['light_in', 'incense_show'].includes(sceneState);
    const isIgnited = ['igniting', 'smoking', 'text_typing', 'ready'].includes(sceneState);
    const isSmoking = ['smoking', 'text_typing', 'ready'].includes(sceneState);

    const getSmokeAnimation = () => { if (!isSmoking) return { pathLength: 0, opacity: 0 }; if (sceneState === 'ready') return { pathLength: 1, opacity: 1, d: pStraight }; return { pathLength: 1, opacity: 1, d: [p1, p2, p4, p3, p1] }; };
    const getSmokeTransition = () => { if (sceneState === 'ready') return { d: { duration: 3, ease: "easeInOut" } }; return { pathLength: { duration: 14, ease: "easeOut" }, opacity: { duration: 0.5 }, d: { duration: 14, ease: "easeInOut", repeat: Infinity } }; };

    return (
        <div className="flex flex-col overflow-hidden text-white font-sans h-full w-full relative">
            <SmokeStyles />
            <GlobalStyles />

            <SharePreviewModal 
                isOpen={isShareModalOpen} 
                onClose={() => { setIsShareModalOpen(false); }} 
                imageUrl={shareImageUrl} 
                onDownload={handleDownload} 
                onSystemShare={handleSystemShare} 
            />
            
            {/* [iOS 黑屏與鬼影終極修正] 
               1. 保持在 viewport 內 (left: 0, top: 0) 以確保 iOS 繪製
               2. opacity: 0.01 (肉眼不可見，解決鬼影問題，但 iOS 仍會運算)
               3. pointerEvents: none (讓點擊穿透，不擋住按鈕)
               4. handleShare 裡的 options.style.opacity: 1 確保截圖出來是清楚的
            */}
            <div style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100vw', 
                height: '100vh', 
                zIndex: -9999, 
                opacity: 0.01,         // [重點] 讓它在螢幕上隱形
                pointerEvents: 'none', // [重點] 讓滑鼠/手指可以點擊底下的按鈕
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
            }}>
                <HiddenCaptureCard 
                    ref={hiddenCaptureRef}
                    selectedCat={selectedCat}
                    finalLuck={finalLuck}
                    finalKeyword={finalKeyword}
                    finalContent={finalContent}
                    qrCodeDataUrl={qrCodeBase64}
                />
            </div>

            {step !== 'BREATHING' && step !== 'RESULT' && (
                <div className="p-4 flex justify-between items-center z-50 shrink-0">
                    <div className="flex items-center gap-2 text-slate-400"><Sparkles size={18} /><span className="text-sm font-bold tracking-widest">吉凶占卜</span></div>
                    <div className="flex items-center gap-4">
                        {step === 'CATEGORY' && isAdmin && (
                            <button onClick={() => setSkipAnimation(!skipAnimation)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${skipAnimation ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}>
                                <Zap size={14} className={skipAnimation ? "fill-current" : ""} /><span>速測</span>
                            </button>
                        )}
                        {!isPublicPage && (
                            <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><X size={20} /></button>
                        )}
                    </div>
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
                    <div className="w-full h-full flex flex-col items-center animate-in fade-in duration-1000 relative pt-[calc(env(safe-area-inset-top)+0.5rem)]">
                        {/* 原本顯示給使用者看的卡片 (使用靜態圖) */}
                        <div 
                            ref={resultRef} 
                            className="bg-[#09090b] w-full max-w-sm mx-auto rounded-xl border border-white/20 flex flex-col items-center relative overflow-hidden shadow-2xl shrink-0 bg-noise"
                            style={{aspectRatio: '9/16', maxHeight: '75vh'}}
                        >
                            <div className="effect-layer absolute top-[-50px] left-[-50px] w-[180px] h-[180px] bg-purple-900/30 rounded-full blur-[60px]"></div>
                            <div className="effect-layer absolute bottom-[-50px] right-[-50px] w-[180px] h-[180px] bg-blue-900/30 rounded-full blur-[60px]"></div>
                            
                            <div className="flex flex-col items-center mt-6 z-10 w-full px-4">
                                <div className="text-[10px] text-amber-500/70 font-serif-tc tracking-[0.2em] mb-1">{getArtisticDate()}</div>
                                <div className="flex items-center gap-3">
                                    <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-amber-500/50"></div>
                                    <h2 className="text-xl font-bold text-slate-200 font-serif-tc tracking-widest">{selectedCat}運勢</h2>
                                    <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-amber-500/50"></div>
                                </div>
                            </div>

                            <div className="relative z-10 w-full h-32 shrink-0 -my-2">
                                {/* 這裡顯示靜態圖 */}
                                <JiaoResultImage luck={finalLuck} />
                            </div>
                            
                            <div className="z-10 flex flex-col items-center justify-center shrink-0 mb-3">
                                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="text-4xl font-black text-white font-serif-tc keyword-glow tracking-[0.2em] ml-2">
                                    {finalKeyword}
                                </motion.div>
                            </div>

                            <div className="flex-1 w-full px-8 relative z-10 flex flex-col items-center">
                                <div className="w-full text-slate-300 text-sm leading-7 text-justify font-serif-tc tracking-wide opacity-90 line-clamp-[8]">
                                    {isLoadingResult ? <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div> : (finalContent || "暫無說明")}
                                </div>
                            </div>

                            <div className="w-full px-6 py-5 z-10 flex items-end justify-between mt-auto">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-1 rounded-md shadow-lg opacity-90">
                                        <img src="/qr-lucky.png" alt="Scan to Play" className="w-10 h-10 object-contain block" />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[8px] text-slate-400 font-sans tracking-wider uppercase">SCAN TO PLAY</span>
                                        <div className="text-[9px] font-serif-tc tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-100 opacity-90 drop-shadow-[0_1px_2px_rgba(251,191,36,0.3)]">
                                            ziweiapp.dabao.life/lucky
                                        </div>
                                    </div>
                                </div>
                                <Seal />
                            </div>
                        </div>

                        {/* 底部操作區 */}
                        <div className="flex-1 w-full max-w-sm mx-auto flex flex-col justify-end pb-safe px-4 gap-3 mt-4">
                            <div className="flex gap-2 w-full">
                                <button onClick={handleShare} disabled={isGeneratingImg} className="flex-1 py-3 bg-gradient-to-r from-purple-700 to-indigo-700 text-white rounded-full font-bold shadow-lg shadow-purple-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 font-serif-tc tracking-widest border border-white/10 text-sm">
                                    {isGeneratingImg ? <><Loader2 className="animate-spin" size={16}/> 繪製中...</> : <><Share2 size={16} /> 分享</>}
                                </button>
                                
                                {isPublicPage ? (
                                    <button onClick={() => navigate('/')} className="flex-[2] py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full font-bold shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 font-serif-tc tracking-widest border border-white/10 text-sm">
                                        免費註冊，掌握每日運勢 <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => window.open(LINE_OA_URL, '_blank')} className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full font-bold shadow-lg shadow-emerald-900/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 font-serif-tc tracking-widest border border-white/10 text-sm">
                                            <MessageCircle size={16} /> 預約
                                        </button>
                                        <button onClick={reset} className="flex-1 py-3 bg-white/10 text-slate-300 rounded-full hover:bg-white/20 transition-all flex items-center justify-center gap-2 font-serif-tc tracking-widest border border-white/10 text-sm">
                                            關閉
                                        </button>
                                    </>
                                )}
                            </div>
                            
                            <div className="flex flex-col items-center justify-center gap-1 text-[10px] text-slate-500 mb-2 text-center">
                                <div className="flex items-center gap-1.5">
                                    <AlertCircle size={10} />
                                    <span>結果供一時參考，一週內一事不二問</span>
                                </div>
                                <span className="opacity-70">詳盡運勢分析歡迎預約</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};