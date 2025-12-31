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

  // 雷達圖數據
  const radarData = [
    { label: '氣場', value: fortune.scores.self },
    { label: '交友', value: fortune.scores.social },
    { label: '感情', value: fortune.scores.love },
    { label: '外出', value: fortune.scores.travel },
    { label: '理財', value: fortune.scores.wealth },
  ];

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* 上半部：五角雷達圖 */}
      <div className="p-6 pb-2 flex flex-col items-center justify-center relative bg-gradient-to-b from-purple-50/50 to-white">
          
          <div className="absolute top-4 left-4 flex flex-col">
               <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full mb-1">
                  {clientName} · 流日{fortune.debug?.flowDayZhi}位
               </span>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">今日運勢</h2>
          </div>

          <div className="mt-8 mb-4">
             <RadarChart data={radarData} size={180} />
          </div>
          
          <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-black text-slate-800">{fortune.score}</span>
              <span className="text-xs font-bold text-slate-400">總分</span>
          </div>

          <p className="text-sm font-bold text-slate-600 mb-2 bg-white/60 px-4 py-1 rounded-full border border-slate-100 shadow-sm">
              {fortune.summary}
          </p>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ChevronRight size={20} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
      </div>

      {/* 下半部：詳細指數與建議 */}
      <div className={`bg-slate-50 border-t border-slate-100 transition-all duration-500 ease-in-out ${isExpanded ? 'py-6' : 'py-4'}`}>
          
          {/* 數值列表 */}
          <div className="grid grid-cols-5 gap-1 px-4 mb-4 text-center">
              {radarData.map((d, i) => (
                  <div key={i} className="flex flex-col items-center">
                      <div className="w-8 h-1 rounded-full mb-1" style={{ backgroundColor: getScoreColor(d.value) }}></div>
                      <span className="text-[10px] text-slate-400">{d.label}</span>
                      <span className="text-sm font-bold text-slate-700">{d.value}</span>
                  </div>
              ))}
          </div>

          {/* 詳細建議文字 (展開才顯示) */}
          <div className={`px-6 space-y-4 transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0 mt-0'}`}>
              
              <DetailRow label="氣場總評" text={fortune.details.overall} isLocked={!isVip} />
              <DetailRow label="感情與事業" text={fortune.details.loveCareer} isLocked={!isVip} />
              <DetailRow label="財運指引" text={fortune.details.wealth} isLocked={!isVip} />

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

// --- SVG 雷達圖組件 ---
const RadarChart = ({ data, size }: { data: {label:string, value:number}[], size: number }) => {
    const radius = size / 2;
    const center = size / 2;
    const angleStep = (Math.PI * 2) / 5;
    
    // 計算頂點座標
    const getPoint = (value: number, index: number) => {
        // 旋轉 -90度 讓第一個點在正上方
        const angle = index * angleStep - Math.PI / 2;
        // 正規化半徑 (20~100 對應 0.2~1.0)
        const r = (value / 100) * radius; 
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
    };

    // 背景網格 (60分, 80分, 100分)
    const levels = [60, 80, 100];
    
    // 數據多邊形
    const polyPoints = data.map((d, i) => getPoint(d.value, i)).join(' ');

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            {/* 網格 */}
            {levels.map((level, idx) => (
                <polygon 
                    key={idx}
                    points={data.map((_, i) => getPoint(level, i)).join(' ')}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray={level === 60 ? "4 2" : ""}
                />
            ))}
            
            {/* 軸線 */}
            {data.map((_, i) => {
                const p = getPoint(100, i);
                return <line key={i} x1={center} y1={center} x2={p.split(',')[0]} y2={p.split(',')[1]} stroke="#f1f5f9" strokeWidth="1" />;
            })}

            {/* 數據區域 */}
            <polygon 
                points={polyPoints} 
                fill="rgba(59, 130, 246, 0.2)" 
                stroke="#3b82f6" 
                strokeWidth="2" 
            />

            {/* 數據點 */}
            {data.map((d, i) => {
                const [x, y] = getPoint(d.value, i).split(',');
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                        {/* 標籤位置微調 */}
                        <text 
                            x={parseFloat(x)} 
                            y={parseFloat(y) + (i===0 ? -10 : 15)} 
                            textAnchor="middle" 
                            fontSize="10" 
                            className="font-bold fill-slate-500"
                        >
                            {d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

const getScoreColor = (score: number) => {
    if (score >= 80) return '#f59e0b'; // orange
    if (score >= 60) return '#3b82f6'; // blue
    return '#64748b'; // slate
};

const DetailRow = ({ label, text, isLocked }: any) => (
    <div className="relative">
        <h4 className="text-xs font-bold text-slate-400 mb-1">{label}</h4>
        <p className={`text-sm text-slate-600 leading-relaxed ${isLocked ? 'blur-sm select-none opacity-60' : ''}`}>
            {text}
        </p>
        {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center"></div>
        )}
    </div>
);