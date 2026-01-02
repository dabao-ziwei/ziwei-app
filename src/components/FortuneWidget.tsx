import React, { useMemo, useState } from 'react';
import { Thermometer, Activity, Bug, AlertTriangle, Calendar, X, Terminal, Clock, Calculator, Hash } from 'lucide-react';
import { calculateDailyFortune } from '../logic/fortune';
import type { UserProfile, Client } from '../db';
import { FortuneThermometer } from './FortuneThermometer';
// [修改] 引入新的聚焦圖表組件
import { FocusTrendChart } from './FocusTrendChart'; 
import { ZiWeiEngine } from '../logic/engine';

// 定義超級管理員 Email
const SUPER_ADMIN_EMAIL = 'stephenwu.0926@gmail.com';

// ... (DebugLogBlock 保持不變，省略以節省篇幅，請保留原有的 DebugLogBlock 程式碼) ...
const DebugLogBlock = ({ title, score, logs }: { title: string, score: number, logs: string[] }) => (
    <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 flex flex-col gap-2 h-full">
        <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-1">
            <span className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider">{title}</span>
            <span className={`font-mono font-bold text-sm ${score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {score}
            </span>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-1 max-h-[120px]">
            {logs && logs.length > 0 ? (
                <ul className="space-y-1">
                    {logs.map((log, i) => (
                        <li key={i} className="text-[10px] text-slate-300 font-mono leading-relaxed border-l-2 border-slate-700 pl-2 hover:border-cyan-500 transition-colors">
                            {log}
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-[10px] text-slate-600 italic">無特殊星曜影響</div>
            )}
        </div>
    </div>
);

// ----------------------------------------------------------------------
// 主組件
// ----------------------------------------------------------------------

interface Props {
  userProfile: UserProfile | null;
  client: Client;
  clientName?: string;
}

// 模擬資料
const DEMO_HOT = [
    { label: '工作', value: 95 },
    { label: '理財', value: 88 },
    { label: '交友', value: 105 },
    { label: '外出', value: 92 },
    { label: '感情', value: 100 },
];

const DEMO_COLD = [
    { label: '工作', value: 20 },
    { label: '理財', value: 15 },
    { label: '交友', value: 30 },
    { label: '外出', value: 5 },
    { label: '感情', value: 10 },
];

export const FortuneWidget: React.FC<Props> = ({ userProfile, client, clientName }) => {
  const [activeTab, setActiveTab] = useState<'thermometer' | 'trend'>('thermometer');
  const [showDebug, setShowDebug] = useState(false); 
  const [demoMode, setDemoMode] = useState<'real' | 'hot' | 'cold'>('real'); 

  const isSuperAdmin = useMemo(() => {
      return userProfile?.email === SUPER_ADMIN_EMAIL;
  }, [userProfile]);

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

  const todayFortune = useMemo(() => {
      if (!engine) return null;
      try {
        return calculateDailyFortune(engine);
      } catch (e) {
        console.error("Today calc failed", e);
        return null;
      }
  }, [engine]);

  const weeklyDetailedData = useMemo(() => {
      if (!engine) return [];
      try {
          const data = [];
          for(let i = 0; i < 7; i++) {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const f = calculateDailyFortune(engine, d);
              data.push({
                  label: `${d.getMonth()+1}/${d.getDate()}`,
                  scores: f.scores,
                  baseScore: f.devInfo.baseScore,
                  dateStr: `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`
              });
          }
          return data;
      } catch (e) {
          console.error("Weekly calc error", e);
          return [];
      }
  }, [engine]);

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

  let displayData = [
    { label: '工作', value: todayFortune.scores.self },
    { label: '理財', value: todayFortune.scores.wealth },
    { label: '交友', value: todayFortune.scores.social },
    { label: '外出', value: todayFortune.scores.travel },
    { label: '感情', value: todayFortune.scores.love },
  ];
  const baseScore = todayFortune.devInfo.baseScore;

  if (demoMode === 'hot') {
      displayData = DEMO_HOT;
  } else if (demoMode === 'cold') {
      displayData = DEMO_COLD;
  }

  return (
    <div className="w-full flex flex-col gap-4">
        {/* 主要儀表板容器 (限制最大高度，防止捲軸) */}
        <div className="w-full bg-[#0B1120] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative group min-h-[500px] flex flex-col">
        
            {/* 裝飾 */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-80 shadow-[0_0_15px_#22d3ee] z-20" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)] pointer-events-none z-0" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0B1120] to-[#020617] opacity-90 z-0" />

            {/* --- 控制列 --- */}
            <div className="relative w-full p-4 sm:p-6 z-30 flex justify-between items-start">
                <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 backdrop-blur-sm shadow-lg pointer-events-auto">
                    <button 
                        onClick={() => setActiveTab('thermometer')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'thermometer' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Thermometer size={14} /> 今日運勢
                    </button>
                    <button 
                        onClick={() => setActiveTab('trend')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'trend' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Activity size={14} /> 一週運勢
                    </button>
                </div>

                {/* Debug 開關 */}
                {isSuperAdmin && (
                    <div className="flex gap-2 ml-auto">
                        <div className="flex bg-slate-800 rounded p-1 gap-1 border border-slate-700">
                            <button onClick={() => setDemoMode('real')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'real' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Real</button>
                            <button onClick={() => setDemoMode('hot')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'hot' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>Hot</button>
                            <button onClick={() => setDemoMode('cold')} className={`px-2 py-0.5 text-[10px] rounded ${demoMode === 'cold' ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}>Cold</button>
                        </div>
                        <button 
                            onClick={() => setShowDebug(!showDebug)} 
                            className={`p-1.5 rounded border transition-colors ${showDebug ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                            title="開啟驗算控制台"
                        >
                            <Bug size={14}/>
                        </button>
                    </div>
                )}
            </div>

            {/* --- 主要內容區 --- */}
            <div className="relative flex-1 w-full flex flex-col items-center justify-center p-4 sm:p-8 z-10">
                {activeTab === 'thermometer' ? (
                    <div className="w-full max-w-5xl h-[400px] animate-in zoom-in duration-500">
                            <FortuneThermometer data={displayData} baseScore={baseScore} />
                    </div>
                ) : (
                    // [修改] 使用新的 FocusTrendChart
                    // 高度設為 100% 填滿剩餘空間，不再寫死 px，避免捲軸
                    <div className="w-full h-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
                        <div className="flex-1 w-full min-h-[350px]"> 
                            <FocusTrendChart data={weeklyDetailedData} />
                        </div>
                    </div>
                )}
            </div>

            {/* --- 驗算控制台 (Debug Console) --- */}
            {showDebug && isSuperAdmin && (
                <div className="absolute inset-x-0 bottom-0 z-50 bg-[#020617]/95 border-t border-green-500/30 backdrop-blur-md transition-all animate-in slide-in-from-bottom-10 h-[350px] flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                    
                    {/* 控制台標題列 */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                        <div className="flex items-center gap-2 text-green-400">
                            <Terminal size={14} />
                            <span className="text-xs font-mono font-bold">DEV_CONSOLE: 運算邏輯驗證</span>
                        </div>
                        <button onClick={() => setShowDebug(false)} className="text-slate-400 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>

                    {/* 控制台內容區 */}
                    <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        
                        {/* 1. 時空參數 & 基礎分 */}
                        <div className="flex flex-col gap-4">
                            <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">
                                    <Clock size={12} className="text-purple-400"/> 時空參數
                                </h4>
                                <div className="space-y-1 font-mono text-[10px] text-slate-400">
                                    <div className="flex justify-between"><span>農曆:</span> <span className="text-yellow-300">{todayFortune.devInfo.lunarDateStr}</span></div>
                                    <div className="flex justify-between"><span>流年:</span> <span className="text-cyan-300">{todayFortune.devInfo.flowYearZhi}</span></div>
                                    <div className="flex justify-between"><span>流月:</span> <span className="text-cyan-300">{todayFortune.devInfo.flowMonthZhi}</span> (起: {todayFortune.devInfo.flowMonthAnchor})</div>
                                    <div className="flex justify-between"><span>流日:</span> <span className="text-cyan-300">{todayFortune.devInfo.flowDayZhi}</span></div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 flex-1">
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">
                                    <Hash size={12} className="text-blue-400"/> 基礎分 (Base)
                                </h4>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-2xl font-black text-white">{todayFortune.devInfo.baseScore}</span>
                                    <span className="text-[10px] text-slate-500 mb-1">初始權重</span>
                                </div>
                                <div className="max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                     <ul className="space-y-1">
                                        {todayFortune.devInfo.formulas.base?.map((log, i) => (
                                            <li key={i} className="text-[10px] text-slate-400 border-l border-slate-700 pl-2">{log}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 2. 工作 & 財運 */}
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Self / Work (工作)" score={todayFortune.scores.self} logs={todayFortune.devInfo.formulas.self} />
                            <DebugLogBlock title="Wealth (財運)" score={todayFortune.scores.wealth} logs={todayFortune.devInfo.formulas.wealth} />
                        </div>

                        {/* 3. 交友 & 外出 */}
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Social (交友)" score={todayFortune.scores.social} logs={todayFortune.devInfo.formulas.social} />
                            <DebugLogBlock title="Travel (外出)" score={todayFortune.scores.travel} logs={todayFortune.devInfo.formulas.travel} />
                        </div>

                        {/* 4. 感情 & 總結 */}
                        <div className="flex flex-col gap-4">
                            <DebugLogBlock title="Love (感情)" score={todayFortune.scores.love} logs={todayFortune.devInfo.formulas.love} />
                            
                            {/* 總分區塊 */}
                            <div className="bg-slate-900/80 p-3 rounded border border-slate-700/50 flex flex-col justify-center items-center h-full">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Total Score</span>
                                <span className={`text-3xl font-black ${todayFortune.score >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                                    {todayFortune.score}
                                </span>
                                <span className="text-[10px] text-slate-600 mt-1">Weighted Average</span>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    </div>
  );
};