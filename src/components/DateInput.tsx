import React, { useRef, ChangeEvent, KeyboardEvent } from 'react';
interface DateValue { year: string; month: string; day: string; hour: string; minute: string; }
interface DateInputProps { value: DateValue; onChange: (val: DateValue) => void; }

export const DateInput: React.FC<DateInputProps> = ({ value, onChange }) => {
  const refs = { year: useRef<HTMLInputElement>(null), month: useRef<HTMLInputElement>(null), day: useRef<HTMLInputElement>(null), hour: useRef<HTMLInputElement>(null), minute: useRef<HTMLInputElement>(null) };
  const handleChange = (field: keyof DateValue, max: number, next?: React.RefObject<HTMLInputElement>) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); if (val.length > max) return;
    onChange({ ...value, [field]: val });
    if (val.length === max && next?.current) next.current.focus();
  };
  const handleKeyDown = (field: keyof DateValue, prev?: React.RefObject<HTMLInputElement>) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && value[field] === '' && prev?.current) prev.current.focus();
  };
  const inputClass = "border border-gray-300 rounded px-2 py-2 text-center text-lg focus:border-ben focus:ring-1 focus:ring-ben outline-none transition-colors";
  return (
    <div className="flex items-center gap-2">
      <input ref={refs.year} className={`${inputClass} w-20`} placeholder="YYYY" value={value.year} onChange={handleChange('year', 4, refs.month)} />
      <span className="text-gray-400 font-bold">-</span>
      <input ref={refs.month} className={`${inputClass} w-14`} placeholder="MM" value={value.month} onChange={handleChange('month', 2, refs.day)} onKeyDown={handleKeyDown('month', refs.year)} />
      <span className="text-gray-400 font-bold">-</span>
      <input ref={refs.day} className={`${inputClass} w-14`} placeholder="DD" value={value.day} onChange={handleChange('day', 2, refs.hour)} onKeyDown={handleKeyDown('day', refs.month)} />
      <span className="mx-2 text-gray-300">|</span>
      <input ref={refs.hour} className={`${inputClass} w-14`} placeholder="時" value={value.hour} onChange={handleChange('hour', 2, refs.minute)} onKeyDown={handleKeyDown('hour', refs.day)} />
      <span className="text-gray-400 font-bold">:</span>
      <input ref={refs.minute} className={`${inputClass} w-14`} placeholder="分" value={value.minute} onChange={handleChange('minute', 2)} onKeyDown={handleKeyDown('minute', refs.hour)} />
    </div>
  );
};