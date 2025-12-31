import React, { useMemo, useState } from 'react';
import { Lock, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { DailyFortune } from '../logic/fortune';
import type { UserProfile } from '../db';

interface Props {
  fortune: DailyFortune;
  userProfile: UserProfile | null;
  clientName: string;
  forceLock?: boolean; // 新增：強制鎖定 (用於預覽)
}

export const FortuneWidget: React.FC<Props> = ({ fortune, userProfile, clientName, forceLock = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 判斷是否為 VIP
  const isVip = useMemo(() => {
    if (forceLock) return false; // 如果開啟預覽模式，強制視為非 VIP
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.role === 'student') {
        if (!userProfile.accessExpiry) return false; 
        return new Date(userProfile.accessExpiry) > new Date();
    }
    return false;
  }, [userProfile, forceLock]);

  const bgColor = {
      sunny: 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200',
      cloudy: 'bg-gradient-to-br from-blue-50 to-slate-50 border-blue-200',
      rainy: 'bg-gradient-to-br from-gray-100 to-slate-200 border-gray-300'
  }[fortune.weather];

  return (
    <div className={`w-full rounded-2xl border p-5 shadow-sm transition-all duration-500 relative overflow-hidden ${bgColor}`}>
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* 左側：儀表板 (Gauge) */}
          <div className="relative w-40 h-24 shrink-0 flex justify-center items-end">
             <GaugeChart score={fortune.score} />
             <div className="absolute bottom-0 text-center">
                <span className="text-3xl font-black text-slate-800">{fortune.score}</span>
                <span className="text-xs text-slate-500 font-medium block -mt-1">今日運勢</span>
             </div>
          </div>

          {/* 中間：文字資訊 */}
          <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full text-slate-500 border border-white/50">
                      {clientName} · 流日{fortune.debug?.flowDayZhi}位
                  </span>
                  {/* VIP 標記 */}
                  {!isVip && <span className="text-[10px] bg-gray-800 text-white px-1.5 py-0.5 rounded">Free</span>}
                  {isVip && <span className="text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded font-bold">VIP</span>}
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">{fortune.summary}</h2>
              <p className="text-xs text-slate-500">
                  {fortune.weather === 'sunny' && '吉星高照，把握良機。'}
                  {fortune.weather === 'cloudy' && '局勢不明，謹慎判斷。'}
                  {fortune.weather === 'rainy' && '風雨欲來，保守為宜。'}
              </p>
          </div>
          
          {/* 右側：展開按鈕 */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-full hover:bg-black/5 transition-colors self-center sm:self-start"
          >
            <ChevronRight size={20} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
      </div>

      {/* 展開：詳細指數 */}
      <div className={`grid gap-3 transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 h-0 overflow-hidden mt-0'}`}>
          <div className="min-h-0 space-y-3 pt-2 border-t border-black/5">
              
              <MeterRow label="財運" score={fortune.moneyScore} color="bg-red-500" detail={fortune.details.money} isLocked={!isVip} />
              <MeterRow label="感情" score={fortune.loveScore} color="bg-pink-500" detail={fortune.details.love} isLocked={!isVip} />
              <MeterRow label="外出" score={fortune.travelScore} color="bg-green-500" detail={fortune.details.travel} isLocked={!isVip} />

              {!isVip && (
                  <div className="mt-2 p-3 bg-white/60 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-500 border border-white shadow-sm cursor-pointer hover:bg-white/80 transition-colors">
                      <Lock size={14} />
                      <span className="font-bold">升級學員解鎖詳細建議</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

// 很炫炮的 SVG 儀表板組件
const GaugeChart = ({ score }: { score: number }) => {
    // 限制分數 0-100
    const clampedScore = Math.max(0, Math.min(100, score));
    // 半圓周長 (r=40) => 2 * pi * 40 / 2 = 125.6
    const radius = 40;
    const circumference = Math.PI * radius; 
    
    // 顏色判定
    let strokeColor = '#94a3b8'; // gray
    if (clampedScore >= 75) strokeColor = '#f59e0b'; // amber (sunny)
    else if (clampedScore >= 50) strokeColor = '#3b82f6'; // blue (cloudy)
    else strokeColor = '#64748b'; // slate (rainy)

    // 指針角度 (0分 = -90度, 100分 = 90度)
    const rotation = -90 + (clampedScore / 100) * 180;

    return (
        <svg width="160" height="90" viewBox="0 0 160 90" className="overflow-visible">
            {/* 背景軌道 */}
            <path d="M 40 80 A 40 40 0 0 1 120 80" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
            
            {/* 分數軌道 (動態長度) */}
            <path 
                d="M 40 80 A 40 40 0 0 1 120 80" 
                fill="none" 
                stroke={strokeColor} 
                strokeWidth="12" 
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - (circumference * clampedScore) / 100}
                className="transition-all duration-1000 ease-out"
            />

            {/* 指針 (中心點在 80, 80) */}
            <g transform={`translate(80, 80) rotate(${rotation})`} className="transition-all duration-1000 ease-out origin-center">
                 {/* 針身 */}
                <path d="M -4 0 L 0 -35 L 4 0 Z" fill="#334155" />
                {/* 針尾圓點 */}
                <circle cx="0" cy="0" r="6" fill="#334155" />
                <circle cx="0" cy="0" r="3" fill="white" />
            </g>
        </svg>
    );
};

const MeterRow = ({ label, score, color, detail, isLocked }: any) => (
    <div className="bg-white/40 rounded-xl p-3 flex items-start gap-3">
        {/* 左側：進度條 */}
        <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
                <span className="text-xs font-bold text-slate-600">{label}</span>
                <span className="text-xs font-black text-slate-800">{score}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
            </div>
        </div>
        
        {/* 右側：文字 (根據鎖定狀態模糊化) */}
        <div className="flex-[2] text-xs leading-relaxed text-slate-600 relative">
            <p className={isLocked ? 'blur-sm select-none opacity-50' : ''}>
                {detail}
            </p>
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Lock size={12} className="text-slate-400 opacity-80" />
                </div>
            )}
        </div>
    </div>
);