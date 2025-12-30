import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2, Link as LinkIcon, Search } from 'lucide-react'; 
import { loadClients, type Client } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { TagSelect } from './TagSelect'; 
import { ZHI } from '../logic/constants'; // 引入 ZHI 以顯示時辰

interface AddChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: any) => Promise<void>;
  editData?: Client | null;
}

const CATEGORIES = ['我', '家人', '朋友', '客戶', '名人', '其他'];

// 鎖定預設項目，不亂加
const DEFAULT_RELATIONS = ['配偶', '情侶', '父親', '母親', '子女', '哥哥', '姐姐', '弟弟', '妹妹', '親戚', '朋友'];

// 輔助：格式化完整時間顯示
const formatFullDate = (c: Client) => {
    const min = c.birthMinute.toString().padStart(2, '0');
    // 計算地支
    const zhiIdx = Math.floor((c.birthHour + 1) / 2) % 12;
    let zhi = ZHI[zhiIdx];
    if (zhiIdx === 0 && c.birthHour === 23) zhi = '晚子';
    if (zhiIdx === 0 && c.birthHour === 0) zhi = '早子';
    
    return `${c.birthYear}/${c.birthMonth.toString().padStart(2, '0')}/${c.birthDay.toString().padStart(2, '0')} ${c.birthHour}:${min} (${zhi}時)`;
};

export const AddChartModal: React.FC<AddChartModalProps> = ({ isOpen, onClose, onSave, editData }) => {
  const [gender, setGender] = useState<'男' | '女'>('女');
  const [name, setName] = useState('');
  
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  
  const [category, setCategory] = useState('客戶');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 快速關聯狀態
  const [linkTarget, setLinkTarget] = useState<Client | null>(null);
  const [linkType, setLinkType] = useState('配偶');
  const [isSearchingLink, setIsSearchingLink] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [allClients, setAllClients] = useState<Client[]>([]);

  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const minuteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadClients().then(setAllClients);
      // 這裡不再載入自訂關係，只使用 DEFAULT_RELATIONS
      
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
        setGender('女');
        setName('');
        setYear('');
        setMonth('');
        setDay('');
        setHour('');
        setMinute('');
        setCategory('客戶');
        setLinkTarget(null);
        setLinkType('配偶'); // 重置為預設
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
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    prevRef?: React.RefObject<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && currentValue === '' && prevRef && prevRef.current) {
      e.preventDefault();
      prevRef.current.focus();
    }
  };

  const handleSubmit = async () => {
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

      const engine = new ZiWeiEngine(birthYear, birthMonth, birthDay, birthHour, birthMinute, gender);
      const chart = engine.getChartData();
      const mingPos = engine.getMingPos();
      const mingPalace = chart.palaces[mingPos];
      const majorStarNames = mingPalace.majorStars.map(s => s.name).join('') || '無主星';
      
      const clientData = {
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
      };

      const payload: any = { ...clientData };
      if (linkTarget) {
          payload.linkRequest = {
              targetId: linkTarget.id,
              type: linkType
          };
      }
      
      await onSave(payload);

      onClose();

    } catch (err: any) {
      console.error('Save Error:', err);
      alert(`發生錯誤：${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = allClients.filter(c => 
    c.name.includes(searchTerm) || c.birthYear.toString().includes(searchTerm)
  ).slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{editData ? '編輯命盤' : '新增命盤'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 block">性別</label>
            <div className="flex gap-4">
              <button onClick={() => setGender('女')} className={`flex-1 py-2 rounded border transition-all ${gender === '女' ? 'border-pink-500 text-pink-600 bg-pink-50 font-bold ring-1 ring-pink-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♀ 女</button>
              <button onClick={() => setGender('男')} className={`flex-1 py-2 rounded border transition-all ${gender === '男' ? 'border-blue-500 text-blue-600 bg-blue-50 font-bold ring-1 ring-blue-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>♂ 男</button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 block">姓名</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="輸入姓名" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 block">時間 (西元 / 24小時制)</label>
            <div className="flex items-center gap-2">
              <input ref={yearRef} type="text" inputMode="numeric" pattern="[0-9]*" value={year} onChange={(e) => handleDateInput(e, setYear, 4, monthRef)} onKeyDown={(e) => handleKeyDown(e, year, undefined)} placeholder="YYYY" className="px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none w-[28%]" />
              <span className="text-gray-400">-</span>
              <input ref={monthRef} type="text" inputMode="numeric" pattern="[0-9]*" value={month} onChange={(e) => handleDateInput(e, setMonth, 2, dayRef)} onKeyDown={(e) => handleKeyDown(e, month, yearRef)} placeholder="MM" className="px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none w-[18%]" />
              <span className="text-gray-400">-</span>
              <input ref={dayRef} type="text" inputMode="numeric" pattern="[0-9]*" value={day} onChange={(e) => handleDateInput(e, setDay, 2, hourRef)} onKeyDown={(e) => handleKeyDown(e, day, monthRef)} placeholder="DD" className="px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none w-[18%]" />
              <span className="text-gray-300 mx-1">|</span>
              <input ref={hourRef} type="text" inputMode="numeric" pattern="[0-9]*" value={hour} onChange={(e) => handleDateInput(e, setHour, 2, minuteRef)} onKeyDown={(e) => handleKeyDown(e, hour, dayRef)} placeholder="hh" className="px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none w-[18%]" />
              <span className="text-gray-400">:</span>
              <input ref={minuteRef} type="text" inputMode="numeric" pattern="[0-9]*" value={minute} onChange={(e) => handleDateInput(e, setMinute, 2, undefined)} onKeyDown={(e) => handleKeyDown(e, minute, hourRef)} placeholder="mm" className="px-2 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none w-[18%]" />
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

          {!editData && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-blue-600 flex items-center gap-1">
                        <LinkIcon size={12}/> 快速建立關聯 (選填)
                    </label>
                    {linkTarget && (
                        <button onClick={() => setLinkTarget(null)} className="text-xs text-red-500 hover:underline">清除關聯</button>
                    )}
                </div>

                {!linkTarget ? (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="搜尋要關聯的對象..." 
                            className="w-full pl-8 pr-3 py-2 border border-blue-100 bg-blue-50/50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:bg-white"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchingLink(true)}
                        />
                        {isSearchingLink && searchTerm && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-32 overflow-y-auto">
                                {filteredClients.map(c => (
                                    <div 
                                        key={c.id} 
                                        onClick={() => { setLinkTarget(c); setIsSearchingLink(false); setSearchTerm(''); }}
                                        className="p-2 hover:bg-blue-50 cursor-pointer text-sm flex justify-between items-center"
                                    >
                                        <span className="font-medium text-gray-700">{c.name}</span>
                                        {/* 完整時間顯示 (Requirement 1) */}
                                        <span className="text-gray-400 text-xs">{formatFullDate(c)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">他是</span>
                            <span className="font-bold text-blue-800">{linkTarget.name}</span>
                            <span className="text-gray-600">的...</span>
                        </div>
                        {/* 這裡僅使用 DEFAULT_RELATIONS，不包含自訂項目 (Requirement 2) */}
                        <TagSelect 
                            options={DEFAULT_RELATIONS} 
                            value={linkType} 
                            onChange={setLinkType} 
                            allowCustom={false}
                        />
                    </div>
                )}
            </div>
          )}

        </div>
        
        <div className="p-4 bg-gray-50 flex gap-3 shrink-0">
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