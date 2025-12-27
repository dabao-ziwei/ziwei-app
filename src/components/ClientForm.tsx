import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { DateInput } from './DateInput';
import { TagSelect } from './TagSelect';
import { ZiWeiEngine } from '../logic/engine';
import { db, type Client } from '../db';

interface ClientFormProps { isOpen: boolean; editTarget: Client | null; onClose: () => void; onSave: (client: Client) => void; }
const DEFAULT_CATS = ["我", "家人", "朋友", "客戶", "名人", "其他"];

export const ClientForm: React.FC<ClientFormProps> = ({ isOpen, editTarget, onClose, onSave }) => {
  if (!isOpen) return null;
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [category, setCategory] = useState('客戶');
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [dateVal, setDateVal] = useState({ year: '', month: '', day: '', hour: '', minute: '' });

  useEffect(() => {
    if (editTarget) {
      setName(editTarget.name); setGender(editTarget.gender); setCategory(editTarget.category);
      setDateVal({ year: editTarget.birthYear.toString(), month: editTarget.birthMonth.toString().padStart(2, '0'), day: editTarget.birthDay.toString().padStart(2, '0'), hour: editTarget.birthHour.toString().padStart(2, '0'), minute: editTarget.birthMinute.toString().padStart(2, '0') });
    } else {
      setName(''); setGender('男'); setCategory('客戶'); setDateVal({ year: '', month: '', day: '', hour: '', minute: '' });
    }
  }, [editTarget, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) return alert("請輸入姓名");
    const y = parseInt(dateVal.year), m = parseInt(dateVal.month), d = parseInt(dateVal.day), h = parseInt(dateVal.hour), min = dateVal.minute === '' ? 0 : parseInt(dateVal.minute);
    if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(h)) return alert("請輸入完整的出生時間");

    const engine = new ZiWeiEngine(y, m, d, h, min, gender);
    const chartData = engine.getChartData();
    const mainStars = chartData.palaces[engine.getMingPos()].majorStars.map(s => s.name).join('');

    const clientData: Client = { name, gender, category, birthYear: y, birthMonth: m, birthDay: d, birthHour: h, birthMinute: min, lunarDateStr: chartData.lunarDate, bazi: chartData.bazi, mainStar: mainStars || "命無正曜", createdAt: editTarget?.createdAt || new Date(), updatedAt: new Date(), isDeleted: false };

    if (editTarget?.id) { await db.clients.update(editTarget.id, clientData); clientData.id = editTarget.id; }
    else { const id = await db.clients.add(clientData); clientData.id = Number(id); }
    onSave(clientData);
  };

  const allCats = Array.from(new Set([...DEFAULT_CATS, ...customCats]));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between bg-gray-50"><h2 className="text-xl font-bold">{editTarget ? '編輯' : '新增'}命盤</h2><button onClick={onClose}><X /></button></div>
        <div className="p-6 overflow-y-auto space-y-6">
          <div><label className="block text-sm font-bold text-gray-500 mb-2">性別</label><div className="flex gap-4"><button onClick={() => setGender('男')} className={`flex-1 py-3 rounded border-2 ${gender === '男' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200'}`}>♂ 男</button><button onClick={() => setGender('女')} className={`flex-1 py-3 rounded border-2 ${gender === '女' ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-200'}`}>♀ 女</button></div></div>
          <div><label className="block text-sm font-bold text-gray-500 mb-2">姓名</label><input autoFocus type="text" className="w-full px-4 py-3 text-lg border rounded" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="block text-sm font-bold text-gray-500 mb-2">時間</label><DateInput value={dateVal} onChange={setDateVal} /></div>
          <div><label className="block text-sm font-bold text-gray-500 mb-2">分類</label><TagSelect options={allCats} value={category} onChange={setCategory} onAdd={n => setCustomCats([...customCats, n])} /></div>
        </div>
        <div className="p-4 border-t flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-gray-100 rounded">取消</button><button onClick={handleSubmit} className="flex-1 py-3 bg-ben text-white rounded flex justify-center gap-2"><Check />儲存並排盤</button></div>
      </div>
    </div>
  );
};