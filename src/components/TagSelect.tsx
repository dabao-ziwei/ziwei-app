import React, { useState } from 'react';
import { Plus } from 'lucide-react';
interface TagSelectProps { options: string[]; value: string; onChange: (val: string) => void; onAdd: (newTag: string) => void; }

export const TagSelect: React.FC<TagSelectProps> = ({ options, value, onChange, onAdd }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagVal, setNewTagVal] = useState('');
  const handleAddSubmit = () => { if (newTagVal.trim()) { onAdd(newTagVal.trim()); onChange(newTagVal.trim()); setNewTagVal(''); setIsAdding(false); } };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} className={`px-4 py-1.5 rounded-full text-sm border transition-all ${value === opt ? 'bg-ben text-white border-ben' : 'bg-white text-gray-600 border-gray-200'}`}>{opt}</button>
      ))}
      {isAdding ? (
        <input autoFocus type="text" className="border-b-2 border-ben outline-none px-1 py-1 w-24 text-sm" placeholder="新類別..." value={newTagVal} onChange={(e) => setNewTagVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubmit()} onBlur={() => { if(newTagVal) handleAddSubmit(); else setIsAdding(false); }} />
      ) : (
        <button onClick={() => setIsAdding(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border border-dashed border-gray-400 text-gray-500 hover:border-ben hover:text-ben"><Plus size={14} /><span>自訂</span></button>
      )}
    </div>
  );
};