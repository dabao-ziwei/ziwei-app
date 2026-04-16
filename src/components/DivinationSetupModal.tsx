// FILE: src/components/DivinationSetupModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Dices, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { checkIsSuperAdmin } from '../db';

interface DivinationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
}

export const DivinationSetupModal: React.FC<DivinationSetupModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [gender, setGender] = useState<'男' | '女'>('女');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'random' | 'manual'>('random');
  const [userEmail, setUserEmail] = useState('');

  // 時間輸入狀態
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

  // 數字輸入狀態 (A, B, C, D)
  const [digits, setDigits] = useState(['', '', '', '']);
  
  // Refs
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  const digitRefs = [
      useRef<HTMLInputElement>(null),
      useRef<HTMLInputElement>(null),
      useRef<HTMLInputElement>(null),
      useRef<HTMLInputElement>(null)
  ];

  // 每次打開 Modal 時初始化，並「預先」抓取信箱
  useEffect(() => {
      if (isOpen) {
          setStep(1);
          setDigits(['', '', '', '']);
          setMode('random');
          
          setYear('');
          setMonth('');
          setDay('');
          setHour('');
          setMinute('');
          setGender('女');

          // 一開啟 Modal 就取得信箱並存起來，避免後續非同步延遲
          supabase.auth.getUser().then(({ data: { user } }) => {
              if (user?.email) {
                  setUserEmail(user.email.trim().toLowerCase());
              }
          });
      }
  }, [isOpen]);

  // [絕對防禦] 將判斷與給值寫死在按鈕行為上，確保同步執行
  const handleManualMode = async () => {
      setMode('manual');
      
      let currentEmail = userEmail;
      // 保底機制：如果剛打開瞬間點太快還沒抓到，這裡強迫等它抓完
      if (!currentEmail) {
          const { data: { user } } = await supabase.auth.getUser();
          currentEmail = user?.email?.trim().toLowerCase() || '';
          setUserEmail(currentEmail);
      }

      // 使用統一的權限驗證函數
      if (checkIsSuperAdmin(currentEmail)) {
          setYear('1979'); 
          setMonth('09'); 
          setDay('26'); 
          setHour('18'); 
          setMinute('26'); 
          setGender('男');
      } else {
          setYear(''); 
          setMonth(''); 
          setDay(''); 
          setHour(''); 
          setMinute(''); 
          setGender('女');
      }
  };

  const handleRandomMode = () => {
      setMode('random');
      setYear(''); 
      setMonth(''); 
      setDay(''); 
      setHour(''); 
      setMinute(''); 
      setGender('女');
  };

  // 時間輸入處理
  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string) => void, maxLen: number, nextRef?: React.RefObject<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '').slice(0, maxLen);
      setter(val);
      if (val.length === maxLen && nextRef?.current) {
          setTimeout(() => { nextRef.current?.focus(); nextRef.current?.select(); }, 0);
      }
  };

  const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentVal: string, prevRef?: React.RefObject<HTMLInputElement>) => {
      if (e.key === 'Backspace' && currentVal === '' && prevRef?.current) {
          e.preventDefault(); prevRef.current.focus();
      }
  };

  // 數字輸入處理 (A, B, C, D)
  const handleDigitInput = (index: number, val: string) => {
      const newDigits = [...digits];
      const v = val.replace(/\D/g, '').slice(-1); 
      newDigits[index] = v;
      setDigits(newDigits);

      if (v && index < 3 && digitRefs[index + 1].current) {
          setTimeout(() => digitRefs[index + 1].current?.focus(), 0);
      }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0 && digitRefs[index - 1].current) {
          e.preventDefault();
          digitRefs[index - 1].current?.focus();
      }
  };

  const handleNextStep = () => {
      if (mode === 'manual') {
          if (!year || !month || !day || !hour || !minute) {
              alert("請填寫完整時間");
              return;
          }
      }
      setStep(2);
      setTimeout(() => digitRefs[0].current?.focus(), 100);
  };

  const handleFinalConfirm = async () => {
      const ab = parseInt((digits[0] || '0') + (digits[1] || '0'));
      const cd = parseInt((digits[2] || '0') + (digits[3] || '0'));

      if (digits.some(d => d === '')) {
          alert("請輸入完整的 4 位數字");
          return;
      }
      if (ab === 0) {
          alert("前兩位數字 (AB) 不可同時為 0");
          return;
      }
      if (cd === 0) {
          alert("後兩位數字 (CD) 不可同時為 0");
          return;
      }

      setLoading(true);
      try {
          let finalData: any = {
              gender: gender,
              type: '紫占',
              name: '紫微占卜',
              divNum: digits,
          };

          if (mode === 'random') {
              const rndYear = Math.floor(Math.random() * (2023 - 1950 + 1)) + 1950;
              const rndMonth = Math.floor(Math.random() * 12) + 1;
              const rndDay = Math.floor(Math.random() * 28) + 1; 
              const rndHour = Math.floor(Math.random() * 24);
              const rndMinute = Math.floor(Math.random() * 60);
              finalData = { ...finalData, birthYear: rndYear, birthMonth: rndMonth, birthDay: rndDay, birthHour: rndHour, birthMinute: rndMinute };
          } else {
              finalData = { ...finalData, birthYear: parseInt(year), birthMonth: parseInt(month), birthDay: parseInt(day), birthHour: parseInt(hour), birthMinute: parseInt(minute) };
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

  // 強制加上 text-slate-800 與 bg-white，切斷暗黑模式的白色字體繼承
  const inputClass = "px-1 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 outline-none transition-all text-lg text-slate-800 bg-white";
  const digitInputClass = "w-14 h-16 text-center text-3xl font-bold border-2 border-purple-200 rounded-xl focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-purple-800 bg-white caret-transparent";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 text-slate-800">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative flex flex-col">
        
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex justify-between items-center text-white shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Dices size={20} />
                紫微占卜 {step === 1 ? '(設定時間)' : '(觸機取數)'}
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
            {step === 1 ? (
                <>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={handleRandomMode} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'random' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>亂數取盤</button>
                        <button onClick={handleManualMode} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${mode === 'manual' ? 'bg-white shadow text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>手動輸入</button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 block">設定性別</label>
                        <div className="flex gap-4">
                            <button onClick={() => setGender('女')} className={`flex-1 py-2 rounded border transition-all ${gender === '女' ? 'border-pink-500 text-pink-600 bg-pink-50 font-bold ring-1 ring-pink-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♀ 女</button>
                            <button onClick={() => setGender('男')} className={`flex-1 py-2 rounded border transition-all ${gender === '男' ? 'border-blue-500 text-blue-600 bg-blue-50 font-bold ring-1 ring-blue-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♂ 男</button>
                        </div>
                    </div>

                    {mode === 'manual' ? (
                        <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
                            <label className="text-xs font-bold text-gray-500 block">輸入時間 (西元)</label>
                            <div className="flex items-center gap-1 justify-between">
                                <input ref={yearRef} type="text" placeholder="YYYY" className={`${inputClass} w-[28%]`} value={year} onChange={e => handleDateInput(e, setYear, 4, monthRef)} onKeyDown={e => handleDateKeyDown(e, year)} />
                                <span className="text-gray-300">-</span>
                                <input ref={monthRef} type="text" placeholder="MM" className={`${inputClass} w-[15%]`} value={month} onChange={e => handleDateInput(e, setMonth, 2, dayRef)} onKeyDown={e => handleDateKeyDown(e, month, yearRef)} />
                                <span className="text-gray-300">-</span>
                                <input ref={dayRef} type="text" placeholder="DD" className={`${inputClass} w-[15%]`} value={day} onChange={e => handleDateInput(e, setDay, 2, hourRef)} onKeyDown={e => handleDateKeyDown(e, day, monthRef)} />
                                <span className="text-gray-300 mx-1">|</span>
                                <input ref={hourRef} type="text" placeholder="hh" className={`${inputClass} w-[15%]`} value={hour} onChange={e => handleDateInput(e, setHour, 2, minuteRef)} onKeyDown={e => handleDateKeyDown(e, hour, dayRef)} />
                                <span className="text-gray-300">:</span>
                                <input ref={minuteRef} type="text" placeholder="mm" className={`${inputClass} w-[15%]`} value={minute} onChange={e => handleDateInput(e, setMinute, 2)} onKeyDown={e => handleDateKeyDown(e, minute, hourRef)} />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100">系統將隨機產生一組出生時間進行排盤。</div>
                    )}
                </>
            ) : (
                <div className="flex flex-col items-center gap-6 py-4 animate-in slide-in-from-right-4 fade-in">
                    <div className="text-center space-y-1">
                        <div className="text-lg font-bold text-gray-800">請輸入 4 位數字</div>
                        <div className="text-xs text-gray-500">前兩碼定命宮，後兩碼定四化</div>
                    </div>
                    
                    <div className="flex gap-3">
                        {digits.map((d, i) => (
                            <React.Fragment key={i}>
                                <input
                                    ref={digitRefs[i]}
                                    type="text"
                                    inputMode="numeric"
                                    value={d}
                                    onChange={(e) => handleDigitInput(i, e.target.value)}
                                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                                    className={digitInputClass}
                                    placeholder="0"
                                />
                                {i === 1 && <div className="w-px bg-gray-200 h-16 mx-1"></div>}
                            </React.Fragment>
                        ))}
                    </div>
                    
                    <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded">
                        AB 不可為 00 · CD 不可為 00
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 bg-gray-50 flex gap-3 shrink-0">
            {step === 1 ? (
                <>
                    <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">取消</button>
                    <button onClick={handleNextStep} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all font-bold flex items-center justify-center gap-2">
                        下一步 <ArrowRight size={18} />
                    </button>
                </>
            ) : (
                <>
                    <button onClick={() => setStep(1)} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2">
                        <ArrowLeft size={18} /> 上一步
                    </button>
                    <button onClick={handleFinalConfirm} disabled={loading} className="flex-[2] py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all font-bold flex items-center justify-center gap-2">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : '開始排盤'}
                    </button>
                </>
            )}
        </div>

      </div>
    </div>
  );
};