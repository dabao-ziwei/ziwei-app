import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { saveClient, getMyProfile } from '../db';
import { ZiWeiEngine } from '../logic/engine';

interface WizardProps {
    onComplete: () => void;
}

export const OnboardingWizard: React.FC<WizardProps> = ({ onComplete }) => {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [formData, setFormData] = useState({ name: '', gender: '' as '男'|'女'|'', year: 2000, month: 1, day: 1, hour: 0, minute: 0 });
    const [loadingText, setLoadingText] = useState('正在連結星曜數據...');

    const handleNext = () => { 
        if (step === 1 && !formData.name) return alert('請輸入您的稱呼'); 
        if (step === 2 && !formData.gender) return alert('請選擇性別'); 
        setStep(prev => (prev + 1) as any); 
    };

    const handleFinalSubmit = async () => { 
        if (!formData.year) return alert("請輸入年份"); 
        setStep(4); 
    };

    useEffect(() => {
        if (step === 4) {
            const sequence = [{t:0,msg:'正在連結星曜數據...'},{t:800,msg:'正在推算命宮位置...'},{t:1600,msg:'正在分析本週運勢能量...'}];
            const timers = sequence.map(({t,msg})=>setTimeout(()=>setLoadingText(msg),t));
            
            const finalTimer = setTimeout(async () => {
                try {
                    // 1. 取得 User ID
                    const profile = await getMyProfile();
                    if (!profile) throw new Error("User not found");

                    // 2. 計算星曜 (為了存 majorStars)
                    const engine = new ZiWeiEngine(Number(formData.year), formData.month, formData.day, formData.hour, formData.minute, formData.gender);
                    const chart = engine.getChartData();
                    const mingPalace = chart.palaces[engine.getMingPos()];
                    const majorStarNames = mingPalace.majorStars.map(s => s.name).join('') || '無主星';

                    // 3. 存入 DB
                    const newClient = { 
                        id: '', 
                        name: formData.name, 
                        gender: formData.gender, 
                        type: '我', 
                        birthYear: Number(formData.year), 
                        birthMonth: formData.month, 
                        birthDay: formData.day, 
                        birthHour: formData.hour, 
                        birthMinute: formData.minute, 
                        bornCity: '', 
                        tags: [], 
                        user_id: profile.id, 
                        majorStars: majorStarNames 
                    };
                    
                    await saveClient(newClient);
                    
                    // 4. 完成回呼
                    onComplete();

                } catch(e) {
                    console.error(e);
                    alert('建立失敗，請稍後再試');
                    setStep(3);
                }
            }, 2500);

            return ()=>{timers.forEach(clearTimeout);clearTimeout(finalTimer);};
        }
    }, [step, formData, onComplete]);
    
    // --- UI Render ---
    if(step===1) return <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800 animate-in fade-in zoom-in"><h1 className="text-2xl font-bold mb-4">歡迎來到大寶紫微</h1><p className="text-slate-500 mb-6 text-sm">首先，請問該如何稱呼您？</p><input className="w-full border-b-2 text-center text-xl p-2 mb-8 outline-none border-blue-200 focus:border-blue-500 transition-colors bg-transparent" placeholder="您的暱稱" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})}/><button onClick={handleNext} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">下一步</button></div>;
    
    if(step===2) return <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800 animate-in slide-in-from-right"><h1 className="text-xl font-bold mb-6">您的性別是？</h1><div className="flex gap-4"><button onClick={()=>{setFormData({...formData,gender:'男'});setTimeout(()=>setStep(3),200)}} className="flex-1 p-6 border-2 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-blue-600 text-xl flex flex-col items-center gap-2"><span>👨</span> 男</button><button onClick={()=>{setFormData({...formData,gender:'女'});setTimeout(()=>setStep(3),200)}} className="flex-1 p-6 border-2 rounded-2xl hover:border-pink-500 hover:bg-pink-50 transition-all font-bold text-pink-500 text-xl flex flex-col items-center gap-2"><span>👩</span> 女</button></div></div>;
    
    if(step===3) return <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center text-slate-800 animate-in slide-in-from-right"><h1 className="text-xl font-bold mb-2">出生時間</h1><p className="text-xs text-slate-400 mb-6">我們需要此資訊來繪製您的專屬命盤</p><div className="space-y-4 mb-8"><div className="flex items-center gap-2"><label className="w-12 text-sm font-bold text-slate-500">西元</label><input type="number" className="flex-1 border p-2 rounded-lg text-center outline-none focus:ring-2 focus:ring-blue-500" placeholder="YYYY" value={formData.year} onChange={e=>setFormData({...formData,year:parseInt(e.target.value)})}/><span className="text-slate-400">年</span></div><div className="flex gap-2"><div className="flex-1 flex items-center gap-1"><input type="number" className="w-full border p-2 rounded-lg text-center outline-none focus:ring-2 focus:ring-blue-500" value={formData.month} onChange={e=>setFormData({...formData,month:parseInt(e.target.value)})}/><span className="text-slate-400 text-sm">月</span></div><div className="flex-1 flex items-center gap-1"><input type="number" className="w-full border p-2 rounded-lg text-center outline-none focus:ring-2 focus:ring-blue-500" value={formData.day} onChange={e=>setFormData({...formData,day:parseInt(e.target.value)})}/><span className="text-slate-400 text-sm">日</span></div></div><div className="flex gap-2"><div className="flex-1 flex items-center gap-1"><input type="number" className="w-full border p-2 rounded-lg text-center outline-none focus:ring-2 focus:ring-blue-500" value={formData.hour} onChange={e=>setFormData({...formData,hour:parseInt(e.target.value)})}/><span className="text-slate-400 text-sm">時</span></div><div className="flex-1 flex items-center gap-1"><input type="number" className="w-full border p-2 rounded-lg text-center outline-none focus:ring-2 focus:ring-blue-500" value={formData.minute} onChange={e=>setFormData({...formData,minute:parseInt(e.target.value)})}/><span className="text-slate-400 text-sm">分</span></div></div></div><button onClick={handleFinalSubmit} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">開始排盤</button></div>;
    
    return <div className="text-white text-center mt-20 animate-in fade-in"><Loader2 className="animate-spin mx-auto mb-4 text-purple-400" size={48}/><p className="text-lg font-bold tracking-widest">{loadingText}</p></div>;
};