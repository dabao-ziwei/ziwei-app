import React, { useMemo, useState } from 'react';
import { Lock, ChevronRight } from 'lucide-react';
import type { DailyFortune } from '../logic/fortune';
import type { UserProfile } from '../db';

interface Props {
  fortune: DailyFortune;
  userProfile: UserProfile | null;
  clientName: string;
  forceLock?: boolean;
}

export const FortuneWidget: React.FC<Props> = ({ fortune, userProfile, clientName, forceLock = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isVip = useMemo(() => {
    if (forceLock) return false;
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.role === 'student') {
        if (!userProfile.accessExpiry) return false; 
        return new Date(userProfile.accessExpiry) > new Date();
    }
    return false;
  }, [userProfile, forceLock]);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* 上半部：大總分儀表板 */}
      <div className="p-6 pb-2 flex flex-col items-center justify-center relative bg-gradient-to-b from-blue-50/50 to-white">
          
          <div className="absolute top-4 left-4 flex flex-col">
               <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mb-1">
                  {clientName} · 流日{fortune.debug?.flowDayZhi}位
               </span>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">今日運勢</h2>
          </div>

          <div className="mt-6 mb-2">
             <BigGauge score={fortune.score} label="綜合評比" />
          </div>
          
          <p className="text-sm font-bold text-slate-600 mb-4 bg-white/60 px-4 py-1 rounded-full border border-slate-100 shadow-sm">
              {fortune.summary}
          </p>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={20} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
      </div>

      {/* 下半部：三大生活指數 */}
      <div className={`bg-slate-50 border-t border-slate-100 transition-all duration-500 ease-in-out ${isExpanded ? 'py-6' : 'py-4'}`}>
          
          {/* 三個小儀表板 (已改為生活化名稱) */}
          <div className="flex justify-around items-start px-2">
              <SmallGauge score={fortune.indexOverall} label="今日氣場" color="#3b82f6" />
              <SmallGauge score={fortune.indexLoveCareer} label="事業感情" color="#ec4899" />
              <SmallGauge score={fortune.indexWealth} label="荷包財運" color="#f59e0b" />
          </div>

          {/* 詳細建議文字 (展開才顯示) */}
          <div className={`px-6 space-y-4 transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
              
              <DetailRow label="氣場分析" text={fortune.details.overall} isLocked={!isVip} />
              <DetailRow label="關係與事業" text={fortune.details.loveCareer} isLocked={!isVip} />
              <DetailRow label="財運建議" text={fortune.details.wealth} isLocked={!isVip} />

              {!isVip && (
                  <div className="mt-4 p-3 bg-white rounded-xl flex items-center justify-center gap-2 text-xs text-slate-500 border border-slate-200 shadow-sm">
                      <Lock size={14} />
                      <span className="font-bold">升級學員解鎖詳細建議</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

// 大儀表板 (SVG)
const BigGauge = ({ score, label }: { score: number, label: string }) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const radius = 60;
    const circumference = Math.PI * radius; 
    let strokeColor = '#94a3b8';
    if (clampedScore >= 75) strokeColor = '#f59e0b'; // sunny
    else if (clampedScore >= 50) strokeColor = '#3b82f6'; // cloudy
    else strokeColor = '#64748b'; // rainy
    const rotation = -90 + (clampedScore / 100) * 180;

    return (
        <div className="relative w-48 h-28 flex justify-center items-end">
             <svg width="200" height="110" viewBox="0 0 200 110" className="overflow-visible">
                <path d="M 40 100 A 60 60 0 0 1 160 100" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
                <path 
                    d="M 40 100 A 60 60 0 0 1 160 100" 
                    fill="none" 
                    stroke={strokeColor} 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * clampedScore) / 100}
                    className="transition-all duration-1000 ease-out"
                />
                <g transform={`translate(100, 100) rotate(${rotation})`} className="transition-all duration-1000 ease-out origin-center">
                    <path d="M -5 0 L 0 -50 L 5 0 Z" fill="#1e293b" />
                    <circle cx="0" cy="0" r="8" fill="#1e293b" />
                    <circle cx="0" cy="0" r="4" fill="white" />
                </g>
            </svg>
            <div className="absolute bottom-0 flex flex-col items-center translate-y-2">
                <span className="text-4xl font-black text-slate-800">{score}</span>
            </div>
        </div>
    );
};

// 小儀表板 (SVG)
const SmallGauge = ({ score, label, color }: { score: number, label: string, color: string }) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const radius = 25;
    const circumference = Math.PI * radius; 
    const rotation = -90 + (clampedScore / 100) * 180;

    return (
        <div className="flex flex-col items-center gap-1">
             <div className="relative w-20 h-12 flex justify-center items-end">
                <svg width="80" height="45" viewBox="0 0 80 45" className="overflow-visible">
                    <path d="M 15 40 A 25 25 0 0 1 65 40" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />
                    <path 
                        d="M 15 40 A 25 25 0 0 1 65 40" 
                        fill="none" 
                        stroke={color} 
                        strokeWidth="6" 
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference - (circumference * clampedScore) / 100}
                        className="transition-all duration-1000 ease-out"
                    />
                    <g transform={`translate(40, 40) rotate(${rotation})`} className="transition-all duration-1000 ease-out origin-center">
                        <path d="M -2 0 L 0 -22 L 2 0 Z" fill={color} />
                        <circle cx="0" cy="0" r="3" fill={color} />
                    </g>
                </svg>
             </div>
             <span className="text-[10px] font-bold text-slate-500">{label}</span>
             <span className="text-xs font-black text-slate-800">{score}</span>
        </div>
    );
};

const DetailRow = ({ label, text, isLocked }: any) => (
    <div className="relative">
        <h4 className="text-xs font-bold text-slate-400 mb-1">{label}</h4>
        <p className={`text-sm text-slate-600 leading-relaxed ${isLocked ? 'blur-sm select-none opacity-60' : ''}`}>
            {text}
        </p>
        {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center">
                {/* 鎖定遮罩 */}
            </div>
        )}
    </div>
);