import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react'; // 新增 Loader2
import type { Client } from '../db';
import { ZiWeiEngine } from '../logic/engine';

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: any) => Promise<void>; // 修改定義，支援 async
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
  const [isSubmitting, setIsSubmitting] = useState(false); // 新增讀取狀態

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

  const handleDateInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setValue: (val: string) => void,
    maxLength: number,
    nextRef?: React.RefObject<HTMLInputElement>
  ) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length > maxLength) return;
    setValue(val);
    if (val.length === maxLength && nextRef && nextRef.current) {
      setTimeout(() => {
        nextRef.current?.focus();
        nextRef.current?.select();
      }, 10);
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

      // 2. 嘗試執行排盤引擎 (最可能出錯的地方)
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
              <input ref={yearRef} type="text" value={year} onChange={(e) => handleDateInput(e, setYear, 4, monthRef)} placeholder="YYYY" className="w-[28%] px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              <span className="text-gray-400">-</span>
              <input ref={monthRef} type="text" value={month} onChange={(e) => handleDateInput(e, setMonth, 2, dayRef)} placeholder="MM" className="w-[18%] px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              <span className="text-gray-400">-</span>
              <input ref={dayRef} type="text" value={day} onChange={(e) => handleDateInput(e, setDay, 2, hourRef)} placeholder="DD" className="w-[18%] px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              <span className="text-gray-300 mx-1">|</span>
              <input ref={hourRef} type="text" value={hour} onChange={(e) => handleDateInput(e, setHour, 2, minuteRef)} placeholder="hh" className="w-[18%] px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              <span className="text-gray-400">:</span>
              <input ref={minuteRef} type="text" value={minute} onChange={(e) => handleDateInput(e, setMinute, 2, undefined)} placeholder="mm" className="w-[18%] px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
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