// FILE: src/pages/Dashboard.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, Menu, LogOut, Loader2, PlusCircle, 
    FileText, Globe, Sliders, Gift, ShoppingCart, ArrowRight, Calendar, Dices
} from 'lucide-react';
import { supabase } from '../supabase';
import { 
    loadClients, saveClient, getMyProfile, checkIsSuperAdmin, 
    type Client, type UserProfile,
    claimWelcomeGift
} from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, type DailyFortune } from '../logic/fortune';
import { FortuneWidget } from '../components/FortuneWidget';
import { getFeaturePermission } from '../logic/permissions';
import { DivinationSetupModal } from '../components/DivinationSetupModal'; // [新增] 引入紫占設定 Modal

const OFFICIAL_SITE_URL = 'https://www.dabao.life';

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
        gender: '' as '男'|'女'|'', 
        year: '', month: '', day: '', hour: '', minute: '' 
    });
    const [loadingText, setLoadingText] = useState('正在連結星曜數據...');

    const yearRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const hourRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === 3) setTimeout(() => yearRef.current?.focus(), 100);
    }, [step]);

    useEffect(() => {
        if (step === 4) {
            const sequence = [{t:0,msg:'正在連結星曜數據...'},{t:800,msg:'正在推算命宮位置...'},{t:1600,msg:'正在分析本週運勢能量...'}];
            const timers = sequence.map(({t,msg})=>setTimeout(()=>setLoadingText(msg),t));
            
            const finalTimer = setTimeout(async () => {
                try {
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
                    setStep(3);
                }
            }, 2500);

            return ()=>{timers.forEach(clearTimeout);clearTimeout(finalTimer);};
        }
    }, [step, formData, onComplete]);

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>, field: keyof typeof formData, maxLen: number, nextRef?: React.RefObject<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, maxLen);
        setFormData(prev => ({ ...prev, [field]: val }));
        if (val.length === maxLen && nextRef?.current) {
            nextRef.current.focus();
            nextRef.current.select();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentVal: string, prevRef?: React.RefObject<HTMLInputElement>) => {
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
    
    if(step===3) return (
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800 animate-in slide-in-from-right duration-300">
            <h1 className="text-2xl font-bold mb-2 text-slate-900">出生時間</h1>
            <p className="text-xs text-slate-400 mb-8">請輸入西元出生年月日時分</p>
            
            <div className="space-y-6 mb-10">
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
  const [showGiftModal, setShowGiftModal] = useState(false);

  // [新增] 紫微占卜 Modal 狀態
  const [isDivinationModalOpen, setIsDivinationModalOpen] = useState(false);

  const canLuckyDivination = useMemo(() => getFeaturePermission(userProfile, 'lucky_divination'), [userProfile]);

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
          alert('🎉 領取成功！您已獲得 7 天無限暢測期，可立即體驗吉凶占卜。');
      } else {
          alert('領取失敗，請稍後再試');
      }
  };

  // [新增] 處理紫微占卜建立
  const handleCreateDivination = async (data: any) => {
      const tempClient = { 
          ...data, 
          id: `temp-${Date.now()}`,
          user_id: userProfile?.id,
          divNum: data.divNum 
      };
      navigate('/divination', { 
          state: { 
              client: tempClient,
              divNum: data.divNum 
          } 
      });
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-slate-500" /></div>;

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
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-3">
                    
                    <button onClick={() => navigate('/booking')} className="px-4 py-2 bg-emerald-800/40 hover:bg-emerald-600/50 text-emerald-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-emerald-700/50">
                        <Calendar size={16} /> 預約諮詢
                    </button>

                    <button onClick={() => navigate('/store')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/50 hover:bg-slate-700 transition-colors group">
                        <ShoppingCart size={16} className="text-yellow-400 group-hover:text-white transition-colors" />
                        <span className="text-sm font-bold text-yellow-400 tracking-tight">訂閱方案中心</span>
                    </button>

                    <a href={OFFICIAL_SITE_URL} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-slate-800/50 hover:bg-amber-600/30 text-slate-300 hover:text-amber-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 hover:border-amber-500/30"><Globe size={16} /> 大寶官網</a>
                    <button onClick={() => navigate('/list')} className="px-4 py-2 bg-slate-800/50 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 hover:border-blue-500/30"><FileText size={16} /> 命盤列表</button>
                    
                    {/* [新增] 紫微占卜按鈕 (電腦版) */}
                    {userProfile?.can_use_divination && (
                        <button onClick={() => setIsDivinationModalOpen(true)} className="px-4 py-2 bg-slate-800/50 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 hover:border-indigo-500/30">
                            <Dices size={16} /> 紫微占卜
                        </button>
                    )}

                    <button onClick={() => navigate('/lucky')} disabled={canLuckyDivination === 'disabled'} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border border-slate-700/50 ${canLuckyDivination === 'enabled' ? 'bg-slate-800/50 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 hover:border-purple-500/30' : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'}`}><Sparkles size={16} /> 吉凶占卜</button>
                </div>
            </div>
        </header>

        <main className="flex-1 w-full overflow-y-auto relative z-10 scroll-smooth pb-10 flex flex-col">
            <div className="max-w-7xl mx-auto p-4 flex flex-col items-center flex-1 w-full">
                {meClient && !forceOnboarding ? (
                    <div className="w-full animate-in fade-in duration-700"><FortuneWidget userProfile={userProfile} client={meClient} clientName={meClient.name} /></div>
                ) : (
                    <div className="mt-6 w-full flex justify-center"><OnboardingWizard userProfile={userProfile} onComplete={handleWizardComplete} onCancelTest={() => setForceOnboarding(false)} isTestMode={forceOnboarding} /></div>
                )}
            </div>
            
            <footer className="w-full text-center py-6 text-xs text-slate-500/60 mt-auto">
                <a href="/legal" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors underline underline-offset-2">服務條款與隱私權政策</a>
            </footer>
        </main>
        
        {/* Mobile Bottom Bar */}
        <div className="shrink-0 px-2 py-4 pb-8 bg-[#0f172a]/90 backdrop-blur-xl border-t border-white/5 flex justify-evenly items-center z-50 md:hidden">
            <button onClick={() => navigate('/booking')} className="flex flex-col items-center gap-1 group w-14 sm:w-16">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/50 group-hover:bg-emerald-600/20 flex items-center justify-center transition-colors"><Calendar size={20} className="text-slate-400 group-hover:text-emerald-400" /></div>
                <span className="text-[10px] text-slate-500 group-hover:text-emerald-400 font-bold whitespace-nowrap">線上預約</span>
            </button>
            <button onClick={() => navigate('/list')} className="flex flex-col items-center gap-1 group w-14 sm:w-16">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/50 group-hover:bg-blue-600/20 flex items-center justify-center transition-colors"><FileText size={20} className="text-slate-400 group-hover:text-blue-400" /></div>
                <span className="text-[10px] text-slate-500 group-hover:text-blue-400 font-bold whitespace-nowrap">命盤列表</span>
            </button>
            <a href={OFFICIAL_SITE_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 group w-14 sm:w-16">
                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all mb-[-10px] transform translate-y-[-8px] shadow-lg bg-slate-800/80 border border-slate-700/50 group-hover:bg-amber-900/30 group-hover:border-amber-500/50"><Globe size={22} className="text-slate-300 group-hover:text-amber-400" /></div>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-amber-400 whitespace-nowrap">大寶官網</span>
            </a>
            
            {/* [新增] 紫微占卜按鈕 (手機版) */}
            {userProfile?.can_use_divination && (
                <button onClick={() => setIsDivinationModalOpen(true)} className="flex flex-col items-center gap-1 group w-14 sm:w-16">
                    <div className="w-10 h-10 rounded-2xl bg-slate-800/50 group-hover:bg-indigo-600/20 flex items-center justify-center transition-colors">
                        <Dices size={20} className="text-slate-400 group-hover:text-indigo-400" />
                    </div>
                    <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-bold whitespace-nowrap">紫微占卜</span>
                </button>
            )}

            <button onClick={() => navigate('/lucky')} disabled={canLuckyDivination === 'disabled'} className="flex flex-col items-center gap-1 group w-14 sm:w-16">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${canLuckyDivination === 'enabled' ? 'bg-slate-800/50 group-hover:bg-purple-600/20' : 'bg-slate-800/30 cursor-not-allowed'}`}><Sparkles size={20} className={`${canLuckyDivination === 'enabled' ? 'text-purple-400' : 'text-slate-600'}`} /></div>
                <span className={`text-[10px] font-bold whitespace-nowrap ${canLuckyDivination === 'enabled' ? 'text-slate-500 group-hover:text-purple-400' : 'text-slate-700'}`}>吉凶占卜</span>
            </button>
        </div>

        {/* [新增] 渲染 Modal */}
        <DivinationSetupModal 
            isOpen={isDivinationModalOpen} 
            onClose={() => setIsDivinationModalOpen(false)} 
            onConfirm={handleCreateDivination} 
        />

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
                        領取後您將獲得 <span className="text-yellow-400 font-bold text-lg">7 天無限暢測期</span>，<br/>
                        可以用來立即體驗吉凶占卜服務。
                    </p>
                    <button onClick={handleClaimGift} className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/30 transition-all active:scale-95">
                        領取禮物
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};