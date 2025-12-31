import React, { useMemo, useState } from 'react';
import { Lock, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { DailyFortune } from '../logic/fortune';
import type { UserProfile } from '../db';

interface Props {
  fortune: DailyFortune;
  userProfile: UserProfile | null;
  clientName: string;
  forceLock?: boolean;
}

export const FortuneWidget: React.FC<Props> = ({ fortune, userProfile, clientName, forceLock = false }) => {
  // 開發階段預設展開算式
  const [showDebug, setShowDebug] = useState(true);

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

  const radarData = [
    { label: '自身', value: fortune.scores.self },
    { label: '交友', value: fortune.scores.social },
    { label: '感情', value: fortune.scores.love },
    { label: '外出', value: fortune.scores.travel },
    { label: '理財', value: fortune.scores.wealth },
  ];

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mb-6">
      
      {/* 標題列 */}
      <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                {clientName}
            </span>
            <span className="text-xs text-slate-500">
                農曆: {fortune.devInfo.lunarDateStr}
            </span>
            <span className="text-xs text-slate-400">
               (流月{fortune.devInfo.flowMonthZhi}, 流日{fortune.devInfo.flowDayZhi})
            </span>
          </div>
          <div className="text-sm font-bold text-slate-700">總分: {fortune.score}</div>
      </div>

      {/* 主要內容區 (左右佈局) */}
      <div className="flex flex-col md:flex-row">
          
          {/* 左側：雷達圖 */}
          <div className="w-full md:w-1/2 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 bg-gradient-to-b from-white to-slate-50/50">
             <RadarChart data={radarData} size={220} />
             <p className="mt-4 text-sm font-bold text-slate-600 px-4 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                 {fortune.summary}
             </p>
          </div>

          {/* 右側：運勢總論與詳情 (預設顯示) */}
          <div className="w-full md:w-1/2 p-6 flex flex-col justify-center">
             <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                 <FileText size={20} className="text-blue-500"/> 運勢分析
             </h3>
             
             <div className="space-y-4">
                <DetailRow label="自身氣場" text={fortune.details.overall} score={fortune.scores.self} isLocked={!isVip} />
                <DetailRow label="感情事業" text={fortune.details.loveCareer} score={fortune.scores.love} isLocked={!isVip} />
                <DetailRow label="荷包財運" text={fortune.details.wealth} score={fortune.scores.wealth} isLocked={!isVip} />
             </div>

             {!isVip && (
                 <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex items-center gap-3">
                     <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                         <Lock size={16} />
                     </div>
                     <div>
                         <div className="text-xs font-bold text-yellow-800">解鎖完整解析</div>
                         <div className="text-[10px] text-yellow-600">升級會員查看詳細避雷指南</div>
                     </div>
                 </div>
             )}
          </div>
      </div>

      {/* 底部：開發驗證算式 (可摺疊) */}
      <div className="border-t border-slate-200">
          <button 
            onClick={() => setShowDebug(!showDebug)}
            className="w-full px-6 py-2 bg-slate-50 text-xs font-bold text-slate-500 hover:bg-slate-100 flex justify-between items-center transition-colors"
          >
              <span>🛠️ 開發驗證：分數計算明細 (點擊收合)</span>
              {showDebug ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          
          {showDebug && (
             <div className="p-6 bg-slate-800 text-green-400 font-mono text-xs overflow-x-auto space-y-4">
                 <LogSection title="自身氣場 (命/遷/官/財)" logs={fortune.devInfo.formulas.self} />
                 <LogSection title="交友運勢 (僕/兄/父/子)" logs={fortune.devInfo.formulas.social} />
                 <LogSection title="感情運勢 (夫/官/遷/福)" logs={fortune.devInfo.formulas.love} />
                 <LogSection title="外出運勢 (子/田/兄/疾)" logs={fortune.devInfo.formulas.travel} />
                 <LogSection title="理財運勢 (財/福/遷/夫)" logs={fortune.devInfo.formulas.wealth} />
             </div>
          )}
      </div>
    </div>
  );
};

const LogSection = ({ title, logs }: { title: string, logs: string[] }) => (
    <div>
        <div className="font-bold text-white mb-1 border-b border-slate-600 pb-1">{title}</div>
        {logs.length === 0 ? (
            <div className="text-slate-500 italic">無變動 (60分)</div>
        ) : (
            logs.map((L, i) => <div key={i}>{L}</div>)
        )}
    </div>
);

const DetailRow = ({ label, text, score, isLocked }: any) => (
    <div className="group">
        <div className="flex justify-between items-baseline mb-1">
            <h4 className="text-sm font-bold text-slate-600">{label}</h4>
            <span className={`text-xs font-mono font-bold ${score >= 60 ? 'text-blue-600' : 'text-slate-400'}`}>{score}分</span>
        </div>
        <div className="relative bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className={`text-sm text-slate-700 leading-relaxed ${isLocked ? 'blur-[3px] opacity-60 select-none' : ''}`}>
                {text}
            </p>
            {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* 鎖定遮罩，但不放按鈕以免干擾閱讀感 */}
                </div>
            )}
        </div>
    </div>
);

// --- 雷達圖組件 (與之前相同) ---
const RadarChart = ({ data, size }: { data: {label:string, value:number}[], size: number }) => {
    const radius = size / 2;
    const center = size / 2;
    const angleStep = (Math.PI * 2) / 5;
    
    const getPoint = (value: number, index: number) => {
        const angle = index * angleStep - Math.PI / 2;
        const r = (value / 100) * radius; 
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
    };

    const levels = [60, 80, 100];
    const polyPoints = data.map((d, i) => getPoint(d.value, i)).join(' ');

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            {levels.map((level, idx) => (
                <polygon key={idx} points={data.map((_, i) => getPoint(level, i)).join(' ')}
                    fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray={level === 60 ? "4 2" : ""} />
            ))}
            {data.map((_, i) => {
                const p = getPoint(100, i);
                return <line key={i} x1={center} y1={center} x2={p.split(',')[0]} y2={p.split(',')[1]} stroke="#f1f5f9" strokeWidth="1" />;
            })}
            <polygon points={polyPoints} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
            {data.map((d, i) => {
                const [x, y] = getPoint(d.value, i).split(',');
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                        <text x={parseFloat(x)} y={parseFloat(y) + (i===0 ? -12 : (i===2||i===3)? 15 : 5)} 
                            textAnchor="middle" fontSize="11" className="font-bold fill-slate-500">
                            {d.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};