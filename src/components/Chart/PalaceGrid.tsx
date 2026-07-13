// src/components/Chart/PalaceGrid.tsx
import React, { forwardRef } from 'react';
import { CenterInfoBoard } from '../CenterInfoBoard';
import { PalaceCard, type SiHuaClickPayload } from '../PalaceCard';
import { GAN } from '../../logic/constants';
import type { Client, Relationship } from '../../db';
import type { ChartData, Scope, SiHuaType } from '../../logic/types';
import type { PermissionState } from '../../logic/permissions';

export interface SiHuaTrace {
  key: string;
  sourcePalaceIdx: number;
  targetPalaceIdx: number;
  sourceGan: string;
  starName: string;
  scope: Scope;
  type: SiHuaType;
}

interface PalaceGridProps {
  client: Client;
  chartData: ChartData;
  relationships: Relationship[];
  historyStack: Client[];

  mode: 'standard' | 'divination';
  selectedPalace: number | null;
  flyingPalace: number | null;
  daXianSeq: number;
  liuNianYear: number | null;
  showXiaoXian: boolean;
  isReverse: boolean;
  isTwinMode: boolean;

  showCompass: boolean;

  reverseFlags?: {
    da: boolean;
    liu: boolean;
    yue: boolean;
    ri: boolean;
    ben: boolean; 
  };
  onToggleInverted?: () => void;

  divNum?: string[];
  isDivinationReady?: boolean;
  divSiHuaMap?: Record<string, '祿' | '權' | '科' | '忌'>;

  externalGan: number | null;
  externalSiHuaMap?: Record<string, '祿' | '權' | '科' | '忌'>;

  benMingMajorStarsStr: string;
  currentHourZhi: string;
  isTimeModified: boolean;
  connections: { self: number; tri1: number; tri2: number; opp: number };
  daXianList: any[];
  xiaoXianMingIdx: number;

  flyingStarsLookup?: Record<string, '祿' | '權' | '科' | '忌'>;

  getRelativeNames: (
    idx: number
  ) => {
    daName?: string;
    liuName?: string;
    xiaoName?: string;
    divinationName?: string;
    yueName?: string;
    riName?: string;
  };
  getIsBenMingMing: (idx: number) => boolean;
  getAnchorCoord: (idx: number) => { x: number; y: number };

  onHistoryBack: () => void;
  onNavigate: (target: Client) => void;
  onCompatibility: (target: Client) => void;
  onChangeHour: (delta: number) => void;
  onResetTime: () => void;
  onToggleTwin: () => void;
  onToggleSmallLimit: () => void;
  onPalaceClick: (idx: number) => void;
  onTriggerClick: (idx: number) => void;
  onSiHuaClick?: (payload: SiHuaClickPayload) => void;
  onBlankClick?: () => void;
  activeSiHuaTrace?: SiHuaTrace | null;

  onOpenYearlyAnalysis?: (year: number) => void;

  permissionFlags?: {
    twin: PermissionState;
    inverted: PermissionState;
    xiao: PermissionState;
    liu_month: PermissionState;
    liu_day: PermissionState;
    dual_chart?: PermissionState;
  };

  liuMonth?: number | null;
  isLiuMonthLeap?: boolean;
  liuDay?: number | null;
  onSetLiuYear?: (y: number | null) => void;
  onSetLiuMonth?: (m: number | null, isLeap: boolean) => void;
  onSetLiuDay?: (d: number | null) => void;
  liuMonthGan?: number;
  liuDayGan?: number;

  currentRealTime?: {
    year: number;
    daSeq: number;
  };

  liuMonthIdx?: number;
  liuDayIdx?: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

const siHuaTraceStyles: Record<Scope, { sourceBg: string; targetRing: string; badge: string }> = {
  ben: {
    sourceBg: 'bg-red-100/55',
    targetRing: 'ring-4 ring-red-500 ring-inset z-40',
    badge: 'bg-red-600 text-white shadow-red-200',
  },
  da: {
    sourceBg: 'bg-slate-200/65',
    targetRing: 'ring-4 ring-slate-600 ring-inset z-40',
    badge: 'bg-slate-700 text-white shadow-slate-200',
  },
  liu: {
    sourceBg: 'bg-blue-100/60',
    targetRing: 'ring-4 ring-blue-500 ring-inset z-40',
    badge: 'bg-blue-600 text-white shadow-blue-200',
  },
  xiao: {
    sourceBg: 'bg-green-100/60',
    targetRing: 'ring-4 ring-green-600 ring-inset z-40',
    badge: 'bg-green-600 text-white shadow-green-200',
  },
};

export const PalaceGrid = forwardRef<HTMLDivElement, PalaceGridProps>(
  (
    {
      client,
      chartData,
      relationships,
      historyStack,
      mode,
      selectedPalace,
      flyingPalace,
      daXianSeq,
      liuNianYear,
      showXiaoXian,
      isReverse,
      isTwinMode,
      showCompass,
      reverseFlags,
      onToggleInverted,
      divNum,
      isDivinationReady,
      divSiHuaMap,
      externalGan,
      externalSiHuaMap,
      benMingMajorStarsStr,
      currentHourZhi,
      isTimeModified,
      connections,
      daXianList,
      xiaoXianMingIdx,
      flyingStarsLookup,
      getRelativeNames,
      getIsBenMingMing,
      getAnchorCoord,
      onHistoryBack,
      onNavigate,
      onCompatibility,
      onChangeHour,
      onResetTime,
      onToggleTwin,
      onToggleSmallLimit,
      onPalaceClick,
      onTriggerClick,
      onSiHuaClick,
      onBlankClick,
      activeSiHuaTrace,
      onOpenYearlyAnalysis,
      permissionFlags,
      liuMonth,
      isLiuMonthLeap,
      liuDay,
      onSetLiuYear,
      onSetLiuMonth,
      onSetLiuDay,
      liuMonthGan,
      liuDayGan,
      currentRealTime,
      liuMonthIdx = -1,
      liuDayIdx = -1,
    },
    ref
  ) => {
    const gridLayout = [5, 6, 7, 8, 4, null, null, 9, 3, null, null, 10, 2, 1, 0, 11];

    const { highlightIdx, highlightClass } = React.useMemo(() => {
      const baseClass = 'absolute inset-0 z-0 pointer-events-none';

      if (liuDay !== null && liuDayIdx >= 0) {
        return { highlightIdx: liuDayIdx, highlightClass: `${baseClass} bg-purple-100/50 animate-pulse` };
      }
      if (liuMonth !== null && liuMonthIdx >= 0) {
        return { highlightIdx: liuMonthIdx, highlightClass: `${baseClass} bg-amber-100/50 animate-pulse` };
      }

      if (showXiaoXian && xiaoXianMingIdx >= 0) {
        return { highlightIdx: xiaoXianMingIdx, highlightClass: `${baseClass} bg-green-100/50 animate-pulse` };
      }

      if (liuNianYear !== null) {
        const liuZhi = mod12(liuNianYear - 4);
        const liuMingIdx = chartData.palaces.findIndex((p) => p.zhiIndex === liuZhi);
        if (liuMingIdx >= 0) {
          return { highlightIdx: liuMingIdx, highlightClass: `${baseClass} bg-blue-100/50 animate-pulse` };
        }
      }

      if (daXianSeq >= 0 && daXianList[daXianSeq]) {
        return { highlightIdx: daXianList[daXianSeq].palaceIdx, highlightClass: `${baseClass} bg-gray-200/70` };
      }

      const benMingIdx = chartData.palaces.findIndex((p) => getIsBenMingMing(p.index));
      if (benMingIdx >= 0) {
        return { highlightIdx: benMingIdx, highlightClass: `${baseClass} bg-red-50/60` };
      }

      return { highlightIdx: -1, highlightClass: '' };
    }, [
      liuDay,
      liuDayIdx,
      liuMonth,
      liuMonthIdx,
      showXiaoXian,
      xiaoXianMingIdx,
      liuNianYear,
      daXianSeq,
      daXianList,
      chartData,
      getIsBenMingMing,
    ]);

    return (
      <div ref={ref} className="w-full h-full bg-white border-2 border-gray-800 shadow-xl z-10 relative pt-2" onClick={onBlankClick}>
        <div className="relative w-full h-full grid grid-cols-4 grid-rows-4">
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[200]">
            {selectedPalace !== null &&
              (() => {
                const pSelf = getAnchorCoord(connections.self);
                const pTri1 = getAnchorCoord(connections.tri1);
                const pTri2 = getAnchorCoord(connections.tri2);
                const pOpp = getAnchorCoord(connections.opp);
                return (
                  <>
                    <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pTri1.x}%`} y2={`${pTri1.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                    <line x1={`${pTri1.x}%`} y1={`${pTri1.y}%`} x2={`${pTri2.x}%`} y2={`${pTri2.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                    <line x1={`${pTri2.x}%`} y1={`${pTri2.y}%`} x2={`${pSelf.x}%`} y2={`${pSelf.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                    <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pOpp.x}%`} y2={`${pOpp.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                  </>
                );
              })()}
          </svg>

          {gridLayout.map((palaceIdx, gridPos) => {
            if (gridPos === 5) {
              return (
                  <div key="center-board" className="col-span-2 row-span-2 z-50 relative h-full w-full">
                  <CenterInfoBoard
                    key="center"
                    client={client}
                    chartData={chartData}
                    relationships={relationships}
                    historyStack={historyStack}
                    onHistoryBack={onHistoryBack}
                    onNavigate={onNavigate}
                    onCompatibility={onCompatibility}
                    benMingMajorStarsStr={benMingMajorStarsStr}
                    onChangeHour={onChangeHour}
                    onResetTime={onResetTime}
                    currentHourZhi={currentHourZhi}
                    isTimeModified={isTimeModified}
                    isDivinationMode={mode === 'divination'}
                    divNum={divNum}
                    isDivinationReady={isDivinationReady}
                    onToggleTwin={onToggleTwin}
                    onToggleInverted={onToggleInverted || (() => {})}
                    onToggleSmallLimit={onToggleSmallLimit}
                    showTwin={isTwinMode}
                    showInverted={isReverse}
                    showSmallLimit={showXiaoXian}
                    isDaXian={daXianSeq >= 0}
                    isLiuNian={liuNianYear !== null}
                    permissionFlags={permissionFlags}
                    liuMonth={liuMonth}
                    isLiuMonthLeap={isLiuMonthLeap}
                    liuDay={liuDay}
                    onSetLiuYear={onSetLiuYear}
                    onSetLiuMonth={onSetLiuMonth}
                    onSetLiuDay={onSetLiuDay}
                    liuNianYear={liuNianYear}
                    liuMonthGan={liuMonthGan}
                    liuDayGan={liuDayGan}
                    currentRealTime={currentRealTime}
                    onOpenYearlyAnalysis={onOpenYearlyAnalysis}
                  />
                </div>
              );
            }

            if (gridPos === 6 || gridPos === 9 || gridPos === 10) return null;
            if (palaceIdx === null) return null;

            const relNames = getRelativeNames(palaceIdx);
            const isBenMingMing = getIsBenMingMing(palaceIdx);

            const isDaXianActive = daXianSeq >= 0;
            const isLiuNianActive = liuNianYear !== null;
            const isXiaoXianActive = showXiaoXian;

            const isDaXianMing = daXianSeq >= 0 && daXianList[daXianSeq]?.palaceIdx === palaceIdx;
            const isLiuNianMing = liuNianYear !== null && chartData.palaces[palaceIdx].zhiIndex === mod12(liuNianYear - 4);
            const isXiaoXianMingPalace = liuNianYear !== null && palaceIdx === xiaoXianMingIdx;

            const isConnected = selectedPalace !== null && Object.values(connections).includes(palaceIdx);

            const showXiaoXianSeal = isXiaoXianMingPalace && !showXiaoXian;
            const isFlyingSource = flyingPalace === palaceIdx;

            const isHighlight = palaceIdx === highlightIdx;
            const isSiHuaSource = activeSiHuaTrace?.sourcePalaceIdx === palaceIdx;
            const isSiHuaTarget = activeSiHuaTrace?.targetPalaceIdx === palaceIdx;
            const traceStyle = activeSiHuaTrace ? siHuaTraceStyles[activeSiHuaTrace.scope] : null;

            return (
              <div
                key={palaceIdx}
                onClick={() => onPalaceClick(palaceIdx)}
                className={`relative cursor-pointer transition-all duration-200 border border-gray-300 box-border overflow-visible
                  ${isConnected ? 'bg-red-50' : 'hover:bg-gray-50'}
                  ${isFlyingSource ? 'ring-4 ring-purple-400 z-50 animate-pulse' : ''}
                  ${isSiHuaTarget && traceStyle ? traceStyle.targetRing : ''}
                `}
                style={isFlyingSource ? { animationIterationCount: 3 } : {}}
              >
                {isHighlight && <div className={highlightClass}></div>}
                {isSiHuaSource && traceStyle && <div className={`absolute inset-0 z-[1] pointer-events-none ${traceStyle.sourceBg}`}></div>}

                {isFlyingSource && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg z-50 whitespace-nowrap tracking-wide border border-white">
                    {GAN[chartData.palaces[palaceIdx].ganIndex]}干飛化
                  </div>
                )}

                <PalaceCard
                  palace={chartData.palaces[palaceIdx]}
                  daName={relNames.daName}
                  liuName={relNames.liuName}
                  xiaoName={relNames.xiaoName}
                  yueName={relNames.yueName}
                  riName={relNames.riName}
                  isBody={mode !== 'divination' && chartData.palaces[palaceIdx].isBody}
                  isXiaoXianMing={showXiaoXianSeal}
                  isBenMingMing={isBenMingMing}
                  isDaXianMing={isDaXianMing && isDaXianActive}
                  isLiuNianMing={isLiuNianMing && isLiuNianActive}
                  isXiaoXianMingPalace={isXiaoXianMingPalace && (isLiuNianActive || isXiaoXianActive)}
                  onTriggerClick={() => {
                    onBlankClick?.();
                    onTriggerClick(palaceIdx);
                  }}
                  flyingStars={flyingStarsLookup}
                  isTwinMode={isTwinMode}
                  isReverse={isReverse}
                  showCompass={showCompass}
                  reverseFlags={reverseFlags}
                  divinationName={relNames.divinationName}
                  divinationSiHua={mode === 'divination' ? divSiHuaMap : undefined}
                  externalSiHua={externalSiHuaMap}
                  activeSiHuaKey={activeSiHuaTrace?.key}
                  onSiHuaClick={onSiHuaClick}
                />

                {isSiHuaSource && traceStyle && (
                  <div className={`absolute left-1/2 top-[62%] -translate-x-1/2 z-40 pointer-events-none h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center text-xs font-black leading-none shadow-md border border-white/80 ${traceStyle.badge}`}>
                    {activeSiHuaTrace.sourceGan}
                  </div>
                )}

                {isConnected && <div className="absolute inset-0 border-2 border-red-500 pointer-events-none z-30"></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
