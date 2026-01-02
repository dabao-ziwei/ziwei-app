import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  data: {
    label: string;
    value: number; 
  }[];
  baseScore: number; 
}

export const FortuneThermometer: React.FC<Props> = ({ data, baseScore }) => {
  return (
    <div className="w-full h-full flex items-center justify-around px-2 py-2 gap-3 sm:gap-6">
      {data.map((item, index) => (
        <ThermometerTube 
          key={item.label} 
          label={item.label} 
          value={item.value} 
          baseScore={baseScore} 
          index={index}
        />
      ))}
    </div>
  );
};

const ThermometerTube = ({ label, value, baseScore, index }: { label: string, value: number, baseScore: number, index: number }) => {
  const delta = value - baseScore;
  const isHot = delta >= 0;
  
  const maxDelta = 40; 
  const rawPercent = (Math.abs(delta) / maxDelta) * 50;
  // 保持最小高度 12% 確保波浪有空間顯示
  const heightPercent = Math.min(Math.max(rawPercent, 12), 50); 

  // 顏色定義：完全對稱的設計
  // 熱：紅黃
  const hotGradient = "linear-gradient(0deg, #dc2626 0%, #f59e0b 100%)"; 
  // 冷：深藍到亮青 (保持液體感，而非結冰感)
  const coldGradient = "linear-gradient(180deg, #1d4ed8 0%, #38bdf8 100%)";
  
  const textColor = isHot ? 'text-amber-400' : 'text-cyan-200';
  const glowColor = isHot ? '239, 68, 68' : '56, 189, 248'; 

  return (
    <div className="flex flex-col items-center h-full w-full relative group justify-center">
      
      {/* 1. 頂部標籤 */}
      <div className="mb-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase z-30">
        {label}
      </div>

      {/* 2. 數值顯示 */}
      <div className={`mb-3 font-mono font-black text-xl leading-none tracking-tighter transition-all duration-500 z-30 ${textColor} ${Math.abs(delta) > 20 ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' : ''}`}>
         {value}
      </div>

      {/* 3. 玻璃管容器 */}
      <div className="relative flex-1 w-8 sm:w-10 rounded-full overflow-hidden backdrop-blur-sm"
           style={{
               background: 'rgba(15, 23, 42, 0.5)',
               border: '1px solid rgba(255, 255, 255, 0.15)',
               boxShadow: 'inset 3px 0 6px rgba(0,0,0,0.8), inset -3px 0 6px rgba(0,0,0,0.8)'
           }}
      >
        
        {/* 玻璃管高光 */}
        <div className="absolute top-2 left-[20%] w-[10%] h-[95%] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full blur-[0.5px] z-50 pointer-events-none" />

        {/* 背景刻度 */}
        <div className="absolute inset-0 flex flex-col justify-between py-6 opacity-20 pointer-events-none z-0">
             {[...Array(11)].map((_, i) => (
                <div key={i} className={`w-full h-[1px] ${i===5 ? 'bg-transparent' : 'bg-slate-400'}`} />
             ))}
        </div>

        {/* 4. 螢光綠基準線 */}
        <div className="absolute top-1/2 left-0 w-full z-40 flex items-center justify-center pointer-events-none">
            <div className="w-full h-[1px] bg-[#4ade80] shadow-[0_0_4px_#4ade80]" />
        </div>

        {/* 5. 液體柱 (對稱邏輯) */}
        <motion.div
            initial={{ height: '10%' }}
            animate={{ height: `${heightPercent}%` }}
            transition={{ 
                type: "spring", stiffness: 50, damping: 15, 
                delay: 0.1 + (index * 0.1), duration: 2 
            }}
            className="absolute left-0 w-full z-10"
            style={{
                background: isHot ? hotGradient : coldGradient,
                
                // [關鍵對稱]：熱貼底，冷貼頂
                bottom: isHot ? '50%' : 'auto',
                top: isHot ? 'auto' : '50%',
                
                // 允許波浪溢出
                overflow: 'visible',
                borderRadius: '0', // 保持平直，由波浪負責修飾末端

                boxShadow: `inset 0 0 10px rgba(0,0,0,0.4), 0 0 15px rgba(${glowColor}, 0.5)`
            }}
        >
            {/* A. 液面波浪 (熱在頂，冷在底，統一使用 OrganicWave) */}
            <OrganicWave 
                color={isHot ? '#f59e0b' : '#38bdf8'} 
                index={index} 
                position={isHot ? 'top' : 'bottom'} 
            />

            {/* B. 氣泡特效 (兩者都有，只是顏色不同) */}
            <Bubbles index={index} />
            
            {/* C. 液體內部微高光 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30 pointer-events-none" style={{ zIndex: 10 }} />
        </motion.div>
      
      </div>
    </div>
  );
};

// --- 波浪組件 (通用版) ---
const OrganicWave = ({ color, index, position }: { color: string, index: number, position: 'top' | 'bottom' }) => {
    const duration1 = 3 + (index % 2); 
    const duration2 = 4.5 + (index % 3);
    const isTop = position === 'top';

    return (
        <div 
            className="absolute left-0 w-full overflow-hidden"
            style={{
                height: '20px',
                // 如果是 top (熱)，向上偏移蓋住頂部
                // 如果是 bottom (冷)，向下偏移蓋住底部
                top: isTop ? -18 : 'auto',
                bottom: !isTop ? -18 : 'auto',
                zIndex: 20,
                // 冷波浪旋轉 180 度，讓弧形向下
                transform: isTop ? 'rotate(0deg)' : 'rotate(180deg)',
                opacity: 0.95
            }}
        >
            <motion.div
                className="absolute top-0 left-0 w-[200%] h-full"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: duration1, repeat: Infinity, ease: "linear" }}
            >
                <svg viewBox="0 0 200 20" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M0,20 V5 C40,0 60,8 100,5 C140,2 160,8 200,5 V20 Z" fill={color} opacity="0.8" />
                </svg>
            </motion.div>

            <motion.div
                className="absolute top-0 left-0 w-[200%] h-full"
                style={{ left: '-25%' }} 
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: duration2, repeat: Infinity, ease: "linear" }}
            >
                <svg viewBox="0 0 200 20" className="w-full h-full" preserveAspectRatio="none">
                    <path d="M0,20 V6 C30,9 70,2 100,6 C130,10 170,3 200,6 V20 Z" fill={color} opacity="0.5" />
                </svg>
            </motion.div>
        </div>
    );
};

// --- 氣泡特效 (通用版) ---
// 統一讓氣泡「向上飄」，這符合物理（氣泡比液體輕）
// 即使是向下的冷管，氣泡往上飄（往基準線飄）在視覺上也是合理的能量流動
const Bubbles = ({ index }: { index: number }) => {
    // 每個管子氣泡數量稍微隨機
    const count = 4 + (index % 3); 
    const bubbles = Array.from({ length: count });

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 15 }}>
            {bubbles.map((_, i) => (
                <motion.div 
                    key={i}
                    className="absolute rounded-full bg-white/70 shadow-[0_0_2px_rgba(255,255,255,0.8)]"
                    style={{
                        width: Math.random() * 3 + 2 + 'px',
                        height: Math.random() * 3 + 2 + 'px',
                        left: Math.random() * 70 + 15 + '%', 
                    }}
                    // 永遠從底部往上飄 (bottom 0 -> 120%)
                    // 對於熱管：從基準線飄向液面
                    // 對於冷管：從液面飄向基準線 (看起來像能量回流，視覺上很協調)
                    initial={{ bottom: '-10%', x: 0, opacity: 0 }}
                    animate={{ 
                        bottom: '120%', 
                        x: [0, Math.random() * 6 - 3, 0], 
                        opacity: [0, 1, 0] 
                    }}
                    transition={{ 
                        duration: Math.random() * 2 + 2, 
                        repeat: Infinity, 
                        ease: "linear",
                        delay: Math.random() * 3 
                    }}
                />
            ))}
        </div>
    );
};