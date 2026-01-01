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

  // 防呆：如果沒有數據，不渲染任何東西，避免報錯
  if (!data || data.length === 0) {
      return (
        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs font-mono">
            ANALYZING DATA...
        </div>
      );
  }

  const width = 500;
  const height = 250;
  const padding = 20;
  
  // 計算座標
  const getX = (index: number) => {
      // 避免除以 0
      const denominator = data.length > 1 ? data.length - 1 : 1;
      return padding + (index / denominator) * (width - 2 * padding);
  };
  
  const getY = (value: number) => {
      const safeValue = isNaN(value) ? 0 : value;
      return height - padding - (safeValue / 100) * (height - 2 * padding);
  };

  // 產生 SVG 路徑指令 (Path Commands)
  // 格式: M x1,y1 L x2,y2 L x3,y3 ...
  const pointsArray = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  
  // 線條路徑 (Line Path)
  const linePathStr = `M ${pointsArray.join(' L ')}`;
  
  // 區域路徑 (Area Path) - 封閉底部
  const lastX = getX(data.length - 1);
  const firstX = getX(0);
  const areaPathStr = `${linePathStr} L ${lastX},${height} L ${firstX},${height} Z`;

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

        {/* 區域填充 (Area Fill) */}
        <motion.path
          d={areaPathStr}
          fill="url(#areaGradient)"
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ transformOrigin: "bottom" }}
        />

        {/* 主折線 (Line) - 改用 path 元素以支援複雜指令 */}
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

        {/* 互動區域與節點 */}
        {data.map((d, i) => {
            const x = getX(i);
            const y = getY(d.value);
            const isHover = hoverIndex === i;

            return (
                <g key={i} 
                   onMouseEnter={() => setHoverIndex(i)} 
                   onMouseLeave={() => setHoverIndex(null)}
                   className="cursor-crosshair"
                >
                    <rect x={x - 20} y={0} width={40} height={height} fill="transparent" />

                    <AnimatePresence>
                        {isHover && (
                            <motion.line
                                x1={x} y1={padding} x2={x} y2={height}
                                stroke="#22d3ee" strokeWidth="1" strokeDasharray="4 2"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 0.5, height: '100%' }}
                                exit={{ opacity: 0 }}
                            />
                        )}
                    </AnimatePresence>

                    <motion.circle
                        cx={x} cy={y} 
                        r={isHover ? 6 : 4} // 這裡如果 x,y 是 NaN 會報錯，但上方已有防呆
                        fill={isHover ? "#fff" : "#0e7490"}
                        stroke="#22d3ee" strokeWidth="2"
                        animate={{ scale: isHover ? 1.2 : 1 }}
                        transition={{ type: "spring" }}
                    />

                    <text x={x} y={height} fill={isHover ? "#22d3ee" : "#64748b"} fontSize="10" textAnchor="middle" fontWeight="bold">
                        {d.label}
                    </text>
                </g>
            );
        })}
      </svg>

      <AnimatePresence>
        {hoverIndex !== null && data[hoverIndex] && (
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
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