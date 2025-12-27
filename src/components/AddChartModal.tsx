import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react'; 
import type { Client } from '../db';
import { ZiWeiEngine } from '../logic/engine';

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: any) => Promise<void>;
  editData?: Client | null;
}

const CATEGORIES = ['我', '家人', '朋友', '客戶', '名人', '其他'];

export const AddChartModal: React.FC<AddChartModalProps> = ({ isOpen, onClose, onSave, editData }) => {
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [name, setName] = useState('');
  
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  
  const [category, setCategory] = useState('客戶');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setName(editData.name);
        setGender(editData.gender);
        setYear(editData.birthYear.toString());
        setMonth(editData.birthMonth.toString().padStart(2, '0'));
        setDay(editData.birthDay.toString().padStart(2, '0'));
        setHour(editData.birthHour.toString().padStart(2, '0'));
        setMinute(editData.birthMinute.toString().padStart(2, '0'));
        setCategory(editData.type);
      } else {
        setGender('男');
        setName('');
        setYear('');
        setMonth('');
        setDay('');
        setHour('');
        setMinute('');
        setCategory('客戶');
      }
      setTimeout(() => yearRef.current?.focus(), 100);
    }
  }, [isOpen, editData]);

  // 修改：輸入自動跳轉邏輯
  const handleDateInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: (val: string) => void,
    maxLength: number,
    nextRef?: React.RefObject<HTMLInputElement>
  ) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length > maxLength) return;
    setValue(val);
    
    // 如果長度到了，直接跳下一格並全選 (提升 UX)
    if (val.length === maxLength && nextRef && nextRef.current) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  // 新增：處理 Backspace 倒退邏輯
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    prevRef?: React.RefObject<HTMLInputElement>
  ) => {
    // 當按下 Backspace 且目前格子是空的，就跳回上一格
    if (e.key === 'Backspace' && currentValue === '' && prevRef && prevRef.current) {
      e.preventDefault();
      prevRef.current.focus();
      // prevRef.current.select(); // 視需求決定是否要全選上一格內容
    }
  };

  const handleSubmit = async () => {
    // 1. 基本驗證
    if (!name || !year || !month || !day || !hour || !minute) {
      alert("請填寫完整資訊");
      return;
    }

    setIsSubmitting(true);

    try {
      const birthYear = parseInt(year);
      const birthMonth = parseInt(month);
      const birthDay = parseInt(day);
      const birthHour = parseInt(hour);
      const birthMinute = parseInt(minute);

      console.log('開始計算排盤...', { birthYear, birthMonth, birthDay, birthHour, birthMinute, gender });

      // 2. 嘗試執行排盤引擎
      const engine = new ZiWeiEngine(birthYear, birthMonth, birthDay, birthHour, birthMinute, gender);
      const chart = engine.getChartData();
      
      // 3. 取得主星
      const mingPos = engine.getMingPos();
      const mingPalace = chart.palaces[mingPos];
      if (!mingPalace) throw new Error(`找不到命宮 (MingPos: ${mingPos})`);
      
      const majorStarNames = mingPalace.majorStars.map(s => s.name).join('') || '無主星';
      
      // 4. 執行儲存
      await onSave({
        id: editData?.id,
        name,
        gender,
        birthYear,
        birthMonth,
        birthDay,
        birthHour,
        birthMinute,
        type: category as any,
        majorStars: majorStarNames
      });

      onClose();

    } catch (err: any) {
      // 5. 捕捉錯誤並顯示
      console.error('Save Error:', err);
      alert(`發生錯誤：${err.message}\n請截圖提供給工程師`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // 定義輸入框共用樣式 (加入 text-center 和 focus ring)
  const inputClass = "px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{editData ? '編輯命盤' : '新增命盤'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 block">性別</label>
            <div className="flex gap-4">
              <button onClick={() => setGender('男')} className={`flex-1 py-2 rounded border transition-all ${gender === '男' ? 'border-blue-500 text-blue-600 bg-blue-50 font-bold ring-1 ring-blue-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♂ 男</button>
              <button onClick={() => setGender('女')} className={`flex-1 py-2 rounded border transition-all ${gender === '女' ? 'border-pink-500 text-pink-600 bg-pink-50 font-bold ring-1 ring-pink-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♀ 女</button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 block">姓名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="輸入姓名" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 block">時間 (西元 / 24小時制)</label>
            <div className="flex items-center gap-2">
              <input 
                ref={yearRef} 
                type="text" 
                inputMode="numeric" pattern="[0-9]*" // 手機鍵盤優化
                value={year} 
                onChange={(e) => handleDateInput(e, setYear, 4, monthRef)} 
                onKeyDown={(e) => handleKeyDown(e, year, undefined)} // 年份沒有上一格
                placeholder="YYYY" 
                className={`${inputClass} w-[28%]`} 
              />
              <span className="text-gray-400">-</span>
              <input 
                ref={monthRef} 
                type="text" 
                inputMode="numeric" pattern="[0-9]*"
                value={month} 
                onChange={(e) => handleDateInput(e, setMonth, 2, dayRef)} 
                onKeyDown={(e) => handleKeyDown(e, month, yearRef)} // 按 Backspace 跳回年份
                placeholder="MM" 
                className={`${inputClass} w-[18%]`} 
              />
              <span className="text-gray-400">-</span>
              <input 
                ref={dayRef} 
                type="text" 
                inputMode="numeric" pattern="[0-9]*"
                value={day} 
                onChange={(e) => handleDateInput(e, setDay, 2, hourRef)} 
                onKeyDown={(e) => handleKeyDown(e, day, monthRef)} // 按 Backspace 跳回月份
                placeholder="DD" 
                className={`${inputClass} w-[18%]`} 
              />
              <span className="text-gray-300 mx-1">|</span>
              <input 
                ref={hourRef} 
                type="text" 
                inputMode="numeric" pattern="[0-9]*"
                value={hour} 
                onChange={(e) => handleDateInput(e, setHour, 2, minuteRef)} 
                onKeyDown={(e) => handleKeyDown(e, hour, dayRef)} // 按 Backspace 跳回日期
                placeholder="hh" 
                className={`${inputClass} w-[18%]`} 
              />
              <span className="text-gray-400">:</span>
              <input 
                ref={minuteRef} 
                type="text" 
                inputMode="numeric" pattern="[0-9]*"
                value={minute} 
                onChange={(e) => handleDateInput(e, setMinute, 2, undefined)} 
                onKeyDown={(e) => handleKeyDown(e, minute, hourRef)} // 按 Backspace 跳回小時
                placeholder="mm" 
                className={`${inputClass} w-[18%]`} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 block">分類</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-1.5 rounded-full text-sm transition-all border ${category === cat ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>{cat}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">取消</button>
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg shadow-red-200 transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : '✓ 儲存並排盤'}
          </button>
        </div>
      </div>
    </div>
  );
};