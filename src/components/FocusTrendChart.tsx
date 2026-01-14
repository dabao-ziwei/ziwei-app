import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
// [修正] 移除不使用的 Icon 引用
// import { Briefcase, Wallet, Users, Plane, Heart } from 'lucide-react';

// ----------------------------------------------------------------------
// 1. 資料與設定
// ----------------------------------------------------------------------

interface WeeklyData {
  label: string; 
  scores: {
    self: number;
    wealth: number;
    social: number;
    travel: number;
    love: number;
  };
  baseScore: number;
  dateStr: string;
}

interface Props {
  data: WeeklyData[];
}

// [修正] 移除 Icon 屬性，保留純文字標籤與顏色
const categories = [
  { key: 'self', label: '工作', color: '#f59e0b' }, // Amber
  { key: 'wealth', label: '理財', color: '#fbbf24' },   // Yellow
  { key: 'social', label: '交友', color: '#a3e635' },    // Lime
  { key: 'travel', label: '外出', color: '#22d3ee' },    // Cyan
  { key: 'love', label: '感情', color: '#f472b6' },      // Pink
] as const;

type CategoryKey = typeof categories[number]['key'];

// ----------------------------------------------------------------------
// 2. 自定義圖表元件
// ----------------------------------------------------------------------

// 發光節點
const CustomDot = (props: any) => {
    const { cx, cy, stroke } = props;
    return (
        <svg x={cx - 5} y={cy - 5} width={10} height={10} style={{ overflow: 'visible' }}>
            <circle cx="5" cy="5" r="5" fill={stroke} fillOpacity={0.4} filter="blur(2px)" />
            <circle cx="5" cy="5" r="2.5" fill="#0f172a" stroke={stroke} strokeWidth={2} />
        </svg>
    );
};

// 活躍節點 (Hover)
const CustomActiveDot = (props: any) => {
    const { cx, cy, stroke } = props;
    return (
        <svg x={cx - 10} y={cy - 10} width={20} height={20} style={{ overflow: 'visible' }}>
            <circle cx="10" cy="10" r="8" fill={stroke} fillOpacity={0.6} filter="blur(4px)">
                <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="10" cy="10" r="3.5" fill="#ffffff" stroke={stroke} strokeWidth={2} />
        </svg>
    );
};

// Tooltip
const CustomTooltip = ({ active, payload, activeCategory }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const score = data.scores[activeCategory];
    const category = categories.find(c => c.key === activeCategory)!;

    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50">
        <p className="text-xs text-slate-400 mb-2 font-mono border-b border-slate-800 pb-1">{data.dateStr}</p>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <span className="w-2 h-6 rounded-full" style={{ backgroundColor: category.color, boxShadow: `0 0 8px ${category.color}` }} />
                <span style={{ color: category.color }} className="font-bold text-sm tracking-widest">{category.label}</span>
            </div>
            <span className="text-2xl font-black text-white leading-none" style={{ textShadow: `0 0 15px ${category.color}80` }}>
                {score}
            </span>
        </div>
      </div>
    );
  }
  return null;
};

// ----------------------------------------------------------------------
// 3. 主組件 (FocusTrendChart)
// ----------------------------------------------------------------------

export const FocusTrendChart: React.FC<Props> = ({ data }) => {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('self');

  // 計算漸層分界點 (Gradient Offset)
  const gradientOffset = useMemo(() => {
    if (!data || data.length === 0) return 0;
    
    const baseScore = data[0].baseScore;
    const scores = data.map(d => d.scores[activeCategory]);
    
    const dataMax = Math.max(...scores, baseScore + 5);
    const dataMin = Math.min(...scores, baseScore - 5);
  
    if (dataMax <= dataMin) return 0;
  
    const offset = (dataMax - baseScore) / (dataMax - dataMin);
    return Math.min(Math.max(offset, 0), 1);
  }, [data, activeCategory]);

  if (!data || data.length === 0) {
    return <div className="text-slate-500 text-sm text-center h-full flex items-center justify-center">尚無一週趨勢資料</div>;
  }

  const currentCategory = categories.find(c => c.key === activeCategory)!;
  const baseScore = data[0]?.baseScore || 60;

  return (
    <div className="w-full h-full flex flex-col items-center">
      
      {/* 1. 切換器 */}
      {/* [修正] 移除 Icon 後，純文字排版 */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 px-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              // [修正] 
              // 1. 移除 flex items-center gap-1.5 (因為沒 icon 了)
              // 2. 保持 text-xs sm:text-sm 與 padding
              className={`
                relative px-4 py-1.5 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider transition-all duration-300
                ${isActive 
                  ? 'text-white shadow-lg scale-105' 
                  : 'text-slate-500 bg-slate-900/50 border border-slate-800 hover:bg-slate-800 hover:text-slate-300'
                }
              `}
              style={{
                backgroundColor: isActive ? 'rgba(15, 23, 42, 0.9)' : undefined,
                borderColor: isActive ? cat.color : undefined,
                boxShadow: isActive ? `0 0 15px ${cat.color}40, inset 0 0 10px ${cat.color}20` : undefined,
                borderWidth: isActive ? '1px' : '1px'
              }}
            >
              {cat.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/4 w-1/2 h-[2px] rounded-full blur-[1px]" style={{ backgroundColor: cat.color }} />
              )}
            </button>
          );
        })}
      </div>

      {/* 2. 分裂填充圖表 */}
      <div className="w-full flex-1 min-h-0 relative px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }} 
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset={0} stopColor={currentCategory.color} stopOpacity={0.7} />
                <stop offset={gradientOffset} stopColor={currentCategory.color} stopOpacity={0.5} />
                <stop offset={gradientOffset} stopColor="#ecfeff" stopOpacity={0.9} />
                <stop offset={1} stopColor="#22d3ee" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(255,255,255,0.08)" 
                vertical={true} 
                horizontal={true}
            />
            
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11, dy: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              padding={{ top: 20, bottom: 20 }}
              domain={[0, 100]} 
              hide 
            />
            
            <Tooltip 
                content={<CustomTooltip activeCategory={activeCategory} />} 
                cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '5 5' }} 
            />

            {/* 基準線 */}
            <ReferenceLine 
                y={baseScore} 
                stroke="#ffffff" 
                strokeOpacity={0.6}
                strokeDasharray="3 3" 
                strokeWidth={1}
                label={{ 
                    value: '基準運勢', 
                    fill: '#ffffff', 
                    fontSize: 10, 
                    position: 'insideRight',
                    opacity: 0.8,
                    dy: -10
                }} 
            />

            {/* 能量圖表 */}
            <Area
              type="monotone"
              dataKey={`scores.${activeCategory}`}
              stroke={currentCategory.color} 
              strokeWidth={4} 
              fill="url(#splitColor)" 
              animationDuration={1000}
              dot={<CustomDot />} 
              activeDot={<CustomActiveDot />}
              style={{
                filter: `drop-shadow(0 0 8px ${currentCategory.color}80)`
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};