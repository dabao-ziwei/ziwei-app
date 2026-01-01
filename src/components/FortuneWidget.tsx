import React, { useMemo } from 'react';
import { Sun, Cloud, CloudRain, Lock, Sparkles, Cpu, Wallet, Heart, Users, Plane, Star } from 'lucide-react';
import type { DailyFortune } from '../logic/fortune';
import type { UserProfile } from '../db';
import { TechRadarChart } from './TechRadarChart';

interface Props {
  fortune: DailyFortune;
  userProfile: UserProfile | null;
  clientName: string;
}

export const FortuneWidget: React.FC<Props> = ({ fortune, userProfile, clientName }) => {
  
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
      if (fortune.weather === 'sunny') return <Sun className="text-amber-400 animate-[spin_10s_linear_infinite]" size={32} />;
      if (fortune.weather === 'cloudy') return <Cloud className="text-blue-300" size={32} />;
      return <CloudRain className="text-indigo-400" size={32} />;
  };

  const radarData = [
    { label: '自身', value: fortune.scores.self, fullMark: 100 },
    { label: '理財', value: fortune.scores.wealth, fullMark: 100 },
    { label: '交友', value: fortune.scores.social, fullMark: 100 },
    { label: '外出', value: fortune.scores.travel, fullMark: 100 },
    { label: '感情', value: fortune.scores.love, fullMark: 100 },
  ];

  return (
    // 主容器：深色科技背景，邊框發光
    <div className="w-full bg-slate-900 rounded-2xl border border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden relative font-sans">
      
      {/* 頂部掃描線裝飾 */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50 shadow-[0_0_10px_#22d3ee]" />

      {/* Grid 布局：手機單欄，平板/桌面雙欄 (左圖右文) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] h-full">
          
          {/* 左側：雷達圖 + 頭部資訊 */}
          <div className="relative p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950">
              
              {/* Header Info */}
              <div className="flex justify-between items-start mb-4 z-10 relative">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg border border-slate-700 shadow-inner">
                          <WeatherIcon />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-cyan-400 tracking-widest border border-cyan-900 bg-cyan-950/30 px-1.5 py-0.5 rounded">
                                SYSTEM LOG
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                  {clientName}
                              </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                              <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                                {fortune.score}
                              </span>
                              <span className="text-xs font-bold text-slate-500">SYNC RATE</span>
                          </div>
                      </div>
                  </div>
                  
                  {/* 今日短評 Tag */}
                  <div className="text-right max-w-[140px]">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">STATUS</div>
                      <div className="text-xs font-bold text-purple-300 leading-tight">
                        {fortune.summary}
                      </div>
                  </div>
              </div>

              {/* Chart Container */}
              <div className="flex-1 flex items-center justify-center relative min-h-[320px]">
                  {/* 背景裝飾網格 */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] pointer-events-none" />
                  <TechRadarChart data={radarData} />
              </div>
          </div>

          {/* 右側：戰略建議 (常駐展開) */}
          <div className="bg-slate-950/50 p-5 overflow-y-auto max-h-[600px] lg:max-h-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                  <Cpu size={16} className="text-cyan-500" />
                  <h3 className="text-sm font-bold text-slate-200">戰略分析模組</h3>
              </div>

              <div className="space-y-3">
                  <StrategyCard 
                    title="總體運勢" 
                    content={fortune.details.overall} 
                    icon={<Star size={14}/>} 
                    color="text-cyan-400"
                    bg="bg-cyan-950/20"
                    border="border-cyan-900/50"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="財運訊號" 
                    content={fortune.details.wealth} 
                    icon={<Wallet size={14}/>} 
                    color="text-amber-400"
                    bg="bg-amber-950/20"
                    border="border-amber-900/50"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="感情訊號" 
                    content={fortune.details.loveCareer} 
                    icon={<Heart size={14}/>} 
                    color="text-pink-400"
                    bg="bg-pink-950/20"
                    border="border-pink-900/50"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="外出運勢" 
                    content={fortune.details.travel} 
                    icon={<Plane size={14}/>} 
                    color="text-emerald-400"
                    bg="bg-emerald-950/20"
                    border="border-emerald-900/50"
                    isLocked={!isVip}
                  />
              </div>

              {!isVip && (
                  <div className="mt-6 p-4 rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden group cursor-pointer hover:border-purple-500/50 transition-colors">
                      <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3 relative z-10">
                          <div className="p-2 bg-purple-900/50 rounded-lg text-purple-400">
                              <Lock size={18} />
                          </div>
                          <div>
                              <div className="text-sm font-bold text-white">解鎖完整分析</div>
                              <div className="text-xs text-slate-400 mt-0.5">升級學員權限，獲取每日詳細戰略</div>
                          </div>
                          <Sparkles className="ml-auto text-purple-500 opacity-50 group-hover:opacity-100 animate-pulse" size={16}/>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

// 子元件：戰略卡片
const StrategyCard = ({ title, content, icon, color, bg, border, isLocked }: any) => (
    <div className={`relative p-3.5 rounded-lg border ${border} ${bg} overflow-hidden transition-all hover:translate-x-1`}>
        <div className="flex items-center gap-2 mb-2">
            <span className={`${color}`}>{icon}</span>
            <span className={`text-xs font-bold ${color} tracking-wider uppercase`}>{title}</span>
        </div>
        
        <div className="relative">
            <p className={`text-xs text-slate-300 leading-relaxed font-mono ${isLocked ? 'blur-[4px] opacity-60 select-none' : ''}`}>
                {content || "暫無詳細數據..."}
            </p>
            
            {/* 鎖定狀態的 Overlay */}
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-slate-900/80 backdrop-blur-[1px] px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5 shadow-lg">
                        <Lock size={10} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-300">內容已加密</span>
                    </div>
                </div>
            )}
        </div>

        {/* 裝飾角 (Decorative Corners) */}
        <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${border.replace('/50', '')} opacity-60`} />
        <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${border.replace('/50', '')} opacity-60`} />
    </div>
);