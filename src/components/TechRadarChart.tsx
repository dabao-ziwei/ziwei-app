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
  const size = 360; 
  const center = size / 2;
  const radius = 100;
  const polySides = 5;

  const getPoint = (value: number, index: number, total: number, offsetRadius: number = 0) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const r = ((value / 100) * radius) + offsetRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, str: `${x},${y}` };
  };

  const pathData = data.map((d, i) => getPoint(d.value, i, polySides).str).join(' ');
  const depthOffset = 8;
  const depthPathData = data.map((d, i) => {
      const p = getPoint(d.value, i, polySides);
      return `${p.x},${p.y + depthOffset}`;
  }).join(' ');

  return (
    <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[300px] max-h-[300px] bg-cyan-500/20 blur-[100px] rounded-full mix-blend-screen animate-pulse" />

      <svg width={size} height={size} className="relative z-10 overflow-visible">
        <defs>
          <linearGradient id="glassGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0891b2" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
          </linearGradient>

          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="scanGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={size} y2={size}>
             <stop offset="0%" stopColor="rgba(255,255,255,0)" />
             <stop offset="50%" stopColor="rgba(255,255,255,1)" />
             <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <motion.g
            style={{ originX: "50%", originY: "50%" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            opacity={0.4}
        >
            <circle cx={center} cy={center} r={radius + 30} stroke="#334155" strokeWidth="1" fill="none" strokeDasharray="4 8" />
            <circle cx={center} cy={center} r={radius + 40} stroke="#1e293b" strokeWidth="8" fill="none" strokeDasharray="1 10" opacity={0.5}/>
        </motion.g>
        
        <motion.g
            style={{ originX: "50%", originY: "50%" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            opacity={0.3}
        >
             <circle cx={center} cy={center} r={radius + 15} stroke="#475569" strokeWidth="1" fill="none" strokeDasharray="10 10" />
        </motion.g>

        {data.map((_, i) => {
          const end = getPoint(100, i, polySides);
          return (
            <line
              key={`axis-${i}`}
              x1={center} y1={center}
              x2={end.x} y2={end.y}
              stroke="#1e293b"
              strokeWidth="1"
            />
          );
        })}

        <motion.polygon
            points={depthPathData}
            fill="url(#depthGradient)"
            stroke="none"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "backOut" }}
            style={{ originX: "50%", originY: "50%" }}
        />

        <motion.polygon
            points={pathData}
            fill="url(#glassGradient)"
            stroke="#22d3ee"
            strokeWidth="2"
            filter="url(#neonGlow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "backOut", delay: 0.1 }}
            style={{ originX: "50%", originY: "50%" }}
        />

        <motion.polygon
            points={pathData}
            fill="url(#scanGradient)"
            stroke="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            style={{ originX: "50%", originY: "50%", mixBlendMode: 'overlay' }}
        />

        {data.map((d, i) => {
          const pos = getPoint(d.value, i, polySides);
          const labelPos = getPoint(100, i, polySides, 45); 
          
          const midX = (pos.x + labelPos.x) / 2;
          const midY = (pos.y + labelPos.y) / 2;

          return (
            <g key={`node-${i}`}>
              
              <motion.polyline
                points={`${pos.x},${pos.y} ${midX},${midY} ${labelPos.x},${labelPos.y}`}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1"
                opacity="0.4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
              />

              <motion.g
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
              >
                  <circle cx={pos.x} cy={pos.y} r="3" fill="#fff" filter="url(#neonGlow)" />
                  <motion.circle 
                    cx={pos.x} cy={pos.y} r="6" 
                    stroke="#22d3ee" strokeWidth="1" fill="none"
                    animate={{ r: [6, 12], opacity: [1, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
              </motion.g>

              <foreignObject x={labelPos.x - 40} y={labelPos.y - 20} width="80" height="50">
                 <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                    className="flex flex-col items-center"
                 >
                    <div className="px-2 py-0.5 bg-slate-900/80 border-b-2 border-cyan-500 text-[10px] font-bold text-cyan-300 tracking-wider shadow-lg backdrop-blur-sm">
                        {d.label}
                    </div>
                    <div className="text-lg font-black text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] leading-none mt-1">
                        <CountUp value={d.value} />
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

const CountUp = ({ value }: { value: number }) => {
    const [count, setCount] = React.useState(0);
    React.useEffect(() => {
        let start = 0;
        const duration = 1000;
        const stepTime = Math.abs(Math.floor(duration / value));
        const timer = setInterval(() => {
            start += 1;
            setCount(start);
            if (start >= value) clearInterval(timer);
        }, stepTime > 0 ? stepTime : 10);
        return () => clearInterval(timer);
    }, [value]);
    return <>{count}</>;
};