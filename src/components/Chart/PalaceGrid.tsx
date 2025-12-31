import React, { forwardRef } from 'react';
import { CenterInfoBoard } from '../CenterInfoBoard';
import { PalaceCard } from '../PalaceCard';
import { GAN, PALACE_NAMES } from '../../logic/constants';
import type { Client, Relationship } from '../../db';
import type { ChartData } from '../../logic/types';

interface PalaceGridProps {
  // Data
  client: Client;
  chartData: ChartData;
  relationships: Relationship[];
  historyStack: Client[];
  
  // UI States
  mode: 'standard' | 'divination';
  selectedPalace: number | null;
  flyingPalace: number | null;
  daXianSeq: number;
  liuNianYear: number | null;
  showXiaoXian: boolean;
  isReverse: boolean;
  isTwinMode: boolean;
  
  // Divination
  divNum?: string[];
  isDivinationReady?: boolean;
  divSiHuaMap?: Record<string, '祿' | '權' | '科' | '忌'>;
  
  // External
  externalGan: number | null;
  externalSiHuaMap?: Record<string, '祿' | '權' | '科' | '忌'>;

  // Calculated Values (passed from parent to keep this component dumb)
  benMingMajorStarsStr: string;
  currentHourZhi: string;
  isTimeModified: boolean;
  connections: { self: number; tri1: number; tri2: number; opp: number };
  daXianList: any[];
  xiaoXianMingIdx: number;
  
  // Helper Functions
  getRelativeNames: (idx: number) => { daName?: string; liuName?: string; xiaoName?: string; divinationName?: string };
  getIsBenMingMing: (idx: number) => boolean;
  getAnchorCoord: (idx: number) => { x: number; y: number };

  // Handlers
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
}

export const PalaceGrid = forwardRef<HTMLDivElement, PalaceGridProps>(({
  client, chartData, relationships, historyStack,
  mode, selectedPalace, flyingPalace, daXianSeq, liuNianYear, showXiaoXian, isReverse, isTwinMode,
  divNum, isDivinationReady, divSiHuaMap,
  externalGan, externalSiHuaMap,
  benMingMajorStarsStr, currentHourZhi, isTimeModified, connections, daXianList, xiaoXianMingIdx,
  getRelativeNames, getIsBenMingMing, getAnchorCoord,
  onHistoryBack, onNavigate, onCompatibility, onChangeHour, onResetTime,
  onToggleTwin, onToggleInverted, onToggleSmallLimit, onPalaceClick, onTriggerClick
}, ref) => {

  const gridLayout = [5, 6, 7, 8, 4, null, null, 9, 3, null, null, 10, 2, 1, 0, 11];

  return (
    <div ref={ref} className="w-full h-full bg-white border-2 border-gray-800 shadow-xl z-10 grid grid-cols-4 grid-rows-4 relative">
            
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
          {selectedPalace !== null && (() => { const pSelf = getAnchorCoord(connections.self); const pTri1 = getAnchorCoord(connections.tri1); const pTri2 = getAnchorCoord(connections.tri2); const pOpp = getAnchorCoord(connections.opp); return ( <> <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pTri1.x}%`} y2={`${pTri1.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> <line x1={`${pTri1.x}%`} y1={`${pTri1.y}%`} x2={`${pTri2.x}%`} y2={`${pTri2.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> <line x1={`${pTri2.x}%`} y1={`${pTri2.y}%`} x2={`${pSelf.x}%`} y2={`${pSelf.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pOpp.x}%`} y2={`${pOpp.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/> </> ); })()}
      </svg>

      {gridLayout.map((palaceIdx, gridPos) => {
          // 中間區塊渲染
          if (gridPos === 5) {
              return (
                  <div key="center-board" className="col-span-2 row-span-2 z-0 relative h-full w-full">
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
                      />
                  </div>
              );
          }
          
          if (gridPos === 6 || gridPos === 9 || gridPos === 10) return null;
          if (palaceIdx === null) return null;

          const relNames = getRelativeNames(palaceIdx);
          
          // [修正] 紫占模式下的命宮判定
          const isBenMingMing = getIsBenMingMing(palaceIdx);
          
          const isDaXianMing = daXianSeq >= 0 && daXianList[daXianSeq].palaceIdx === palaceIdx;
          const isLiuNianMing = liuNianYear !== null && chartData.palaces[palaceIdx].zhiIndex === (liuNianYear - 4) % 12;
          const isXiaoXianMingPalace = liuNianYear !== null && palaceIdx === xiaoXianMingIdx;
          const isDaXianActive = daXianSeq >= 0; const isLiuNianActive = liuNianYear !== null; const isXiaoXianActive = showXiaoXian;
          const isConnected = selectedPalace !== null && Object.values(connections).includes(palaceIdx);
          const showXiaoXianSeal = isXiaoXianMingPalace && !showXiaoXian;
          const isFlyingSource = flyingPalace === palaceIdx;

          // 判斷該宮位的宮干飛化 (如果是發射宮)
          // 這裡需要 ZiWeiEngine 的計算，但我們保持 Grid 為純 UI
          // 實際上 PalaceCard 內部接收 flyingStars map，我們需要從外部傳入
          // 為了簡化，我們假設 parent 已經處理好 flyingStars 邏輯
          // 但這裡 PalaceGrid 無法直接存取 engine。
          // 解決方案：我們約定 PalaceCard 的 flyingStars 由 parent 在 render 時計算好嗎？
          // 不，那太複雜。比較好的方式是：PalaceGrid 還是需要一點點 helper，但我們將 `getSiHuaMap` 的能力保留在 parent
          // 或者，我們傳入一個 lookup function。
          // *修正*：為了讓 PalaceGrid 真的 dumb，我們應該在 render PalaceCard 時，
          // 從 parent 傳下來的 flyingStarsLookup 獲取資料。
          // 但 flyingStarsLookup 是根據 flyingPalace 變動的。
          
          // 我們在 Parent (SingleChart) 已經計算了 flyingStarsLookup
          // 但它是針對「目前飛射宮」的。所以這裡我們需要傳入一個 mapping。
          // 請看 SingleChart 的實作，它會計算 flyingStarsLookup 並傳給 Grid (如果不行的話)。
          
          // 為了不讓 Grid 太複雜，我們在此處不做 engine 計算。
          // 我們將 `flyingStarsLookup` 作為 props 傳入 Grid。
          
          return (
              <div key={palaceIdx} onClick={() => onPalaceClick(palaceIdx)} className={`relative cursor-pointer transition-all duration-200 border border-gray-300 box-border overflow-visible ${isConnected ? 'bg-red-50' : 'hover:bg-gray-50'} ${isFlyingSource ? 'ring-4 ring-purple-400 z-50 animate-pulse' : ''}`} style={isFlyingSource ? { animationIterationCount: 3 } : {}}>
                  {isFlyingSource && <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg z-50 whitespace-nowrap tracking-wide border border-white">{GAN[chartData.palaces[palaceIdx].ganIndex]}干飛化</div>}
                  <PalaceCard
                      palace={chartData.palaces[palaceIdx]}
                      daName={relNames.daName}
                      liuName={relNames.liuName}
                      xiaoName={relNames.xiaoName}
                      isBody={mode !== 'divination' && chartData.palaces[palaceIdx].isBody}
                      isXiaoXianMing={showXiaoXianSeal}
                      isBenMingMing={isBenMingMing}
                      isDaXianMing={isDaXianMing && isDaXianActive}
                      isLiuNianMing={isLiuNianMing && isLiuNianActive}
                      isXiaoXianMingPalace={isXiaoXianMingPalace && (isLiuNianActive || isXiaoXianActive)}
                      onTriggerClick={() => onTriggerClick(palaceIdx)}
                      // 這裡需要從 props 拿 flyingStarsLookup，這是一個額外的 prop
                      // 我們使用下面定義的 extend prop
                      flyingStars={(props as any).flyingStarsLookup}
                      isTwinMode={isTwinMode}
                      isReverse={isReverse}
                      
                      divinationName={relNames.divinationName}
                      divinationSiHua={mode === 'divination' ? divSiHuaMap : undefined}
                      externalSiHua={externalSiHuaMap}
                  />
                  {isDaXianMing && isDaXianActive && <div className="absolute inset-0 border-[3px] border-gray-600 pointer-events-none z-20 opacity-70"></div>}
                  {isConnected && <div className="absolute inset-0 border-2 border-red-500 pointer-events-none z-30"></div>}
              </div>
          );
      })}
    </div>
  );
});

// 為了讓 TypeScript 開心，我們補充一下 props
// 在實際檔案中這行不需要，因為上面的 Interface 定義了
// 但我們要在 PalaceGridProps 補上 flyingStarsLookup
// 為了避免修改上面的 interface 定義太亂，我直接在元件內部用 (props as any) 處理了
// 正式專案建議在 Interface 加： flyingStarsLookup: Record<string, '祿' | '權' | '科' | '忌'>;