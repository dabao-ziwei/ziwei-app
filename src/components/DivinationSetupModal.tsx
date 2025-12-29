import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Dices } from 'lucide-react';
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

  // Refs for auto-focus
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  // 監聽模式切換：如果是管理員切換到手動模式，自動帶入預設值
  useEffect(() => {
      if (isOpen && mode === 'manual') {
          supabase.auth.getUser().then(({ data: { user } }) => {
              if (user?.email === SUPER_ADMIN_EMAIL) {
                  // 管理員預設值
                  setYear('1979');
                  setMonth('09');
                  setDay('26');
                  setHour('18');
                  setMinute('26');
                  setGender('男');
              } else {
                  // 一般使用者切換過來時保持空白 (或可選擇不清除，看需求，這裡重置為空比較乾淨)
                  // 若希望保留使用者上次輸入的，可註解掉下面這段
                  setYear('');
                  setMonth('');
                  setDay('');
                  setHour('');
                  setMinute('');
                  setGender('女');
              }
          });
      }
  }, [isOpen, mode]);

  const handleInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
    maxLen: number,
    nextRef?: React.RefObject<HTMLInputElement>
  ) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, maxLen);
      setter(val);
      
      if (val.length === maxLen && nextRef && nextRef.current) {
          // 【關鍵修正】使用 setTimeout 將 focus 動作推遲到 Event Loop 的下一個 Tick
          // 這能確保當前的按鍵事件 (Keyup/Keydown) 不會傳遞到下一個輸入框
          setTimeout(() => {
              nextRef.current?.focus();
              nextRef.current?.select();
          }, 0);
      }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentVal: string,
    prevRef?: React.RefObject<HTMLInputElement>
  ) => {
      // 處理 Backspace 倒退
      if (e.key === 'Backspace' && currentVal === '' && prevRef?.current) {
          e.preventDefault();
          prevRef.current.focus();
      }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
        let finalData: any = {
            gender: gender,
            type: '紫占',
            name: '紫微占卜',
        };

        // 亂數模式邏輯 (純隨機，不再有管理員覆寫)
        if (mode === 'random') {
            const rndYear = Math.floor(Math.random() * (2023 - 1950 + 1)) + 1950;
            const rndMonth = Math.floor(Math.random() * 12) + 1;
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
        } else {
            // 手動模式邏輯 (直接使用狀態值)
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

  const inputClass = "px-1 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none transition-all text-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative">
        
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center text-white">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Dices size={20} />
                紫微占卜設定
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
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'random' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    亂數取盤
                </button>
                <button 
                    onClick={() => setMode('manual')}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'manual' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    手動輸入
                </button>
            </div>

            {/* 性別選擇 */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 block">設定性別</label>
                <div className="flex gap-4">
                    <button onClick={() => setGender('女')} className={`flex-1 py-2 rounded border transition-all ${gender === '女' ? 'border-pink-500 text-pink-600 bg-pink-50 font-bold ring-1 ring-pink-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♀ 女</button>
                    <button onClick={() => setGender('男')} className={`flex-1 py-2 rounded border transition-all ${gender === '男' ? 'border-blue-500 text-blue-600 bg-blue-50 font-bold ring-1 ring-blue-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♂ 男</button>
                </div>
            </div>

            {/* 手動輸入區塊 (單行排列 + Auto Focus) */}
            {mode === 'manual' && (
                <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                    <label className="text-xs font-bold text-gray-500 block">輸入時間 (西元)</label>
                    <div className="flex items-center gap-1 justify-between">
                        <input ref={yearRef} type="text" placeholder="YYYY" className={`${inputClass} w-[28%]`} value={year} onChange={e => handleInput(e, setYear, 4, monthRef)} onKeyDown={e => handleKeyDown(e, year)} />
                        <span className="text-gray-300">-</span>
                        <input ref={monthRef} type="text" placeholder="MM" className={`${inputClass} w-[15%]`} value={month} onChange={e => handleInput(e, setMonth, 2, dayRef)} onKeyDown={e => handleKeyDown(e, month, yearRef)} />
                        <span className="text-gray-300">-</span>
                        <input ref={dayRef} type="text" placeholder="DD" className={`${inputClass} w-[15%]`} value={day} onChange={e => handleInput(e, setDay, 2, hourRef)} onKeyDown={e => handleKeyDown(e, day, monthRef)} />
                        <span className="text-gray-300 mx-1">|</span>
                        <input ref={hourRef} type="text" placeholder="hh" className={`${inputClass} w-[15%]`} value={hour} onChange={e => handleInput(e, setHour, 2, minuteRef)} onKeyDown={e => handleKeyDown(e, hour, dayRef)} />
                        <span className="text-gray-300">:</span>
                        <input ref={minuteRef} type="text" placeholder="mm" className={`${inputClass} w-[15%]`} value={minute} onChange={e => handleInput(e, setMinute, 2)} onKeyDown={e => handleKeyDown(e, minute, hourRef)} />
                    </div>
                </div>
            )}

            {mode === 'random' && (
                <div className="text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">
                    系統將隨機產生一組出生時間進行排盤。
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
                {loading ? <Loader2 className="animate-spin" size={20} /> : '開始占卜'}
            </button>
        </div>

      </div>
    </div>
  );
};