import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Menu, LogOut, UserCog, Loader2, Save, Bug } from 'lucide-react';
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

  // Debug 資訊
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

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
    const logs: string[] = []; // 用來收集診斷訊息
    
    try {
        const profile = await getMyProfile();
        setUserProfile(profile);
        
        if (!profile) {
            logs.push("❌ 無法取得使用者 Profile (未登入?)");
        } else {
            logs.push(`登入者: ${profile.email}`);
        }

        const allClients = await loadClients();
        const loadedClients = Array.isArray(allClients) ? allClients : [];

        // --- 寬鬆比對邏輯 ---
        const myCharts = loadedClients.filter(c => {
            const isOwner = c.user_id === profile?.id;
            const cleanType = (c.type || '').trim();
            const isMe = cleanType === '我' || cleanType === 'Me';
            return isOwner && isMe;
        });

        if (myCharts.length > 0) {
            const target = myCharts[0];
            setMeClient(target);
            logs.push(`✅ 鎖定命盤: [${target.name}]`);
            
            try {
                const engine = new ZiWeiEngine(
                    target.birthYear, target.birthMonth, target.birthDay, 
                    target.birthHour, target.birthMinute, target.gender
                );
                const fortune = calculateDailyFortune(engine);
                
                // 檢查數據是否異常
                logs.push(`✅ 運勢計算: 分數=${fortune.score}, 天氣=${fortune.weather}`);
                if (Number.isNaN(fortune.score)) logs.push("⚠️ 警告：分數是 NaN");
                if (!fortune.weather) logs.push("⚠️ 警告：天氣未定義");

                setDailyFortune(fortune);
            } catch (e: any) {
                logs.push(`❌ 運勢引擎錯誤: ${e.message}`);
            }
        } else {
            logs.push(`⚠️ 找不到「我」的命盤，進入新手引導。`);
            const myOwned = loadedClients.filter(c => c.user_id === profile?.id);
            logs.push(`您名下共有 ${myOwned.length} 張命盤`);
        }

    } catch (e: any) {
        logs.push(`❌ 初始化嚴重錯誤: ${e.message}`);
        console.error(e);
    } finally {
        setDebugInfo(logs);
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

            <h1 className="text-lg font-bold text-slate-800">首頁儀表板</h1>
            
            <div className="w-10"></div> 
        </header>

        {/* Content */}
        <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col items-center">
            
            {/* --- 強制顯示診斷面板 --- */}
            <div className="w-full mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs font-mono text-yellow-800 break-all shadow-sm">
                <div className="flex items-center gap-2 font-bold mb-2 text-yellow-900 border-b border-yellow-200 pb-2">
                    <Bug size={14}/> 診斷模式 (所有人可見)
                </div>
                {debugInfo.map((line, i) => (
                    <div key={i} className="mb-0.5 border-b border-yellow-100 pb-0.5">{line}</div>
                ))}
            </div>

            {/* 情境 A: 有命盤 -> 顯示儀表板 */}
            {meClient && dailyFortune && (
                <>
                    {/* 紅色邊框是用來檢查渲染範圍的，確認功能正常後可移除 */}
                    <div className="w-full mb-8 transform hover:scale-[1.02] transition-transform duration-300 border-2 border-dashed border-red-400 p-2 relative">
                        <div className="absolute -top-3 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded">
                            儀表板區域 ({dailyFortune.weather})
                        </div>
                        <FortuneWidget 
                            fortune={dailyFortune}
                            userProfile={userProfile}
                            clientName={meClient.name}
                        />
                    </div>

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
                            className="w-full mt-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 hover:border-purple-300 text-purple-800 font-bold py-4 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles size={18} />
                            快速進行紫微占卜
                        </button>
                    )}
                </>
            )}

            {/* 情境 B: 沒命盤 -> 顯示新手引導 */}
            {!meClient && (
                 <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
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
        </main>
        
        <UserManagementModal 
            isOpen={isUserMgmtOpen} 
            onClose={() => setIsUserMgmtOpen(false)} 
        />
    </div>
  );
};