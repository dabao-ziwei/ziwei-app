import React, { useMemo } from 'react';
import { Sun, Cloud, CloudRain, Lock, Sparkles, Cpu, Wallet, Heart, Users, Plane, Star, Zap } from 'lucide-react';
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
      if (fortune.weather === 'sunny') return <Sun className="text-amber-400 animate-[spin_10s_linear_infinite]" size={28} />;
      if (fortune.weather === 'cloudy') return <Cloud className="text-blue-300" size={28} />;
      return <CloudRain className="text-indigo-400" size={28} />;
  };

  const radarData = [
    { label: '自身', value: fortune.scores.self, fullMark: 100 },
    { label: '理財', value: fortune.scores.wealth, fullMark: 100 },
    { label: '交友', value: fortune.scores.social, fullMark: 100 },
    { label: '外出', value: fortune.scores.travel, fullMark: 100 },
    { label: '感情', value: fortune.scores.love, fullMark: 100 },
  ];

  return (
    // 外框容器：移除折疊邏輯，改為固定展示
    <div className="w-full bg-[#0B1120] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative group">
      
      {/* 頂部裝飾：動態流光邊框 */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80 shadow-[0_0_15px_#22d3ee]" />

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] min-h-[450px]">
          
          {/* --- 左側：3D 雷達圖與核心數據 --- */}
          <div className="relative p-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#020617]">
              
              {/* Header Info Area */}
              <div className="absolute top-0 left-0 w-full p-5 z-20 flex justify-between items-start pointer-events-none">
                  <div className="flex items-center gap-3 pointer-events-auto">
                      <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
                          <WeatherIcon />
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold text-cyan-400 tracking-widest border border-cyan-900 bg-cyan-950/50 px-1.5 py-0.5 rounded">
                                SYSTEM LOG
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                  {clientName}
                              </span>
                          </div>
                          <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                {fortune.score}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Sync Rate</span>
                          </div>
                      </div>
                  </div>
                  
                  {/* 右上角：今日短評 */}
                  <div className="text-right pointer-events-auto">
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex justify-end items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> STATUS
                      </div>
                      <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-white leading-tight drop-shadow-sm">
                        {fortune.summary}
                      </div>
                  </div>
              </div>

              {/* Radar Chart 容器 */}
              <div className="flex-1 w-full h-full flex items-center justify-center pt-10">
                  <TechRadarChart data={radarData} />
              </div>
          </div>

          {/* --- 右側：戰略分析 (常駐顯示) --- */}
          <div className="bg-[#0B1120] p-5 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800/50 sticky top-0 bg-[#0B1120] z-10">
                  <Cpu size={18} className="text-cyan-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-200 tracking-wide">戰略分析模組</h3>
                  {!isVip && (
                      <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                          PREVIEW
                      </span>
                  )}
              </div>

              <div className="space-y-4 pb-4">
                  <StrategyCard 
                    title="總體運勢" 
                    content={fortune.details.overall} 
                    icon={<Star size={16}/>} 
                    color="text-cyan-400"
                    bg="bg-cyan-950/10"
                    border="border-cyan-500/20"
                    glow="shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="財運訊號" 
                    content={fortune.details.wealth} 
                    icon={<Wallet size={16}/>} 
                    color="text-amber-400"
                    bg="bg-amber-950/10"
                    border="border-amber-500/20"
                    glow="shadow-[0_0_15px_rgba(251,191,36,0.05)]"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="感情訊號" 
                    content={fortune.details.loveCareer} 
                    icon={<Heart size={16}/>} 
                    color="text-pink-400"
                    bg="bg-pink-950/10"
                    border="border-pink-500/20"
                    glow="shadow-[0_0_15px_rgba(244,114,182,0.05)]"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="外出運勢" 
                    content={fortune.details.travel} 
                    icon={<Plane size={16}/>} 
                    color="text-emerald-400"
                    bg="bg-emerald-950/10"
                    border="border-emerald-500/20"
                    glow="shadow-[0_0_15px_rgba(52,211,153,0.05)]"
                    isLocked={!isVip}
                  />
              </div>

              {/* 底部升級提示 */}
              {!isVip && (
                  <div className="mt-auto pt-4 border-t border-slate-800/50">
                      <button className="w-full group relative overflow-hidden rounded-xl p-[1px]">
                          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 animate-[spin_4s_linear_infinite] opacity-70" />
                          <div className="relative bg-slate-900 rounded-xl p-3 flex items-center justify-center gap-2 transition-colors group-hover:bg-slate-800">
                              <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-bold text-white tracking-wide">解鎖完整分析報告</span>
                          </div>
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

// 子元件：高科技戰略卡片
const StrategyCard = ({ title, content, icon, color, bg, border, glow, isLocked }: any) => (
    <div className={`relative p-4 rounded-xl border ${border} ${bg} ${glow} transition-all duration-300 hover:scale-[1.02] hover:bg-opacity-30 group`}>
        <div className="flex items-center gap-2.5 mb-2.5">
            <div className={`p-1.5 rounded-md bg-slate-900 border border-slate-700 ${color} shadow-sm group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <span className={`text-xs font-bold ${color} tracking-widest uppercase`}>{title}</span>
        </div>
        
        <div className="relative">
            <p className={`text-xs text-slate-300 leading-6 font-sans tracking-wide ${isLocked ? 'blur-[5px] select-none opacity-50 grayscale' : ''}`}>
                {content || "分析數據運算中，暫無詳細資料..."}
            </p>
            
            {/* 鎖定狀態的 Overlay (數位加密感) */}
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-slate-950/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-2 shadow-xl">
                        <Lock size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-300 tracking-wide">ENCRYPTED DATA</span>
                    </div>
                </div>
            )}
        </div>

        {/* 裝飾角 (Cyberpunk Corners) */}
        <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${border.replace('/20', '')} opacity-40 rounded-tr-sm`} />
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${border.replace('/20', '')} opacity-40 rounded-bl-sm`} />
    </div>
);