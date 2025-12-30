import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface TagSelectProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  onAdd?: (newTag: string) => void;
  allowCustom?: boolean;
}

export const TagSelect: React.FC<TagSelectProps> = ({ options, value, onChange, onAdd, allowCustom = true }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTagVal, setNewTagVal] = useState('');

  const handleAddSubmit = () => {
    if (newTagVal.trim()) {
      const val = newTagVal.trim();
      if (onAdd) onAdd(val);
      onChange(val);
      setNewTagVal('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-200 
            ${value === opt 
              ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' 
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}
        >
          {opt}
        </button>
      ))}
      
      {allowCustom && (
        isAdding ? (
          <div className="flex items-center bg-white border border-blue-500 rounded-full px-2 py-0.5 animate-in fade-in zoom-in">
             <input 
                autoFocus 
                type="text" 
                className="outline-none px-1 py-0.5 w-20 text-sm bg-transparent" 
                placeholder="自訂..." 
                value={newTagVal} 
                onChange={(e) => setNewTagVal(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubmit()} 
                onBlur={() => { if(newTagVal) handleAddSubmit(); else setIsAdding(false); }} 
            />
          </div>
        ) : (
          <button 
            onClick={() => setIsAdding(true)} 
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border border-dashed border-gray-400 text-gray-500 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Plus size={14} />
            <span>自訂</span>
          </button>
        )
      )}
    </div>
  );
};