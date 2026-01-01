import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  data: {
    label: string;
    value: number; // 0-100
    fullMark: number;
  }[];
}

export const TechRadarChart: React.FC<Props> = ({ data }) => {
  const size = 320;
  const center = size / 2;
  const radius = 100; // 雷達圖半徑
  const polySides = 5; // 五邊形

  // 計算頂點座標
  const getPoint = (value: number, index: number, total: number, offsetRadius: number = 0) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = ((value / 100) * radius) + offsetRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, str: `${x},${y}` };
  };

  // 產生路徑字串
  const pathData = data.map((d, i) => getPoint(d.value, i, polySides).str).join(' ');
  const fullPathData = data.map((_, i) => getPoint(100, i, polySides).str).join(' ');
  
  // 動畫變數
  const drawTransition = { duration: 1.5, ease: "easeInOut" };

  return (
    <div className="relative w-full h-full flex items-center justify-center min-h-[350px]">
      
      {/* 1. 背景底光 (Ambient Light) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500/20 blur-[40px] rounded-full mix-blend-screen" />

      <svg width={size} height={size} className="relative z-10 overflow-visible">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" /> {/* Cyan */}
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" /> {/* Violet */}
          </linearGradient>
          <filter id="glowLine" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 2. 旋轉 HUD 刻度圈 (外層) */}
        <motion.g
            style={{ originX: "50%", originY: "50%" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
            <circle cx={center} cy={center} r={radius + 40} stroke="#334155" strokeWidth="1" fill="none" strokeDasharray="2 10" opacity={0.3} />
            <circle cx={center} cy={center} r={radius + 45} stroke="#334155" strokeWidth="2" fill="none" strokeDasharray="20 40" opacity={0.2} />
        </motion.g>

        {/* 3. 逆旋轉 HUD 圈 (內層) */}
        <motion.g
            style={{ originX: "50%", originY: "50%" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
             <circle cx={center} cy={center} r={radius + 20} stroke="#475569" strokeWidth="1" fill="none" strokeDasharray="4 4" opacity={0.4} />
        </motion.g>

        {/* 4. 放射線 (從中心延伸) - 線條延伸特效 */}
        {data.map((_, i) => {
          const end = getPoint(100, i, polySides);
          return (
            <motion.line
              key={`axis-${i}`}
              x1={center} y1={center}
              x2={end.x} y2={end.y}
              stroke="#1e293b"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, delay: i * 0.1, ease: "circOut" }}
            />
          );
        })}

        {/* 5. 背景網格 (五邊形) - 依序展開 */}
        {[25, 50, 75, 100].map((percent, idx) => (
            <motion.polygon
                key={`grid-${percent}`}
                points={data.map((_, i) => getPoint(percent, i, polySides).str).join(' ')}
                fill="none"
                stroke={percent === 100 ? "#475569" : "#1e293b"}
                strokeWidth="1"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
                style={{ originX: "50%", originY: "50%" }}
            />
        ))}

        {/* 6. 數據區域 (Data Polygon) - 炫酷展開 */}
        <motion.polygon
          points={pathData}
          fill="url(#radarFill)"
          stroke="#22d3ee"
          strokeWidth="2"
          filter="url(#glowLine)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
              duration: 1.2, 
              ease: "backOut", // 彈性效果
              delay: 0.5 
          }}
          style={{ originX: "50%", originY: "50%" }}
        />

        {/* 7. 數據頂點 & 數值標籤 */}
        {data.map((d, i) => {
          const pos = getPoint(d.value, i, polySides);
          const labelPos = getPoint(100, i, polySides, 35); // 標籤推更遠

          return (
            <g key={`point-${i}`}>
              {/* 連接線 (從頂點連到標籤) */}
              <motion.line
                x1={pos.x} y1={pos.y}
                x2={labelPos.x} y2={labelPos.y}
                stroke="#22d3ee"
                strokeWidth="1"
                opacity="0.3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1 + i * 0.1, duration: 0.5 }}
              />

              {/* 頂點光點 */}
              <motion.circle
                cx={pos.x} cy={pos.y}
                r="3"
                fill="#fff"
                filter="url(#glowLine)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1 + i * 0.1, type: "spring" }}
              />

              {/* 數值標籤框 */}
              <foreignObject x={labelPos.x - 30} y={labelPos.y - 15} width="60" height="40">
                 <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 + i * 0.1 }}
                    className="flex flex-col items-center justify-center"
                 >
                    <div className="text-[10px] text-cyan-200 font-bold bg-slate-900/90 px-1.5 py-0.5 border border-cyan-900/50 rounded shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                        {d.label}
                    </div>
                    <div className="text-sm font-black text-white drop-shadow-md mt-[1px]">
                        {d.value}
                    </div>
                 </motion.div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
};