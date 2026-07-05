// FILE: src/components/PalaceCard.tsx
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
  
  reverseFlags?: {
      ben?: boolean;
      da: boolean;
      liu: boolean;
      yue: boolean;
      ri: boolean;
  };
  
  showCompass?: boolean;

  divinationName?: string;

  externalSiHua?: Record<string, '祿' | '權' | '科' | '忌'>;
  divinationSiHua?: Record<string, '祿' | '權' | '科' | '忌'>;
}

const COMPASS_MAP = [
  '正北',   // 子 (0)
  '北北東', // 丑 (1)
  '東東北', // 寅 (2)
  '正東',   // 卯 (3)
  '東東南', // 辰 (4)
  '南南東', // 巳 (5)
  '正南',   // 午 (6)
  '南南西', // 未 (7)
  '西西南', // 申 (8)
  '正西',   // 酉 (9)
  '西西北', // 戌 (10)
  '北北西'  // 亥 (11)
];

// 輔助函式：取得顛倒宮位名稱
const getReversedName = (name: string): string | null => {
    if (!name) return null;
    
    // [修正] 1. 如果是本命盤的完整名稱 (存在於對照表中)，直接回傳完整的顛倒名稱，不要硬切
    if (PALACE_REVERSE_MAP[name]) {
        return PALACE_REVERSE_MAP[name];
    }
    
    // 2. 否則是短名稱 (如 大命、流夫 等)，才用字尾推算
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
  reverseFlags, 
  showCompass,
  divinationName, 
  externalSiHua,
  divinationSiHua
}) => {
  const palaceGanZhi = `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`;
  const isBenMing = !daName && !liuName && !xiaoName;

  let hasExternalLu = false;
  let hasExternalJi = false;
  
  if (externalSiHua) {
      [...palace.majorStars, ...palace.minorStars, ...palace.miscStars].forEach(star => {
          const type = externalSiHua[star.name];
          if (type === '祿') hasExternalLu = true;
          if (type === '忌') hasExternalJi = true;
      });
  }

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

  let baseName = palace.name;
  if (divinationName) {
      baseName = divinationName;
  } else if (isTwinMode) {
      baseName = PALACE_REVERSE_MAP[palace.name];
  }

  const renderExternalChips = () => {
    if (!externalSiHua) return null;
    const chips: React.ReactNode[] = [];

    allStarsInPalace.forEach((star, idx) => {
      const extType = externalSiHua[star.name];
      if (extType) {
          const abbr = STAR_ABBR_MAP[star.name] || star.name[0];
          let colorClass = ''; 
          if (extType === '祿') { colorClass = 'bg-green-600 text-white'; }
          else if (extType === '權') { colorClass = 'bg-red-600 text-white'; }
          else if (extType === '科') { colorClass = 'bg-blue-600 text-white'; }
          else if (extType === '忌') { colorClass = 'bg-gray-900 text-white border border-red-500'; }
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

  const renderLabel = (name: string, colorClass: string, targetLayer: 'ben' | 'da' | 'liu' | 'yue' | 'ri') => {
      let isReversed = false;
      if (reverseFlags) {
          if (targetLayer === 'ben') isReversed = reverseFlags.ben || false;
          if (targetLayer === 'da') isReversed = reverseFlags.da;
          if (targetLayer === 'liu') isReversed = reverseFlags.liu;
          if (targetLayer === 'yue') isReversed = reverseFlags.yue;
          if (targetLayer === 'ri') isReversed = reverseFlags.ri;
      } else {
          isReversed = isReverse || false; 
      }

      const reversedName = isReversed ? getReversedName(name) : null;

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

      {showCompass && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none select-none">
              <span className="text-xs font-bold text-amber-700 bg-amber-50/80 px-2 py-1 rounded-full border border-amber-200 shadow-sm backdrop-blur-[1px] whitespace-nowrap">
                  {COMPASS_MAP[palace.zhiIndex]}
              </span>
          </div>
      )}

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
        <div className="flex flex-col-reverse items-end leading-tight pointer-events-none">
          
          {renderLabel(baseName, 'text-red-600', 'ben')}
          {daName && renderLabel(daName, 'text-gray-500', 'da')}
          {liuName && renderLabel(liuName, 'text-blue-600', 'liu')}
          {yueName && renderLabel(yueName, 'text-amber-600', 'yue')}
          {riName && renderLabel(riName, 'text-green-700', 'ri')}

          {xiaoName && (
              <span className="text-[13px] font-bold text-green-600 whitespace-nowrap leading-none mb-[1px] pr-0.5">
                  {xiaoName}
              </span>
          )}
        
        </div>
        
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
    <div className="flex flex-col items-center w-[20px] mr-[1px] relative">
      <span className={`text-[15px] font-bold ${color} leading-[0.9] select-none`}>{star.name[0]}</span>
      <span className={`text-[15px] font-bold ${color} leading-[0.9] select-none`}>{star.name[1]}</span>
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
