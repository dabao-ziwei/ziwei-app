import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, ArrowRight, Menu, LogOut, UserCog, Loader2, PlusCircle, Database, 
    FileText, Calendar, Clock, HelpCircle, ArrowLeft, Globe, Sliders, 
    Coins, Gift, AlertCircle, X, ShoppingCart 
} from 'lucide-react';
import { supabase } from '../supabase';
import { 
    loadClients, saveClient, getMyProfile, checkIsSuperAdmin, type Client, 
    type UserProfile, consumeDivinationV2, issueGuestToken, claimWelcomeGift, 
    getFeatureRuntime 
} from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, type DailyFortune } from '../logic/fortune';
import { FortuneWidget } from '../components/FortuneWidget';
import { LuckyDivinationModal } from '../components/LuckyDivinationModal';
import { LuckyDivinationGame } from '../components/LuckyDivinationGame';
import { ZHI } from '../logic/constants';
import { getFeaturePermission } from '../logic/permissions';
import { usePaywall, type PaywallMode } from '../hooks/usePaywall';
import PaywallModal from '../components/Paywall/PaywallModal';

const OFFICIAL_SITE_URL = 'https://www.dabao.life';
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

interface WizardProps {
    userProfile: UserProfile | null;
    onComplete: (data: any) => Promise<void>;
    onCancelTest: () => void;
    isTestMode: boolean;
}

const OnboardingWizard: React.FC<WizardProps> = ({ userProfile, onComplete, onCancelTest, isTestMode }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [formData, setFormData] = useState({ name: '', gender: '' as '男'|'女'|'', year: 2000, month: 1, day: 1, hour: 0, minute: 0 });
    const [timeMode, setTimeMode] = useState<'precise'|'zhi'|'unsure'>('precise');
    const [loadingText, setLoadingText] = useState('正在連結星曜數據...');
    
    // Refs for input focus
    const yearRef = useRef<HTMLInputElement>(null);
    const monthRef = useRef<HTMLInputElement>(null);
    const dayRef = useRef<HTMLInputElement>(null);
    const minuteRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (step === 4) {
            const sequence = [{t:0,msg:'正在連結星曜數據...'},{t:800,msg:'正在推算命宮位置...'},{t:1600,msg:'正在分析本週運勢能量...'}];
            const timers = sequence.map(({t,msg})=>setTimeout(()=>setLoadingText(msg),t));
            const finalTimer = setTimeout(async()=>{try{await onComplete(formData);}catch(e){console.error("Setup failed:",e);alert("建立失敗，請檢查網路連線後重試。");setStep(3);}},2500);
            return ()=>{timers.forEach(clearTimeout);clearTimeout(finalTimer);};
        }
    }, [step, formData, onComplete]);

    const handleNext = () => { if (step === 1 && !formData.name) return alert('請輸入您的稱呼'); if (step === 2 && !formData.gender) return alert('請選擇性別'); setStep(prev => (prev + 1) as any); };
    const handleZhiSelect = (zhiIdx: number) => { setFormData({ ...formData, hour: zhiIdx === 0 ? 0 : zhiIdx * 2, minute: 0 }); };
    const handleUnsure = () => { setFormData({ ...formData, hour: 0, minute: 0 }); setStep(4); };
    const handleFinalSubmit = () => { if (!formData.year || isNaN(Number(formData.year))) { alert("請輸入有效的出生年份"); return; } setStep(4); };
    const handleDateInput = (e: any, setter: any, max: number, next?: any) => { const v = e.target.value.replace(/\D/g, '').slice(0, maxLen); setter(v?parseInt(v):''); if(v.length===max && next?.current) { nextRef.current.focus(); nextRef.current.select(); } };
    const handleKeyDown = (e: any, currentVal: any, prevRef?: any) => { if (e.key === 'Backspace' && (currentVal === '' || currentVal === 0) && prevRef?.current) { prevRef.current.focus(); } };

    if(step===1) return <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 relative text-slate-800"> {isTestMode && <button onClick={onCancelTest} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600"><PlusCircle size={20} className="rotate-45"/></button>} <div className="p-8 pt-12 flex flex-col items-center text-center space-y-6"> <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-2"> <Sparkles size={32} /> </div> <div> <h1 className="text-2xl font-bold text-slate-800 mb-2">歡迎來到 AI紫微斗數<br/><span className="text-lg font-medium text-slate-500">智能命理分析系統</span></h1> <p className="text-slate-400 text-sm mt-4">請問我們該怎麼稱呼您？</p> </div> <div className="w-full"> <input type="text" autoFocus className="w-full text-center text-2xl font-bold border-b-2 border-blue-100 py-2 focus:border-blue-500 outline-none bg-transparent placeholder:text-slate-200 text-slate-700 transition-colors" placeholder="輸入您的暱稱" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleNext()} /> </div> <button onClick={handleNext} disabled={!formData.name} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"> 下一步 <ArrowRight size={18} /> </button> </div> </div>;
    if(step===2) return <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300 relative text-slate-800"> <button onClick={() => setStep(1)} className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs font-bold"><ArrowRight size={14} className="rotate-180"/> 上一步</button> <div className="p-8 pt-12 flex flex-col items-center text-center space-y-6"> <h2 className="text-xl font-bold text-slate-800">請問您的性別？</h2> <div className="grid grid-cols-2 gap-4 w-full"> <button onClick={() => { setFormData({...formData, gender: '男'}); setTimeout(() => setStep(3), 200); }} className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group ${formData.gender === '男' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50'}`} > <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">♂</div> <span className="font-bold text-slate-700">男性</span> </button> <button onClick={() => { setFormData({...formData, gender: '女'}); setTimeout(() => setStep(3), 200); }} className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 group ${formData.gender === '女' ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-200' : 'border-slate-100 hover:border-pink-200 hover:bg-slate-50'}`} > <div className="w-12 h-12 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform">♀</div> <span className="font-bold text-slate-700">女性</span> </button> </div> <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-xs text-amber-700 text-left leading-relaxed flex gap-2"> <Sparkles size={14} className="shrink-0 mt-0.5" /> 紫微斗數中，男女的排盤方式大不相同，這會影響系統分析的運勢走向。 </div> </div> </div>;
    if(step===3) return <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-right-8 duration-300 relative text-slate-800"> <button onClick={() => setStep(2)} className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-xs font-bold"><ArrowRight size={14} className="rotate-180"/> 上一步</button> <div className="p-6 pt-12 flex flex-col space-y-5"> <div className="text-center"> <h2 className="text-xl font-bold text-slate-800">您的出生時間？</h2> <p className="text-slate-400 text-xs mt-1">這是排盤最關鍵的資料</p> </div> <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"> <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500"> <Calendar size={14}/> 出生日期 (西元) </div> <div className="flex gap-2"> <input ref={yearRef} type="number" className="flex-1 min-w-0 border rounded-lg px-2 py-2 text-center bg-white" placeholder="年" value={formData.year} onChange={e => handleDateInput(e, v => setFormData({...formData, year: v}), 4, monthRef)} onKeyDown={e => handleKeyDown(e, formData.year)} /> <select className="w-20 border rounded-lg px-1 py-2 bg-white text-center" value={formData.month} onChange={e => setFormData({...formData, month: parseInt(e.target.value)})}> {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{m}月</option>)} </select> <select className="w-20 border rounded-lg px-1 py-2 bg-white text-center" value={formData.day} onChange={e => setFormData({...formData, day: parseInt(e.target.value)})}> {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}日</option>)} </select> </div> </div> <div className="flex bg-slate-100 p-1 rounded-lg"> <button onClick={() => setTimeMode('precise')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${timeMode === 'precise' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>精確時間</button> <button onClick={() => setTimeMode('zhi')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${timeMode === 'zhi' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>只知時辰</button> <button onClick={() => setTimeMode('unsure')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${timeMode === 'unsure' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>我不確定</button> </div> <div className="min-h-[140px]"> {timeMode === 'precise' && ( <div className="space-y-3 animate-in fade-in zoom-in duration-200"> <div className="flex items-center gap-2 text-xs font-bold text-slate-500"> <Clock size={14}/> 輸入時間 </div> <div className="flex gap-3 items-center justify-center py-4"> <div className="flex flex-col items-center"> <select className="w-24 text-lg font-bold border-2 border-blue-100 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-500" value={formData.hour} onChange={e => setFormData({...formData, hour: parseInt(e.target.value)})}> {Array.from({length:24},(_,i)=>i).map(h=><option key={h} value={h}>{h} 點</option>)} </select> </div> <span className="text-xl font-bold text-slate-300">:</span> <div className="flex flex-col items-center"> <input ref={minuteRef} type="number" className="w-24 text-lg font-bold border-2 border-blue-100 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-500 text-center" placeholder="分" value={formData.minute} onChange={e => handleDateInput(e, v => setFormData({...formData, minute: v}), 2)} onKeyDown={e => handleKeyDown(e, formData.minute)} /> </div> </div> <div className="text-center text-xs text-slate-400"> 對應時辰：<span className="font-bold text-blue-600">{ZHI[Math.floor((formData.hour + 1) / 2) % 12]}時</span> </div> </div> )} {timeMode === 'zhi' && ( <div className="animate-in fade-in zoom-in duration-200"> <div className="grid grid-cols-6 gap-2"> {ZHI.map((z, idx) => { const currentZhiIdx = Math.floor((formData.hour + 1) / 2) % 12; const isSelected = currentZhiIdx === idx; return ( <button key={z} onClick={() => handleZhiSelect(idx)} className={`py-2 rounded-lg border transition-all text-sm font-bold flex flex-col items-center justify-center ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`} > <span>{z}</span> <span className={`text-[9px] scale-90 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}> {idx===0 ? '23-01' : `${(idx*2-1).toString().padStart(2,'0')}-${(idx*2+1).toString().padStart(2,'0')}`} </span> </button> ); })} </div> <p className="text-[10px] text-center text-slate-400 mt-2">*系統將自動帶入時辰的中間時間進行排盤</p> </div> )} {timeMode === 'unsure' && ( <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-800 text-sm leading-relaxed animate-in fade-in zoom-in duration-200"> <div className="flex items-start gap-2 mb-2"> <HelpCircle size={18} className="shrink-0 mt-0.5 text-orange-500" /> <span className="font-bold">別擔心...</span> </div> <p className="mb-2">沒關係，我們先幫您預設一個時間，讓您先體驗運勢的流動。</p> <p className="opacity-80 text-xs">命盤就像人生的導航，輸入的座標越精準，導航就越準確。等您確認時間後，隨時可以回來校正。</p> </div> )} </div> <button onClick={timeMode === 'unsure' ? handleUnsure : handleFinalSubmit} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-2" > <Sparkles size={18} /> {timeMode === 'unsure' ? '先用預設時間體驗' : '開始分析運勢'} </button> </div> </div>;
    if(step===4) return <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in duration-500 flex flex-col items-center justify-center py-20 px-8 text-center relative text-slate-800"> <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" /> <div className="relative mb-8"> <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center animate-pulse"> <Sparkles size={40} className="text-blue-500 animate-spin-slow" /> </div> <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-100 rounded-full border-t-blue-500 animate-spin" /> </div> <h3 className="text-xl font-bold text-slate-800 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300"> {loadingText} </h3> <p className="text-slate-400 text-sm">正在為您繪製專屬命盤...</p> </div>;
    return null;
};

// DailyQuote 元件
const DailyQuote = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    return (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/50 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120} className="text-purple-400" /></div>
            <div className="relative z-10">
                <div className="text-slate-400 text-sm mb-1 font-mono tracking-widest">{dateStr}</div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 mb-2">今日運勢</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                    「命運不是機遇，而是選擇。」在這裡，透過紫微斗數探索你的命盤，掌握流年運勢，為自己做出最好的決定。
                </p>
            </div>
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
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
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

        // 檢查迎新禮
        if (profile && profile.has_claimed_welcome_gift === false) {
            setShowGiftModal(true);
        }

        // ✅ [修正] loadClients 預設只抓自己的，解決 Dashboard 資料外洩問題
        const allClients = await loadClients(); 
        
        // 找出「我」的命盤 (用於運勢計算)
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
                            {(userProfile?.role === 'admin' || userProfile?.email === SUPER_ADMIN_EMAIL) && (
                                <button onClick={() => { navigate('/admin'); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-2 text-slate-300 font-medium">
                                    <Database size={16} /> 占卜文案矩陣
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
                    {/* [電腦版] 點數顯示 */}
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
                    <>
                        <div className="w-full animate-in fade-in duration-700"><FortuneWidget userProfile={userProfile} client={meClient} clientName={meClient.name} /></div>
                        
                        {/* 今日運勢卡片 */}
                        <div className="w-full mt-8">
                            <DailyQuote />
                        </div>

                        {/* ✅ [修正] 已移除所有命盤列表區塊 */}
                    </>
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
                        領取後您將獲得 <span className="text-yellow-400 font-bold text-lg">99 點</span>，<br/>
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
                        本次占卜將扣除 <span className="text-yellow-400 font-bold text-lg mx-1">{divinationCost}</span> 點。
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