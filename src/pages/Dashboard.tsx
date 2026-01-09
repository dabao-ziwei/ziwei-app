import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Menu, LogOut, UserCog, Loader2, PlusCircle, Database, FileText, Calendar, Clock, HelpCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { loadClients, saveClient, getMyProfile, getUsedChartCount, type Client, type UserProfile } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, type DailyFortune } from '../logic/fortune';
import { FortuneWidget } from '../components/FortuneWidget';
import { UserManagementModal } from '../components/UserManagementModal';
import { LuckyDivinationModal } from '../components/LuckyDivinationModal';
import { ZHI } from '../logic/constants';
import { getFeaturePermission } from '../logic/permissions';

const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

// --- 新手引導精靈元件 (Wizard) ---
interface WizardProps {
    userProfile: UserProfile | null;
    onComplete: (data: any) => Promise<void>;
    onCancelTest: () => void;
    isTestMode: boolean;
}

const OnboardingWizard: React.FC<WizardProps> = ({ userProfile, onComplete, onCancelTest, isTestMode }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [formData, setFormData] = useState({
        name: '',
        gender: '' as '男' | '女' | '',
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0
    });
    
    // 時間輸入模式: 'precise'(精確) | 'zhi'(時辰) | 'unsure'(不確定)
    const [timeMode, setTimeMode] = useState<'precise' | 'zhi' | 'unsure'>('precise');
    const [loadingText, setLoadingText] = useState('正在連結星曜數據...');

    // 動畫控制與送出邏輯
    useEffect(() => {
        if (step === 4) {
            const sequence = [
                { t: 0, msg: '正在連結星曜數據...' },
                { t: 800, msg: '正在推算命宮位置...' },
                { t: 1600, msg: '正在分析本週運勢能量...' },
            ];
            
            // 播放文字動畫
            const timers = sequence.map(({ t, msg }) => {
                return setTimeout(() => setLoadingText(msg), t);
            });

            // 2.5秒後執行完成，並加入錯誤處理
            const finalTimer = setTimeout(async () => {
                try {
                    await onComplete(formData);
                } catch (error) {
                    console.error("Setup failed:", error);
                    alert("建立失敗，請檢查網路連線後重試。");
                    // 失敗時退回上一步 (Step 3)，避免卡死在 Loading
                    setStep(3);
                }
            }, 2500);

            return () => {
                timers.forEach(t => clearTimeout(t));
                clearTimeout(finalTimer);
            };
        }
    }, [step, formData, onComplete]);

    const handleNext = () => {
        if (step === 1 && !formData.name) return alert('請輸入您的稱呼');
        if (step === 2 && !formData.gender) return alert('請選擇性別');
        setStep(prev => (prev + 1) as any);
    };

    const handleZhiSelect = (zhiIdx: number) => {
        // 地支對應的小時 (取中間值，例如子時取 0, 丑時取 2)
        const hour = zhiIdx === 0 ? 0 : zhiIdx * 2; 
        setFormData({ ...formData, hour, minute: 0 });
    };

    const handleUnsure = () => {
        // 不確定時，預設取子時 (0點)
        setFormData({ ...formData, hour: 0, minute: 0 });
        setStep(4); // 直接進入運算
    };

    const handleFinalSubmit = () => {
        // 防止年份為空或無效時送出
        if (!formData.year || isNaN(Number(formData.year))) {
            alert("請輸入有效的出生年份");
            return;
        }
        setStep(4);
    };
    
    // Refs for input focus
    const yearRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: any) => void, maxLen: number, nextRef?: React.RefObject<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, maxLen);
        setter(val === '' ? '' : parseInt(val));
        if (val.length === maxLen && nextRef?.current) {
             nextRef.current.focus();
             nextRef.current.select();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentVal: any, prevRef?: React.RefObject<HTMLInputElement>) => {
         if (e.key === 'Backspace' && (currentVal === '' || currentVal === 0) && prevRef?.current) {
             prevRef.current.focus();
         }
    };

    // Step 1: 歡迎與稱呼
    if (step === 1) {
        return (
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 relative text-slate-800">
                {isTestMode && <button onClick={onCancelTest} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"><PlusCircle size={20} className="rotate-45"/></button>}
                <div className="p-8 pt-12 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2">
                        <Sparkles size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">歡迎來到 AI紫微斗數<br/><span className="text-lg font-medium text-slate-500">智能命理分析系統</span></h1>
                        <p className="text-slate-400 text-sm mt-4">請問我們該怎麼稱呼您？</p>
                    </div>
                    <div className="w-full">
                        <input 
                            type="text" 
                            autoFocus
                            className="w-full text-center text-2xl font-bold border-b-2 border-blue-100 py-2 focus:border-blue-500 outline-none bg-transparent placeholder:text-slate-200 text-slate-700 transition-colors"
                            placeholder="輸入您的暱稱"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && handleNext()}
                        />
                    </div>
                    <button onClick={handleNext} disabled={!formData.name} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                        下一步 <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: 性別選擇
    if (step === 2) {
        return (
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300 relative text-slate-800">
                <button onClick={() => setStep(1)} className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs font-bold"><ArrowRight size={14} className="rotate-180"/> 上一步</button>
                <div className="p-8 pt-12 flex flex-col items-center text-center space-y-6">
                    <h2 className="text-xl font-bold text-slate-800">請問您的性別？</h2>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            onClick={() => { setFormData({...formData, gender: '男'}); setTimeout(() => setStep(3), 200); }}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group ${formData.gender === '男' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">♂</div>
                            <span className="font-bold text-slate-700">男性</span>
                        </button>
                        <button 
                            onClick={() => { setFormData({...formData, gender: '女'}); setTimeout(() => setStep(3), 200); }}
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group ${formData.gender === '女' ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200' : 'border-slate-100 hover:border-pink-200 hover:bg-slate-50'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">♀</div>
                            <span className="font-bold text-slate-700">女性</span>
                        </button>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-xs text-amber-700 text-left leading-relaxed flex gap-2">
                        <Sparkles size={14} className="shrink-0 mt-0.5" />
                        紫微斗數中，男女的排盤方式大不相同，這會影響系統分析的運勢走向。
                    </div>
                </div>
            </div>
        );
    }

    // Step 3: 出生資料 (核心)
    if (step === 3) {
        return (
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300 relative text-slate-800">
                <button onClick={() => setStep(2)} className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs font-bold"><ArrowRight size={14} className="rotate-180"/> 上一步</button>
                
                <div className="p-6 pt-12 flex flex-col space-y-5">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-slate-800">您的出生時間？</h2>
                        <p className="text-slate-400 text-xs mt-1">這是排盤最關鍵的資料</p>
                    </div>

                    {/* 日期選擇 */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500">
                            <Calendar size={14}/> 出生日期 (西元)
                        </div>
                        <div className="flex gap-2">
                            <input 
                                ref={yearRef}
                                type="number" 
                                className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-center bg-white" 
                                placeholder="年" 
                                value={formData.year} 
                                onChange={e => handleDateInput(e, v => setFormData({...formData, year: v}), 4, monthRef)}
                                onKeyDown={e => handleKeyDown(e, formData.year)}
                            />
                            <select className="w-20 border rounded-lg px-1 py-2 bg-white text-center" value={formData.month} onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}>
                                {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)}
                            </select>
                            <select className="w-20 border rounded-lg px-1 py-2 bg-white text-center" value={formData.day} onChange={e => setFormData({...formData, day: parseInt(e.target.value)})}>
                                {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}日</option>)}
                            </select>
                        </div>
                    </div>

                    {/* 時間輸入模式切換 (膠囊) */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setTimeMode('precise')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${timeMode === 'precise' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>精確時間</button>
                        <button onClick={() => setTimeMode('zhi')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${timeMode === 'zhi' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>只知時辰</button>
                        <button onClick={() => setTimeMode('unsure')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${timeMode === 'unsure' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>我不確定</button>
                    </div>

                    {/* 根據模式顯示內容 */}
                    <div className="min-h-[140px]">
                        {timeMode === 'precise' && (
                            <div className="space-y-3 animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                    <Clock size={14}/> 輸入時間
                                </div>
                                <div className="flex gap-3 items-center justify-center py-4">
                                    <div className="flex flex-col items-center">
                                        <select className="w-24 text-lg font-bold border-2 border-blue-100 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-500" value={formData.hour} onChange={e => setFormData({...formData, hour: parseInt(e.target.value)})}>
                                            {Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{h} 點</option>)}
                                        </select>
                                    </div>
                                    <span className="text-xl font-bold text-slate-300">:</span>
                                    <div className="flex flex-col items-center">
                                        <input 
                                            ref={minuteRef}
                                            type="number" 
                                            className="w-24 text-lg font-bold border-2 border-blue-100 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-500 text-center" 
                                            placeholder="分" 
                                            value={formData.minute} 
                                            onChange={e => handleDateInput(e, v => setFormData({...formData, minute: v}), 2)} 
                                            onKeyDown={e => handleKeyDown(e, formData.minute)}
                                        />
                                    </div>
                                </div>
                                <div className="text-center text-xs text-slate-400">
                                    對應時辰：<span className="font-bold text-blue-600">{ZHI[Math.floor((formData.hour + 1) / 2) % 12]}時</span>
                                </div>
                            </div>
                        )}

                        {timeMode === 'zhi' && (
                            <div className="animate-in fade-in zoom-in duration-200">
                                <div className="grid grid-cols-6 gap-2">
                                    {ZHI.map((z, idx) => {
                                        const currentZhiIdx = Math.floor((formData.hour + 1) / 2) % 12;
                                        const isSelected = currentZhiIdx === idx;
                                        return (
                                            <button 
                                                key={z} 
                                                onClick={() => handleZhiSelect(idx)}
                                                className={`py-2 rounded-lg border transition-all text-sm font-bold flex flex-col items-center justify-center ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                            >
                                                <span>{z}</span>
                                                <span className={`text-[9px] scale-90 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                                    {idx===0 ? '23-01' : `${(idx*2-1).toString().padStart(2,'0')}-${(idx*2+1).toString().padStart(2,'0')}`}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-center text-slate-400 mt-2">*系統將自動帶入時辰的中間時間進行排盤</p>
                            </div>
                        )}

                        {timeMode === 'unsure' && (
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-800 text-sm leading-relaxed animate-in fade-in zoom-in duration-200">
                                <div className="flex items-start gap-2 mb-2">
                                    <HelpCircle size={18} className="shrink-0 mt-0.5 text-orange-500" />
                                    <span className="font-bold">別擔心...</span>
                                </div>
                                <p className="mb-2">沒關係，我們先幫您預設一個時間，讓您先體驗運勢的流動。</p>
                                <p className="opacity-80 text-xs">命盤就像人生的導航，輸入的座標越精準，導航就越準確。等您確認時間後，隨時可以回來校正。</p>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={timeMode === 'unsure' ? handleUnsure : handleFinalSubmit}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                        <Sparkles size={18} />
                        {timeMode === 'unsure' ? '先用預設時間體驗' : '開始分析運勢'}
                    </button>
                </div>
            </div>
        );
    }

    // Step 4: Loading (儀式感過場)
    if (step === 4) {
        return (
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in duration-500 flex flex-col items-center justify-center py-20 px-8 text-center relative text-slate-800">
                {/* 背景裝飾 */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
                
                <div className="relative mb-8">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center animate-pulse">
                        <Sparkles size={40} className="text-blue-500 animate-spin-slow" />
                    </div>
                    <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-100 rounded-full border-t-blue-500 animate-spin" />
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300 key={loadingText}">
                    {loadingText}
                </h3>
                <p className="text-slate-400 text-sm">正在為您繪製專屬命盤...</p>
            </div>
        );
    }

    return null;
};


// --- 主頁面 Dashboard ---

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meClient, setMeClient] = useState<Client | null>(null);
  const [dailyFortune, setDailyFortune] = useState<DailyFortune | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [isLuckyDivinationOpen, setIsLuckyDivinationOpen] = useState(false);

  const [forceOnboarding, setForceOnboarding] = useState(false);

  const initDashboard = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const profile = await getMyProfile();
        setUserProfile(profile);
        
        const allClients = await loadClients();
        const loadedClients = Array.isArray(allClients) ? allClients : [];

        // 尋找「我」的命盤
        const myCharts = loadedClients.filter(c => {
            const currentUserId = profile?.id || user?.id;
            const isOwner = c.user_id === currentUserId;
            const cleanType = (c.type || '').trim();
            return isOwner && (cleanType === '我' || cleanType === 'Me');
        });

        if (myCharts.length > 0) {
            const target = myCharts[0];
            setMeClient(target);
            try {
                const engine = new ZiWeiEngine(
                    target.birthYear, target.birthMonth, target.birthDay, 
                    target.birthHour, target.birthMinute, target.gender
                );
                const fortune = calculateDailyFortune(engine);
                setDailyFortune(fortune);
            } catch (e) {
                console.error("Fortune calculation error", e);
            }
        }
    } catch (e) {
        console.error("Init error", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    initDashboard();
  }, []);

  const handleWizardComplete = async (data: any) => {
    try {
        // 在儲存前，先使用 ZiWeiEngine 計算命宮主星
        const engine = new ZiWeiEngine(
            Number(data.year), data.month, data.day,
            data.hour, data.minute, data.gender
        );
        const chart = engine.getChartData();
        const mingPos = engine.getMingPos();
        const mingPalace = chart.palaces[mingPos];
        const majorStarNames = mingPalace.majorStars.map(s => s.name).join('') || '無主星';

        const newClient = {
            id: '', 
            name: data.name,
            gender: data.gender,
            type: '我',
            birthYear: Number(data.year),
            birthMonth: data.month,
            birthDay: data.day,
            birthHour: data.hour,
            birthMinute: data.minute,
            bornCity: '',
            tags: [],
            user_id: userProfile?.id,
            majorStars: majorStarNames 
        };
        await saveClient(newClient);
        
        setForceOnboarding(false);
        await initDashboard();
    } catch (e) {
        throw e;
    }
  };

  const canLuckyDivination = useMemo(() => getFeaturePermission(userProfile, 'lucky_divination'), [userProfile]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-slate-500" /></div>;

  return (
    // [修改] 全局背景改為深色
    <div className="h-screen w-full bg-slate-950 flex flex-col font-sans overflow-hidden relative text-white">
        
        {/* 背景光暈特效 */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header - [修改] 透明背景，文字改白，加入右側導航按鈕 (電腦版) */}
        <header className="shrink-0 px-6 py-4 flex justify-between items-center z-50">
            {/* 左側容器：包含漢堡選單 與 標題 */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    {/* 漢堡選單：保留給管理功能，但隱藏主要入口 */}
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="w-10 h-10 bg-white/10 hover:bg-white/20 text-slate-300 transition-colors rounded-xl flex items-center justify-center backdrop-blur-md"
                    >
                        <Menu size={20} />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute top-12 left-0 w-60 bg-slate-900/95 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50 backdrop-blur-xl">
                            {userProfile?.role === 'admin' && (
                                <button 
                                    onClick={() => { setIsUserMgmtOpen(true); setIsMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-slate-300 font-medium"
                                >
                                    <UserCog size={16} /> 使用者管理
                                </button>
                            )}

                            {(userProfile?.role === 'admin' || userProfile?.email === SUPER_ADMIN_EMAIL) && (
                                <button
                                    onClick={() => {
                                        navigate('/admin');
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-slate-300 font-medium"
                                >
                                    <Database size={16} /> 占卜文案矩陣
                                </button>
                            )}

                            {userProfile?.email === SUPER_ADMIN_EMAIL && (
                                <button 
                                    onClick={() => { 
                                        setForceOnboarding(true); 
                                        setIsMenuOpen(false); 
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-amber-500/10 flex items-center gap-2 text-amber-500 font-medium border-t border-slate-800"
                                >
                                    <PlusCircle size={16} /> [測試] 新手引導流程
                                </button>
                            )}

                            <button 
                                onClick={() => supabase.auth.signOut()}
                                className="w-full text-left px-4 py-3 hover:bg-red-500/10 flex items-center gap-2 text-red-400 font-medium border-t border-slate-800"
                            >
                                <LogOut size={16} /> 登出系統
                            </button>
                        </div>
                    )}
                    {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>}
                </div>

                {/* 標題 - 在手機與電腦版皆顯示，並位於漢堡選單右側 */}
                <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 tracking-widest">
                    大寶 | 紫微斗數
                </h1>
            </div>

            {/* 右側容器：電腦版導航按鈕 */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-3">
                    <button 
                        onClick={() => navigate('/list')}
                        className="px-4 py-2 bg-slate-800/50 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 hover:border-blue-500/30"
                    >
                        <FileText size={16} /> 命盤列表
                    </button>
                    <button 
                        onClick={() => { if (canLuckyDivination === 'enabled') setIsLuckyDivinationOpen(true); }}
                        disabled={canLuckyDivination === 'disabled'}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50
                            ${canLuckyDivination === 'enabled' 
                                ? 'bg-slate-800/50 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 hover:border-purple-500/30' 
                                : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'}
                        `}
                    >
                        <Sparkles size={16} /> 吉凶占卜
                    </button>
                </div>
            </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto relative z-10">
            {/* [修改] 寬度限制放寬至 max-w-7xl，讓左右分欄有空間 */}
            <div className="max-w-7xl mx-auto p-4 flex flex-col items-center">
                {meClient && !forceOnboarding ? (
                    <>
                        {/* 今日運勢 Widget - 包含果凍圖與下方的指引卡片 */}
                        {dailyFortune && (
                            <div className="w-full animate-in fade-in duration-700">
                                <FortuneWidget 
                                    userProfile={userProfile} 
                                    client={meClient} 
                                    clientName={meClient.name}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="mt-6 w-full flex justify-center">
                         <OnboardingWizard 
                            userProfile={userProfile}
                            onComplete={handleWizardComplete}
                            onCancelTest={() => setForceOnboarding(false)}
                            isTestMode={forceOnboarding}
                        />
                    </div>
                )}
            </div>
        </main>
        
        {/* [新增] Bottom Tab Bar (手機版核心導航) - md:hidden */}
        {/* [修改] justify-around -> justify-evenly 並移除空白 div */}
        <div className="shrink-0 px-6 py-4 pb-8 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5 flex justify-evenly items-center z-50 md:hidden">
            <button 
                onClick={() => navigate('/list')}
                className="flex flex-col items-center gap-1 group w-16"
            >
                <div className="w-10 h-10 rounded-2xl bg-slate-800/50 group-hover:bg-blue-600/20 flex items-center justify-center transition-colors">
                    <FileText size={20} className="text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
                <span className="text-[10px] text-slate-500 group-hover:text-blue-400 font-bold">命盤列表</span>
            </button>

            <button 
                onClick={() => {
                    if (canLuckyDivination === 'enabled') setIsLuckyDivinationOpen(true);
                }}
                disabled={canLuckyDivination === 'disabled'}
                className="flex flex-col items-center gap-1 group w-16"
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all mb-[-10px] transform translate-y-[-10px] shadow-lg
                    ${canLuckyDivination === 'enabled' 
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-purple-900/50 hover:scale-110' 
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
                `}>
                    <Sparkles size={24} />
                </div>
                <span className={`text-[10px] font-bold ${canLuckyDivination === 'enabled' ? 'text-purple-400' : 'text-slate-600'}`}>吉凶占卜</span>
            </button>
        </div>

        <UserManagementModal 
            isOpen={isUserMgmtOpen} 
            onClose={() => setIsUserMgmtOpen(false)} 
        />

        <LuckyDivinationModal 
            isOpen={isLuckyDivinationOpen} 
            onClose={() => setIsLuckyDivinationOpen(false)} 
        />
    </div>
  );
};