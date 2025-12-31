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

const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // 狀態：我的命盤與運勢
  const [meClient, setMeClient] = useState<Client | null>(null);
  const [dailyFortune, setDailyFortune] = useState<DailyFortune | null>(null);
  
  // 狀態：Menu 與 Modal
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);

  // 狀態：新手引導表單
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

        // 讀取所有命盤，尋找「我」
        const allClients = await loadClients();
        const myChart = (Array.isArray(allClients) ? allClients : []).find(
            c => c.user_id === profile?.id && c.type === '我'
        );

        if (myChart) {
            setMeClient(myChart);
            // 計算運勢
            try {
                const engine = new ZiWeiEngine(
                    myChart.birthYear, myChart.birthMonth, myChart.birthDay, 
                    myChart.birthHour, myChart.birthMinute, myChart.gender
                );
                const fortune = calculateDailyFortune(engine);
                setDailyFortune(fortune);
            } catch (e) {
                console.error("Fortune Calc Error", e);
            }
        }
    } catch (e) {
        console.error("Init Error", e);
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
            type: '我', // 強制設定
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
        // 重新整理頁面以進入運勢模式
        await initDashboard();
    } catch (e) {
        alert("建立失敗，請重試");
        console.error(e);
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) {
      return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>;
  }

  // --- 畫面 A: 新手引導 (沒有「我」的命盤) ---
  if (!meClient) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
              <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
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
          </div>
      );
  }

  // --- 畫面 B: 儀表板首頁 (有「我」的命盤) ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-x-hidden">
        
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-100 relative z-20">
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

            <h1 className="text-lg font-bold text-slate-800">今日運勢</h1>
            
            <div className="w-10"></div> {/* Placeholder for balance */}
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col items-center">
            
            {/* 運勢儀表板 - 放大顯示 */}
            <div className="w-full mb-8 transform hover:scale-[1.02] transition-transform duration-300">
                {dailyFortune && (
                    <FortuneWidget 
                        fortune={dailyFortune}
                        userProfile={userProfile}
                        clientName={meClient.name}
                    />
                )}
            </div>

            {/* 主要行動按鈕 */}
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

            {/* 紫占快速入口 (選填) */}
            {userProfile?.can_use_divination && (
                <button
                    onClick={() => navigate('/list', { state: { openDivination: true } })} // 這裡可以做更細的路由控制，暫時先導去列表
                    className="w-full mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 hover:border-purple-300 text-purple-800 font-bold py-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                    <Sparkles size={18} />
                    快速進行紫微占卜
                </button>
            )}

        </main>

        <UserManagementModal 
            isOpen={isUserMgmtOpen} 
            onClose={() => setIsUserMgmtOpen(false)} 
        />
    </div>
  );
};