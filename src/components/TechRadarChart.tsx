import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  data: {
    label: string;
    value: number; // 0-100
    fullMark: number;
  }[];
  color?: string;
}

export const TechRadarChart: React.FC<Props> = ({ data }) => {
  const size = 300;
  const center = size / 2;
  const radius = 100; // 半徑
  const polySides = 5; // 五邊形

  // 計算多邊形頂點
  const getPoint = (value: number, index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = (value / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  };

  // 生成雷達圖的路徑 (Path Data)
  const pathData = data.map((d, i) => getPoint(d.value, i, polySides)).join(' ');
  const bgPathData = data.map((_, i) => getPoint(100, i, polySides)).join(' '); // 最外圈
  const mdPathData = data.map((_, i) => getPoint(60, i, polySides)).join(' ');  // 60分及格線

  return (
    <div className="relative w-full flex items-center justify-center py-4">
      {/* 背景光暈裝飾 */}
      <div className="absolute inset-0 bg-blue-500/5 blur-[60px] rounded-full transform scale-75" />

      <svg width={size} height={size} className="relative z-10 overflow-visible">
        <defs>
          {/* 3D 金屬光澤漸層 */}
          <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" /> {/* Cyan-400 */}
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" /> {/* Violet-500 */}
          </linearGradient>
          
          {/* 發光濾鏡 */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* --- 背景動態裝飾圈 (HUD Ring) --- */}
        <motion.circle
          cx={center} cy={center} r={radius + 30}
          fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{ originX: "50%", originY: "50%" }}
          opacity={0.3}
        />
        <motion.circle
          cx={center} cy={center} r={radius + 15}
          fill="none" stroke="#475569" strokeWidth="1"
          strokeDasharray="20 10"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          style={{ originX: "50%", originY: "50%" }}
          opacity={0.3}
        />

        {/* --- 網格線 (背景五邊形) --- */}
        <polygon points={bgPathData} fill="none" stroke="#1e293b" strokeWidth="1" />
        <polygon points={data.map((_, i) => getPoint(80, i, polySides)).join(' ')} fill="none" stroke="#1e293b" strokeWidth="1" />
        <polygon points={mdPathData} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" /> {/* 60分及格線 */}
        <polygon points={data.map((_, i) => getPoint(40, i, polySides)).join(' ')} fill="none" stroke="#1e293b" strokeWidth="1" />
        <polygon points={data.map((_, i) => getPoint(20, i, polySides)).join(' ')} fill="none" stroke="#1e293b" strokeWidth="1" />

        {/* 連接中心點的放射線 */}
        {data.map((_, i) => {
          const endPoint = getPoint(100, i, polySides);
          return (
            <line 
              key={i} 
              x1={center} y1={center} 
              x2={endPoint.split(',')[0]} y2={endPoint.split(',')[1]} 
              stroke="#1e293b" strokeWidth="1" 
            />
          );
        })}

        {/* --- 實際數據區域 (帶動畫) --- */}
        <motion.polygon
          points={pathData}
          fill="url(#radarGradient)"
          stroke="#22d3ee"
          strokeWidth="2"
          filter="url(#glow)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "backOut" }}
          style={{ originX: "50%", originY: "50%" }}
        />

        {/* --- 頂點數值與標籤 --- */}
        {data.map((d, i) => {
          const point = getPoint(115, i, polySides); // 標籤位置推遠一點
          const [x, y] = point.split(',').map(Number);
          
          return (
            <g key={i}>
              {/* 頂點光點 */}
              <motion.circle 
                cx={getPoint(d.value, i, polySides).split(',')[0]} 
                cy={getPoint(d.value, i, polySides).split(',')[1]} 
                r="3" fill="#fff" 
                animate={{ r: [3, 5, 3], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              />
              
              {/* 文字標籤 (含背景框) */}
              <foreignObject x={x - 40} y={y - 15} width="80" height="50">
                <div className="flex flex-col items-center justify-center text-center leading-none">
                  <span className="text-[10px] text-cyan-400 font-bold tracking-wider drop-shadow-md bg-slate-900/80 px-1 rounded backdrop-blur-sm border border-slate-700/50">
                    {d.label}
                  </span>
                  <span className="text-sm font-mono font-black text-white mt-0.5 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                    {d.value}
                  </span>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};