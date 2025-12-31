import React, { useMemo, useState } from 'react';
import { Sun, Cloud, CloudRain, Lock, ChevronRight, RefreshCw, X } from 'lucide-react';
import { DailyFortune } from '../logic/fortune';
import { UserProfile } from '../db';

interface Props {
  fortune: DailyFortune;
  userProfile: UserProfile | null;
  clientName: string;
}

export const FortuneWidget: React.FC<Props> = ({ fortune, userProfile, clientName }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 判斷是否為 VIP (學員 或 Admin)
  // 學員判斷：role === 'student' 且 沒過期
  // 或是 role === 'admin'
  const isVip = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.role === 'student') {
        if (!userProfile.accessExpiry) return false; // 沒壓日期視為無效? 或視為永久? 這裡假設必須壓日期
        return new Date(userProfile.accessExpiry) > new Date();
    }
    return false;
  }, [userProfile]);

  const WeatherIcon = () => {
      if (fortune.weather === 'sunny') return <Sun className="text-amber-500 animate-spin-slow" size={48} />;
      if (fortune.weather === 'cloudy') return <Cloud className="text-blue-400" size={48} />;
      return <CloudRain className="text-slate-500" size={48} />;
  };

  const bgColor = {
      sunny: 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-200',
      cloudy: 'bg-gradient-to-br from-blue-50 to-slate-50 border-blue-200',
      rainy: 'bg-gradient-to-br from-gray-100 to-slate-200 border-gray-300'
  }[fortune.weather];

  return (
    <div className={`w-full rounded-2xl border p-4 shadow-sm transition-all duration-500 relative overflow-hidden ${bgColor}`}>
      
      {/* 頂部：今日概況 */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 bg-white/60 rounded-full shadow-sm backdrop-blur-sm">
                  <WeatherIcon />
              </div>
              <div>
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">今日運勢</span>
                      <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full text-gray-400">
                          {clientName} · 流日{fortune.debug?.flowDayZhi}位
                      </span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-800 leading-none mb-1">
                      {fortune.score} <span className="text-sm font-medium text-gray-500">分</span>
                  </h2>
                  <p className="text-sm font-medium text-gray-600">{fortune.summary}</p>
              </div>
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <ChevronRight size={20} className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
      </div>

      {/* 展開：詳細指數 */}
      <div className={`mt-4 grid gap-3 transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 h-0 overflow-hidden mt-0'}`}>
          <div className="min-h-0 space-y-3 pt-2 border-t border-black/5">
              
              <MeterRow 
                label="財運" 
                score={fortune.moneyScore} 
                color="bg-red-500" 
                detail={fortune.details.money}
                isLocked={!isVip} 
              />
              <MeterRow 
                label="感情" 
                score={fortune.loveScore} 
                color="bg-pink-500" 
                detail={fortune.details.love}
                isLocked={!isVip} 
              />
              <MeterRow 
                label="外出" 
                score={fortune.travelScore} 
                color="bg-green-500" 
                detail={fortune.details.travel}
                isLocked={!isVip} 
              />

              {!isVip && (
                  <div className="mt-2 p-3 bg-white/60 rounded-xl flex items-center justify-center gap-2 text-xs text-gray-500 border border-white">
                      <Lock size={14} />
                      <span>升級學員解鎖詳細建議</span>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

const MeterRow = ({ label, score, color, detail, isLocked }: any) => (
    <div className="bg-white/40 rounded-xl p-2.5">
        <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-bold text-gray-600">{label}指數</span>
            <span className="text-xs font-black text-gray-800">{score}%</span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${score}%` }} />
        </div>
        <p className={`text-xs text-gray-600 leading-relaxed ${isLocked ? 'blur-[3px] select-none opacity-60' : ''}`}>
            {detail}
        </p>
    </div>
);