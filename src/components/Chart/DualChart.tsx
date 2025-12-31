import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PalaceGrid } from './PalaceGrid';
import { ZiWeiEngine } from '../../logic/engine';
import { GAN, ZHI, SIHUA_TABLE } from '../../logic/constants';
import { Loader2, ChevronLeft, Lock, Unlock, ArrowRightLeft } from 'lucide-react';
import type { Client } from '../../db';

interface DualChartProps {
  onBack?: () => void;
}

const getSiHuaMap = (ganIndex: number) => {
    if (ganIndex < 0 || ganIndex > 9) return {};
    const ganChar = GAN[ganIndex];
    const stars = SIHUA_TABLE[ganChar];
    if (!stars) return {};
    return {
        [stars[0]]: '祿',
        [stars[1]]: '權',
        [stars[2]]: '科',
        [stars[3]]: '忌',
    } as Record<string, '祿' | '權' | '科' | '忌'>;
};

// 輔助：產生 10 年流年列表
const getLiuNianList = (engine: ZiWeiEngine, chartData: any, daXianSeq: number) => {
    if (!engine || !chartData || daXianSeq < 0) return [];
    
    // 找出該大限的命宮位置
    const startPos = engine.getMingPos();
    const direction = chartData.direction || 1;
    const offset = daXianSeq * direction;
    const daXianPalaceIdx = (startPos + offset + 120) % 12;
    const palace = chartData.palaces[daXianPalaceIdx];
    
    if (!palace) return [];
    
    const startYear = chartData.lunarYear + palace.ages[0];
    const list = [];
    for (let i = 0; i < 10; i++) {
        const year = startYear + i;
        const age = palace.ages[0] + i;
        const gan = (year - 4) % 10;
        const zhi = (year - 4) % 12;
        // 顯示：2025 (乙巳) 41歲
        list.push({ year, age, label: `${year} ${GAN[gan]}${ZHI[zhi]} ${age}` });
    }
    return list;
};

export const DualChart: React.FC<DualChartProps> = ({ onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 1. 資料來源：預期從 location.state 傳入 clientA 和 clientB
  const clientA = location.state?.clientA as Client;
  const clientB = location.state?.clientB as Client;

  // 如果沒有資料，踢回首頁
  useEffect(() => {
      if (!clientA || !clientB) {
          navigate('/');
      }
  }, [clientA, clientB, navigate]);

  // 2. 共用狀態
  const [isLocked, setIsLocked] = useState(true); // 預設鎖定流年
  const [activeSide, setActiveSide] = useState<'A' | 'B' | null>(null); // 誰是發射端
  const [flyingPalace, setFlyingPalace] = useState<number | null>(null); // 發射宮位 Index

  // 3. Client A 狀態
  const [hourA, setHourA] = useState(clientA?.birthHour || 0);
  const [daSeqA, setDaSeqA] = useState(-1);
  const [liuYearA, setLiuYearA] = useState<number | null>(null);
  const [showXiaoA, setShowXiaoA] = useState(false);
  const [isRevA, setIsRevA] = useState(false);
  const [isTwinA, setIsTwinA] = useState(false);

  // 4. Client B 狀態
  const [hourB, setHourB] = useState(clientB?.birthHour || 0);
  const [daSeqB, setDaSeqB] = useState(-1);
  const [liuYearB, setLiuYearB] = useState<number | null>(null);
  const [showXiaoB, setShowXiaoB] = useState(false);
  const [isRevB, setIsRevB] = useState(false);
  const [isTwinB, setIsTwinB] = useState(false);

  // --- Engine A ---
  const engineA = useMemo(() => {
      if (!clientA) return null;
      return new ZiWeiEngine(clientA.birthYear, clientA.birthMonth, clientA.birthDay, hourA, clientA.birthMinute, clientA.gender);
  }, [clientA, hourA]);

  const chartA = useMemo(() => {
      if (!engineA) return null;
      // 計算大限流年
      let daGan = -1, liuGan = -1, liuZhi = -1, xiaoGan = -1;
      const baseData = engineA.getChartData();
      const startPos = engineA.getMingPos();
      const direction = baseData.direction;

      if (daSeqA >= 0) {
          const p = baseData.palaces[(startPos + daSeqA * direction + 120) % 12];
          if (p) daGan = p.ganIndex;
      }
      if (liuYearA) {
          liuGan = (liuYearA - 4) % 10;
          liuZhi = (liuYearA - 4) % 12;
      }
      if (liuYearA && showXiaoA) {
          const va = liuYearA - baseData.lunarYear + 1;
          const pos = engineA.getXiaoXianPos(va);
          if (pos >= 0) xiaoGan = baseData.palaces[pos].ganIndex;
      }
      engineA.computeLimitStars(daGan, liuGan, liuZhi, xiaoGan, showXiaoA);
      engineA.computeSiHua(daGan, liuGan, xiaoGan);
      return engineA.getChartData();
  }, [engineA, daSeqA, liuYearA, showXiaoA]);

  // --- Engine B ---
  const engineB = useMemo(() => {
      if (!clientB) return null;
      return new ZiWeiEngine(clientB.birthYear, clientB.birthMonth, clientB.birthDay, hourB, clientB.birthMinute, clientB.gender);
  }, [clientB, hourB]);

  const chartB = useMemo(() => {
      if (!engineB) return null;
      // 計算大限流年
      let daGan = -1, liuGan = -1, liuZhi = -1, xiaoGan = -1;
      const baseData = engineB.getChartData();
      const startPos = engineB.getMingPos();
      const direction = baseData.direction;

      if (daSeqB >= 0) {
          const p = baseData.palaces[(startPos + daSeqB * direction + 120) % 12];
          if (p) daGan = p.ganIndex;
      }
      if (liuYearB) {
          liuGan = (liuYearB - 4) % 10;
          liuZhi = (liuYearB - 4) % 12;
      }
      if (liuYearB && showXiaoB) {
          const va = liuYearB - baseData.lunarYear + 1;
          const pos = engineB.getXiaoXianPos(va);
          if (pos >= 0) xiaoGan = baseData.palaces[pos].ganIndex;
      }
      engineB.computeLimitStars(daGan, liuGan, liuZhi, xiaoGan, showXiaoB);
      engineB.computeSiHua(daGan, liuGan, xiaoGan);
      return engineB.getChartData();
  }, [engineB, daSeqB, liuYearB, showXiaoB]);

  // --- Helper Functions ---
  // [修正] 取得大限列表，必須包含 palaceIdx，否則 PalaceGrid 會當機
  const daListA = useMemo(() => {
      if (!engineA || !chartA) return [];
      const list = [];
      const startPos = engineA.getMingPos();
      const dir = chartA.direction;
      for (let i=0; i<10; i++) {
          const idx = (startPos + i*dir + 120) % 12; // 計算大限命宮 Index
          const p = chartA.palaces[idx];
          const startYear = chartA.lunarYear + p.ages[0];
          // 這裡補上了 palaceIdx
          list.push({ 
              seq: i, 
              palaceIdx: idx, 
              startYear: startYear, 
              endYear: chartA.lunarYear + p.ages[1], 
              name: `${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]}限`,
              label: `${p.ages[0]}-${p.ages[1]}` 
          });
      }
      return list;
  }, [chartA, engineA]);

  // [修正] 同上，補上 palaceIdx
  const daListB = useMemo(() => {
      if (!engineB || !chartB) return [];
      const list = [];
      const startPos = engineB.getMingPos();
      const dir = chartB.direction;
      for (let i=0; i<10; i++) {
          const idx = (startPos + i*dir + 120) % 12;
          const p = chartB.palaces[idx];
          const startYear = chartB.lunarYear + p.ages[0];
          list.push({ 
              seq: i, 
              palaceIdx: idx, 
              startYear: startYear, 
              endYear: chartB.lunarYear + p.ages[1], 
              name: `${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]}限`,
              label: `${p.ages[0]}-${p.ages[1]}` 
          });
      }
      return list;
  }, [chartB, engineB]);

  // --- 互動邏輯: 同步時間 ---
  const syncTime = (source: 'A' | 'B', year: number | null) => {
      if (!isLocked) return; // 沒鎖定就不連動

      if (source === 'A') {
          // A 改流年 -> B 跟著改
          if (year === null) {
              setLiuYearB(null); // A 取消流年 -> B 也取消
          } else {
              // 1. B 切換到該流年
              setLiuYearB(year); 
              // 2. B 自動切換到該流年所屬的大限
              const targetDa = daListB.find(d => year >= d.startYear && year <= d.endYear);
              if (targetDa) setDaSeqB(targetDa.seq);
          }
      } else {
          // B 改流年 -> A 跟著改
          if (year === null) {
              setLiuYearA(null);
          } else {
              setLiuYearA(year);
              const targetDa = daListA.find(d => year >= d.startYear && year <= d.endYear);
              if (targetDa) setDaSeqA(targetDa.seq);
          }
      }
  };

  // --- 互動邏輯: 點擊宮位 ---
  const handlePalaceClick = (side: 'A' | 'B', index: number) => {
      // 邏輯：
      // 1. 如果點擊的是「已經是發射端」的那一邊的同一個宮位 -> 取消選取
      // 2. 否則 -> 設定該邊為發射端，該宮位為發射源
      if (activeSide === side && flyingPalace === index) {
          setActiveSide(null);
          setFlyingPalace(null);
      } else {
          setActiveSide(side);
          setFlyingPalace(index);
      }
  };

  // --- 計算跨盤飛化 ---
  // 當 A 是發射端，計算 A 的宮干四化，傳給 B 顯示
  const flyMapAtoB = useMemo(() => {
      if (activeSide !== 'A' || flyingPalace === null || !chartA) return undefined;
      const gan = chartA.palaces[flyingPalace].ganIndex;
      return getSiHuaMap(gan);
  }, [activeSide, flyingPalace, chartA]);

  // 當 B 是發射端，計算 B 的宮干四化，傳給 A 顯示
  const flyMapBtoA = useMemo(() => {
      if (activeSide !== 'B' || flyingPalace === null || !chartB) return undefined;
      const gan = chartB.palaces[flyingPalace].ganIndex;
      return getSiHuaMap(gan);
  }, [activeSide, flyingPalace, chartB]);


  if (!clientA || !clientB || !chartA || !chartB) {
      return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>;
  }

  // --- 為了重複使用 PalaceGrid，我們需要準備一些 dummy props (例如 connections) ---
  // 在合盤模式下，不需要顯示三方四正的線條，所以 connections 全部給 -1
  const dummyConnections = { self: -1, tri1: -1, tri2: -1, opp: -1 };
  const getDummyCoords = () => ({ x: 0, y: 0 });
  const dummyNav = () => {};

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0 z-50 h-[56px]">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 text-sm font-bold shadow-sm">
                    <ChevronLeft size={16} /> 返回
                </button>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <span className="text-blue-600">{clientA.name}</span>
                    <ArrowRightLeft size={14} className="text-gray-400" />
                    <span className="text-pink-600">{clientB.name}</span>
                </div>
            </div>

            <button 
                onClick={() => setIsLocked(!isLocked)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isLocked ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
            >
                {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                {isLocked ? '時間鎖定' : '獨立操作'}
            </button>
        </div>

        {/* Dual Grid Container */}
        <div className="flex-1 flex overflow-hidden relative">
            
            {/* Left Chart (A) */}
            <div className="flex-1 flex flex-col border-r-2 border-gray-300 relative">
                <div className="flex-1 relative">
                    <PalaceGrid
                        client={clientA}
                        chartData={chartA}
                        relationships={[]} // 合盤不顯示關係圖
                        historyStack={[]}
                        mode="standard"
                        
                        // 狀態
                        selectedPalace={null} // 合盤不使用單盤的選取邏輯
                        flyingPalace={activeSide === 'A' ? flyingPalace : null} // 顯示發射源光圈
                        daXianSeq={daSeqA}
                        liuNianYear={liuYearA}
                        showXiaoXian={showXiaoA}
                        isReverse={isRevA}
                        isTwinMode={isTwinA}
                        
                        // 外部四化 (接收 B 射過來的四化)
                        externalGan={null}
                        flyingStarsLookup={flyMapBtoA} // [核心互動] 這裡接收 B 的飛化

                        // 必要的計算值
                        benMingMajorStarsStr=""
                        currentHourZhi={`${hourA}`}
                        isTimeModified={hourA !== clientA.birthHour}
                        connections={dummyConnections}
                        
                        // [修正] 傳入正確的大限列表
                        daXianList={daListA} 
                        
                        xiaoXianMingIdx={-1}
                        
                        // Helpers
                        getRelativeNames={(idx) => {
                            // 簡單顯示大限命宮標記
                            let daName = undefined;
                            if (daSeqA >= 0 && daListA[daSeqA]?.palaceIdx === idx) {
                                daName = '大命';
                            }
                            return { daName };
                        }}
                        getIsBenMingMing={(idx) => idx === engineA!.getMingPos()}
                        getAnchorCoord={getDummyCoords}

                        // Handlers
                        onHistoryBack={dummyNav}
                        onNavigate={dummyNav}
                        onCompatibility={dummyNav}
                        onChangeHour={() => {}}
                        onResetTime={() => {}}
                        onToggleTwin={() => setIsTwinA(!isTwinA)}
                        onToggleInverted={() => setIsRevA(!isRevA)}
                        onToggleSmallLimit={() => setShowXiaoA(!showXiaoA)}
                        onPalaceClick={(idx) => handlePalaceClick('A', idx)} // 設定 A 為發射
                        onTriggerClick={() => {}}
                    />
                </div>
                {/* Chart A Control Bar */}
                <div className="h-12 bg-white border-t border-gray-200 flex overflow-x-auto scrollbar-hide shrink-0">
                    <div className="flex w-full">
                        {daListA.map(limit => (
                            <button key={limit.seq} 
                                onClick={() => { 
                                    // 切換大限，若有鎖定要清除流年
                                    setDaSeqA(limit.seq); 
                                    setLiuYearA(null); 
                                    if(isLocked) setLiuYearB(null); 
                                }}
                                className={`px-2 py-1 text-[10px] border-r border-gray-100 whitespace-nowrap min-w-[60px] flex flex-col items-center justify-center ${daSeqA === limit.seq ? 'bg-gray-600 text-white' : 'text-gray-600'}`}
                            >
                                <span>{limit.name}</span>
                                <span className="text-[9px] opacity-80">{limit.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                {/* Chart A Liu Nian Bar */}
                {daSeqA >= 0 && (
                    <div className="h-8 bg-blue-50 border-t border-blue-100 flex overflow-x-auto scrollbar-hide shrink-0">
                        {getLiuNianList(engineA!, chartA!, daSeqA).map(item => (
                            <button key={item.year}
                                onClick={() => { 
                                    const newYear = liuYearA === item.year ? null : item.year;
                                    setLiuYearA(newYear);
                                    syncTime('A', newYear); // 觸發同步
                                }}
                                className={`px-2 text-[10px] border-r border-blue-200 whitespace-nowrap min-w-[60px] ${liuYearA === item.year ? 'bg-blue-600 text-white' : 'text-blue-600'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Chart (B) */}
            <div className="flex-1 flex flex-col relative">
                <div className="flex-1 relative">
                    <PalaceGrid
                        client={clientB}
                        chartData={chartB}
                        relationships={[]}
                        historyStack={[]}
                        mode="standard"
                        
                        selectedPalace={null}
                        flyingPalace={activeSide === 'B' ? flyingPalace : null} // 發射源
                        daXianSeq={daSeqB}
                        liuNianYear={liuYearB}
                        showXiaoXian={showXiaoB}
                        isReverse={isRevB}
                        isTwinMode={isTwinB}
                        
                        externalGan={null}
                        flyingStarsLookup={flyMapAtoB} // [核心互動] 接收 A 的飛化

                        benMingMajorStarsStr=""
                        currentHourZhi={`${hourB}`}
                        isTimeModified={hourB !== clientB.birthHour}
                        connections={dummyConnections}
                        
                        // [修正] 傳入正確的大限列表
                        daXianList={daListB} 
                        
                        xiaoXianMingIdx={-1}
                        
                        getRelativeNames={(idx) => {
                            let daName = undefined;
                            if (daSeqB >= 0 && daListB[daSeqB]?.palaceIdx === idx) {
                                daName = '大命';
                            }
                            return { daName };
                        }}
                        getIsBenMingMing={(idx) => idx === engineB!.getMingPos()}
                        getAnchorCoord={getDummyCoords}

                        onHistoryBack={dummyNav}
                        onNavigate={dummyNav}
                        onCompatibility={dummyNav}
                        onChangeHour={() => {}}
                        onResetTime={() => {}}
                        onToggleTwin={() => setIsTwinB(!isTwinB)}
                        onToggleInverted={() => setIsRevB(!isRevB)}
                        onToggleSmallLimit={() => setShowXiaoB(!showXiaoB)}
                        onPalaceClick={(idx) => handlePalaceClick('B', idx)} // 設定 B 為發射
                        onTriggerClick={() => {}}
                    />
                </div>
                {/* Chart B Control Bar */}
                <div className="h-12 bg-white border-t border-gray-200 flex overflow-x-auto scrollbar-hide shrink-0">
                    <div className="flex w-full">
                        {daListB.map(limit => (
                            <button key={limit.seq} 
                                onClick={() => { 
                                    setDaSeqB(limit.seq); 
                                    setLiuYearB(null); 
                                    if(isLocked) setLiuYearA(null);
                                }}
                                className={`px-2 py-1 text-[10px] border-r border-gray-100 whitespace-nowrap min-w-[60px] flex flex-col items-center justify-center ${daSeqB === limit.seq ? 'bg-gray-600 text-white' : 'text-gray-600'}`}
                            >
                                <span>{limit.name}</span>
                                <span className="text-[9px] opacity-80">{limit.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                {daSeqB >= 0 && (
                    <div className="h-8 bg-blue-50 border-t border-blue-100 flex overflow-x-auto scrollbar-hide shrink-0">
                        {getLiuNianList(engineB!, chartB!, daSeqB).map(item => (
                            <button key={item.year}
                                onClick={() => { 
                                    const newYear = liuYearB === item.year ? null : item.year;
                                    setLiuYearB(newYear);
                                    syncTime('B', newYear); // 觸發同步
                                }}
                                className={`px-2 text-[10px] border-r border-blue-200 whitespace-nowrap min-w-[60px] ${liuYearB === item.year ? 'bg-blue-600 text-white' : 'text-blue-600'}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

        </div>
    </div>
  );
};