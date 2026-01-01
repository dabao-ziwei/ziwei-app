import React, { useMemo, useState } from 'react';
import { Sun, Cloud, CloudRain, Lock, Sparkles, Cpu, Wallet, Heart, Users, Plane, Star, Zap, Activity, Radar, Calendar, Bug, AlertTriangle } from 'lucide-react';
import { calculateDailyFortune } from '../logic/fortune';
import type { UserProfile, Client } from '../db';
import { TechRadarChart } from './TechRadarChart';
import { TechLineChart } from './TechLineChart';
import { ZiWeiEngine } from '../logic/engine';

interface Props {
  userProfile: UserProfile | null;
  client: Client;
  clientName?: string;
}

export const FortuneWidget: React.FC<Props> = ({ userProfile, client, clientName }) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'trend'>('radar');
  const [showDebug, setShowDebug] = useState(false); // Default Debug OFF

  const isVip = useMemo(() => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin') return true;
    if (userProfile.role === 'student') {
        if (!userProfile.accessExpiry) return false; 
        return new Date(userProfile.accessExpiry) > new Date();
    }
    return false;
  }, [userProfile]);

  // 1. 初始化 Engine
  const engine = useMemo(() => {
      if (!client) return null;
      try {
          return new ZiWeiEngine(
              client.birthYear, 
              client.birthMonth, 
              client.birthDay, 
              client.birthHour, 
              client.birthMinute, 
              client.gender
          );
      } catch (e) {
          console.error("Engine Init Failed", e);
          return null;
      }
  }, [client]);

  // 2. 計算今日運勢 (Today)
  const todayFortune = useMemo(() => {
      if (!engine) return null;
      try {
        return calculateDailyFortune(engine);
      } catch (e) {
        console.error("Today calc failed", e);
        return null;
      }
  }, [engine]);

  // 3. 計算未來一週運勢 (Weekly)
  const weeklyData = useMemo(() => {
      if (!engine) return [];
      try {
          const data = [];
          for(let i = 0; i < 7; i++) {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const f = calculateDailyFortune(engine, d);
              data.push({
                  label: `${d.getMonth()+1}/${d.getDate()}`,
                  value: f.score,
                  dateStr: `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
              });
          }
          return data;
      } catch (e) {
          console.error("Weekly calc error", e);
          return [];
      }
  }, [engine]);

  // --- 防呆 UI ---
  // 如果計算失敗，不要 return null，而是顯示錯誤介面
  if (!todayFortune || !engine) {
      return (
        <div className="w-full bg-[#0B1120] rounded-2xl border border-red-900/50 shadow-2xl p-6 flex items-center justify-center text-red-400 gap-3">
            <AlertTriangle size={24} />
            <div>
                <h3 className="font-bold">運勢模組載入失敗</h3>
                <p className="text-xs opacity-70">命盤資料可能缺損，無法進行運算。</p>
            </div>
        </div>
      );
  }

  const WeatherIcon = () => {
      if (todayFortune.weather === 'sunny') return <Sun className="text-amber-400 animate-[spin_10s_linear_infinite]" size={28} />;
      if (todayFortune.weather === 'cloudy') return <Cloud className="text-blue-300" size={28} />;
      return <CloudRain className="text-indigo-400" size={28} />;
  };

  const radarData = [
    { label: '自身', value: todayFortune.scores.self, fullMark: 100 },
    { label: '理財', value: todayFortune.scores.wealth, fullMark: 100 },
    { label: '交友', value: todayFortune.scores.social, fullMark: 100 },
    { label: '外出', value: todayFortune.scores.travel, fullMark: 100 },
    { label: '感情', value: todayFortune.scores.love, fullMark: 100 },
  ];

  return (
    <div className="w-full bg-[#0B1120] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative group">
      
      {showDebug && (
        <div className="absolute inset-0 z-50 bg-black/90 text-green-400 p-4 font-mono text-xs overflow-auto">
            <button onClick={() => setShowDebug(false)} className="mb-2 bg-red-900 text-white px-2 py-1 rounded">CLOSE DEBUG</button>
            <pre>{JSON.stringify(weeklyData, null, 2)}</pre>
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80 shadow-[0_0_15px_#22d3ee]" />

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] min-h-[480px]">
          
          <div className="relative p-0 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#020617]">
              
              <div className="absolute top-0 left-0 w-full p-5 z-20 flex justify-between items-start">
                  <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-lg pointer-events-auto">
                      <button 
                        onClick={() => setActiveTab('radar')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'radar' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                          <Radar size={14} /> 今日運勢
                      </button>
                      <button 
                        onClick={() => setActiveTab('trend')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'trend' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      >
                          <Activity size={14} /> 一週運勢
                      </button>
                  </div>
                  
                  {activeTab === 'radar' && (
                      <div className="text-right pointer-events-auto animate-in fade-in slide-in-from-right-2">
                          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 flex justify-end items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> 今日運勢
                          </div>
                          <div className="flex items-baseline justify-end gap-2">
                              <span className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                {todayFortune.score}
                              </span>
                              <span className="text-xs font-bold text-slate-500">分</span>
                          </div>
                      </div>
                  )}
              </div>

              <div className="flex-1 w-full h-full flex items-center justify-center pt-16 pb-4 px-4 relative">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)] pointer-events-none" />
                  
                  {activeTab === 'radar' ? (
                      <div className="w-full h-full flex items-center justify-center animate-in zoom-in duration-500">
                          <TechRadarChart data={radarData} />
                      </div>
                  ) : (
                      <div className="w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col justify-center">
                          <div className="flex items-center gap-2 mb-4 px-4 justify-center md:justify-start">
                              <Calendar size={14} className="text-purple-400"/>
                              <span className="text-xs font-bold text-purple-200 tracking-wider">一週運勢</span>
                          </div>
                          <div className="h-[250px] w-full px-2">
                              <TechLineChart data={weeklyData} />
                          </div>
                      </div>
                  )}
              </div>
          </div>

          <div className="bg-[#0B1120] p-5 flex flex-col h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent border-l border-slate-800/50">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800/50 sticky top-0 bg-[#0B1120] z-10">
                  <Cpu size={18} className="text-cyan-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-200 tracking-wide">今日運勢分析</h3>
                  {!isVip && (
                      <span className="ml-auto text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">
                          PREVIEW
                      </span>
                  )}
              </div>

              <div className="space-y-4 pb-4">
                  <StrategyCard 
                    title="總體運勢" 
                    content={todayFortune.details.overall} 
                    icon={<Star size={16}/>} 
                    color="text-cyan-400"
                    bg="bg-cyan-950/10"
                    border="border-cyan-500/20"
                    glow="shadow-[0_0_15px_rgba(34,211,238,0.05)]"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="財運訊號" 
                    content={todayFortune.details.wealth} 
                    icon={<Wallet size={16}/>} 
                    color="text-amber-400"
                    bg="bg-amber-950/10"
                    border="border-amber-500/20"
                    glow="shadow-[0_0_15px_rgba(251,191,36,0.05)]"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="感情訊號" 
                    content={todayFortune.details.loveCareer} 
                    icon={<Heart size={16}/>} 
                    color="text-pink-400"
                    bg="bg-pink-950/10"
                    border="border-pink-500/20"
                    glow="shadow-[0_0_15px_rgba(244,114,182,0.05)]"
                    isLocked={!isVip}
                  />
                  <StrategyCard 
                    title="外出運勢" 
                    content={todayFortune.details.travel} 
                    icon={<Plane size={16}/>} 
                    color="text-emerald-400"
                    bg="bg-emerald-950/10"
                    border="border-emerald-500/20"
                    glow="shadow-[0_0_15px_rgba(52,211,153,0.05)]"
                    isLocked={!isVip}
                  />
              </div>

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
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-slate-950/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-2 shadow-xl">
                        <Lock size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-300 tracking-wide">ENCRYPTED DATA</span>
                    </div>
                </div>
            )}
        </div>
        <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${border.replace('/20', '')} opacity-40 rounded-tr-sm`} />
        <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${border.replace('/20', '')} opacity-40 rounded-bl-sm`} />
    </div>
);