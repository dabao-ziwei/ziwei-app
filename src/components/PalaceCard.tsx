import React from 'react';
import { type Palace, type Star, type SiHuaType } from '../logic/types';
import { GAN, ZHI, STAR_ABBR_MAP, PALACE_REVERSE_MAP } from '../logic/constants';

interface PalaceCardProps {
  palace: Palace;
  daName?: string;
  liuName?: string;
  xiaoName?: string;
  yueName?: string;
  riName?: string;

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
  
  divinationName?: string;

  externalSiHua?: Record<string, '祿' | '權' | '科' | '忌'>;
  divinationSiHua?: Record<string, '祿' | '權' | '科' | '忌'>;
}

// 輔助函式：取得顛倒宮位名稱
const getReversedName = (name: string): string | null => {
    if (!name) return null;
    const lastChar = name.slice(-1);
    const fullKey = Object.keys(PALACE_REVERSE_MAP).find(k => k.includes(lastChar));
    if (!fullKey) return null;
    const reversedFull = PALACE_REVERSE_MAP[fullKey];
    const reversedSuffix = reversedFull.substring(0, 1);
    const prefix = name.substring(0, name.length - 1);
    return `${prefix}${reversedSuffix}`;
};

export const PalaceCard: React.FC<PalaceCardProps> = ({
  palace,
  daName,
  liuName,
  xiaoName,
  yueName,
  riName,
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
  divinationName, 
  externalSiHua,
  divinationSiHua
}) => {
  const palaceGanZhi = `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`;
  const isBenMing = !daName && !liuName && !xiaoName;

  // --- 判斷當前最高層級 (Active Layer) ---
  // [修改] 擴充判斷：加入流月(yue)與流日(ri)
  let activeLayer: 'ben' | 'da' | 'liu' | 'yue' | 'ri' = 'ben';
  if (riName) activeLayer = 'ri';
  else if (yueName) activeLayer = 'yue';
  else if (liuName) activeLayer = 'liu';
  else if (daName) activeLayer = 'da';
  else activeLayer = 'ben';

  let hasExternalLu = false;
  let hasExternalJi = false;
  
  if (externalSiHua) {
      [...palace.majorStars, ...palace.minorStars, ...palace.miscStars].forEach(star => {
          const type = externalSiHua[star.name];
          if (type === '祿') hasExternalLu = true;
          if (type === '忌') hasExternalJi = true;
      });
  }

  // 視覺分流：邊框圖層 (Border Layer)
  let siHuaBorderClass = '';
  if (hasExternalJi) {
      siHuaBorderClass = 'ring-inset ring-2 ring-gray-600'; 
  } else if (hasExternalLu) {
      siHuaBorderClass = 'ring-inset ring-2 ring-red-400'; 
  }

  const allStarsInPalace = [
    ...palace.majorStars,
    ...palace.minorStars,
    ...palace.miscStars,
    ...palace.limitStars,
  ];

  // 基礎宮位名稱 (本命或占卜)
  let baseName = palace.name;
  if (divinationName) {
      baseName = divinationName;
  } else if (isTwinMode) {
      baseName = PALACE_REVERSE_MAP[palace.name];
  }

  // 渲染外部飛化 Chips
  const renderExternalChips = () => {
    if (!externalSiHua) return null;
    const chips: React.ReactNode[] = [];

    allStarsInPalace.forEach((star, idx) => {
      const extType = externalSiHua[star.name];
      if (extType) {
          const abbr = STAR_ABBR_MAP[star.name] || star.name[0];
          let colorClass = ''; 
          if (extType === '祿') { colorClass = 'bg-fuchsia-600 text-white'; }
          else if (extType === '權') { colorClass = 'bg-orange-600 text-white'; }
          else if (extType === '科') { colorClass = 'bg-indigo-500 text-white'; }
          else if (extType === '忌') { colorClass = 'bg-slate-800 text-white border border-fuchsia-400'; }

          chips.push(
            <div key={`ext-${idx}`} className={`px-1 py-[1px] rounded text-[11px] font-bold leading-none shadow-md ${colorClass} select-none border border-white/20`}>
                {abbr}{extType}
            </div>
          );
      }
    });

    if (chips.length === 0) return null;
    return <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 items-end z-30 pointer-events-none">{chips}</div>;
  };

  // 渲染互動飛化 Chips
  const renderInteractiveFlyingStars = () => {
    if (!flyingStars) return null;
    const chips: React.ReactNode[] = [];

    allStarsInPalace.forEach((star, idx) => {
        const type = flyingStars[star.name];
        if (type) {
          const abbr = STAR_ABBR_MAP[star.name] || star.name[0];
          let colorClass = '';
          if (type === '祿') colorClass = 'bg-green-600 text-white shadow-green-200';
          else if (type === '權') colorClass = 'bg-red-600 text-white shadow-red-200';
          else if (type === '科') colorClass = 'bg-blue-600 text-white shadow-blue-200';
          else if (type === '忌') colorClass = 'bg-gray-900 text-white border border-red-500 shadow-gray-400';

          chips.push(
            <div key={`fly-${idx}`} className={`flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold leading-none shadow-md animate-in zoom-in duration-200 border border-white ring-1 ring-black/5 ${colorClass} select-none`}>
              <span>{abbr}</span>
              <span className="ml-0.5 text-[9px] opacity-90">{type}</span>
            </div>
          );
        }
    });

    if (chips.length === 0) return null;
    return (
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-50 pointer-events-none filter drop-shadow-sm">
        {chips}
      </div>
    );
  };

  // 通用標籤渲染函式 (含顛倒盤邏輯)
  const renderLabel = (name: string, colorClass: string, targetLayer: 'ben' | 'da' | 'liu' | 'yue' | 'ri') => {
      // 邏輯核心：只有當 "開啟顛倒盤" 且 "目標層級等於當前最高層級" 時，才顯示顛倒名稱
      const shouldReverse = isReverse && activeLayer === targetLayer;
      const reversedName = shouldReverse ? getReversedName(name) : null;

      return (
        <div className="flex items-center justify-end gap-1 group-hover:scale-105 transition-transform origin-bottom-right pr-0.5">
            {reversedName && (
                <span className="text-[13px] font-bold text-purple-600 whitespace-nowrap leading-none mb-[1px]">
                    {reversedName}
                </span>
            )}
            <span className={`text-[13px] font-bold ${colorClass} whitespace-nowrap leading-none mb-[1px]`}>
                {name}
            </span>
        </div>
      );
  };

  return (
    <div
      className={`w-full h-full flex flex-col p-0.5 box-border relative overflow-visible ${siHuaBorderClass} transition-colors duration-300`}
    >
      {renderExternalChips()}
      {renderInteractiveFlyingStars()}

      <div className="flex-1 flex flex-row gap-0.5 relative z-10 min-h-0 items-start content-start overflow-hidden pointer-events-none">
        {palace.majorStars.map((star, idx) => (
          <VerticalStar
            key={`maj-${idx}`}
            star={star}
            color="text-red-700"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            divinationSiHua={divinationSiHua}
          />
        ))}

        {palace.minorStars.map((star, idx) => (
          <VerticalStar
            key={`min-${idx}`}
            star={star}
            color="text-black"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            divinationSiHua={divinationSiHua}
          />
        ))}

        {palace.miscStars.map((star, idx) => (
          <VerticalStar
            key={`mic-${idx}`}
            star={star}
            color="text-blue-600"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            divinationSiHua={divinationSiHua}
          />
        ))}

        {palace.limitStars.map((star, idx) => (
          <VerticalStar
            key={`lim-${idx}`}
            star={star}
            color="text-black"
            bgSiHua={{ ben: 'bg-red-600', da: 'bg-gray-500', liu: 'bg-blue-500', xiao: 'bg-green-600' }}
            divinationSiHua={divinationSiHua}
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
        className="absolute bottom-0 right-0 h-[70%] min-w-[30%] flex items-end justify-end gap-1 p-1 rounded-tl-lg cursor-pointer hover:bg-purple-100/50 transition-colors select-none group z-30"
        onClick={(e) => { e.stopPropagation(); onTriggerClick && onTriggerClick(); }}
        title="點擊查看此宮位之飛化 (四化)"
      >
        {/* 宮位名稱堆疊區 (Stacking) 
            使用 flex-col-reverse，第一個 child 在最下面
            順序：本命(底) -> 大限 -> 流年 -> 流月 -> 流日 -> 小限(頂)
        */}
        <div className="flex flex-col-reverse items-end leading-tight pointer-events-none">
          
          {/* 1. 本命 (最底層) */}
          {renderLabel(baseName, 'text-red-600', 'ben')}
          
          {/* 2. 大限 */}
          {daName && renderLabel(daName, 'text-gray-500', 'da')}
          
          {/* 3. 流年 */}
          {liuName && renderLabel(liuName, 'text-blue-600', 'liu')}
          
          {/* 4. 流月 (加入顛倒功能) */}
          {yueName && (
             <div className="flex items-center justify-end gap-1 mb-[1px] origin-bottom-right">
                {(isReverse && activeLayer === 'yue') && (
                    <span className="text-[13px] font-bold text-purple-600 whitespace-nowrap leading-none bg-white/90 px-0.5 rounded shadow-sm border border-purple-200">
                        {getReversedName(yueName)}
                    </span>
                )}
                <span className="text-[13px] font-bold text-amber-600 whitespace-nowrap leading-none bg-white/80 px-0.5 rounded shadow-sm border border-amber-100">
                    {yueName}
                </span>
             </div>
          )}

          {/* 5. 流日 (加入顛倒功能) */}
          {riName && (
             <div className="flex items-center justify-end gap-1 mb-[1px] origin-bottom-right">
                {(isReverse && activeLayer === 'ri') && (
                    <span className="text-[13px] font-bold text-purple-600 whitespace-nowrap leading-none bg-white/90 px-0.5 rounded shadow-sm border border-purple-200">
                        {getReversedName(riName)}
                    </span>
                )}
                <span className="text-[13px] font-bold text-green-700 whitespace-nowrap leading-none bg-white/80 px-0.5 rounded shadow-sm border border-green-100">
                    {riName}
                </span>
             </div>
          )}

          {/* 6. 小限 (最頂層，無顛倒功能) */}
          {xiaoName && (
              <span className="text-[13px] font-bold text-green-600 whitespace-nowrap leading-none mb-[1px] pr-0.5">
                  {xiaoName}
              </span>
          )}
        
        </div>
        
        {/* 天干地支 (顯示在最右下角) */}
        <div className="flex flex-col leading-none text-[15px] font-bold text-black mb-[2px] ml-1 pointer-events-none">
          <span className="group-hover:text-purple-600 transition-colors">{palaceGanZhi[0]}</span>
          <span>{palaceGanZhi[1]}</span>
        </div>
      </div>
    </div>
  );
};

const VerticalStar = ({
  star,
  color,
  bgSiHua,
  divinationSiHua, 
}: {
  star: Star;
  color: string;
  bgSiHua: any;
  divinationSiHua?: any;
}) => {
  return (
    <div className="flex flex-col items-center w-[18px] mr-[1px] relative">
      <span className={`text-[13px] font-bold ${color} leading-[0.9] select-none`}>{star.name[0]}</span>
      <span className={`text-[13px] font-bold ${color} leading-[0.9] select-none`}>{star.name[1]}</span>
      <span className="text-[10px] text-gray-400 font-normal leading-none scale-90 origin-center my-0">{star.brightness || ''}</span>

      <div className="flex flex-col gap-0 w-full items-center mt-0">
        <SiHuaSlot star={star} scope="ben" bg={bgSiHua.ben} overrideType={divinationSiHua?.[star.name]} />
        <SiHuaSlot star={star} scope="da" bg={bgSiHua.da} />
        <SiHuaSlot star={star} scope="liu" bg={bgSiHua.liu} />
        <SiHuaSlot star={star} scope="xiao" bg={bgSiHua.xiao} />
      </div>
    </div>
  );
};

const SiHuaSlot = ({ star, scope, bg, overrideType }: { star: Star; scope: 'ben' | 'da' | 'liu' | 'xiao'; bg: string; overrideType?: string }) => {
  if (scope === 'ben' && overrideType) {
      return <div className={`w-3.5 h-3.5 flex items-center justify-center text-[11px] text-white rounded-[1px] leading-none shadow-sm ${bg} mb-[1px]`}>{overrideType}</div>;
  }

  const sihua = star.sihua?.find((s) => s.scope === scope);
  if (sihua) {
    return <div className={`w-3.5 h-3.5 flex items-center justify-center text-[11px] text-white rounded-[1px] leading-none shadow-sm ${bg} mb-[1px]`}>{sihua.type}</div>;
  }
  return <div className="w-3.5 h-3.5 mb-[1px]" />;
};