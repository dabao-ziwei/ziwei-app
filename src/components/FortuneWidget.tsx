import React, { useMemo, useState } from 'react';
import { Sun, Cloud, CloudRain, ChevronRight, Lock, Sparkles, Cpu } from 'lucide-react';
import type { DailyFortune } from '../logic/fortune';
import type { UserProfile } from '../db';
import { TechRadarChart } from './TechRadarChart';

interface Props {
  fortune: DailyFortune;
  userProfile: UserProfile | null;
  clientName: string;
}

export const FortuneWidget: React.FC<Props> = ({ fortune, userProfile, clientName }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 判斷是否為 VIP
  const isVip = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.role === 'student') {
        if (!userProfile.accessExpiry) return false; 
        return new Date(userProfile.accessExpiry) > new Date();
    }
    return false;
  }, [userProfile]);

  const WeatherIcon = () => {
      if (fortune.weather === 'sunny') return <Sun className="text-amber-400 animate-[spin_10s_linear_infinite]" size={40} />;
      if (fortune.weather === 'cloudy') return <Cloud className="text-blue-300" size={40} />;
      return <CloudRain className="text-indigo-400" size={40} />;
  };

  // 準備雷達圖數據
  const radarData = [
    { label: '自身', value: fortune.scores.self, fullMark: 100 },
    { label: '理財', value: fortune.scores.wealth, fullMark: 100 },
    { label: '交友', value: fortune.scores.social, fullMark: 100 },
    { label: '外出', value: fortune.scores.travel, fullMark: 100 },
    { label: '感情', value: fortune.scores.love, fullMark: 100 },
  ];

  return (
    // 外框：改為深色科技風 (Slate-900)，帶邊框光暈
    <div className="w-full rounded-2xl bg-slate-900 border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.3)] overflow-hidden relative group">
      
      {/* 頂部裝飾線 (Animated Gradient Border) */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70" />

      {/* 頂部：今日概況 (HUD Header Style) */}
      <div className="p-5 relative z-10">
          <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                  <div className="shrink-0 p-2.5 bg-slate-800/80 rounded-xl shadow-inner border border-slate-700 backdrop-blur-sm">
                      <WeatherIcon />
                  </div>
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest border border-cyan-900 bg-cyan-950/50 px-1.5 py-0.5 rounded">
                            DAILY LOG
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                              {clientName} · 流日{fortune.devInfo.flowDayZhi}位
                          </span>
                      </div>
                      
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-white leading-none tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                            {fortune.score}
                        </h2>
                        <span className="text-sm font-bold text-slate-500">SCORE</span>
                      </div>
                      
                      <p className="text-sm font-medium text-slate-300 mt-1 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-purple-400" />
                        {fortune.summary}
                      </p>
                  </div>
              </div>
              
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-500 hover:text-cyan-400"
              >
                <ChevronRight size={20} className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
          </div>
      </div>

      {/* 展開區域：雷達圖與詳細建議 */}
      <div className={`transition-all duration-500 ease-in-out bg-slate-950/50 ${isExpanded ? 'opacity-100 max-h-[800px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <div className="p-2 border-t border-slate-800">
              
              {/* 1. 3D 雷達圖 */}
              <div className="mb-2">
                <TechRadarChart data={radarData} />
              </div>

              {/* 2. 文字建議 (卡片式) */}
              <div className="grid grid-cols-1 gap-3 p-3">
                  <DetailCard 
                    title="財運戰略" 
                    content={fortune.details.wealth} 
                    icon={<Cpu size={14}/>} 
                    isLocked={!isVip} 
                    color="text-amber-400"
                    borderColor="border-amber-900/30"
                    bgColor="bg-amber-950/10"
                  />
                  <DetailCard 
                    title="感情訊號" 
                    content={fortune.details.loveCareer} 
                    icon={<Cpu size={14}/>} 
                    isLocked={!isVip} 
                    color="text-pink-400"
                    borderColor="border-pink-900/30"
                    bgColor="bg-pink-950/10"
                  />
                  <DetailCard 
                    title="綜合建議" 
                    content={fortune.details.overall} 
                    icon={<Cpu size={14}/>} 
                    isLocked={!isVip} 
                    color="text-cyan-400"
                    borderColor="border-cyan-900/30"
                    bgColor="bg-cyan-950/10"
                  />

                  {!isVip && (
                      <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center justify-center gap-2 text-xs text-slate-400">
                          <Lock size={14} />
                          <span>升級學員權限解鎖完整戰略分析</span>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

// 子元件：科技感文字卡片
const DetailCard = ({ title, content, icon, isLocked, color, borderColor, bgColor }: any) => (
    <div className={`relative p-3 rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
        <div className="flex items-center gap-2 mb-1.5">
            <span className={`${color}`}>{icon}</span>
            <span className={`text-xs font-bold ${color} tracking-wider uppercase`}>{title}</span>
        </div>
        <p className={`text-xs text-slate-300 leading-relaxed font-mono ${isLocked ? 'blur-[3px] select-none opacity-50' : ''}`}>
            {content || "暫無詳細分析數據..."}
        </p>
        {/* 裝飾角 */}
        <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${borderColor.replace('/30', '')}`} />
        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${borderColor.replace('/30', '')}`} />
    </div>
);