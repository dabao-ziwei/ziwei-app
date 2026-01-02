import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';

// 定義傳入資料的型別
interface WeeklyData {
    label: string; // 日期標籤 (e.g., "10/27")
    scores: {      // 五大面向分數
        self: number;
        wealth: number;
        social: number;
        travel: number;
        love: number;
    };
    baseScore: number; // 基礎分基準線
    dateStr: string;
}

interface Props {
    data: WeeklyData[];
}

// 定義五個軌道的設定
const tracks = [
    { key: 'self', title: '工作運勢', color: '#f59e0b' }, // Amber
    { key: 'wealth', title: '財運走勢', color: '#fbbf24' }, // Yellow
    { key: 'social', title: '交友關係', color: '#a3e635' }, // Lime
    { key: 'travel', title: '外出運勢', color: '#22d3ee' }, // Cyan
    { key: 'love', title: '感情溫度', color: '#f472b6' }, // Pink
] as const;


// 自定義發光數據點 (Customized Dot)
// 根據分數是否高於基礎分，顯示不同的發光效果
const GlowingDot = (props: any) => {
    const { cx, cy, value, payload } = props;
    const baseScore = payload.baseScore;
    const isHot = value >= baseScore;

    // 熱：紅/橘光暈；冷：藍/白光暈
    const glowColor = isHot ? 'rgba(239, 68, 68, 0.8)' : 'rgba(56, 189, 248, 0.8)';
    const strokeColor = isHot ? '#f59e0b' : '#38bdf8';
    const fillColor = isHot ? '#7c2d12' : '#0c4a6e';

    return (
        <svg x={cx - 6} y={cy - 6} width={12} height={12} style={{ overflow: 'visible' }}>
            <circle cx="6" cy="6" r="6" fill={glowColor} filter="blur(4px)" opacity="0.6" />
            <circle cx="6" cy="6" r="3" stroke={strokeColor} strokeWidth="1.5" fill={fillColor} />
        </svg>
    );
};

// 自定義 Tooltip (滑鼠懸停時的提示框)
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload; // 取得當天的完整資料
        const baseScore = data.baseScore;

        return (
            <div className="bg-slate-900/95 border border-slate-700/50 p-3 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md">
                <p className="text-xs font-bold text-slate-400 mb-2">{data.dateStr} ({label})</p>
                <div className="space-y-1.5">
                    {tracks.map(track => {
                        const score = data.scores[track.key];
                        const isHot = score >= baseScore;
                        return (
                            <div key={track.key} className="flex items-center justify-between gap-4 text-xs">
                                <span style={{ color: track.color }} className="font-bold tracking-wider uppercase opacity-80">{track.title}</span>
                                <div className="flex items-center gap-1 font-mono">
                                    <span className={`font-black ${isHot ? 'text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-cyan-400 drop-shadow-[0_0_5px_rgba(56,189,248,0.5)]'}`}>
                                        {score}
                                    </span>
                                    <span className="text-[10px] text-slate-600">/ 基{baseScore}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    }
    return null;
};


export const ParallelTrendCharts: React.FC<Props> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-slate-500 text-sm text-center h-full flex items-center justify-center">尚無一週趨勢資料</div>;
    }

    // 取得基礎分 (假設一週內基礎分不變，取第一天即可)
    const baseScore = data[0].baseScore;

    return (
        <div className="w-full h-full flex flex-col" style={{ gap: '2px' }}>
            {/* 迴圈渲染 5 個平行的軌道圖表 */}
            {tracks.map((track, index) => {
                const isLast = index === tracks.length - 1;
                return (
                    <div key={track.key} className="flex-1 relative group min-h-[70px]">
                        {/* 軌道標題背景標籤 */}
                        <div className="absolute top-1 left-2 z-20 pointer-events-none text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded bg-slate-900/50 border border-slate-800/50" style={{ color: track.color, opacity: 0.6 }}>
                            {track.title}
                        </div>
                        
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={data}
                                // [關鍵] syncId: 讓所有圖表的滑鼠互動同步
                                syncId="trend-sync" 
                                margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                
                                {/* 只有最後一個圖表顯示 X 軸標籤，其他隱藏 */}
                                <XAxis 
                                    dataKey="label" 
                                    hide={!isLast} 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, dy: 5 }}
                                />
                                {/* Y 軸隱藏，保持畫面乾淨 */}
                                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                                
                                {/* 只有第一個圖表負責渲染 Tooltip (因為同步了，一個就夠) */}
                                {index === 0 && (
                                    <Tooltip 
                                        content={<CustomTooltip />}
                                        cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        isAnimationActive={false}
                                    />
                                )}

                                {/* 基準線 (Base Score Reference) */}
                                <ReferenceLine 
                                    y={baseScore} 
                                    stroke="#4ade80" 
                                    strokeOpacity={0.3} 
                                    strokeDasharray="3 3" 
                                    strokeWidth={1}
                                    // 只在第一個圖表顯示標籤，避免重複
                                    label={index === 0 ? { value: `基準:${baseScore}`, fill: '#4ade80', fontSize: 10, opacity: 0.5, position: 'insideTopRight', dy: -12 } : undefined}
                                />

                                {/* 折線本體 */}
                                <Line
                                    type="monotone"
                                    // 從 data.scores 中取出對應面向的分數
                                    dataKey={(d) => d.scores[track.key]} 
                                    stroke={track.color}
                                    strokeWidth={2}
                                    // 使用自定義的發光數據點
                                    dot={<GlowingDot />}
                                    activeDot={{ r: 5, stroke: 'white', strokeWidth: 2, fill: track.color }}
                                    isAnimationActive={true}
                                    animationDuration={1000}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                );
            })}
        </div>
    );
};