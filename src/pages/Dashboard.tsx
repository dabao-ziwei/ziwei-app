import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Sparkles, ArrowRight, Menu, LogOut, Loader2, PlusCircle, 
    FileText, Globe, Sliders, Coins, Gift, AlertCircle, X, 
    ShoppingCart, ChevronRight, Plus, Trash2 
} from 'lucide-react';
import { supabase } from '../supabase';
import { 
    loadClients, saveClient, getMyProfile, checkIsSuperAdmin, 
    type Client, type UserProfile, consumeDivinationV2, 
    claimWelcomeGift, getFeatureRuntime, deleteClient 
} from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, type DailyFortune } from '../logic/fortune';
import { FortuneWidget } from '../components/FortuneWidget';
import { LuckyDivinationModal } from '../components/LuckyDivinationModal';
import { LuckyDivinationGame } from '../components/LuckyDivinationGame';
import { getFeaturePermission } from '../logic/permissions';
import { usePaywall, type PaywallMode } from '../hooks/usePaywall';
import PaywallModal from '../components/Paywall/PaywallModal';
import { motion, AnimatePresence } from 'framer-motion';

const OFFICIAL_SITE_URL = 'https://www.dabao.life';

interface WizardProps {
    userProfile: UserProfile | null;
    onComplete: (data: any) => Promise<void>;
    onCancelTest: () => void;
    isTestMode: boolean;
}

const OnboardingWizard: React.FC<WizardProps> = ({ userProfile, onComplete, onCancelTest, isTestMode }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [formData, setFormData] = useState({ name: '', gender: '' as '男'|'女'|'', year: 2000, month: 1, day: 1, hour: 0, minute: 0 });
    const [loadingText, setLoadingText] = useState('正在連結星曜數據...');

    useEffect(() => {
        if (step === 4) {
            const sequence = [{t:0,msg:'正在連結星曜數據...'},{t:800,msg:'正在推算命宮位置...'},{t:1600,msg:'正在分析本週運勢能量...'}];
            const timers = sequence.map(({t,msg})=>setTimeout(()=>setLoadingText(msg),t));
            const finalTimer = setTimeout(async()=>{try{await onComplete(formData);}catch(e){console.error(e);setStep(3);}},2500);
            return ()=>{timers.forEach(clearTimeout);clearTimeout(finalTimer);};
        }
    }, [step, formData, onComplete]);

    const handleNext = () => { if (step === 1 && !formData.name) return alert('請輸入您的稱呼'); if (step === 2 && !formData.gender) return alert('請選擇性別'); setStep(prev => (prev + 1) as any); };
    const handleFinalSubmit = () => { if (!formData.year) return alert("請輸入年份"); setStep(4); };
    
    if(step===1) return <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800"><h1 className="text-2xl font-bold mb-4">歡迎</h1><input className="w-full border-b-2 text-center text-xl p-2 mb-4 outline-none border-blue-200 focus:border-blue-500 transition-colors" placeholder="您的稱呼" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})}/><button onClick={handleNext} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">下一步</button></div>;
    if(step===2) return <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800"><h1 className="text-xl font-bold mb-4">性別</h1><div className="flex gap-4"><button onClick={()=>{setFormData({...formData,gender:'男'});setTimeout(()=>setStep(3),200)}} className="flex-1 p-4 border rounded-xl hover:bg-blue-50 transition-colors font-bold text-blue-600">男</button><button onClick={()=>{setFormData({...formData,gender:'女'});setTimeout(()=>setStep(3),200)}} className="flex-1 p-4 border rounded-xl hover:bg-pink-50 transition-colors font-bold text-pink-500">女</button></div></div>;
    if(step===3) return <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800"><h1 className="text-xl font-bold mb-4">出生年</h1><input type="number" className="w-full border p-2 rounded mb-4 text-center text-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="西元年 (例如: 1990)" value={formData.year} onChange={e=>setFormData({...formData,year:parseInt(e.target.value)})}/><button onClick={handleFinalSubmit} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">開始分析</button></div>;
    return <div className="text-white text-center mt-20"><Loader2 className="animate-spin mx-auto mb-2"/>{loadingText}</div>;
};

// DailyQuote 元件 (補回)
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

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [newClient, setNewClient] = useState({
      name: '', gender: '男',
      birthYear: 1990, birthMonth: 1, birthDay: 1,
      birthHour: 0, birthMinute: 0
  });

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
        setClients(allClients);
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

  const handleAddClient = async () => {
    if (!userProfile) return;
    if (clients.length >= userProfile.maxCharts && !checkIsSuperAdmin(userProfile.email)) {
        alert(`已達命盤數量上限 (${userProfile.maxCharts})，請升級會員或刪除舊盤。`);
        return;
    }
    try {
        await saveClient(newClient);
        setShowAddModal(false);
        await initDashboard();
        setNewClient({ name: '', gender: '男', birthYear: 1990, birthMonth: 1, birthDay: 1, birthHour: 0, birthMinute: 0 });
    } catch (error) {
        alert('新增失敗');
    }
  };

  const handleDelete = async (id: string) => {
      await deleteClient(id);
      setShowDeleteConfirm(null);
      const updated = await loadClients();
      setClients(updated);
      if (selectedClient?.id === id) setSelectedClient(null);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-slate-500" /></div>;

  if (isGameOpen) {
      return (
          <div className="fixed inset-0 z-[100] bg-black">
              <LuckyDivinationGame onClose={() => setIsGameOpen(false)} />
          </div>
      );
  }

  const GENDERS = ['男', '女'];

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
                    <>
                        <div className="w-full animate-in fade-in duration-700"><FortuneWidget userProfile={userProfile} client={meClient} clientName={meClient.name} /></div>
                        
                        {/* 今日運勢卡片 */}
                        <div className="w-full mt-8">
                            <DailyQuote />
                        </div>

                        {/* 命盤列表區塊 */}
                        <div className="w-full mt-8">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                                    我的命盤
                                    <span className="text-xs font-normal text-slate-500 ml-2 bg-slate-800 px-2 py-0.5 rounded-full">{clients.length} / {userProfile?.maxCharts}</span>
                                </h3>
                                <button 
                                    onClick={() => setShowAddModal(true)} 
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-900/20 text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
                                >
                                    <Plus size={18} /> 新增命盤
                                </button>
                            </div>

                            {/* Grid List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                                <AnimatePresence>
                                    {clients.map(client => (
                                        <motion.div 
                                            key={client.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            onClick={() => navigate(`/chart/${client.id}`)}
                                            className="group relative bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 hover:border-purple-500/30 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-purple-900/10 overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-opacity group-hover:opacity-100 opacity-50"></div>
                                            
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-slate-200 group-hover:text-purple-300 transition-colors mb-1">{client.name}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span className={`px-1.5 py-0.5 rounded ${client.gender==='男'?'bg-blue-900/30 text-blue-400':'bg-pink-900/30 text-pink-400'}`}>{client.gender}</span>
                                                            <span>{client.birthYear}年{client.birthMonth}月{client.birthDay}日</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(client.id); }}
                                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
                                                    <div className="text-xs text-slate-500 font-mono">ID: {client.id.slice(0,6)}</div>
                                                    <div className="flex items-center gap-1 text-xs text-purple-400 font-bold group-hover:translate-x-1 transition-transform">
                                                        查看命盤 <ChevronRight size={14} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 刪除確認遮罩 */}
                                            {showDeleteConfirm === client.id && (
                                                <div 
                                                    className="absolute inset-0 bg-slate-900/95 z-20 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <AlertCircle size={32} className="text-red-500 mb-2" />
                                                    <p className="text-sm text-slate-300 mb-4">確定要刪除 <span className="font-bold text-white">{client.name}</span> 嗎？</p>
                                                    <div className="flex gap-2 w-full">
                                                        <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 bg-slate-800 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-700">取消</button>
                                                        <button onClick={() => handleDelete(client.id)} className="flex-1 py-2 bg-red-600 rounded-lg text-xs font-bold text-white hover:bg-red-500">刪除</button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                
                                {/* Empty State / Add Button */}
                                {clients.length === 0 && (
                                    <button onClick={() => setShowAddModal(true)} className="col-span-full py-12 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-700 hover:bg-slate-800/30 text-slate-600 hover:text-slate-400 transition-all flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center"><Plus size={24}/></div>
                                        <span className="font-bold">尚未建立命盤，點此新增</span>
                                    </button>
                                )}
                            </div>
                        </div>
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

        {/* 新增命盤 Modal */}
        {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-white">新增命盤</h3>
                        <button onClick={() => setShowAddModal(false)}><X size={20} className="text-slate-500 hover:text-white"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">姓名</label>
                            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="請輸入姓名" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">性別</label>
                                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                    {GENDERS.map(g => (
                                        <button key={g} onClick={() => setNewClient({...newClient, gender: g as any})} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${newClient.gender === g ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>{g}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">出生年 (西元)</label>
                                <input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-purple-500 outline-none" value={newClient.birthYear} onChange={e => setNewClient({...newClient, birthYear: parseInt(e.target.value)})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs text-slate-500 block mb-1">月</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-white" value={newClient.birthMonth} onChange={e => setNewClient({...newClient, birthMonth: parseInt(e.target.value)})} /></div>
                            <div><label className="text-xs text-slate-500 block mb-1">日</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-white" value={newClient.birthDay} onChange={e => setNewClient({...newClient, birthDay: parseInt(e.target.value)})} /></div>
                            <div><label className="text-xs text-slate-500 block mb-1">時 (0-23)</label><input type="number" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-center text-white" value={newClient.birthHour} onChange={e => setNewClient({...newClient, birthHour: parseInt(e.target.value)})} /></div>
                        </div>
                        <button onClick={handleAddClient} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-900/20 mt-2">建立命盤</button>
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