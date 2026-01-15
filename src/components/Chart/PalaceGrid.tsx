import React, { forwardRef } from 'react';
import { CenterInfoBoard } from '../CenterInfoBoard';
import { PalaceCard } from '../PalaceCard';
import { GAN, PALACE_NAMES } from '../../logic/constants';
import type { Client, Relationship } from '../../db';
import type { ChartData } from '../../logic/types';
import type { PermissionState } from '../../logic/permissions';

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

  getRelativeNames: (idx: number) => { daName?: string; liuName?: string; xiaoName?: string; divinationName?: string; yueName?: string; riName?: string };
  getIsBenMingMing: (idx: number) => boolean;
  getAnchorCoord: (idx: number) => { x: number; y: number };

  onHistoryBack: () => void;
  onNavigate: (target: Client) => void;
  onCompatibility: (target: Client) => void;
  onChangeHour: (delta: number) => void;
  onResetTime: () => void;
  onToggleTwin: () => void;
  onToggleInverted: () => void;
  onToggleSmallLimit: () => void;
  onPalaceClick: (idx: number) => void;
  onTriggerClick: (idx: number) => void;

  permissionFlags?: {
      twin: PermissionState;
      inverted: PermissionState;
      xiao: PermissionState;
      liu_month: PermissionState;
      liu_day: PermissionState;
  };

  liuMonth?: number | null;
  isLiuMonthLeap?: boolean;
  liuDay?: number | null;
  onSetLiuMonth?: (m: number | null, isLeap: boolean) => void;
  onSetLiuDay?: (d: number | null) => void;
  liuMonthGan?: number;
  liuDayGan?: number;
  liuNianYear?: number | null;
  
  currentRealTime?: {
      year: number;      
      daSeq: number;     
  };
  
  liuMonthIdx?: number;
  liuDayIdx?: number;
}

export const PalaceGrid = forwardRef<HTMLDivElement, PalaceGridProps>(({
  client, chartData, relationships, historyStack,
  mode, selectedPalace, flyingPalace, daXianSeq, liuNianYear, showXiaoXian, isReverse, isTwinMode,
  divNum, isDivinationReady, divSiHuaMap,
  externalGan, externalSiHuaMap,
  benMingMajorStarsStr, currentHourZhi, isTimeModified, connections, daXianList, xiaoXianMingIdx,
  flyingStarsLookup,
  getRelativeNames, getIsBenMingMing, getAnchorCoord,
  onHistoryBack, onNavigate, onCompatibility, onChangeHour, onResetTime,
  onToggleTwin, onToggleInverted, onToggleSmallLimit, onPalaceClick, onTriggerClick,
  permissionFlags,
  liuMonth, isLiuMonthLeap, liuDay, onSetLiuMonth, onSetLiuDay, liuMonthGan, liuDayGan,
  currentRealTime,
  liuMonthIdx = -1, liuDayIdx = -1
}, ref) => {

  const gridLayout = [5, 6, 7, 8, 4, null, null, 9, 3, null, null, 10, 2, 1, 0, 11];

  // [修改] 恢復小限盤的高亮邏輯 (Priority 3)
  const { highlightIdx, highlightClass } = React.useMemo(() => {
      const baseClass = "absolute inset-0 z-0 pointer-events-none"; 

      // 1. 流日盤 (最高權重) - 淡紫色呼吸
      if (liuDay !== null && liuDayIdx >= 0) {
          return { highlightIdx: liuDayIdx, highlightClass: `${baseClass} bg-purple-100/50 animate-pulse` };
      }
      // 2. 流月盤 - 淡琥珀色呼吸
      if (liuMonth !== null && liuMonthIdx >= 0) {
          return { highlightIdx: liuMonthIdx, highlightClass: `${baseClass} bg-amber-100/50 animate-pulse` };
      }
      
      // [恢復] 3. 小限盤 - 淡綠色呼吸
      // 當 showXiaoXian 為 true 時，這裡會觸發，顯示綠色背景
      if (showXiaoXian && xiaoXianMingIdx >= 0) {
          return { highlightIdx: xiaoXianMingIdx, highlightClass: `${baseClass} bg-green-100/50 animate-pulse` };
      }
      
      // 4. 流年盤 - 淡藍色呼吸
      if (liuNianYear !== null) {
          const liuZhi = (liuNianYear - 4) % 12;
          const liuMingIdx = chartData.palaces.findIndex(p => p.zhiIndex === liuZhi);
          if (liuMingIdx >= 0) {
              return { highlightIdx: liuMingIdx, highlightClass: `${baseClass} bg-blue-100/50 animate-pulse` };
          }
      }
      // 5. 大限盤 - 灰色靜態
      if (daXianSeq >= 0 && daXianList[daXianSeq]) {
          return { highlightIdx: daXianList[daXianSeq].palaceIdx, highlightClass: `${baseClass} bg-gray-200/70` };
      }
      // 6. 本命盤 (預設) - 淡紅色靜態
      const benMingIdx = chartData.palaces.findIndex(p => getIsBenMingMing(p.index));
      if (benMingIdx >= 0) {
          return { highlightIdx: benMingIdx, highlightClass: `${baseClass} bg-red-50/60` };
      }
      
      return { highlightIdx: -1, highlightClass: '' };

  }, [liuDay, liuDayIdx, liuMonth, liuMonthIdx, showXiaoXian, xiaoXianMingIdx, liuNianYear, daXianSeq, daXianList, chartData, getIsBenMingMing]);


  return (
    // [修改] 增加 pt-3 (約12px) 的頂部內距，創造安全緩衝區，防止飛化標籤被 Header 遮擋
    <div ref={ref} className="w-full h-full bg-white border-2 border-gray-800 shadow-xl z-10 grid grid-cols-4 grid-rows-4 relative pt-2">
            
      {/* [修正] 將 z-40 提升至 z-[200]，確保線條覆蓋在 CenterInfoBoard (z-[100]+) 之上 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[200]">
          {selectedPalace !== null && (() => { const pSelf = getAnchorCoord(connections.self); const pTri1 = getAnchorCoord(connections.tri1); const pTri2 = getAnchorCoord(connections.tri2); const pOpp = getAnchorCoord(connections.opp); return ( <> <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pTri1.x}%`} y2={`${pTri1.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> <line x1={`${pTri1.x}%`} y1={`${pTri1.y}%`} x2={`${pTri2.x}%`} y2={`${pTri2.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> <line x1={`${pTri2.x}%`} y1={`${pTri2.y}%`} x2={`${pSelf.x}%`} y2={`${pSelf.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pOpp.x}%`} y2={`${pOpp.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> </> ); })()}
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
                          onToggleInverted={onToggleInverted}
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
                          onSetLiuMonth={onSetLiuMonth}
                          onSetLiuDay={onSetLiuDay}
                          liuNianYear={liuNianYear}
                          liuMonthGan={liuMonthGan}
                          liuDayGan={liuDayGan}
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

          const isDaXianMing = daXianSeq >= 0 && daXianList[daXianSeq].palaceIdx === palaceIdx;
          const isLiuNianMing = liuNianYear !== null && chartData.palaces[palaceIdx].zhiIndex === (liuNianYear - 4) % 12;
          const isXiaoXianMingPalace = liuNianYear !== null && palaceIdx === xiaoXianMingIdx;
          
          const isConnected = selectedPalace !== null && Object.values(connections).includes(palaceIdx);
          
          // [邏輯確認] 當 showXiaoXian 為 true 時，showXiaoXianSeal 為 false，所以標籤消失
          const showXiaoXianSeal = isXiaoXianMingPalace && !showXiaoXian;
          const isFlyingSource = flyingPalace === palaceIdx;
          
          const isHighlight = palaceIdx === highlightIdx;

          return (
              <div key={palaceIdx} onClick={() => onPalaceClick(palaceIdx)} 
                   className={`relative cursor-pointer transition-all duration-200 border border-gray-300 box-border overflow-visible 
                   ${isConnected ? 'bg-red-50' : 'hover:bg-gray-50'} 
                   ${isFlyingSource ? 'ring-4 ring-purple-400 z-50 animate-pulse' : ''}
                   `} 
                   style={isFlyingSource ? { animationIterationCount: 3 } : {}}
              >
                  {isHighlight && <div className={highlightClass}></div>}
                  
                  {isFlyingSource && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg z-50 whitespace-nowrap tracking-wide border border-white">{GAN[chartData.palaces[palaceIdx].ganIndex]}干飛化</div>}
                  
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
                      onTriggerClick={() => onTriggerClick(palaceIdx)}
                      flyingStars={flyingStarsLookup}
                      isTwinMode={isTwinMode}
                      isReverse={isReverse}
                      divinationName={relNames.divinationName}
                      divinationSiHua={mode === 'divination' ? divSiHuaMap : undefined}
                      externalSiHua={externalSiHuaMap}
                  />
                  {isConnected && <div className="absolute inset-0 border-2 border-red-500 pointer-events-none z-30"></div>}
              </div>
          );
      })}
    </div>
  );
});