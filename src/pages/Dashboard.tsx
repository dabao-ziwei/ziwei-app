import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Menu, LogOut, UserCog, Loader2, Save } from 'lucide-react';
import { supabase } from '../supabase';
import { loadClients, saveClient, getMyProfile, type Client, type UserProfile } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { calculateDailyFortune, type DailyFortune } from '../logic/fortune';
import { FortuneWidget } from '../components/FortuneWidget';
import { UserManagementModal } from '../components/UserManagementModal';
import { ZHI } from '../logic/constants';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [meClient, setMeClient] = useState<Client | null>(null);
  const [dailyFortune, setDailyFortune] = useState<DailyFortune | null>(null);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);

  const [onboardingForm, setOnboardingForm] = useState({
    name: '',
    gender: '男' as '男'|'女',
    year: 1980,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0
  });
  const [isSaving, setIsSaving] = useState(false);

  const initDashboard = async () => {
    setLoading(true);
    try {
        const profile = await getMyProfile();
        setUserProfile(profile);
        
        const allClients = await loadClients();
        const loadedClients = Array.isArray(allClients) ? allClients : [];

        // 尋找「我」的命盤 (寬鬆比對)
        const myCharts = loadedClients.filter(c => {
            const isOwner = c.user_id === profile?.id;
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

  const handleOnboardingSubmit = async () => {
    if (!onboardingForm.name) {
        alert("請輸入您的姓名");
        return;
    }
    setIsSaving(true);
    try {
        const newClient = {
            id: crypto.randomUUID(),
            name: onboardingForm.name,
            gender: onboardingForm.gender,
            type: '我',
            birthYear: onboardingForm.year,
            birthMonth: onboardingForm.month,
            birthDay: onboardingForm.day,
            birthHour: onboardingForm.hour,
            birthMinute: onboardingForm.minute,
            bornCity: '',
            tags: [],
            user_id: userProfile?.id
        };
        await saveClient(newClient);
        await initDashboard();
    } catch (e) {
        alert("建立失敗，請重試");
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    // [修正重點] 外層 h-screen 固定高度 + overflow-hidden 禁止整頁捲動
    <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
        
        {/* Header: 固定不縮放 (shrink-0) */}
        <header className="shrink-0 px-6 py-4 flex justify-between items-center bg-white border-b border-slate-100 z-50 shadow-sm">
            <div className="relative">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors rounded-xl flex items-center justify-center"
                >
                    <Menu size={20} />
                </button>
                {isMenuOpen && (
                    <div className="absolute top-12 left-0 w-52 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                        {userProfile?.role === 'admin' && (
                            <button 
                                onClick={() => { setIsUserMgmtOpen(true); setIsMenuOpen(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium"
                            >
                                <UserCog size={16} /> 使用者管理
                            </button>
                        )}
                        <button 
                            onClick={() => supabase.auth.signOut()}
                            className="w-full text-left px-4 py-3 hover:bg-red-50 flex items-center gap-2 text-red-600 font-medium border-t border-gray-100"
                        >
                            <LogOut size={16} /> 登出系統
                        </button>
                    </div>
                )}
                {isMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>}
            </div>

            <h1 className="text-lg font-bold text-slate-800">首頁儀表板</h1>
            
            <div className="w-10"></div> 
        </header>

        {/* [修正重點] Main: flex-1 佔滿剩餘空間 + overflow-y-auto 允許內部捲動 */}
        <main className="flex-1 w-full overflow-y-auto">
            <div className="max-w-4xl mx-auto p-6 flex flex-col items-center pb-20">
                
                {/* 情境 A: 有命盤 -> 顯示儀表板 */}
                {meClient && dailyFortune && (
                    <>
                        <FortuneWidget 
                            fortune={dailyFortune}
                            userProfile={userProfile}
                            clientName={meClient.name}
                        />

                        {/* 功能按鈕區 */}
                        <div className="w-full grid md:grid-cols-2 gap-4 mt-2">
                            <button
                                onClick={() => navigate('/list')}
                                className="w-full bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold py-5 rounded-2xl shadow-sm transition-all flex items-center justify-between px-6 group"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-lg text-slate-800 group-hover:text-blue-700 transition-colors">管理命盤列表</span>
                                    <span className="text-xs text-slate-400 font-normal">查看所有客戶與紫占記錄</span>
                                </div>
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <ArrowRight size={20} />
                                </div>
                            </button>
                            
                            {userProfile?.can_use_divination && (
                                <button
                                    onClick={() => navigate('/list', { state: { openDivination: true } })}
                                    className="w-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 hover:border-purple-300 text-purple-800 font-bold py-5 rounded-2xl shadow-sm transition-all flex items-center justify-between px-6 group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="text-lg text-purple-900 group-hover:text-purple-700 transition-colors">紫微占卜</span>
                                        <span className="text-xs text-purple-400 font-normal">遇事不決，可問斗數</span>
                                    </div>
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                                        <Sparkles size={20} />
                                    </div>
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* 情境 B: 沒命盤 -> 顯示新手引導 */}
                {!meClient && (
                    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500 mt-10">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <Sparkles size={32} className="text-yellow-300" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">歡迎來到大寶紫微</h1>
                        <p className="text-blue-100 text-sm">請輸入您的生辰資料，<br/>讓我們為您解析今日運勢。</p>
                    </div>
                    
                    <div className="p-8 space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">您的姓名 / 暱稱</label>
                            <input 
                                type="text" 
                                className="w-full border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 text-lg font-bold text-slate-700 bg-transparent transition-colors"
                                placeholder="例如：大寶"
                                value={onboardingForm.name}
                                onChange={e => setOnboardingForm({...onboardingForm, name: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2">性別</label>
                            <div className="flex gap-4">
                                {['男', '女'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setOnboardingForm({...onboardingForm, gender: g as any})}
                                        className={`flex-1 py-2 rounded-xl border-2 font-bold transition-all ${onboardingForm.gender === g ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">出生年</label>
                                <input type="number" className="w-full border rounded-lg px-3 py-2" value={onboardingForm.year} onChange={e => setOnboardingForm({...onboardingForm, year: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">月</label>
                                <select className="w-full border rounded-lg px-3 py-2 bg-white" value={onboardingForm.month} onChange={e => setOnboardingForm({...onboardingForm, month: Number(e.target.value)})}>
                                    {Array.from({length:12}, (_, i) => i+1).map(m => <option key={m} value={m}>{m}月</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">日</label>
                                <select className="w-full border rounded-lg px-3 py-2 bg-white" value={onboardingForm.day} onChange={e => setOnboardingForm({...onboardingForm, day: Number(e.target.value)})}>
                                    {Array.from({length:31}, (_, i) => i+1).map(d => <option key={d} value={d}>{d}日</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">時辰 (小時)</label>
                                <select className="w-full border rounded-lg px-3 py-2 bg-white" value={onboardingForm.hour} onChange={e => setOnboardingForm({...onboardingForm, hour: Number(e.target.value)})}>
                                    {Array.from({length:24}, (_, i) => i).map(h => (
                                        <option key={h} value={h}>{h}點 ({ZHI[Math.floor((h+1)/2)%12]}時)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">分鐘</label>
                                <input type="number" className="w-full border rounded-lg px-3 py-2" value={onboardingForm.minute} onChange={e => setOnboardingForm({...onboardingForm, minute: Number(e.target.value)})} />
                            </div>
                        </div>

                        <button 
                            onClick={handleOnboardingSubmit}
                            disabled={isSaving}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-4"
                        >
                            {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            開始分析運勢
                        </button>
                    </div>
                </div>
                )}
            </div>
        </main>
        
        <UserManagementModal 
            isOpen={isUserMgmtOpen} 
            onClose={() => setIsUserMgmtOpen(false)} 
        />
    </div>
  );
};