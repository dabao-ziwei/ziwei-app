import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, Menu, LogOut, Loader2, PlusCircle, 
    FileText, Globe, Sliders, Coins, Gift, ShoppingCart, ArrowRight
} from 'lucide-react';
import { supabase } from '../supabase';
import { 
    loadClients, saveClient, getMyProfile, checkIsSuperAdmin, 
    type Client, type UserProfile, consumeDivinationV2, 
    claimWelcomeGift, getFeatureRuntime
} from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, type DailyFortune } from '../logic/fortune';
import { FortuneWidget } from '../components/FortuneWidget';
import { LuckyDivinationModal } from '../components/LuckyDivinationModal';
import { LuckyDivinationGame } from '../components/LuckyDivinationGame';
import { getFeaturePermission } from '../logic/permissions';
import { usePaywall, type PaywallMode } from '../hooks/usePaywall';
import PaywallModal from '../components/Paywall/PaywallModal';

const OFFICIAL_SITE_URL = 'https://www.dabao.life';

interface WizardProps {
    userProfile: UserProfile | null;
    onComplete: (data: any) => Promise<void>;
    onCancelTest: () => void;
    isTestMode: boolean;
}

// [修正] 優化後的精靈元件：包含完整的時間輸入與自動跳焦點邏輯
const OnboardingWizard: React.FC<WizardProps> = ({ userProfile, onComplete, onCancelTest, isTestMode }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    // 改用 string 方便輸入處理，最後送出再轉 number
    const [formData, setFormData] = useState({ 
        name: '', 
        gender: '' as '男'|'女'|'', 
        year: '', month: '', day: '', hour: '', minute: '' 
    });
    const [loadingText, setLoadingText] = useState('正在連結星曜數據...');

    // Refs 用於自動跳焦點
    const yearRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);

    // 自動聚焦
    useEffect(() => {
        if (step === 3) {
            setTimeout(() => yearRef.current?.focus(), 100);
        }
    }, [step]);

    useEffect(() => {
        if (step === 4) {
            const sequence = [{t:0,msg:'正在連結星曜數據...'},{t:800,msg:'正在推算命宮位置...'},{t:1600,msg:'正在分析本週運勢能量...'}];
            const timers = sequence.map(({t,msg})=>setTimeout(()=>setLoadingText(msg),t));
            
            const finalTimer = setTimeout(async () => {
                try {
                    // 轉回數字格式
                    const finalData = {
                        ...formData,
                        year: parseInt(formData.year),
                        month: parseInt(formData.month),
                        day: parseInt(formData.day),
                        hour: parseInt(formData.hour || '0'),
                        minute: parseInt(formData.minute || '0')
                    };
                    await onComplete(finalData);
                } catch(e) {
                    console.error(e);
                    // alert('發生錯誤，請檢查資料'); // 避免干擾，通常 onComplete 會處理
                    setStep(3);
                }
            }, 2500);

            return ()=>{timers.forEach(clearTimeout);clearTimeout(finalTimer);};
        }
    }, [step, formData, onComplete]);

    // 輸入處理：限制長度並自動跳下一格
    const handleDateInput = (
        e: React.ChangeEvent<HTMLInputElement>, 
        field: keyof typeof formData, 
        maxLen: number, 
        nextRef?: React.RefObject<HTMLInputElement>
    ) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, maxLen);
        setFormData(prev => ({ ...prev, [field]: val }));
        
        if (val.length === maxLen && nextRef?.current) {
            nextRef.current.focus();
            nextRef.current.select();
        }
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        currentVal: string,
        prevRef?: React.RefObject<HTMLInputElement>
    ) => {
        if (e.key === 'Backspace' && currentVal === '' && prevRef?.current) {
            e.preventDefault();
            prevRef.current.focus();
        }
        if (e.key === 'Enter') {
            if (step === 1 && formData.name) handleNext();
            if (step === 3) handleFinalSubmit();
        }
    };

    const handleNext = () => { 
        if (step === 1 && !formData.name) return alert('請輸入您的稱呼'); 
        if (step === 2 && !formData.gender) return alert('請選擇性別'); 
        setStep(prev => (prev + 1) as any); 
    };

    const handleFinalSubmit = () => { 
        if (!formData.year || !formData.month || !formData.day) return alert("請輸入完整的出生日期"); 
        setStep(4); 
    };
    
    // Step 1: 姓名
    if(step===1) return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800 animate-in fade-in zoom-in duration-300">
            <h1 className="text-2xl font-bold mb-4 text-slate-900">歡迎來到大寶紫微</h1>
            <p className="text-slate-500 mb-8 text-sm">首先，請問該如何稱呼您？</p>
            <input 
                autoFocus
                className="w-full border-b-2 text-center text-2xl p-2 mb-8 outline-none border-blue-100 focus:border-blue-500 transition-colors bg-transparent text-slate-800 placeholder:text-slate-300" 
                placeholder="您的暱稱" 
                value={formData.name} 
                onChange={e=>setFormData({...formData,name:e.target.value})}
                onKeyDown={e => handleKeyDown(e, formData.name)}
            />
            <button onClick={handleNext} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group">
                下一步 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
            </button>
        </div>
    );
    
    // Step 2: 性別
    if(step===2) return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800 animate-in slide-in-from-right duration-300">
            <h1 className="text-2xl font-bold mb-8 text-slate-900">您的生理性別是？</h1>
            <div className="flex gap-4 mb-6">
                <button 
                    onClick={()=>{setFormData({...formData,gender:'男'});setTimeout(()=>setStep(3),200)}} 
                    className="flex-1 p-6 border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-slate-400 hover:text-blue-600 text-xl flex flex-col items-center gap-3 group"
                >
                    <span className="text-4xl grayscale group-hover:grayscale-0 transition-all">👨</span> 
                    <span>男</span>
                </button>
                <button 
                    onClick={()=>{setFormData({...formData,gender:'女'});setTimeout(()=>setStep(3),200)}} 
                    className="flex-1 p-6 border-2 border-slate-100 rounded-2xl hover:border-pink-500 hover:bg-pink-50 transition-all font-bold text-slate-400 hover:text-pink-600 text-xl flex flex-col items-center gap-3 group"
                >
                    <span className="text-4xl grayscale group-hover:grayscale-0 transition-all">👩</span> 
                    <span>女</span>
                </button>
            </div>
            <button onClick={()=>setStep(1)} className="text-slate-400 text-sm hover:text-slate-600">回上一步</button>
        </div>
    );
    
    // Step 3: 出生時間 (恢復好用的介面)
    if(step===3) return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800 animate-in slide-in-from-right duration-300">
            <h1 className="text-2xl font-bold mb-2 text-slate-900">出生時間</h1>
            <p className="text-xs text-slate-400 mb-8">請輸入西元出生年月日時分</p>
            
            <div className="space-y-6 mb-10">
                {/* 年月日 */}
                <div className="flex items-center justify-center gap-2">
                    <div className="flex flex-col gap-1 w-24">
                        <input 
                            ref={yearRef}
                            type="tel" 
                            className="w-full border-b-2 border-slate-200 p-2 text-center text-2xl outline-none focus:border-blue-500 bg-transparent font-mono text-slate-800 placeholder:text-slate-200" 
                            placeholder="YYYY" 
                            value={formData.year} 
                            onChange={e=>handleDateInput(e, 'year', 4, monthRef)}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">年</span>
                    </div>
                    <span className="text-slate-300 text-xl -mt-4">/</span>
                    <div className="flex flex-col gap-1 w-16">
                        <input 
                            ref={monthRef}
                            type="tel" 
                            className="w-full border-b-2 border-slate-200 p-2 text-center text-2xl outline-none focus:border-blue-500 bg-transparent font-mono text-slate-800 placeholder:text-slate-200" 
                            placeholder="MM" 
                            value={formData.month} 
                            onChange={e=>handleDateInput(e, 'month', 2, dayRef)}
                            onKeyDown={e=>handleKeyDown(e, formData.month, yearRef)}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">月</span>
                    </div>
                    <span className="text-slate-300 text-xl -mt-4">/</span>
                    <div className="flex flex-col gap-1 w-16">
                        <input 
                            ref={dayRef}
                            type="tel" 
                            className="w-full border-b-2 border-slate-200 p-2 text-center text-2xl outline-none focus:border-blue-500 bg-transparent font-mono text-slate-800 placeholder:text-slate-200" 
                            placeholder="DD" 
                            value={formData.day} 
                            onChange={e=>handleDateInput(e, 'day', 2, hourRef)}
                            onKeyDown={e=>handleKeyDown(e, formData.day, monthRef)}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">日</span>
                    </div>
                </div>

                {/* 時分 */}
                <div className="flex items-center justify-center gap-2">
                    <div className="flex flex-col gap-1 w-20">
                        <input 
                            ref={hourRef}
                            type="tel" 
                            className="w-full border-b-2 border-slate-200 p-2 text-center text-2xl outline-none focus:border-blue-500 bg-transparent font-mono text-slate-800 placeholder:text-slate-200" 
                            placeholder="00" 
                            value={formData.hour} 
                            onChange={e=>handleDateInput(e, 'hour', 2, minuteRef)}
                            onKeyDown={e=>handleKeyDown(e, formData.hour, dayRef)}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">時 (24H)</span>
                    </div>
                    <span className="text-slate-300 text-xl -mt-4">:</span>
                    <div className="flex flex-col gap-1 w-20">
                        <input 
                            ref={minuteRef}
                            type="tel" 
                            className="w-full border-b-2 border-slate-200 p-2 text-center text-2xl outline-none focus:border-blue-500 bg-transparent font-mono text-slate-800 placeholder:text-slate-200" 
                            placeholder="00" 
                            value={formData.minute} 
                            onChange={e=>handleDateInput(e, 'minute', 2)}
                            onKeyDown={e=>handleKeyDown(e, formData.minute, hourRef)}
                        />
                        <span className="text-[10px] text-slate-400 font-bold">分</span>
                    </div>
                </div>
            </div>

            <button onClick={handleFinalSubmit} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 mb-4">
                開始分析命盤
            </button>
            <button onClick={()=>setStep(2)} className="text-slate-400 text-sm hover:text-slate-600">回上一步</button>
            
            {isTestMode && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                    <button onClick={onCancelTest} className="text-xs text-red-400 hover:text-red-600">
                        取消測試模式
                    </button>
                </div>
            )}
        </div>
    );
    
    // Step 4: Loading
    return (
        <div className="text-white text-center mt-32 animate-in fade-in duration-700">
            <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto text-purple-400 animate-pulse" size={32} />
            </div>
            <h2 className="text-2xl font-bold tracking-widest mb-2">{loadingText}</h2>
            <p className="text-purple-300/60 text-sm">AI 正在運算您的命盤軌跡...</p>
        </div>
    );
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meClient, setMeClient] = useState<Client | null>(null);
  const [dailyFortune, setDailyFortune] = useState<DailyFortune | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);

  // 權限與 Paywall 相關
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallMode, setPaywallMode] = useState<PaywallMode>('CONFIRM_DEDUCT');
  const { checkAccess } = usePaywall(userProfile);
  const canLuckyDivination = useMemo(() => getFeaturePermission(userProfile, 'lucky_divination'), [userProfile]);

  // 新功能狀態
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showCostConfirm, setShowCostConfirm] = useState(false);
  const [divinationCost, setDivinationCost] = useState(50);
  const [isProcessingDivination, setIsProcessingDivination] = useState(false);

  const initDashboard = async () => {
    setLoading(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        const profile = await getMyProfile();
        setUserProfile(profile);

        if (profile && profile.has_claimed_welcome_gift === false) {
            setShowGiftModal(true);
        }

        const allClients = await loadClients();
        const myCharts = (allClients || []).filter(c => {
            const currentUserId = profile?.id || user?.id;
            const isOwner = c.user_id === currentUserId;
            return isOwner && ((c.type || '').trim() === '我' || (c.type || '').trim() === 'Me');
        });

        if (myCharts.length > 0) {
            const target = myCharts[0];
            setMeClient(target);
            try {
                const engine = new ZiWeiEngine(target.birthYear, target.birthMonth, target.birthDay, target.birthHour, target.birthMinute, target.gender);
                const fortune = calculateDailyFortune(engine);
                setDailyFortune(fortune);
            } catch (e) { console.error(e); }
        }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { initDashboard(); }, []);

  const handleWizardComplete = async (data: any) => {
    try {
        const engine = new ZiWeiEngine(Number(data.year), data.month, data.day, data.hour, data.minute, data.gender);
        const chart = engine.getChartData();
        const mingPalace = chart.palaces[engine.getMingPos()];
        const majorStarNames = mingPalace.majorStars.map(s => s.name).join('') || '無主星';
        const newClient = { id: '', name: data.name, gender: data.gender, type: '我', birthYear: Number(data.year), birthMonth: data.month, birthDay: data.day, birthHour: data.hour, birthMinute: data.minute, bornCity: '', tags: [], user_id: userProfile?.id, majorStars: majorStarNames };
        await saveClient(newClient);
        setForceOnboarding(false);
        await initDashboard();
    } catch (e) { throw e; }
  };

  const handleClaimGift = async () => {
      const success = await claimWelcomeGift();
      if (success) {
          setShowGiftModal(false);
          const updated = await getMyProfile(); 
          setUserProfile(updated);
          alert('🎉 領取成功！您已獲得 99 點，可立即體驗吉凶占卜。');
      } else {
          alert('領取失敗，請稍後再試');
      }
  };

  const handleDivinationClick = async () => {
    if (canLuckyDivination !== 'enabled') return;

    const config = await getFeatureRuntime('lucky_divination');
    
    if (config && !config.is_paid) {
        setIsGameOpen(true);
        return;
    }
    
    const cost = config?.price || 50;
    setDivinationCost(cost);
    setShowCostConfirm(true);
  };

  const handleConfirmDivination = async () => {
    setIsProcessingDivination(true);
    
    const result = await consumeDivinationV2();
    
    setIsProcessingDivination(false);
    setShowCostConfirm(false);

    if (result.success) {
        if (result.newBalance !== undefined && userProfile) {
            setUserProfile({ ...userProfile, points_balance: result.newBalance });
        }
        setIsGameOpen(true);
    } else {
        if (confirm(`點數不足！此服務需要 ${divinationCost} 點，您的餘額不足。\n\n是否前往商店儲值？`)) {
            navigate('/store'); 
        }
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-slate-500" /></div>;

  if (isGameOpen) {
      return (
          <div className="fixed inset-0 z-[100] bg-black">
              <LuckyDivinationGame onClose={() => setIsGameOpen(false)} />
          </div>
      );
  }

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col font-sans overflow-hidden relative text-white">
        
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

        <header className="shrink-0 px-6 py-4 flex justify-between items-center z-50 bg-[#0f172a]/50 backdrop-blur-md sticky top-0 border-b border-white/5">
            <div className="flex items-center gap-3">
                <div className="relative">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-10 h-10 bg-white/10 hover:bg-white/20 text-slate-300 transition-colors rounded-xl flex items-center justify-center backdrop-blur-md">
                        <Menu size={20} />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute top-12 left-0 w-60 bg-slate-900/95 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50 backdrop-blur-xl">
                            {(userProfile?.role === 'admin' || checkIsSuperAdmin(userProfile?.email)) && (
                                <button
                                    onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-slate-300 font-medium"
                                >
                                    <Sliders size={16} /> 後台管理
                                </button>
                            )}
                            {checkIsSuperAdmin(userProfile?.email) && (
                                <button onClick={() => { setForceOnboarding(true); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-amber-500/10 flex items-center gap-2 text-amber-500 font-medium border-t border-slate-800"><PlusCircle size={16} /> [測試] 新手引導</button>
                            )}
                            <button onClick={() => supabase.auth.signOut()} className="w-full text-left px-4 py-3 hover:bg-red-500/10 flex items-center gap-2 text-red-400 font-medium border-t border-slate-800"><LogOut size={16} /> 登出系統</button>
                        </div>
                    )}
                    {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>}
                </div>
                
                <h1 className="hidden md:block text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 tracking-widest">大寶 | 紫微斗數</h1>
            
                {/* [手機版] 點數顯示 */}
                <div className="md:hidden flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50 active:scale-95 transition-transform" onClick={() => navigate('/store')}>
                    <Coins size={14} className="text-yellow-400" />
                    <span className="text-sm font-mono font-bold text-yellow-400">
                        {userProfile?.points_balance || 0} 點數
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3">
                    {/* [電腦版] 點數顯示 (加字、換 icon) */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 rounded-lg border border-slate-700/50 mr-2 cursor-pointer hover:bg-slate-700 transition-colors group" onClick={() => navigate('/store')}>
                        <Coins size={16} className="text-yellow-400" />
                        <span className="text-sm font-bold text-yellow-400 font-mono tracking-tight">
                            {userProfile?.points_balance || 0} 點數
                        </span>
                        <div className="w-[1px] h-4 bg-slate-600 mx-1"></div>
                        <ShoppingCart size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                    </div>

                    <a href={OFFICIAL_SITE_URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800/50 hover:bg-amber-600/30 text-slate-300 hover:text-amber-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 hover:border-amber-500/30"><Globe size={16} /> 大寶官網</a>
                    <button onClick={() => navigate('/list')} className="px-4 py-2 bg-slate-800/50 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 hover:border-blue-500/30"><FileText size={16} /> 命盤列表</button>
                    <button onClick={handleDivinationClick} disabled={canLuckyDivination === 'disabled'} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 ${canLuckyDivination === 'enabled' ? 'bg-slate-800/50 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 hover:border-purple-500/30' : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'}`}><Sparkles size={16} /> 吉凶占卜</button>
                </div>
            </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto relative z-10 scroll-smooth">
            <div className="max-w-7xl mx-auto p-4 flex flex-col items-center">
                {meClient && !forceOnboarding ? (
                    <div className="w-full animate-in fade-in duration-700"><FortuneWidget userProfile={userProfile} client={meClient} clientName={meClient.name} /></div>
                ) : (
                    <div className="mt-6 w-full flex justify-center"><OnboardingWizard userProfile={userProfile} onComplete={handleWizardComplete} onCancelTest={() => setForceOnboarding(false)} isTestMode={forceOnboarding} /></div>
                )}
            </div>
        </main>
        
        {/* Mobile Bottom Bar */}
        <div className="shrink-0 px-6 py-4 pb-8 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5 flex justify-evenly items-center z-50 md:hidden">
            <button onClick={() => navigate('/list')} className="flex flex-col items-center gap-1 group w-16">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/50 group-hover:bg-blue-600/20 flex items-center justify-center transition-colors"><FileText size={20} className="text-slate-400 group-hover:text-blue-400" /></div>
                <span className="text-[10px] text-slate-500 group-hover:text-blue-400 font-bold">命盤列表</span>
            </button>
            <a href={OFFICIAL_SITE_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group w-16">
                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all mb-[-10px] transform translate-y-[-8px] shadow-lg bg-slate-800/80 border border-slate-700/50 group-hover:bg-amber-900/30 group-hover:border-amber-500/50"><Globe size={22} className="text-slate-300 group-hover:text-amber-400" /></div>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-amber-400">大寶官網</span>
            </a>
            <button onClick={handleDivinationClick} disabled={canLuckyDivination === 'disabled'} className="flex flex-col items-center gap-1 group w-16">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${canLuckyDivination === 'enabled' ? 'bg-slate-800/50 group-hover:bg-purple-600/20' : 'bg-slate-800/30 cursor-not-allowed'}`}><Sparkles size={20} className={`${canLuckyDivination === 'enabled' ? 'text-purple-400' : 'text-slate-600'}`} /></div>
                <span className={`text-[10px] font-bold ${canLuckyDivination === 'enabled' ? 'text-slate-500 group-hover:text-purple-400' : 'text-slate-700'}`}>吉凶占卜</span>
            </button>
        </div>

        {/* 迎新禮物 Modal */}
        {showGiftModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-purple-500/30 w-full max-w-sm rounded-3xl shadow-2xl p-8 relative overflow-hidden text-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                    <div className="mb-6 flex justify-center">
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center animate-bounce">
                            <Gift size={40} className="text-purple-400" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">會員專屬禮</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        大寶老師為您準備了一份見面禮！<br/>
                        領取後您將獲得 <span className="text-yellow-400 font-bold text-lg">99 點數</span>，<br/>
                        可以用來立即體驗吉凶占卜服務。
                    </p>
                    <button 
                        onClick={handleClaimGift}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all active:scale-95"
                    >
                        領取禮物
                    </button>
                </div>
            </div>
        )}

        {/* 占卜扣點確認 Modal */}
        {showCostConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl shadow-2xl p-6 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                            <Sparkles size={32} className="text-purple-400" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">開始吉凶占卜</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        本次占卜將扣除 <span className="text-yellow-400 font-bold text-lg mx-1">{divinationCost}</span> 點數。
                    </p>
                    <div className="space-y-3">
                        <button 
                            onClick={handleConfirmDivination}
                            disabled={isProcessingDivination}
                            className="w-full py-2.5 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold transition-colors"
                        >
                            {isProcessingDivination ? '處理中...' : '確認扣點並開始'}
                        </button>
                        <button 
                            onClick={() => setShowCostConfirm(false)}
                            className="w-full py-2.5 text-slate-500 hover:text-slate-300 font-bold transition-colors"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 保留舊的 Modal 與 Paywall 作為備用 (或給其他功能使用) */}
        <LuckyDivinationModal isOpen={false} onClose={() => {}} /> 
        <PaywallModal isOpen={isPaywallOpen} mode={paywallMode} balance={(userProfile as any)?.points_balance ?? 0} cost={0} announcement="" onDeductConfirm={()=>{}} onSoftProceed={()=>{}} onGoToTopup={()=>{}} onLogin={()=>{}} onClose={() => setIsPaywallOpen(false)} />
    </div>
  );
};