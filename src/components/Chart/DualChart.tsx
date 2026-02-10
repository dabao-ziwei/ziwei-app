import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PalaceGrid } from './PalaceGrid';
import { ZiWeiEngine } from '../../logic/engine';
import { GAN, SIHUA_TABLE, ZHI } from '../../logic/constants';
import { Loader2, ChevronLeft, Lock, Unlock, ArrowRightLeft } from 'lucide-react';
import { Solar } from 'lunar-typescript';
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

const getLiuNianList = (engine: ZiWeiEngine, chartData: any, daXianSeq: number) => {
    if (!engine || !chartData || daXianSeq < 0) return [];
    
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
        list.push({ year, label: `${year}` });
    }
    return list;
};

const getCurrentDaLimitIndex = (chartData: any, engine: ZiWeiEngine) => {
    if (!chartData || !engine) return 0;
    
    const now = new Date();
    const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const currentLunarYear = solar.getLunar().getYear(); 
    
    const virtualAge = currentLunarYear - chartData.lunarYear + 1;

    const startPos = engine.getMingPos();
    const direction = chartData.direction || 1;
    
    for (let i = 0; i < 10; i++) {
        const idx = (startPos + i * direction + 120) % 12;
        const p = chartData.palaces[idx];
        if (virtualAge >= p.ages[0] && virtualAge <= p.ages[1]) {
            return i;
        }
    }
    return 0;
};

const calcNextHour = (currentHour: number, delta: number) => {
    const currentZhiIdx = Math.floor((currentHour + 1) / 2) % 12;
    let nextZhiIdx = currentZhiIdx + delta;
    if (nextZhiIdx < 0) nextZhiIdx = 11;
    if (nextZhiIdx > 11) nextZhiIdx = 0;
    return nextZhiIdx === 0 ? 0 : nextZhiIdx * 2;
};

export const DualChart: React.FC<DualChartProps> = ({ onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const clientA = location.state?.clientA as Client;
  const clientB = location.state?.clientB as Client;

  useEffect(() => {
      if (!clientA || !clientB) {
          navigate('/');
      }
  }, [clientA, clientB, navigate]);

  const [isLocked, setIsLocked] = useState(true);
  const [activeSide, setActiveSide] = useState<'A' | 'B' | null>(null);
  const [flyingPalace, setFlyingPalace] = useState<number | null>(null);

  // Client A State
  const [hourA, setHourA] = useState(clientA?.birthHour || 0);
  const [daSeqA, setDaSeqA] = useState(-1);
  const [liuYearA, setLiuYearA] = useState<number | null>(null);
  const [showXiaoA, setShowXiaoA] = useState(false);
  const [isTwinA, setIsTwinA] = useState(false);
  const [reverseMapA, setReverseMapA] = useState<Record<string, boolean>>({});

  // Client B State
  const [hourB, setHourB] = useState(clientB?.birthHour || 0);
  const [daSeqB, setDaSeqB] = useState(-1);
  const [liuYearB, setLiuYearB] = useState<number | null>(null);
  const [showXiaoB, setShowXiaoB] = useState(false);
  const [isTwinB, setIsTwinB] = useState(false);
  const [reverseMapB, setReverseMapB] = useState<Record<string, boolean>>({});

  const engineA = useMemo(() => clientA ? new ZiWeiEngine(clientA.birthYear, clientA.birthMonth, clientA.birthDay, hourA, clientA.birthMinute, clientA.gender) : null, [clientA, hourA]);
  const engineB = useMemo(() => clientB ? new ZiWeiEngine(clientB.birthYear, clientB.birthMonth, clientB.birthDay, hourB, clientB.birthMinute, clientB.gender) : null, [clientB, hourB]);

  useEffect(() => {
      if (engineA) {
          const chart = engineA.getChartData();
          setDaSeqA(getCurrentDaLimitIndex(chart, engineA));
      }
  }, [engineA]);

  useEffect(() => {
      if (engineB) {
          const chart = engineB.getChartData();
          setDaSeqB(getCurrentDaLimitIndex(chart, engineB));
      }
  }, [engineB]);

  const chartA = useMemo(() => {
      if (!engineA) return null;
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

  const chartB = useMemo(() => {
      if (!engineB) return null;
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

  const daListA = useMemo(() => {
      if (!engineA || !chartA) return [];
      const list = [];
      const startPos = engineA.getMingPos();
      const dir = chartA.direction;
      for (let i=0; i<10; i++) {
          const idx = (startPos + i*dir + 120) % 12;
          const p = chartA.palaces[idx];
          const startYear = chartA.lunarYear + p.ages[0];
          const endYear = chartA.lunarYear + p.ages[1];
          list.push({ 
              seq: i, 
              palaceIdx: idx, 
              startYear: startYear, 
              endYear: endYear, 
              name: `${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]}限`,
              label: `${p.ages[0]}-${p.ages[1]}`,
              startAge: p.ages[0],
              endAge: p.ages[1]
          });
      }
      return list;
  }, [chartA, engineA]);

  const daListB = useMemo(() => {
      if (!engineB || !chartB) return [];
      const list = [];
      const startPos = engineB.getMingPos();
      const dir = chartB.direction;
      for (let i=0; i<10; i++) {
          const idx = (startPos + i*dir + 120) % 12;
          const p = chartB.palaces[idx];
          const startYear = chartB.lunarYear + p.ages[0];
          const endYear = chartB.lunarYear + p.ages[1];
          list.push({ 
              seq: i, 
              palaceIdx: idx, 
              startYear: startYear, 
              endYear: endYear, 
              name: `${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]}限`,
              label: `${p.ages[0]}-${p.ages[1]}`,
              startAge: p.ages[0],
              endAge: p.ages[1]
          });
      }
      return list;
  }, [chartB, engineB]);

  const handleToggleReverseA = () => {
    let key = '';
    if (liuYearA !== null) key = `liu-${liuYearA}`;
    else if (daSeqA >= 0) key = `da-${daSeqA}`;
    else return;
    setReverseMapA(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleReverseB = () => {
    let key = '';
    if (liuYearB !== null) key = `liu-${liuYearB}`;
    else if (daSeqB >= 0) key = `da-${daSeqB}`;
    else return;
    setReverseMapB(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isDaRevA = daSeqA >= 0 ? !!reverseMapA[`da-${daSeqA}`] : false;
  const isLiuRevA = liuYearA ? !!reverseMapA[`liu-${liuYearA}`] : false;
  const isCurrentRevA = liuYearA !== null ? isLiuRevA : (daSeqA >= 0 ? isDaRevA : false);
  const reverseFlagsA = { da: isDaRevA, liu: isLiuRevA, yue: false, ri: false };

  const isDaRevB = daSeqB >= 0 ? !!reverseMapB[`da-${daSeqB}`] : false;
  const isLiuRevB = liuYearB ? !!reverseMapB[`liu-${liuYearB}`] : false;
  const isCurrentRevB = liuYearB !== null ? isLiuRevB : (daSeqB >= 0 ? isDaRevB : false);
  const reverseFlagsB = { da: isDaRevB, liu: isLiuRevB, yue: false, ri: false };

  const syncTime = (source: 'A' | 'B', year: number | null) => {
      if (!isLocked) return; 
      if (source === 'A') {
          if (year === null) {
              setLiuYearB(null);
          } else {
              setLiuYearB(year); 
              const targetDa = daListB.find(d => year >= d.startYear && year <= d.endYear);
              if (targetDa) setDaSeqB(targetDa.seq);
          }
      } else {
          if (year === null) {
              setLiuYearA(null);
          } else {
              setLiuYearA(year);
              const targetDa = daListA.find(d => year >= d.startYear && year <= d.endYear);
              if (targetDa) setDaSeqA(targetDa.seq);
          }
      }
  };

  const handlePalaceClick = (side: 'A' | 'B', index: number) => {
      if (activeSide === side && flyingPalace === index) {
          setActiveSide(null);
          setFlyingPalace(null);
      } else {
          setActiveSide(side);
          setFlyingPalace(index);
      }
  };

  const handleChangeHourA = (delta: number) => {
      const newHour = calcNextHour(hourA, delta);
      setHourA(newHour);
      setDaSeqA(-1); setLiuYearA(null); setShowXiaoA(false);
      setFlyingPalace(null); setActiveSide(null);
      setReverseMapA({});
  };

  const handleChangeHourB = (delta: number) => {
      const newHour = calcNextHour(hourB, delta);
      setHourB(newHour);
      setDaSeqB(-1); setLiuYearB(null); setShowXiaoB(false);
      setFlyingPalace(null); setActiveSide(null);
      setReverseMapB({});
  };

  const flyMapAtoB = useMemo(() => {
      if (activeSide !== 'A' || flyingPalace === null || !chartA) return undefined;
      const gan = chartA.palaces[flyingPalace].ganIndex;
      return getSiHuaMap(gan);
  }, [activeSide, flyingPalace, chartA]);

  const flyMapBtoA = useMemo(() => {
      if (activeSide !== 'B' || flyingPalace === null || !chartB) return undefined;
      const gan = chartB.palaces[flyingPalace].ganIndex;
      return getSiHuaMap(gan);
  }, [activeSide, flyingPalace, chartB]);
  
  const currentRealTimeA = useMemo(() => {
      const now = new Date();
      const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const currentLunarYear = solar.getLunar().getYear();

      if (!chartA) return undefined;
      const virtualAge = currentLunarYear - chartA.lunarYear + 1;
      const daSeq = daListA.findIndex(d => virtualAge >= d.startAge && virtualAge <= d.endAge);
      const displayYear = chartA.lunarYear + virtualAge; 
      return { year: displayYear, daSeq: daSeq >= 0 ? daSeq : -1 };
  }, [chartA, daListA]);

  const currentRealTimeB = useMemo(() => {
      const now = new Date();
      const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
      const currentLunarYear = solar.getLunar().getYear();

      if (!chartB) return undefined;
      const virtualAge = currentLunarYear - chartB.lunarYear + 1;
      const daSeq = daListB.findIndex(d => virtualAge >= d.startAge && virtualAge <= d.endAge);
      const displayYear = chartB.lunarYear + virtualAge; 
      return { year: displayYear, daSeq: daSeq >= 0 ? daSeq : -1 };
  }, [chartB, daListB]);


  if (!clientA || !clientB || !chartA || !chartB) {
      return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>;
  }

  const dummyConnections = { self: -1, tri1: -1, tri2: -1, opp: -1 };
  const getDummyCoords = () => ({ x: 0, y: 0 });
  const dummyNav = () => {};

  const renderControlBar = (
      daList: any[], daSeq: number, setDaSeq: any, setLiuYear: any, targetLiuYearSetter: any, engine: ZiWeiEngine, chart: any, liuYear: number | null, source: 'A' | 'B', realTime: { year: number; daSeq: number } | undefined
  ) => (
      <>
        <div className="h-12 bg-white border-t border-gray-200 flex overflow-x-auto scrollbar-hide shrink-0">
            <div className="flex w-full">
                {daList.map(limit => (
                    <button key={limit.seq} onClick={() => { setDaSeq(limit.seq); setLiuYear(null); if(isLocked) targetLiuYearSetter(null); }} className={`px-1 py-1 text-[10px] border-r border-gray-100 whitespace-nowrap flex-1 min-w-[50px] flex flex-col items-center justify-center relative ${daSeq === limit.seq ? 'bg-gray-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                        {realTime && realTime.daSeq === limit.seq && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                        <span>{limit.name}</span>
                        <span className="text-[9px] opacity-80 scale-90">{limit.label}</span>
                    </button>
                ))}
            </div>
        </div>
        {daSeq >= 0 && (
            <div className="h-9 bg-blue-50 border-t border-blue-100 flex overflow-x-auto scrollbar-hide shrink-0">
                {getLiuNianList(engine, chart, daSeq).map(item => (
                    <button key={item.year} onClick={() => { const newYear = liuYear === item.year ? null : item.year; setLiuYear(newYear); syncTime(source, newYear); }} className={`px-1 text-[11px] font-medium border-r border-blue-200 whitespace-nowrap flex-1 min-w-[40px] relative ${liuYear === item.year ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-100'}`}>
                        {realTime && realTime.year === item.year && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                        {item.label}
                    </button>
                ))}
            </div>
        )}
      </>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0 z-50 h-[56px]">
            <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 text-sm font-bold shadow-sm"><ChevronLeft size={16} /> 返回</button>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><span className="text-blue-600">{clientA.name}</span><ArrowRightLeft size={14} className="text-gray-400" /><span className="text-pink-600">{clientB.name}</span></div>
            </div>
            <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isLocked ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}>
                {isLocked ? <Lock size={14} /> : <Unlock size={14} />} {isLocked ? '時間鎖定' : '獨立操作'}
            </button>
        </div>

        <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 flex flex-col border-r-2 border-gray-300 relative min-w-0">
                <div className="flex-1 relative min-h-0">
                    <PalaceGrid client={clientA} chartData={chartA} relationships={[]} historyStack={[]} mode="standard" selectedPalace={null} flyingPalace={activeSide === 'A' ? flyingPalace : null} daXianSeq={daSeqA} liuNianYear={liuYearA} showXiaoXian={showXiaoA} isReverse={isCurrentRevA} reverseFlags={reverseFlagsA} onToggleInverted={handleToggleReverseA} isTwinMode={isTwinA} externalGan={null} flyingStarsLookup={flyMapBtoA} benMingMajorStarsStr="" currentHourZhi={`${hourA}`} isTimeModified={hourA !== clientA.birthHour} connections={dummyConnections} daXianList={daXianList} xiaoXianMingIdx={-1} getRelativeNames={(idx) => { let daName = undefined; if (daSeqA >= 0 && daListA[daSeqA]?.palaceIdx === idx) daName = '大命'; return { daName }; }} getIsBenMingMing={(idx) => idx === engineA!.getMingPos()} getAnchorCoord={getDummyCoords} onHistoryBack={dummyNav} onNavigate={dummyNav} onCompatibility={dummyNav} onChangeHour={handleChangeHourA} onResetTime={() => setHourA(clientA.birthHour)} onToggleTwin={() => setIsTwinA(!isTwinA)} onToggleSmallLimit={() => setShowXiaoA(!showXiaoA)} onPalaceClick={(idx) => handlePalaceClick('A', idx)} onTriggerClick={() => {}} currentRealTime={currentRealTimeA} />
                </div>
                {renderControlBar(daListA, daSeqA, setDaSeqA, setLiuYearA, setLiuYearB, engineA!, chartA, liuYearA, 'A', currentRealTimeA)}
            </div>

            <div className="flex-1 flex flex-col relative min-w-0">
                <div className="flex-1 relative min-h-0">
                    <PalaceGrid client={clientB} chartData={chartB} relationships={[]} historyStack={[]} mode="standard" selectedPalace={null} flyingPalace={activeSide === 'B' ? flyingPalace : null} daXianSeq={daSeqB} liuNianYear={liuYearB} showXiaoXian={showXiaoB} isReverse={isCurrentRevB} reverseFlags={reverseFlagsB} onToggleInverted={handleToggleReverseB} isTwinMode={isTwinB} externalGan={null} flyingStarsLookup={flyMapAtoB} benMingMajorStarsStr="" currentHourZhi={`${hourB}`} isTimeModified={hourB !== clientB.birthHour} connections={dummyConnections} daXianList={daListB} xiaoXianMingIdx={-1} getRelativeNames={(idx) => { let daName = undefined; if (daSeqB >= 0 && daListB[daSeqB]?.palaceIdx === idx) daName = '大命'; return { daName }; }} getIsBenMingMing={(idx) => idx === engineB!.getMingPos()} getAnchorCoord={getDummyCoords} onHistoryBack={dummyNav} onNavigate={dummyNav} onCompatibility={dummyNav} onChangeHour={handleChangeHourB} onResetTime={() => setHourB(clientB.birthHour)} onToggleTwin={() => setIsTwinB(!isTwinB)} onToggleSmallLimit={() => setShowXiaoB(!showXiaoB)} onPalaceClick={(idx) => handlePalaceClick('B', idx)} onTriggerClick={() => {}} currentRealTime={currentRealTimeB} />
                </div>
                {renderControlBar(daListB, daSeqB, setDaSeqB, setLiuYearB, setLiuYearA, engineB!, chartB, liuYearB, 'B', currentRealTimeB)}
            </div>
        </div>
    </div>
  );
};