import React from 'react';
import { type Palace, type Star, type SiHuaType } from '../logic/types';
import { GAN, ZHI, STAR_ABBR_MAP } from '../logic/constants';

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
}) => {
  const palaceGanZhi = `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`;
  const isBenMing = !daName && !liuName && !xiaoName;

  const bgColorClass = isLiuNianMing ? 'bg-blue-50' : '';
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

  // 飛化標籤 (Chips)
  const renderFlyingChips = () => {
    if (!flyingStars) return null;

    const chips: React.ReactNode[] = [];

    allStarsInPalace.forEach((star, idx) => {
      const type = flyingStars[star.name];
      if (type) {
        const abbr = STAR_ABBR_MAP[star.name] || star.name[0];

        let colorClass = '';
        if (type === '祿') colorClass = 'bg-green-600 text-white';
        else if (type === '權') colorClass = 'bg-red-600 text-white';
        else if (type === '科') colorClass = 'bg-blue-600 text-white';
        else if (type === '忌')
          colorClass = 'bg-gray-900 text-white border border-red-500';

        chips.push(
          <div
            key={`fly-${idx}`}
            className={`px-1 py-[1px] rounded text-[12px] font-bold leading-none shadow-sm animate-pulse ${colorClass} select-none`}
            style={{ animationIterationCount: 3 }}
          >
            {abbr}
            {type}
          </div>
        );
      }
    });

    if (chips.length === 0) return null;

    return (
      <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 items-end z-30 pointer-events-none">
        {chips}
      </div>
    );
  };

  return (
    <div
      className={`w-full h-full flex flex-col p-0.5 box-border relative overflow-hidden ${bgColorClass} ${borderClass} ${xiaoXianClass}`}
    >
      {/* 飛化標籤層 (右上角) */}
      {renderFlyingChips()}

      <div className="flex-1 flex flex-row gap-0.5 relative z-10 min-h-0 items-start content-start overflow-hidden pointer-events-none">
        {palace.majorStars.map((star, idx) => (
          <VerticalStar
            key={`maj-${idx}`}
            star={star}
            color="text-red-700"
            bgSiHua={{
              ben: 'bg-red-600',
              da: 'bg-gray-500',
              liu: 'bg-blue-500',
              xiao: 'bg-green-600',
            }}
          />
        ))}

        {palace.minorStars.map((star, idx) => (
          <VerticalStar
            key={`min-${idx}`}
            star={star}
            color="text-black"
            bgSiHua={{
              ben: 'bg-red-600',
              da: 'bg-gray-500',
              liu: 'bg-blue-500',
              xiao: 'bg-green-600',
            }}
          />
        ))}

        {palace.miscStars.map((star, idx) => (
          <VerticalStar
            key={`mic-${idx}`}
            star={star}
            color="text-blue-600"
            bgSiHua={{
              ben: 'bg-red-600',
              da: 'bg-gray-500',
              liu: 'bg-blue-500',
              xiao: 'bg-green-600',
            }}
          />
        ))}

        {palace.limitStars.map((star, idx) => (
          <VerticalStar
            key={`lim-${idx}`}
            star={star}
            color="text-black"
            bgSiHua={{
              ben: 'bg-red-600',
              da: 'bg-gray-500',
              liu: 'bg-blue-500',
              xiao: 'bg-green-600',
            }}
          />
        ))}
      </div>

      <div className="absolute right-1 top-[35%] flex flex-col gap-1 items-end pointer-events-none z-20">
        {isBody && isBenMing && (
          <div className="w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-[2px] shadow-sm">
            身
          </div>
        )}

        {isXiaoXianMing && (
          <div className="w-4 h-4 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-[2px] shadow-sm">
            限
          </div>
        )}
      </div>

      {/* 底部資訊區 (左側神煞) */}
      <div className="mt-auto flex justify-between items-end z-10 shrink-0 w-full relative pointer-events-none">
        <div className="flex flex-col gap-0 leading-none pb-[1px]">
          <span className="text-[9px] text-blue-500 scale-95 origin-bottom-left whitespace-nowrap">
            {palace.sui12}
          </span>
          <span className="text-[9px] text-blue-500 scale-95 origin-bottom-left whitespace-nowrap">
            {palace.jiang12}
          </span>
          <div className="flex items-end gap-1">
            <span className="text-[9px] text-gray-500 scale-95 origin-bottom-left whitespace-nowrap">
              {palace.boshi12}
            </span>

            <span className="text-[9px] text-gray-400 scale-95 origin-bottom-left whitespace-nowrap leading-none font-medium ml-0.5">
              {palace.changsheng12}
            </span>

            {isBenMing && (
              <span className="text-[9px] text-black scale-95 origin-bottom-left whitespace-nowrap font-medium ml-0.5">
                {palace.ages[0]}-{palace.ages[1]}
              </span>
            )}
          </div>
        </div>

        {/* 原本右側的 Trigger 佔位區已移除，改用下方的 Absolute Layer */}
      </div>

      {/* 飛化觸發區 (Trigger Zone) - 獨立的 Absolute Layer */}
      <div
        className="absolute bottom-0 right-0 h-[50%] min-w-[30%] flex items-end justify-end gap-1 p-1 rounded-tl-lg cursor-pointer hover:bg-purple-100/50 transition-colors select-none group z-30"
        onClick={(e) => {
          e.stopPropagation();
          onTriggerClick && onTriggerClick();
        }}
        title="點擊查看此宮位之飛化 (四化)"
      >
        <div className="flex flex-col-reverse items-end leading-tight pointer-events-none">
          <span className="text-[13px] font-bold text-red-600 whitespace-nowrap leading-none group-hover:scale-105 transition-transform">
            {palace.name}
          </span>
          {daName && (
            <span className="text-[13px] font-bold text-gray-500 whitespace-nowrap leading-none mb-[1px]">
              {daName}
            </span>
          )}
          {liuName && (
            <span className="text-[13px] font-bold text-blue-600 whitespace-nowrap leading-none mb-[1px]">
              {liuName}
            </span>
          )}
          {xiaoName && (
            <span className="text-[13px] font-bold text-green-600 whitespace-nowrap leading-none mb-[1px]">
              {xiaoName}
            </span>
          )}
        </div>
        <div className="flex flex-col leading-none text-[15px] font-bold text-black mb-[2px] ml-1 pointer-events-none">
          <span className="group-hover:text-purple-600 transition-colors">
            {palaceGanZhi[0]}
          </span>
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
}: {
  star: Star;
  color: string;
  bgSiHua: any;
}) => {
  return (
    <div className="flex flex-col items-center w-[18px] mr-[1px] relative">
      <span
        className={`text-[13px] font-bold ${color} leading-[0.9] select-none`}
      >
        {star.name[0]}
      </span>
      <span
        className={`text-[13px] font-bold ${color} leading-[0.9] select-none`}
      >
        {star.name[1]}
      </span>

      <span className="text-[10px] text-gray-400 font-normal leading-none scale-90 origin-center my-0">
        {star.brightness || ''}
      </span>

      <div className="flex flex-col gap-0 w-full items-center mt-0">
        <SiHuaSlot star={star} scope="ben" bg={bgSiHua.ben} />
        <SiHuaSlot star={star} scope="da" bg={bgSiHua.da} />
        <SiHuaSlot star={star} scope="liu" bg={bgSiHua.liu} />
        <SiHuaSlot star={star} scope="xiao" bg={bgSiHua.xiao} />
      </div>
    </div>
  );
};

const SiHuaSlot = ({
  star,
  scope,
  bg,
}: {
  star: Star;
  scope: 'ben' | 'da' | 'liu' | 'xiao';
  bg: string;
}) => {
  const sihua = star.sihua?.find((s) => s.scope === scope);
  if (sihua) {
    return (
      <div
        className={`w-3.5 h-3.5 flex items-center justify-center text-[11px] text-white rounded-[1px] leading-none shadow-sm ${bg} mb-[1px]`}
      >
        {sihua.type}
      </div>
    );
  }
  return <div className="w-3.5 h-3.5 mb-[1px]" />;
};

