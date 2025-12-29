import React, { useState } from 'react';
import { X, Loader2, Dices, User } from 'lucide-react';
import { supabase } from '../supabase';

interface DivinationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
}

const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

export const DivinationSetupModal: React.FC<DivinationSetupModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [gender, setGender] = useState<'男' | '女'>('女');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'random' | 'manual'>('random');

  // 手動輸入的狀態
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    try {
        let finalData: any = {
            gender: gender,
            type: '紫占',
            name: '紫占排盤', // 預設名稱
        };

        const { data: { user } } = await supabase.auth.getUser();
        const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

        if (mode === 'random') {
            if (isSuperAdmin) {
                // 超級管理員外掛：固定帶入 1979/09/26 18:26 男
                finalData = {
                    ...finalData,
                    gender: '男',
                    birthYear: 1979,
                    birthMonth: 9,
                    birthDay: 26,
                    birthHour: 18,
                    birthMinute: 26,
                };
            } else {
                // 一般亂數取盤
                // 隨機生成 1950 ~ 2023 年
                const rndYear = Math.floor(Math.random() * (2023 - 1950 + 1)) + 1950;
                const rndMonth = Math.floor(Math.random() * 12) + 1;
                // 簡單處理，統一只取 1-28 日避免大小月問題
                const rndDay = Math.floor(Math.random() * 28) + 1; 
                const rndHour = Math.floor(Math.random() * 24);
                const rndMinute = Math.floor(Math.random() * 60);

                finalData = {
                    ...finalData,
                    birthYear: rndYear,
                    birthMonth: rndMonth,
                    birthDay: rndDay,
                    birthHour: rndHour,
                    birthMinute: rndMinute,
                };
            }
        } else {
            // 手動輸入
            if (!year || !month || !day || !hour || !minute) {
                alert("請填寫完整時間");
                setLoading(false);
                return;
            }
            finalData = {
                ...finalData,
                birthYear: parseInt(year),
                birthMonth: parseInt(month),
                birthDay: parseInt(day),
                birthHour: parseInt(hour),
                birthMinute: parseInt(minute),
            };
        }

        // 呼叫父層處理 (通常是 saveClient)
        await onConfirm(finalData);
        onClose();

    } catch (e) {
        console.error(e);
        alert('建立失敗');
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none transition-all w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative">
        
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Dices size={20} />
                紫占排盤設定
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* 模式選擇 */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setMode('random')}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === 'random' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    亂數取盤
                </button>
                <button 
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${mode === 'manual' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    手動輸入
                </button>
            </div>

            {/* 性別選擇 (不管是亂數還是手動都需要) */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 block">設定性別</label>
                <div className="flex gap-4">
                    <button onClick={() => setGender('女')} className={`flex-1 py-2 rounded border transition-all ${gender === '女' ? 'border-pink-500 text-pink-600 bg-pink-50 font-bold ring-1 ring-pink-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♀ 女</button>
                    <button onClick={() => setGender('男')} className={`flex-1 py-2 rounded border transition-all ${gender === '男' ? 'border-blue-500 text-blue-600 bg-blue-50 font-bold ring-1 ring-blue-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♂ 男</button>
                </div>
            </div>

            {/* 手動輸入區塊 */}
            {mode === 'manual' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                    <label className="text-xs font-bold text-gray-500 block">輸入時間 (西元)</label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="YYYY" className={inputClass} value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0,4))} />
                        <input type="text" placeholder="MM" className={inputClass} value={month} onChange={e => setMonth(e.target.value.replace(/\D/g, '').slice(0,2))} />
                        <input type="text" placeholder="DD" className={inputClass} value={day} onChange={e => setDay(e.target.value.replace(/\D/g, '').slice(0,2))} />
                    </div>
                    <div className="flex gap-2 items-center">
                        <input type="text" placeholder="hh" className={inputClass} value={hour} onChange={e => setHour(e.target.value.replace(/\D/g, '').slice(0,2))} />
                        <span>:</span>
                        <input type="text" placeholder="mm" className={inputClass} value={minute} onChange={e => setMinute(e.target.value.replace(/\D/g, '').slice(0,2))} />
                    </div>
                </div>
            )}

            {mode === 'random' && (
                <div className="text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    系統將隨機產生一組出生時間進行排盤。<br/>
                    (StepH 管理員測試時會自動鎖定特定時間)
                </div>
            )}

        </div>

        <div className="p-4 bg-gray-50 flex gap-3">
            <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">取消</button>
            <button 
                onClick={handleConfirm} 
                disabled={loading}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all font-bold flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : '開始紫占'}
            </button>
        </div>

      </div>
    </div>
  );
};