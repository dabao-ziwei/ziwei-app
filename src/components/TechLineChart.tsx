import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataPoint {
  label: string; 
  value: number; 
  dateStr: string; 
}

interface Props {
  data: DataPoint[];
}

export const TechLineChart: React.FC<Props> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // 1. 強力防呆：如果資料有問題，直接不渲染 SVG，但給出可見的提示
  if (!data || data.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono animate-pulse">
            ANALYZING DATA...
        </div>
      );
  }

  const width = 500;
  const height = 250;
  const padding = 20;
  
  // 2. 座標計算 (確保絕對數值)
  const getX = (index: number) => {
      const count = data.length > 1 ? data.length - 1 : 1;
      return padding + (index / count) * (width - 2 * padding);
  };
  
  const getY = (value: number) => {
      const safeVal = (typeof value === 'number' && !isNaN(value)) ? value : 60;
      return height - padding - (safeVal / 100) * (height - 2 * padding);
  };

  // 3. 路徑生成
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const linePathStr = `M ${points.join(' L ')}`;
  const areaPathStr = `${linePathStr} L ${getX(data.length - 1)},${height} L ${getX(0)},${height} Z`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative select-none">
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible z-10">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <filter id="neonLine" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 背景網格 */}
        {Array.from({ length: 5 }).map((_, i) => (
            <line 
                key={i} 
                x1={padding} y1={getY(i * 25)} 
                x2={width - padding} y2={getY(i * 25)} 
                stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" 
            />
        ))}

        {/* 區域填充 */}
        <motion.path
          d={areaPathStr}
          fill="url(#areaGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* 主折線 */}
        <motion.path
          d={linePathStr}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#neonLine)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* 互動節點 - 使用普通 Circle + CSS 避免 Framer 初始化錯誤 */}
        {data.map((d, i) => {
            const x = getX(i);
            const y = getY(d.value);
            const isHover = hoverIndex === i;

            return (
                <g key={i} 
                   onMouseEnter={() => setHoverIndex(i)} 
                   onMouseLeave={() => setHoverIndex(null)}
                   className="cursor-pointer"
                >
                    {/* 透明感應區 */}
                    <rect x={x - 15} y={0} width={30} height={height} fill="transparent" />

                    {/* 掃描線 */}
                    {isHover && (
                        <line
                            x1={x} y1={padding} x2={x} y2={height}
                            stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 2"
                            opacity="0.5"
                        />
                    )}

                    {/* 圓點 */}
                    <circle
                        cx={x} cy={y} 
                        r={isHover ? 6 : 4} 
                        fill={isHover ? "#fff" : "#0e7490"}
                        stroke="#22d3ee" strokeWidth="2"
                        className="transition-all duration-200 ease-out"
                    />

                    <text x={x} y={height + 15} fill={isHover ? "#22d3ee" : "#64748b"} fontSize="10" textAnchor="middle" fontWeight="bold">
                        {d.label}
                    </text>
                </g>
            );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoverIndex !== null && data[hoverIndex] && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bg-slate-900/90 border border-cyan-500/50 p-2 rounded-lg shadow-xl backdrop-blur-md z-20 flex flex-col items-center pointer-events-none"
                style={{ 
                    left: getX(hoverIndex) * (100/width) + '%', 
                    top: (getY(data[hoverIndex].value) * (100/height)) - 20 + '%',
                    transform: 'translate(-50%, -100%)'
                }}
            >
                <div className="text-[10px] text-cyan-300 font-bold mb-0.5">{data[hoverIndex].dateStr}</div>
                <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-white">{data[hoverIndex].value}</span>
                    <span className="text-[10px] text-slate-400">分</span>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};