// FILE: src/components/Chart/DualChart.tsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PalaceGrid, type SiHuaTrace } from './PalaceGrid';
import type { SiHuaClickPayload } from '../PalaceCard';
import { ZiWeiEngine } from '../../logic/engine';
import { GAN, SIHUA_TABLE, ZHI, PALACE_NAMES } from '../../logic/constants';
import { Loader2, ChevronLeft, Lock, Unlock, ArrowRightLeft, PenLine } from 'lucide-react';
import { Solar, Lunar, LunarYear } from 'lunar-typescript';
import type { Client } from '../../db';
import { WhiteboardOverlay } from '../Whiteboard/WhiteboardOverlay';
import { exportAndShareWhiteboard } from '../../logic/whiteboardExport';

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
    const currentYear = now.getFullYear();

    const startPos = engine.getMingPos();
    const direction = chartData.direction || 1;
    
    for (let i = 0; i < 10; i++) {
        const idx = (startPos + i * direction + 120) % 12;
        const p = chartData.palaces[idx];
        const startYear = chartData.lunarYear + p.ages[0];
        const endYear = chartData.lunarYear + p.ages[1];
        if (currentYear >= startYear && currentYear <= endYear) {
            return i;
        }
    }
    return 0;
};

const calcNextHour = (currentHour: number, delta: number) => {
    const hours = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
    let currentIndex = hours.indexOf(currentHour);
    if (currentIndex === -1) {
        currentIndex = hours.findIndex(h => h >= currentHour);
    }
    
    let nextIndex = currentIndex + delta;
    if (nextIndex < 0) nextIndex = hours.length - 1;
    if (nextIndex >= hours.length) nextIndex = 0;
    
    return hours[nextIndex];
};

export const DualChart: React.FC<DualChartProps> = ({ onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dualCaptureRef = useRef<HTMLDivElement>(null);
  
  const clientA = location.state?.clientA as Client;
  const clientB = location.state?.clientB as Client;

  useEffect(() => {
      if (!clientA || !clientB) {
          navigate('/');
      }
  }, [clientA, clientB, navigate]);

  const [isLocked, setIsLocked] = useState(true);
  const [isWhiteboardActive, setIsWhiteboardActive] = useState(false);
  const [activeSide, setActiveSide] = useState<'A' | 'B' | null>(null);
  const [flyingPalace, setFlyingPalace] = useState<number | null>(null);
  const [activeSiHuaTraceA, setActiveSiHuaTraceA] = useState<SiHuaTrace | null>(null);
  const [activeSiHuaTraceB, setActiveSiHuaTraceB] = useState<SiHuaTrace | null>(null);

  const [selfFlyingPalaceA, setSelfFlyingPalaceA] = useState<number | null>(null);
  const [selfFlyingPalaceB, setSelfFlyingPalaceB] = useState<number | null>(null);

  const [hourA, setHourA] = useState(clientA?.birthHour || 0);
  const [daSeqA, setDaSeqA] = useState(-1);
  const [liuYearA, setLiuYearA] = useState<number | null>(null);
  const [showXiaoA, setShowXiaoA] = useState(false);
  const [isTwinA, setIsTwinA] = useState(false);
  const [reverseMapA, setReverseMapA] = useState<Record<string, boolean>>({});
  const [liuMonthA, setLiuMonthA] = useState<number | null>(null);
  const [isLiuMonthLeapA, setIsLiuMonthLeapA] = useState<boolean>(false);
  const [liuDayA, setLiuDayA] = useState<number | null>(null);

  const [hourB, setHourB] = useState(clientB?.birthHour || 0);
  const [daSeqB, setDaSeqB] = useState(-1);
  const [liuYearB, setLiuYearB] = useState<number | null>(null);
  const [showXiaoB, setShowXiaoB] = useState(false);
  const [isTwinB, setIsTwinB] = useState(false);
  const [reverseMapB, setReverseMapB] = useState<Record<string, boolean>>({});
  const [liuMonthB, setLiuMonthB] = useState<number | null>(null);
  const [isLiuMonthLeapB, setIsLiuMonthLeapB] = useState<boolean>(false);
  const [liuDayB, setLiuDayB] = useState<number | null>(null);

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

  const { liuMonthIdxA, liuDayIdxA, liuMonthGanA, liuDayGanA } = useMemo(() => {
      if (!chartA || !liuYearA || liuMonthA === null) {
          return { liuMonthIdxA: -1, liuDayIdxA: -1, liuMonthGanA: -1, liuDayGanA: -1 };
      }
      try {
          const yearZhi = (liuYearA - 4) % 12;
          const douJunPalace = chartA.palaces[2];
          const douJunName = douJunPalace.name;
          const nameIdx = PALACE_NAMES.indexOf(douJunName);
          const offset = (12 - nameIdx) % 12;
          const flowMonthAnchor = (yearZhi + offset) % 12;

          const lunarYear = LunarYear.fromYear(liuYearA);
          const leapMonth = lunarYear.getLeapMonth();

          let monthSteps = liuMonthA - 1;
          if (leapMonth > 0) {
              if (liuMonthA > leapMonth) {
                  monthSteps += 1;
              } else if (liuMonthA === leapMonth && isLiuMonthLeapA) {
                  monthSteps += 1;
              }
          }
          const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;

          let effectiveMonth = isLiuMonthLeapA ? -Math.abs(liuMonthA) : Math.abs(liuMonthA);
          let mGan = -1;
          try {
              const naturalMonthObj = Lunar.fromYmd(liuYearA, effectiveMonth, 1);
              mGan = naturalMonthObj.getMonthGanIndex();
          } catch (e) {
              effectiveMonth = Math.abs(liuMonthA);
              const fallbackObj = Lunar.fromYmd(liuYearA, effectiveMonth, 1);
              mGan = fallbackObj.getMonthGanIndex();
          }

          if (liuDayA === null) {
              return { liuMonthIdxA: flowMonthIdx, liuDayIdxA: -1, liuMonthGanA: mGan, liuDayGanA: -1 };
          }

          let safeDay = Math.min(liuDayA, 30);
          let dGan = -1;
          while (safeDay >= 1) {
              try {
                  const naturalDayObj = Lunar.fromYmd(liuYearA, effectiveMonth, safeDay);
                  dGan = naturalDayObj.getDayGanIndex();
                  break;
              } catch (e) {
                  safeDay--;
              }
          }

          const flowDayIdx = (flowMonthIdx + (safeDay - 1)) % 12;

          return { liuMonthIdxA: flowMonthIdx, liuDayIdxA: flowDayIdx, liuMonthGanA: mGan, liuDayGanA: dGan };
      } catch {
          return { liuMonthIdxA: -1, liuDayIdxA: -1, liuMonthGanA: -1, liuDayGanA: -1 };
      }
  }, [chartA, liuYearA, liuMonthA, isLiuMonthLeapA, liuDayA]);

  const { liuMonthIdxB, liuDayIdxB, liuMonthGanB, liuDayGanB } = useMemo(() => {
      if (!chartB || !liuYearB || liuMonthB === null) {
          return { liuMonthIdxB: -1, liuDayIdxB: -1, liuMonthGanB: -1, liuDayGanB: -1 };
      }
      try {
          const yearZhi = (liuYearB - 4) % 12;
          const douJunPalace = chartB.palaces[2];
          const douJunName = douJunPalace.name;
          const nameIdx = PALACE_NAMES.indexOf(douJunName);
          const offset = (12 - nameIdx) % 12;
          const flowMonthAnchor = (yearZhi + offset) % 12;

          const lunarYear = LunarYear.fromYear(liuYearB);
          const leapMonth = lunarYear.getLeapMonth();

          let monthSteps = liuMonthB - 1;
          if (leapMonth > 0) {
              if (liuMonthB > leapMonth) {
                  monthSteps += 1;
              } else if (liuMonthB === leapMonth && isLiuMonthLeapB) {
                  monthSteps += 1;
              }
          }
          const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;

          let effectiveMonth = isLiuMonthLeapB ? -Math.abs(liuMonthB) : Math.abs(liuMonthB);
          let mGan = -1;
          try {
              const naturalMonthObj = Lunar.fromYmd(liuYearB, effectiveMonth, 1);
              mGan = naturalMonthObj.getMonthGanIndex();
          } catch (e) {
              effectiveMonth = Math.abs(liuMonthB);
              const fallbackObj = Lunar.fromYmd(liuYearB, effectiveMonth, 1);
              mGan = fallbackObj.getMonthGanIndex();
          }

          if (liuDayB === null) {
              return { liuMonthIdxB: flowMonthIdx, liuDayIdxB: -1, liuMonthGanB: mGan, liuDayGanB: -1 };
          }

          let safeDay = Math.min(liuDayB, 30);
          let dGan = -1;
          while (safeDay >= 1) {
              try {
                  const naturalDayObj = Lunar.fromYmd(liuYearB, effectiveMonth, safeDay);
                  dGan = naturalDayObj.getDayGanIndex();
                  break;
              } catch (e) {
                  safeDay--;
              }
          }

          const flowDayIdx = (flowMonthIdx + (safeDay - 1)) % 12;

          return { liuMonthIdxB: flowMonthIdx, liuDayIdxB: flowDayIdx, liuMonthGanB: mGan, liuDayGanB: dGan };
      } catch {
          return { liuMonthIdxB: -1, liuDayIdxB: -1, liuMonthGanB: -1, liuDayGanB: -1 };
      }
  }, [chartB, liuYearB, liuMonthB, isLiuMonthLeapB, liuDayB]);

  const xiaoXianMingIdxA = useMemo(() => {
      if (!liuYearA || !chartA || !engineA) return -1;
      const virtualAge = liuYearA - chartA.lunarYear + 1;
      return engineA.getXiaoXianPos(virtualAge);
  }, [liuYearA, chartA, engineA]);

  const xiaoXianMingIdxB = useMemo(() => {
      if (!liuYearB || !chartB || !engineB) return -1;
      const virtualAge = liuYearB - chartB.lunarYear + 1;
      return engineB.getXiaoXianPos(virtualAge);
  }, [liuYearB, chartB, engineB]);

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
    else key = 'ben';
    setReverseMapA(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleReverseB = () => {
    let key = '';
    if (liuYearB !== null) key = `liu-${liuYearB}`;
    else if (daSeqB >= 0) key = `da-${daSeqB}`;
    else key = 'ben';
    setReverseMapB(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isDaRevA = daSeqA >= 0 ? !!reverseMapA[`da-${daSeqA}`] : false;
  const isLiuRevA = liuYearA ? !!reverseMapA[`liu-${liuYearA}`] : false;
  const isBenRevA = !!reverseMapA['ben'];
  const isCurrentRevA = liuYearA !== null ? isLiuRevA : (daSeqA >= 0 ? isDaRevA : isBenRevA); 
  const reverseFlagsA = { da: isDaRevA, liu: isLiuRevA, yue: false, ri: false, ben: isBenRevA };

  const isDaRevB = daSeqB >= 0 ? !!reverseMapB[`da-${daSeqB}`] : false;
  const isLiuRevB = liuYearB ? !!reverseMapB[`liu-${liuYearB}`] : false;
  const isBenRevB = !!reverseMapB['ben'];
  const isCurrentRevB = liuYearB !== null ? isLiuRevB : (daSeqB >= 0 ? isDaRevB : isBenRevB);
  const reverseFlagsB = { da: isDaRevB, liu: isLiuRevB, yue: false, ri: false, ben: isBenRevB };

  const whiteboardStorageKey = useMemo(() => [
      'dual',
      clientA?.id || 'temporary-a',
      clientB?.id || 'temporary-b',
      hourA,
      hourB,
      daSeqA,
      daSeqB,
      liuYearA ?? 'none',
      liuYearB ?? 'none',
      liuMonthA ?? 'none',
      liuMonthB ?? 'none',
      liuDayA ?? 'none',
      liuDayB ?? 'none',
      isTwinA ? 'twin-a' : 'normal-a',
      isTwinB ? 'twin-b' : 'normal-b',
      isCurrentRevA ? 'reversed-a' : 'forward-a',
      isCurrentRevB ? 'reversed-b' : 'forward-b',
  ].join(':'), [
      clientA?.id,
      clientB?.id,
      daSeqA,
      daSeqB,
      hourA,
      hourB,
      isCurrentRevA,
      isCurrentRevB,
      isTwinA,
      isTwinB,
      liuDayA,
      liuDayB,
      liuMonthA,
      liuMonthB,
      liuYearA,
      liuYearB,
  ]);

  // 同步連動設定
  const handleSetLiuYearA = (year: number | null) => {
      setLiuYearA(year);
      if (year !== null) {
          const targetDa = daListA.find(d => year >= d.startYear && year <= d.endYear);
          if (targetDa) setDaSeqA(targetDa.seq);
      }
      if (isLocked) {
          setLiuYearB(year);
          if (year !== null) {
              const targetDaB = daListB.find(d => year >= d.startYear && year <= d.endYear);
              if (targetDaB) setDaSeqB(targetDaB.seq);
          }
      }
  };

  const handleSetLiuYearB = (year: number | null) => {
      setLiuYearB(year);
      if (year !== null) {
          const targetDa = daListB.find(d => year >= d.startYear && year <= d.endYear);
          if (targetDa) setDaSeqB(targetDa.seq);
      }
      if (isLocked) {
          setLiuYearA(year);
          if (year !== null) {
              const targetDaA = daListA.find(d => year >= d.startYear && year <= d.endYear);
              if (targetDaA) setDaSeqA(targetDaA.seq);
          }
      }
  };

  const syncTime = (source: 'A' | 'B', year: number | null) => {
      if (!isLocked) return; 

      if (source === 'A') {
          if (year === null) {
              setLiuYearB(null);
              setLiuMonthB(null);
              setLiuDayB(null);
          } else {
              setLiuYearB(year); 
              const targetDa = daListB.find(d => year >= d.startYear && year <= d.endYear);
              if (targetDa) setDaSeqB(targetDa.seq);
          }
      } else {
          if (year === null) {
              setLiuYearA(null);
              setLiuMonthA(null);
              setLiuDayA(null);
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

  const clearSiHuaTrace = () => {
      setActiveSiHuaTraceA(null);
      setActiveSiHuaTraceB(null);
  };

  const buildSiHuaTrace = (
      payload: SiHuaClickPayload,
      chart: any,
      engine: ZiWeiEngine | null,
      daSeq: number,
      daList: any[],
      liuYear: number | null,
      xiaoXianMingIdx: number
  ): SiHuaTrace | null => {
      if (!chart || !engine) return null;

      let sourcePalaceIdx = -1;
      let sourceGanIdx = -1;

      if (payload.scope === 'ben') {
          sourcePalaceIdx = engine.getMingPos();
          sourceGanIdx = GAN.indexOf(chart.bazi[0]);
      } else if (payload.scope === 'da') {
          sourcePalaceIdx = daList[daSeq]?.palaceIdx ?? -1;
          sourceGanIdx = sourcePalaceIdx >= 0 ? chart.palaces[sourcePalaceIdx]?.ganIndex ?? -1 : -1;
      } else if (payload.scope === 'liu' && liuYear !== null) {
          sourcePalaceIdx = chart.palaces.findIndex((p: any) => p.zhiIndex === ((liuYear - 4) % 12 + 12) % 12);
          sourceGanIdx = ((liuYear - 4) % 10 + 10) % 10;
      } else if (payload.scope === 'xiao') {
          sourcePalaceIdx = xiaoXianMingIdx;
          sourceGanIdx = sourcePalaceIdx >= 0 ? chart.palaces[sourcePalaceIdx]?.ganIndex ?? -1 : -1;
      }

      if (sourcePalaceIdx < 0 || sourceGanIdx < 0) return null;

      return {
          key: payload.key,
          sourcePalaceIdx,
          targetPalaceIdx: payload.palaceIdx,
          sourceGan: GAN[sourceGanIdx],
          starName: payload.starName,
          scope: payload.scope,
          type: payload.type,
      };
  };

  const handleSiHuaClickA = (payload: SiHuaClickPayload) => {
      if (activeSiHuaTraceA?.key === payload.key) {
          setActiveSiHuaTraceA(null);
          return;
      }
      const trace = buildSiHuaTrace(payload, chartA, engineA, daSeqA, daListA, liuYearA, xiaoXianMingIdxA);
      if (!trace) return;
      setActiveSiHuaTraceA(trace);
      setActiveSiHuaTraceB(null);
  };

  const handleSiHuaClickB = (payload: SiHuaClickPayload) => {
      if (activeSiHuaTraceB?.key === payload.key) {
          setActiveSiHuaTraceB(null);
          return;
      }
      const trace = buildSiHuaTrace(payload, chartB, engineB, daSeqB, daListB, liuYearB, xiaoXianMingIdxB);
      if (!trace) return;
      setActiveSiHuaTraceB(trace);
      setActiveSiHuaTraceA(null);
  };

  useEffect(() => {
      clearSiHuaTrace();
  }, [hourA, daSeqA, liuYearA, showXiaoA, liuMonthA, liuDayA, hourB, daSeqB, liuYearB, showXiaoB, liuMonthB, liuDayB]);

  const handleChangeHourA = (delta: number) => {
      const newHour = calcNextHour(hourA, delta);
      setHourA(newHour);
      setDaSeqA(-1); setLiuYearA(null); setShowXiaoA(false);
      setLiuMonthA(null); setLiuDayA(null);
      setFlyingPalace(null); setActiveSide(null);
      setSelfFlyingPalaceA(null);
      setReverseMapA({});
  };

  const handleChangeHourB = (delta: number) => {
      const newHour = calcNextHour(hourB, delta);
      setHourB(newHour);
      setDaSeqB(-1); setLiuYearB(null); setShowXiaoB(false);
      setLiuMonthB(null); setLiuDayB(null);
      setFlyingPalace(null); setActiveSide(null);
      setSelfFlyingPalaceB(null);
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

  const selfFlyMapA = useMemo(() => {
      if (selfFlyingPalaceA === null || !chartA) return {};
      return engineA!.getSiHuaMap(chartA.palaces[selfFlyingPalaceA].ganIndex);
  }, [selfFlyingPalaceA, chartA, engineA]);

  const selfFlyMapB = useMemo(() => {
      if (selfFlyingPalaceB === null || !chartB) return {};
      return engineB!.getSiHuaMap(chartB.palaces[selfFlyingPalaceB].ganIndex);
  }, [selfFlyingPalaceB, chartB, engineB]);
  
  const currentRealTimeA = useMemo(() => {
      const now = new Date();
      const year = now.getFullYear();
      if (!chartA) return undefined;
      const daSeq = daListA.findIndex(d => year >= d.startYear && year <= d.endYear);
      return { year, daSeq: daSeq >= 0 ? daSeq : -1 };
  }, [chartA, daListA]);

  const currentRealTimeB = useMemo(() => {
      const now = new Date();
      const year = now.getFullYear();
      if (!chartB) return undefined;
      const daSeq = daListB.findIndex(d => year >= d.startYear && year <= d.endYear);
      return { year, daSeq: daSeq >= 0 ? daSeq : -1 };
  }, [chartB, daListB]);

  const getRelativeNamesA = (currentIdx: number) => {
      if (!chartA || !engineA) return {};
      const benMingPos = engineA.getMingPos();

      let daName = undefined, liuName = undefined, xiaoName = undefined, yueName = undefined, riName = undefined;

      if (daSeqA >= 0 && daListA[daSeqA]) {
          const daMingIdx = daListA[daSeqA].palaceIdx;
          const offset = (daMingIdx - currentIdx + 12) % 12;
          daName = `大${PALACE_NAMES[offset].substring(0, 1)}`;
      }

      if (liuYearA) {
          const liuZhi = (liuYearA - 4) % 12;
          const liuMingIdx = chartA.palaces.findIndex((p: any) => p.zhiIndex === liuZhi);
          if (liuMingIdx >= 0) {
              const offset = (liuMingIdx - currentIdx + 12) % 12;
              liuName = `流${PALACE_NAMES[offset].substring(0, 1)}`;
          }
      }

      if (xiaoXianMingIdxA >= 0 && showXiaoA) {
          const offset = (xiaoXianMingIdxA - currentIdx + 12) % 12;
          xiaoName = `小${PALACE_NAMES[offset].substring(0, 1)}`;
      }

      if (liuMonthIdxA >= 0) {
          const offset = (liuMonthIdxA - currentIdx + 12) % 12;
          yueName = `月${PALACE_NAMES[offset].substring(0, 1)}`;
      }
      if (liuDayIdxA >= 0) {
          const offset = (liuDayIdxA - currentIdx + 12) % 12;
          riName = `日${PALACE_NAMES[offset].substring(0, 1)}`;
      }

      return { daName, liuName, xiaoName, yueName, riName };
  };

  const getRelativeNamesB = (currentIdx: number) => {
      if (!chartB || !engineB) return {};
      const benMingPos = engineB.getMingPos();

      let daName = undefined, liuName = undefined, xiaoName = undefined, yueName = undefined, riName = undefined;

      if (daSeqB >= 0 && daListB[daSeqB]) {
          const daMingIdx = daListB[daSeqB].palaceIdx;
          const offset = (daMingIdx - currentIdx + 12) % 12;
          daName = `大${PALACE_NAMES[offset].substring(0, 1)}`;
      }

      if (liuYearB) {
          const liuZhi = (liuYearB - 4) % 12;
          const liuMingIdx = chartB.palaces.findIndex((p: any) => p.zhiIndex === liuZhi);
          if (liuMingIdx >= 0) {
              const offset = (liuMingIdx - currentIdx + 12) % 12;
              liuName = `流${PALACE_NAMES[offset].substring(0, 1)}`;
          }
      }

      if (xiaoXianMingIdxB >= 0 && showXiaoB) {
          const offset = (xiaoXianMingIdxB - currentIdx + 12) % 12;
          xiaoName = `小${PALACE_NAMES[offset].substring(0, 1)}`;
      }

      if (liuMonthIdxB >= 0) {
          const offset = (liuMonthIdxB - currentIdx + 12) % 12;
          yueName = `月${PALACE_NAMES[offset].substring(0, 1)}`;
      }
      if (liuDayIdxB >= 0) {
          const offset = (liuDayIdxB - currentIdx + 12) % 12;
          riName = `日${PALACE_NAMES[offset].substring(0, 1)}`;
      }

      return { daName, liuName, xiaoName, yueName, riName };
  };

  if (!clientA || !clientB || !chartA || !chartB) {
      return <div className="flex h-[100dvh] items-center justify-center"><Loader2 className="animate-spin"/></div>;
  }

  const dummyNav = () => {};

  const handleWhiteboardExport = async () => {
      if (!dualCaptureRef.current) return;
      await exportAndShareWhiteboard(
          dualCaptureRef.current,
          `${clientA.name}_${clientB.name}_合盤_白板紀錄.png`
      );
  };

  const renderControlBar = (
      daList: any[], 
      daSeq: number, 
      setDaSeq: any, 
      setLiuYear: any,
      targetLiuYearSetter: any,
      engine: ZiWeiEngine,
      chart: any,
      liuYear: number | null,
      source: 'A' | 'B',
      realTime: { year: number; daSeq: number } | undefined
  ) => {
      const safeAreaBg = daSeq >= 0 ? 'bg-blue-50' : 'bg-white';
      return (
        <div className={`shrink-0 flex flex-col w-full z-40 pb-[env(safe-area-inset-bottom)] ${safeAreaBg}`}>
            <div className="bg-white border-t border-gray-200 flex overflow-x-auto scrollbar-hide w-full">
                <div className="flex w-full pt-0.5 pb-1">
                    {daList.map(limit => (
                        <button key={limit.seq} 
                            onClick={() => { 
                                setDaSeq(limit.seq); 
                                setLiuYear(null); 
                                if(isLocked) targetLiuYearSetter(null); 
                            }}
                            className={`px-1 py-1 text-[10px] border-r border-gray-100 whitespace-nowrap flex-1 min-w-[50px] flex flex-col items-center justify-center relative ${daSeq === limit.seq ? 'bg-gray-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            {realTime && realTime.daSeq === limit.seq && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                            <span>{limit.name}</span>
                            <span className="text-[9px] opacity-80 scale-90">{limit.label}</span>
                        </button>
                    ))}
                </div>
            </div>
            
            {daSeq >= 0 && (
                <div className="bg-blue-50 border-t border-blue-100 flex overflow-x-auto scrollbar-hide w-full">
                    <div className="flex w-full pt-0.5 pb-1">
                        {getLiuNianList(engine, chart, daSeq).map(item => (
                            <button key={item.year}
                                onClick={() => { 
                                    const newYear = liuYear === item.year ? null : item.year;
                                    setLiuYear(newYear);
                                    syncTime(source, newYear);
                                }}
                                className={`px-1 py-1 text-[11px] font-medium border-r border-blue-200 whitespace-nowrap flex-1 min-w-[40px] relative ${liuYear === item.year ? 'bg-blue-600 text-white font-bold' : 'text-blue-600 hover:bg-blue-100'}`}
                            >
                                {realTime && realTime.year === item.year && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-100 overflow-hidden">
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

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsWhiteboardActive((current) => !current)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isWhiteboardActive ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'}`}
                    title={isWhiteboardActive ? '結束白板書寫' : '開啟白板'}
                >
                    <PenLine size={15} /> 白板
                </button>
                <button
                    onClick={() => setIsLocked(!isLocked)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isLocked ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
                >
                    {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                    {isLocked ? '時間鎖定' : '獨立操作'}
                </button>
            </div>
        </div>

        {/* Dual Grid Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div ref={dualCaptureRef} className="flex-1 flex overflow-hidden relative min-h-0">
            
            {/* Left Chart (A) */}
            <div className="flex-1 flex flex-col border-r-2 border-gray-300 relative min-w-0">
                <div className="flex-1 relative min-h-0">
                    <PalaceGrid
                        presentationScale={isWhiteboardActive ? 1.1 : 1}
                        client={clientA}
                        chartData={chartA}
                        relationships={[]}
                        historyStack={[]}
                        mode="standard"
                        selectedPalace={null}
                        flyingPalace={activeSide === 'A' ? flyingPalace : (selfFlyingPalaceA !== null ? selfFlyingPalaceA : null)}
                        daXianSeq={daSeqA}
                        liuNianYear={liuYearA}
                        showXiaoXian={showXiaoA}
                        
                        isReverse={isCurrentRevA}
                        reverseFlags={reverseFlagsA}
                        onToggleInverted={handleToggleReverseA}
                        
                        isTwinMode={isTwinA}
                        externalGan={null}
                        flyingStarsLookup={selfFlyingPalaceA !== null ? selfFlyMapA : {}}
                        externalSiHuaMap={flyMapBtoA}
                        benMingMajorStarsStr=""
                        currentHourZhi={(() => {
                            let zhi = ZHI[Math.floor((hourA + 1) / 2) % 12];
                            if (Math.floor((hourA + 1) / 2) % 12 === 0) zhi = (hourA === 23 ? '晚子' : '早子');
                            return zhi;
                        })()}
                        isTimeModified={hourA !== clientA.birthHour}
                        connections={{ self: -1, tri1: -1, tri2: -1, opp: -1 }}
                        daXianList={daListA} 
                        xiaoXianMingIdx={xiaoXianMingIdxA}
                        getRelativeNames={getRelativeNamesA}
                        getIsBenMingMing={(idx) => idx === engineA!.getMingPos()}
                        getAnchorCoord={() => ({ x: 0, y: 0 })}
                        onHistoryBack={dummyNav}
                        onNavigate={dummyNav}
                        onCompatibility={dummyNav}
                        onChangeHour={handleChangeHourA}
                        onResetTime={() => setHourA(clientA.birthHour)}
                        onToggleTwin={() => setIsTwinA(!isTwinA)}
                        onToggleSmallLimit={() => setShowXiaoA(!showXiaoA)}
                        onPalaceClick={(idx) => handlePalaceClick('A', idx)}
                        onTriggerClick={(idx) => {
                            setSelfFlyingPalaceA(selfFlyingPalaceA === idx ? null : idx);
                        }}
                        onSiHuaClick={handleSiHuaClickA}
                        onBlankClick={clearSiHuaTrace}
                        activeSiHuaTrace={activeSiHuaTraceA}
                        currentRealTime={currentRealTimeA}
                        showCompass={false}
                        liuMonth={liuMonthA}
                        isLiuMonthLeap={isLiuMonthLeapA}
                        liuDay={liuDayA}
                        onSetLiuYear={handleSetLiuYearA}
                        onSetLiuMonth={(m, isLeap) => {
                            setLiuMonthA(m);
                            setIsLiuMonthLeapA(isLeap);
                            setLiuDayA(null);
                            if (isLocked) {
                                setLiuMonthB(m);
                                setIsLiuMonthLeapB(isLeap);
                                setLiuDayB(null);
                            }
                        }}
                        onSetLiuDay={(d) => {
                            setLiuDayA(d);
                            if (isLocked) {
                                setLiuDayB(d);
                            }
                        }}
                        liuMonthGan={liuMonthGanA}
                        liuDayGan={liuDayGanA}
                        liuMonthIdx={liuMonthIdxA}
                        liuDayIdx={liuDayIdxA}
                    />
                </div>
            </div>

            {/* Right Chart (B) */}
            <div className="flex-1 flex flex-col relative min-w-0">
                <div className="flex-1 relative min-h-0">
                    <PalaceGrid
                        presentationScale={isWhiteboardActive ? 1.1 : 1}
                        client={clientB}
                        chartData={chartB}
                        relationships={[]}
                        historyStack={[]}
                        mode="standard"
                        selectedPalace={null}
                        flyingPalace={activeSide === 'B' ? flyingPalace : (selfFlyingPalaceB !== null ? selfFlyingPalaceB : null)}
                        daXianSeq={daSeqB}
                        liuNianYear={liuYearB}
                        showXiaoXian={showXiaoB}
                        
                        isReverse={isCurrentRevB}
                        reverseFlags={reverseFlagsB}
                        onToggleInverted={handleToggleReverseB}

                        isTwinMode={isTwinB}
                        externalGan={null}
                        flyingStarsLookup={selfFlyingPalaceB !== null ? selfFlyMapB : {}}
                        externalSiHuaMap={flyMapAtoB}
                        benMingMajorStarsStr=""
                        currentHourZhi={(() => {
                            let zhi = ZHI[Math.floor((hourB + 1) / 2) % 12];
                            if (Math.floor((hourB + 1) / 2) % 12 === 0) zhi = (hourB === 23 ? '晚子' : '早子');
                            return zhi;
                        })()}
                        isTimeModified={hourB !== clientB.birthHour}
                        connections={{ self: -1, tri1: -1, tri2: -1, opp: -1 }}
                        daXianList={daListB} 
                        xiaoXianMingIdx={xiaoXianMingIdxB}
                        getRelativeNames={getRelativeNamesB}
                        getIsBenMingMing={(idx) => idx === engineB!.getMingPos()}
                        getAnchorCoord={() => ({ x: 0, y: 0 })}
                        onHistoryBack={dummyNav}
                        onNavigate={dummyNav}
                        onCompatibility={dummyNav}
                        onChangeHour={handleChangeHourB}
                        onResetTime={() => setHourB(clientB.birthHour)}
                        onToggleTwin={() => setIsTwinB(!isTwinB)}
                        onToggleSmallLimit={() => setShowXiaoB(!showXiaoB)}
                        onPalaceClick={(idx) => handlePalaceClick('B', idx)}
                        onTriggerClick={(idx) => {
                            setSelfFlyingPalaceB(selfFlyingPalaceB === idx ? null : idx);
                        }}
                        onSiHuaClick={handleSiHuaClickB}
                        onBlankClick={clearSiHuaTrace}
                        activeSiHuaTrace={activeSiHuaTraceB}
                        currentRealTime={currentRealTimeB}
                        showCompass={false}
                        liuMonth={liuMonthB}
                        isLiuMonthLeap={isLiuMonthLeapB}
                        liuDay={liuDayB}
                        onSetLiuYear={handleSetLiuYearB}
                        onSetLiuMonth={(m, isLeap) => {
                            setLiuMonthB(m);
                            setIsLiuMonthLeapB(isLeap);
                            setLiuDayB(null);
                            if (isLocked) {
                                setLiuMonthA(m);
                                setIsLiuMonthLeapA(isLeap);
                                setLiuDayA(null);
                            }
                        }}
                        onSetLiuDay={(d) => {
                            setLiuDayB(d);
                            if (isLocked) {
                                setLiuDayA(d);
                            }
                        }}
                        liuMonthGan={liuMonthGanB}
                        liuDayGan={liuDayGanB}
                        liuMonthIdx={liuMonthIdxB}
                        liuDayIdx={liuDayIdxB}
                    />
                </div>
            </div>

            <WhiteboardOverlay
                active={isWhiteboardActive}
                storageKey={whiteboardStorageKey}
                onDone={() => setIsWhiteboardActive(false)}
                onExport={handleWhiteboardExport}
            />
          </div>

          <div className="shrink-0 flex w-full">
            <div className="flex-1 min-w-0 border-r-2 border-gray-300">
              {renderControlBar(daListA, daSeqA, setDaSeqA, setLiuYearA, setLiuYearB, engineA!, chartA, liuYearA, 'A', currentRealTimeA)}
            </div>
            <div className="flex-1 min-w-0">
              {renderControlBar(daListB, daSeqB, setDaSeqB, setLiuYearB, setLiuYearA, engineB!, chartB, liuYearB, 'B', currentRealTimeB)}
            </div>
          </div>
        </div>
    </div>
  );
};
