import React, { useMemo, useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { PalaceCard } from './PalaceCard';
import type { Client } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { GAN, ZHI, PALACE_NAMES } from '../logic/constants';

interface ChartBoardProps {
  client: Client;
  onBack?: () => void;
}

export const ChartBoard: React.FC<ChartBoardProps> = ({ client, onBack }) => {
  const [selectedPalace, setSelectedPalace] = useState<number | null>(null);
  const [flyingPalace, setFlyingPalace] = useState<number | null>(null);

  const [daXianSeq, setDaXianSeq] = useState<number>(-1);
  const [liuNianYear, setLiuNianYear] = useState<number | null>(null);
  const [showXiaoXian, setShowXiaoXian] = useState<boolean>(false);
  const [currentHour, setCurrentHour] = useState<number>(client.birthHour);

  const chartRef = useRef<HTMLDivElement>(null);

  const engine = useMemo(() => {
    return new ZiWeiEngine(
      client.birthYear,
      client.birthMonth,
      client.birthDay,
      currentHour,
      client.birthMinute,
      client.gender
    );
  }, [client, currentHour]);

  const baseChartData = useMemo(() => engine.getChartData(), [engine]);

  const resetAllStates = () => {
    setDaXianSeq(-1);
    setLiuNianYear(null);
    setShowXiaoXian(false);
    setSelectedPalace(null);
    setFlyingPalace(null);
  };

  const changeHour = (delta: number) => {
    let newHour = currentHour + delta * 2;
    if (newHour < 0) newHour = 22;
    if (newHour > 23) newHour = 0;
    setCurrentHour(newHour);
    resetAllStates();
  };

  const resetTime = () => {
    setCurrentHour(client.birthHour);
    resetAllStates();
  };

  const isTimeModified = currentHour !== client.birthHour;

  const currentHourZhi = useMemo(() => {
    return ZHI[Math.floor((currentHour + 1) / 2) % 12];
  }, [currentHour]);

  const isCleanState =
    daXianSeq === -1 &&
    liuNianYear === null &&
    selectedPalace === null &&
    flyingPalace === null;

  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${client.name}_本命盤.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const daXianList = useMemo(() => {
    const list = [];
    const startPos = engine.getMingPos();
    const direction = baseChartData.direction || 1;

    for (let i = 0; i < 10; i++) {
      const offset = i * direction;
      const palaceIdx = (startPos + offset + 120) % 12;
      const palace = baseChartData.palaces[palaceIdx];
      if (palace) {
        const startYear = baseChartData.lunarYear + palace.ages[0];
        list.push({
          seq: i,
          name: `${
            ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]
          }限`,
          ganZhi: `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`,
          palaceIdx: palaceIdx,
          startAge: palace.ages[0],
          endAge: palace.ages[1],
          startYear: startYear,
        });
      }
    }
    return list;
  }, [baseChartData, engine]);

  const liuNianList = useMemo(() => {
    const targetSeq = daXianSeq === -1 ? 0 : daXianSeq;
    const targetDaXian = daXianList[targetSeq];
    if (!targetDaXian) return [];

    const list = [];
    for (let i = 0; i < 10; i++) {
      const year = targetDaXian.startYear + i;
      const age = targetDaXian.startAge + i;
      const gan = (year - 4) % 10;
      const zhi = (year - 4) % 12;
      list.push({ year, age, label: `${year}${GAN[gan]}${ZHI[zhi]} ${age}` });
    }
    return list;
  }, [daXianSeq, daXianList]);

  const xiaoXianMingIdx = useMemo(() => {
    if (!liuNianYear) return -1;
    const virtualAge = liuNianYear - baseChartData.lunarYear + 1;
    return engine.getXiaoXianPos(virtualAge);
  }, [liuNianYear, baseChartData.lunarYear, engine]);

  const chartData = useMemo(() => {
    let daGan = -1;
    let liuGan = -1;
    let liuZhi = -1;
    let xiaoGan = -1;

    if (daXianSeq >= 0) {
      const target = daXianList[daXianSeq];
      if (target && baseChartData.palaces[target.palaceIdx]) {
        daGan = baseChartData.palaces[target.palaceIdx].ganIndex;
      }
    }

    if (liuNianYear) {
      liuGan = (liuNianYear - 4) % 10;
      liuZhi = (liuNianYear - 4) % 12;
    }

    if (xiaoXianMingIdx >= 0 && showXiaoXian) {
      xiaoGan = baseChartData.palaces[xiaoXianMingIdx].ganIndex;
    }

    engine.computeLimitStars(daGan, liuGan, liuZhi, xiaoGan, showXiaoXian);
    engine.computeSiHua(daGan, liuGan, xiaoGan);

    return engine.getChartData();
  }, [
    engine,
    baseChartData,
    daXianSeq,
    liuNianYear,
    xiaoXianMingIdx,
    daXianList,
    showXiaoXian,
  ]);

  const getRelativeNames = (currentIdx: number) => {
    let daName = undefined;
    let liuName = undefined;
    let xiaoName = undefined;

    if (daXianSeq >= 0) {
      const daMingIdx = daXianList[daXianSeq].palaceIdx;
      const offset = (daMingIdx - currentIdx + 12) % 12;
      daName = `大${PALACE_NAMES[offset].substring(0, 1)}`;
    }

    if (liuNianYear) {
      const liuZhi = (liuNianYear - 4) % 12;
      const liuMingIdx = baseChartData.palaces.findIndex(
        (p) => p.zhiIndex === liuZhi
      );
      if (liuMingIdx >= 0) {
        const offset = (liuMingIdx - currentIdx + 12) % 12;
        liuName = `流${PALACE_NAMES[offset].substring(0, 1)}`;
      }
    }

    if (xiaoXianMingIdx >= 0 && showXiaoXian) {
      const offset = (xiaoXianMingIdx - currentIdx + 12) % 12;
      xiaoName = `小${PALACE_NAMES[offset].substring(0, 1)}`;
    }

    return { daName, liuName, xiaoName };
  };

  const handleDaXianClick = (seq: number) => {
    if (daXianSeq === seq) {
      setDaXianSeq(-1);
      setLiuNianYear(null);
    } else {
      setDaXianSeq(seq);
      setLiuNianYear(null);
    }
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const handleLiuNianClick = (year: number) => {
    if (liuNianYear === year) setLiuNianYear(null);
    else setLiuNianYear(year);
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const toggleXiaoXian = () => {
    setShowXiaoXian(!showXiaoXian);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const handlePalaceClick = (palaceIdx: number) => {
    if (selectedPalace === palaceIdx) {
      setSelectedPalace(null);
    } else {
      setSelectedPalace(palaceIdx);
    }
  };

  const handleTriggerClick = (palaceIdx: number) => {
    if (flyingPalace === palaceIdx) {
      setFlyingPalace(null);
    } else {
      setFlyingPalace(palaceIdx);
    }
  };

  const flyingStarsLookup = useMemo(() => {
    if (flyingPalace === null) return {};
    const targetPalace = baseChartData.palaces[flyingPalace];
    if (!targetPalace) return {};
    return engine.getSiHuaMap(targetPalace.ganIndex);
  }, [flyingPalace, baseChartData, engine]);

  const gridLayout = [
    5,
    6,
    7,
    8,
    4,
    null,
    null,
    9,
    3,
    null,
    null,
    10,
    2,
    1,
    0,
    11,
  ];

  const connections = useMemo(() => {
    if (selectedPalace === null)
      return { self: -1, tri1: -1, tri2: -1, opp: -1 };
    return {
      self: selectedPalace,
      tri1: (selectedPalace + 4) % 12,
      tri2: (selectedPalace + 8) % 12,
      opp: (selectedPalace + 6) % 12,
    };
  }, [selectedPalace]);

  const getAnchorCoord = (palaceIdx: number) => {
    const map: { [key: number]: { x: number; y: number } } = {
      5: { x: 25, y: 25 },
      6: { x: 37.5, y: 25 },
      7: { x: 62.5, y: 25 },
      8: { x: 75, y: 25 },
      4: { x: 25, y: 37.5 },
      9: { x: 75, y: 37.5 },
      3: { x: 25, y: 62.5 },
      10: { x: 75, y: 62.5 },
      2: { x: 25, y: 75 },
      1: { x: 37.5, y: 75 },
      0: { x: 62.5, y: 75 },
      11: { x: 75, y: 75 },
    };
    return map[palaceIdx] || { x: 50, y: 50 };
  };

  const benMingPos = engine.getMingPos();

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden relative">
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 items-start">
        <button
          onClick={onBack}
          className="bg-white text-gray-700 px-3 py-2 rounded-lg shadow-md hover:bg-gray-100 flex items-center gap-1.5 transition-all border border-gray-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="text-sm font-bold">列表</span>
        </button>

        {isCleanState && (
          <button
            onClick={handleDownload}
            className="bg-white text-gray-700 px-3 py-2 rounded-lg shadow-md hover:bg-gray-100 flex items-center gap-1.5 transition-all border border-gray-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-bold">截圖</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center w-full p-1 gap-0 overflow-hidden">
        <div
          ref={chartRef}
          className="relative w-full max-w-[1200px] aspect-[4/3] bg-white border-2 border-gray-800 shadow-xl z-10 shrink-1 min-h-0 flex-1"
        >
          {/* SVG 繪圖層 (僅保留三方四正) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
            {selectedPalace !== null &&
              (() => {
                const pSelf = getAnchorCoord(connections.self);
                const pTri1 = getAnchorCoord(connections.tri1);
                const pTri2 = getAnchorCoord(connections.tri2);
                const pOpp = getAnchorCoord(connections.opp);
                return (
                  <>
                    <line
                      x1={`${pSelf.x}%`}
                      y1={`${pSelf.y}%`}
                      x2={`${pTri1.x}%`}
                      y2={`${pTri1.y}%`}
                      stroke="#4b5563"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={`${pTri1.x}%`}
                      y1={`${pTri1.y}%`}
                      x2={`${pTri2.x}%`}
                      y2={`${pTri2.y}%`}
                      stroke="#4b5563"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={`${pTri2.x}%`}
                      y1={`${pTri2.y}%`}
                      x2={`${pSelf.x}%`}
                      y2={`${pSelf.y}%`}
                      stroke="#4b5563"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                    <line
                      x1={`${pSelf.x}%`}
                      y1={`${pSelf.y}%`}
                      x2={`${pOpp.x}%`}
                      y2={`${pOpp.y}%`}
                      stroke="#4b5563"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </>
                );
              })()}
          </svg>

          <div className="grid grid-cols-4 grid-rows-4 w-full h-full border-collapse">
            {gridLayout.map((palaceIdx, gridPos) => {
              if (palaceIdx === null) {
                if (gridPos === 5)
                  return (
                    <div
                      key="center"
                      className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 border border-gray-300 bg-white z-10 relative"
                    >
                      <div className="flex w-full justify-between items-center mb-2 px-10 mt-6">
                        <button
                          onClick={() => changeHour(-1)}
                          className="text-gray-400 hover:text-gray-800 font-bold text-2xl select-none"
                        >
                          &lt;
                        </button>
                        <div
                          onClick={isTimeModified ? resetTime : undefined}
                          className={`text-lg font-bold select-none ${
                            isTimeModified
                              ? 'text-blue-600 cursor-pointer underline'
                              : 'text-gray-600'
                          }`}
                          title={isTimeModified ? '點擊還原出生時辰' : ''}
                        >
                          {currentHourZhi}時
                        </div>
                        <button
                          onClick={() => changeHour(1)}
                          className="text-gray-400 hover:text-gray-800 font-bold text-2xl select-none"
                        >
                          &gt;
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div className="text-4xl font-bold text-black tracking-widest">
                          {client.name}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 text-base items-center text-center w-full leading-tight">
                        <div className="text-gray-700">
                          {client.gender} {chartData.bureau}
                        </div>
                        <div className="text-gray-600">
                          西元：{chartData.solarDate}
                        </div>
                        <div className="text-gray-600">
                          農曆：{chartData.lunarDate}
                        </div>
                        <div className="text-gray-700 font-medium mt-1">
                          命主：{chartData.mingZhu} 身主：{chartData.shenZhu}
                        </div>
                      </div>

                      {liuNianYear && (
                        <div className="absolute top-3 right-3 flex flex-col items-center gap-1 scale-110">
                          <span className="text-[10px] text-gray-500 font-bold">
                            小限盤
                          </span>
                          <button
                            onClick={toggleXiaoXian}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                              showXiaoXian ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                                showXiaoXian ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                return null;
              }

              const isBenMingMing = palaceIdx === benMingPos;
              const isDaXianMing =
                daXianSeq >= 0 && daXianList[daXianSeq].palaceIdx === palaceIdx;
              const isLiuNianMing =
                liuNianYear !== null &&
                chartData.palaces[palaceIdx].zhiIndex ===
                  (liuNianYear - 4) % 12;
              const isXiaoXianMingPalace =
                liuNianYear !== null && palaceIdx === xiaoXianMingIdx;

              const isDaXianActive = daXianSeq >= 0;
              const isLiuNianActive = liuNianYear !== null;
              const isXiaoXianActive = showXiaoXian;

              const { daName, liuName, xiaoName } = getRelativeNames(palaceIdx);
              const isConnected =
                selectedPalace !== null &&
                Object.values(connections).includes(palaceIdx);
              const showXiaoXianSeal = isXiaoXianMingPalace && !showXiaoXian;

              const isFlyingSource = flyingPalace === palaceIdx;

              return (
                <div
                  key={palaceIdx}
                  onClick={() => handlePalaceClick(palaceIdx)}
                  className={`relative cursor-pointer transition-all duration-200 border border-gray-300 box-border overflow-visible 
                      ${isConnected ? 'bg-red-50' : 'hover:bg-gray-50'}
                      ${
                        isFlyingSource
                          ? 'ring-4 ring-purple-400 z-50 animate-pulse'
                          : ''
                      } 
                  `}
                  style={isFlyingSource ? { animationIterationCount: 3 } : {}}
                >
                  {/* 飛化發射台名牌 */}
                  {isFlyingSource && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-lg z-50 whitespace-nowrap tracking-wide border border-white">
                      {GAN[chartData.palaces[palaceIdx].ganIndex]}干飛化
                    </div>
                  )}

                  <PalaceCard
                    palace={chartData.palaces[palaceIdx]}
                    daName={daName}
                    liuName={liuName}
                    xiaoName={xiaoName}
                    isBody={chartData.palaces[palaceIdx].isBody}
                    isXiaoXianMing={showXiaoXianSeal}
                    isBenMingMing={isBenMingMing}
                    isDaXianMing={isDaXianMing && isDaXianActive}
                    isLiuNianMing={isLiuNianMing && isLiuNianActive}
                    isXiaoXianMingPalace={
                      isXiaoXianMingPalace &&
                      (isLiuNianActive || isXiaoXianActive)
                    }
                    onTriggerClick={() => handleTriggerClick(palaceIdx)}
                    flyingStars={flyingStarsLookup}
                  />
                  {isDaXianMing && isDaXianActive && (
                    <div className="absolute inset-0 border-[3px] border-gray-600 pointer-events-none z-20 opacity-70"></div>
                  )}
                  {isConnected && (
                    <div className="absolute inset-0 border-2 border-red-500 pointer-events-none z-30"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-[1200px] flex flex-col border-x-2 border-b-2 border-gray-800 bg-gray-100 mt-[-2px] z-0 shrink-0">
          <div className="flex w-full overflow-x-auto scrollbar-hide border-b border-gray-300">
            {daXianList.map((limit) => {
              const isActive = daXianSeq === limit.seq;
              return (
                <button
                  key={limit.seq}
                  onClick={() => handleDaXianClick(limit.seq)}
                  className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs ${
                    isActive
                      ? 'bg-gray-600 text-white font-bold'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  <div>
                    {limit.name} {limit.ganZhi}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex w-full overflow-x-auto scrollbar-hide">
            {liuNianList.map((item) => {
              const isActive = liuNianYear === item.year;
              return (
                <button
                  key={item.year}
                  onClick={() => handleLiuNianClick(item.year)}
                  className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold'
                      : 'hover:bg-blue-100 text-gray-600'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
