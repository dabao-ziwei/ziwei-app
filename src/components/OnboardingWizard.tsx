import React, { useState } from 'react';
import { saveClient } from '../db';

export const OnboardingWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [name, setName] = useState('');
    const [gender, setGender] = useState<'男'|'女'>('男');
    const [year, setYear] = useState('1990');
    const [month, setMonth] = useState('1');
    const [day, setDay] = useState('1');
    const [hour, setHour] = useState('12');

    const handleSubmit = async () => {
        const client = {
            name, gender, category: '我',
            birthYear: parseInt(year), birthMonth: parseInt(month), birthDay: parseInt(day),
            birthHour: parseInt(hour), birthMinute: 0
        };
        await saveClient(client);
        onComplete();
    };

    return (
        <div className="bg-white p-6 rounded-lg text-black w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">建立您的命盤</h2>
            <input className="border p-2 w-full mb-2" placeholder="姓名" value={name} onChange={e => setName(e.target.value)} />
            <div className="flex gap-4 mb-2">
                <button className={`flex-1 p-2 border ${gender==='男'?'bg-blue-100':''}`} onClick={()=>setGender('男')}>男</button>
                <button className={`flex-1 p-2 border ${gender==='女'?'bg-pink-100':''}`} onClick={()=>setGender('女')}>女</button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
                <input className="border p-2" type="number" value={year} onChange={e=>setYear(e.target.value)} placeholder="年"/>
                <input className="border p-2" type="number" value={month} onChange={e=>setMonth(e.target.value)} placeholder="月"/>
                <input className="border p-2" type="number" value={day} onChange={e=>setDay(e.target.value)} placeholder="日"/>
                <input className="border p-2" type="number" value={hour} onChange={e=>setHour(e.target.value)} placeholder="時"/>
            </div>
            <button onClick={handleSubmit} className="w-full bg-blue-600 text-white p-3 rounded">建立命盤</button>
        </div>
    );
};