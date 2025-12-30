import React from 'react';
import { type Palace, type Star, type SiHuaType } from '../logic/types';
import { GAN, ZHI, STAR_ABBR_MAP, PALACE_REVERSE_MAP } from '../logic/constants';

interface PalaceCardProps {
  palace: Palace;
  daName?: string;
  liuName?: string;
  xiaoName?: string;
  isBody?: boolean;
  isXiaoXianMing?: boolean;

  isBenMingMing?: boolean;
  isDaXianMing?: boolean;
  isLiuNianMing?: boolean;
  isXiaoXianMingPalace?: boolean;

  onTriggerClick?: () => void;
  flyingStars?: Record<string, SiHuaType>;
  
  isTwinMode?: boolean; 
  isReverse?: boolean;
  
  reverseDaName?: string;
  reverseLiuName?: string;
  
  divinationName?: string;

  // 新增: 接收外來四化
  externalSiHua?: Record<string, '祿' | '權' | '科' | '忌'>;
}

export const PalaceCard: React.FC<PalaceCardProps> = ({
  palace,
  daName,
  liuName,
  xiaoName,
  isBody,
  isXiaoXianMing,
  isBenMingMing,
  isDaXianMing,
  isLiuNianMing,
  isXiaoXianMingPalace,
  onTriggerClick,
  flyingStars,
  isTwinMode,
  isReverse,
  reverseDaName,
  reverseLiuName,
  divinationName, 
  externalSiHua,
}) => {
  const palaceGanZhi = `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`;
  const isBenMing = !daName && !liuName && !xiaoName;

  // --- 計算外來四化影響 ---
  let hasExternalLu = false;
  let hasExternalJi = false;
  
  if (externalSiHua) {
      [...palace.majorStars, ...palace.minorStars, ...palace.miscStars].forEach(star => {
          const type = externalSiHua[star.name];
          if (type === '祿') hasExternalLu = true;
          if (type === '忌') hasExternalJi = true;
      });
  }

  // 背景色判斷優先順序：外來化忌 > 外來化祿 > 流年 > 預設
  let bgColorClass = '';
  if (hasExternalJi) {
      bgColorClass = 'bg-gray-200 ring-inset ring-2 ring-gray-400'; // 化忌
  } else if (hasExternalLu) {
      bgColorClass = 'bg-red-50 ring-inset ring-2 ring-pink-300'; // 化祿
  } else if (isLiuNianMing) {
      bgColorClass = 'bg-blue-50';
  }

  const borderClass = isBenMingMing ? 'border-2 border-red-600' : '';
  const xiaoXianClass = isXiaoXianMingPalace
    ? 'shadow-[inset_0_0_15px_rgba(34,197,94,0.6)] border-green-400'
    : '';

  const allStarsInPalace = [
    ...palace.majorStars,
    ...palace.minorStars,
    ...palace.miscStars,
    ...palace.limitStars,
  ];

  let baseName = palace.name;
  if (divinationName) {
      baseName = divinationName;
  } else if (isTwinMode) {
      baseName = PALACE_REVERSE_MAP[palace.name];
  }

  const reverseBaseName = isReverse ? PALACE_REVERSE_MAP[baseName] : null;

  // [修改點] 整合宮干飛化與外來生年飛化
  const renderFlyingChips = () => {
    const chips: React.ReactNode[] = [];
    
    allStarsInPalace.forEach((star, idx) => {
      // 1. 宮干飛化 (原本的邏輯)
      if (flyingStars) {
          const type = flyingStars[star.name];
          if (type) {
            const abbr = STAR_ABBR_MAP[star.name] || star.name[0];
            let colorClass = '';
            if (type === '祿') colorClass = 'bg-green-600 text-white';
            else if (type === '權') colorClass = 'bg-red-600 text-white';
            else if (type === '科') colorClass = 'bg-blue-600 text-white';
            else if (type === '忌') colorClass = 'bg-gray-900 text-white border border-red-500';

            chips.push(
              <div key={`fly-${idx}`} className={`px-1 py-[1px] rounded text-[12px] font-bold leading-none shadow-sm animate-pulse ${colorClass} select-none`} style={{ animationIterationCount: 3 }}>
                {abbr}{type}
              </div>
            );
          }
      }

      // 2. 外來生年飛化 (新增的邏輯)
      if (externalSiHua) {
          const extType = externalSiHua[star.name];
          if (extType) {
             const abbr = STAR_ABBR_MAP[star.name] || star.name[0];
             // 使用紫色系區隔，代表「外來/生年」
             // 祿: 紫紅, 權: 紫橘, 科: 紫藍, 忌: 深紫
             let colorClass = ''; 
             let label = '';

             // 這裡您可以決定顯示 "飛祿" 或 "生祿" 或 "乙祿"
             // 為了版面整潔，建議顯示 "飛+化" (例如: 飛祿)
             if (extType === '祿') { colorClass = 'bg-fuchsia-600 text-white'; label = '飛祿'; }
             else if (extType === '權') { colorClass = 'bg-orange-600 text-white'; label = '飛權'; }
             else if (extType === '科') { colorClass = 'bg-indigo-500 text-white'; label = '飛科'; }
             else if (extType === '忌') { colorClass = 'bg-slate-800 text-white border border-fuchsia-400'; label = '飛忌'; }

             chips.push(
                <div key={`ext-${idx}`} className={`px-1 py-[1px] rounded text-[11px] font-bold leading-none shadow-md ${colorClass} select-none border border-white/20`}>
                   {abbr}{extType} {/* 顯示範例: 機祿 (天機化祿) */}
                </div>
             );
          }
      }
    });

    if (chips.length === 0) return null;
    // 使用 flex-col gap-0.5 讓多個名牌垂直堆疊，避免擋住太多橫向空間
    return <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 items-end z-30 pointer-events-none">{chips}</div>;
  };

  return (
    <div
      className={`w-full h-full flex flex-col p-0.5 box-border relative overflow-hidden ${bgColorClass} ${borderClass} ${xiaoXianClass} transition-colors duration-300`}
    >
      {renderFlyingChips()}

      <div className="flex-1 flex flex-row gap-0.5 relative z-10 min-h-0 items-start content-start overflow-hidden pointer-events-none">
        {palace.majorStars.map((star, idx) => (
          <VerticalStar
            key={`maj-${idx}`}
            star={star}
            color="text-red-700"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            // 移除 externalType 傳遞
          />
        ))}

        {palace.minorStars.map((star, idx) => (
          <VerticalStar
            key={`min-${idx}`}
            star={star}
            color="text-black"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            // 移除 externalType 傳遞
          />
        ))}

        {palace.miscStars.map((star, idx) => (
          <VerticalStar
            key={`mic-${idx}`}
            star={star}
            color="text-blue-600"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            // 移除 externalType 傳遞
          />
        ))}

        {palace.limitStars.map((star, idx) => (
          <VerticalStar
            key={`lim-${idx}`}
            star={star}
            color="text-black"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            // 移除 externalType 傳遞
          />
        ))}
      </div>

      <div className="absolute right-1 top-[35%] flex flex-col gap-1 items-end pointer-events-none z-20">
        {isBody && isBenMing && <div className="w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-[2px] shadow-sm">身</div>}
        {isXiaoXianMing && <div className="w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-[2px] shadow-sm">限</div>}
      </div>

      <div className="mt-auto flex justify-between items-end z-10 shrink-0 w-full relative pointer-events-none">
        <div className="flex flex-col gap-0 leading-none pb-[1px]">
          <span className="text-[9px] text-blue-500 scale-95 origin-bottom-left whitespace-nowrap">{palace.sui12}</span>
          <span className="text-[9px] text-blue-500 scale-95 origin-bottom-left whitespace-nowrap">{palace.jiang12}</span>
          <div className="flex items-end gap-1">
            <span className="text-[9px] text-gray-500 scale-95 origin-bottom-left whitespace-nowrap">{palace.boshi12}</span>
            <span className="text-[9px] text-gray-400 scale-95 origin-bottom-left whitespace-nowrap leading-none font-medium ml-0.5">{palace.changsheng12}</span>
            {isBenMing && <span className="text-[9px] text-black scale-95 origin-bottom-left whitespace-nowrap font-medium ml-0.5">{palace.ages[0]}-{palace.ages[1]}</span>}
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 h-[50%] min-w-[30%] flex items-end justify-end gap-1 p-1 rounded-tl-lg cursor-pointer hover:bg-purple-100/50 transition-colors select-none group z-30"
        onClick={(e) => { e.stopPropagation(); onTriggerClick && onTriggerClick(); }}
        title="點擊查看此宮位之飛化 (四化)"
      >
        <div className="flex flex-col-reverse items-end leading-tight pointer-events-none">
          <div className="flex items-center justify-end gap-1 group-hover:scale-105 transition-transform origin-bottom-right">
              {reverseBaseName && <span className="text-[13px] font-bold text-purple-600 whitespace-nowrap leading-none">{reverseBaseName}</span>}
              <span className="text-[13px] font-bold text-red-600 whitespace-nowrap leading-none">{baseName}</span>
          </div>
          {daName && <div className="flex items-center justify-end gap-1 group-hover:scale-105 transition-transform origin-bottom-right">{isReverse && reverseDaName && <span className="text-[13px] font-bold text-purple-600 whitespace-nowrap leading-none mb-[1px]">{reverseDaName}</span>}<span className="text-[13px] font-bold text-gray-500 whitespace-nowrap leading-none mb-[1px]">{daName}</span></div>}
          {liuName && <div className="flex items-center justify-end gap-1 group-hover:scale-105 transition-transform origin-bottom-right">{isReverse && reverseLiuName && <span className="text-[13px] font-bold text-purple-600 whitespace-nowrap leading-none mb-[1px]">{reverseLiuName}</span>}<span className="text-[13px] font-bold text-blue-600 whitespace-nowrap leading-none mb-[1px]">{liuName}</span></div>}
          {xiaoName && <span className="text-[13px] font-bold text-green-600 whitespace-nowrap leading-none mb-[1px]">{xiaoName}</span>}
        </div>
        <div className="flex flex-col leading-none text-[15px] font-bold text-black mb-[2px] ml-1 pointer-events-none">
          <span className="group-hover:text-purple-600 transition-colors">{palaceGanZhi[0]}</span>
          <span>{palaceGanZhi[1]}</span>
        </div>
      </div>
    </div>
  );
};

// [修改點] 移除 externalType 參數
const VerticalStar = ({
  star,
  color,
  bgSiHua,
}: {
  star: Star;
  color: string;
  bgSiHua: any;
}) => {
  return (
    <div className="flex flex-col items-center w-[18px] mr-[1px] relative">
      <span className={`text-[13px] font-bold ${color} leading-[0.9] select-none`}>{star.name[0]}</span>
      <span className={`text-[13px] font-bold ${color} leading-[0.9] select-none`}>{star.name[1]}</span>
      <span className="text-[10px] text-gray-400 font-normal leading-none scale-90 origin-center my-0">{star.brightness || ''}</span>

      <div className="flex flex-col gap-0 w-full items-center mt-0">
        <SiHuaSlot star={star} scope="ben" bg={bgSiHua.ben} />
        <SiHuaSlot star={star} scope="da" bg={bgSiHua.da} />
        <SiHuaSlot star={star} scope="liu" bg={bgSiHua.liu} />
        <SiHuaSlot star={star} scope="xiao" bg={bgSiHua.xiao} />
        
        {/* 已移除底部的外來四化文字 */}
      </div>
    </div>
  );
};

const SiHuaSlot = ({ star, scope, bg }: { star: Star; scope: 'ben' | 'da' | 'liu' | 'xiao'; bg: string; }) => {
  const sihua = star.sihua?.find((s) => s.scope === scope);
  if (sihua) {
    return <div className={`w-3.5 h-3.5 flex items-center justify-center text-[11px] text-white rounded-[1px] leading-none shadow-sm ${bg} mb-[1px]`}>{sihua.type}</div>;
  }
  return <div className="w-3.5 h-3.5 mb-[1px]" />;
};