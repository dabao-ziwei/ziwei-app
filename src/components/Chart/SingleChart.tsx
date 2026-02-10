// FILE: src/components/Chart/SingleChart.tsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PalaceGrid } from './PalaceGrid';
import {
  getClient,
  getRelationships,
  getMyProfile,
  loadYearAdviceRules,
  consumeDivinationV2,
  type Client,
  type Relationship,
  type UserProfile,
  type YearAdviceRule,
} from '../../db';

import { ZiWeiEngine } from '../../logic/engine';
import { GAN, ZHI, PALACE_NAMES, SIHUA_TABLE } from '../../logic/constants';
import { Loader2, UserPlus, X, ChevronLeft, Camera, Compass, Sparkles, MessageCircle, Users } from 'lucide-react';
import { getFeaturePermission } from '../../logic/permissions';
import { Lunar, LunarYear } from 'lunar-typescript';
import { YearlyAnalysisBoard } from './YearlyAnalysisBoard';
import { YearlyAnalysisDrawer } from './YearlyAnalysisDrawer';
import { scanYearlyAdvice } from '../../logic/advice/yearAdvice';
import { usePaywall, type PaywallMode } from '../../hooks/usePaywall';
import PaywallModal from '../Paywall/PaywallModal';

const OFFICIAL_SITE_URL = 'https://www.dabao.life';

interface SingleChartProps {
  client?: Client;
  onBack?: () => void;
  mode?: 'standard' | 'divination';
}

// ... (中間邏輯函數保持不變: getSiHuaMap, getRecursiveSum, getDivinationStem, calcNextHour, classNames)
// 請保留原有的函數定義，此處為了版面整潔省略
const getSiHuaMap = (ganIndex: number) => {
  if (ganIndex < 0 || ganIndex > 9) return {};
  const ganChar = GAN[ganIndex];
  const stars = SIHUA_TABLE[ganChar];
  if (!stars) return {};
  return {
    [stars[0]]: '祿', [stars[1]]: '權', [stars[2]]: '科', [stars[3]]: '忌',
  } as Record<string, '祿' | '權' | '科' | '忌'>;
};
const getRecursiveSum = (n: number): number => {
  let sum = n;
  while (sum > 12) {
    let tempSum = 0;
    const digits = sum.toString().split('').map(Number);
    digits.forEach((d) => (tempSum += d));
    sum = tempSum;
  }
  return sum;
};
const getDivinationStem = (n: number): number => (n - 3 + 10) % 10;
const calcNextHour = (currentHour: number, delta: number) => {
  const hours = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
  let currentIndex = hours.indexOf(currentHour);
  if (currentIndex === -1) currentIndex = hours.findIndex((h) => h >= currentHour);
  let nextIndex = currentIndex + delta;
  if (nextIndex < 0) nextIndex = hours.length - 1;
  if (nextIndex >= hours.length) nextIndex = 0;
  return hours[nextIndex];
};
function classNames(...xs: Array<string | false | null | undefined>) { return xs.filter(Boolean).join(' '); }

export const SingleChart: React.FC<SingleChartProps> = ({ client: propClient, onBack, mode = 'standard' }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [client, setClient] = useState<Client | null>(propClient || location.state?.client || null);
  const [historyStack, setHistoryStack] = useState<Client[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  const [currentHour, setCurrentHour] = useState<number>(() => {
    if (propClient) return propClient.birthHour;
    if (location.state?.client) return location.state.client.birthHour;
    return -1;
  });

  const [loading, setLoading] = useState(!client);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [selectedPalace, setSelectedPalace] = useState<number | null>(null);
  const [flyingPalace, setFlyingPalace] = useState<number | null>(null);
  
  const [daXianSeq, setDaXianSeq] = useState<number>(-1);
  const [liuNianYear, setLiuNianYear] = useState<number | null>(null);
  const [showXiaoXian, setShowXiaoXian] = useState<boolean>(false);
  const [isTwinMode, setIsTwinMode] = useState<boolean>(false);
  const [showCompass, setShowCompass] = useState<boolean>(false);
  const [reverseMap, setReverseMap] = useState<Record<string, boolean>>({});
  const [liuMonth, setLiuMonth] = useState<number | null>(null);
  const [isLiuMonthLeap, setIsLiuMonthLeap] = useState<boolean>(false);
  const [liuDay, setLiuDay] = useState<number | null>(null);

  const divNum = location.state?.divNum || (client as any)?.divNum;
  const isDivinationReady = !!divNum;

  const [isExternalInputOpen, setIsExternalInputOpen] = useState(false);
  const [externalYearStr, setExternalYearStr] = useState('');
  const [externalYearType, setExternalYearType] = useState<'west' | 'roc'>('roc');
  const [externalGan, setExternalGan] = useState<number | null>(null);
  const [isYearlyDrawerOpen, setIsYearlyDrawerOpen] = useState(false);
  const [analysisYear, setAnalysisYear] = useState<number>(new Date().getFullYear());
  const [adviceRules, setAdviceRules] = useState<YearAdviceRule[]>([]);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallMode, setPaywallMode] = useState<PaywallMode>('CONFIRM_DEDUCT');
  
  const { checkAccess } = usePaywall(userProfile);
  const chartRef = useRef<HTMLDivElement>(null);
  const majorRowRef = useRef<HTMLDivElement | null>(null); 
  
  // [新增] 狀態：顯示給用戶的價格與公告
  const [currentCost, setCurrentCost] = useState(50);
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');

  useEffect(() => {
    getMyProfile().then(setUserProfile);
    loadYearAdviceRules().then(setAdviceRules);

    const fetchData = async () => {
      if (client) {
        setLoading(false);
        if (client.id && !client.id.startsWith('temp-') && mode !== 'divination') {
          getRelationships(client.id).then(setRelationships);
        } else {
          setRelationships([]);
        }
        if (currentHour === -1) setCurrentHour(client.birthHour);
        return;
      }

      if (id) {
        setLoading(true);
        try {
          const data = await getClient(id);
          if (data) {
            setClient(data);
            setCurrentHour(data.birthHour);
            getRelationships(data.id).then(setRelationships);
          } else {
            navigate('/list', { replace: true });
          }
        } catch (e) {
          navigate('/list', { replace: true });
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/list');
      }
    };
    fetchData();
  }, [id, client, navigate, mode, currentHour]);

  const canTwin = useMemo(() => getFeaturePermission(userProfile, 'twin'), [userProfile]);
  const canInvert = useMemo(() => getFeaturePermission(userProfile, 'inverted'), [userProfile]);
  const canScreenshot = useMemo(() => getFeaturePermission(userProfile, 'screenshot'), [userProfile]);
  const canDual = useMemo(() => getFeaturePermission(userProfile, 'dual_chart'), [userProfile]);
  const canFlying = useMemo(() => getFeaturePermission(userProfile, 'flying_star'), [userProfile]);
  const canXiao = useMemo(() => getFeaturePermission(userProfile, 'xiao_limit'), [userProfile]);
  const canLiuMonth = useMemo(() => getFeaturePermission(userProfile, 'liu_month'), [userProfile]);
  const canLiuDay = useMemo(() => getFeaturePermission(userProfile, 'liu_day'), [userProfile]);

  const baseEngine = useMemo(() => {
    if (!client || currentHour === -1) return null;
    try {
      return new ZiWeiEngine(client.birthYear, client.birthMonth, client.birthDay, currentHour, client.birthMinute, client.gender);
    } catch { return null; }
  }, [client, currentHour]);

  const baseChartData = useMemo(() => baseEngine?.getChartData(), [baseEngine]);

  const { liuMonthIdx, liuDayIdx, liuMonthGan, liuDayGan } = useMemo(() => {
    if (!baseChartData || !liuNianYear || liuMonth === null) return { liuMonthIdx: -1, liuDayIdx: -1, liuMonthGan: -1, liuDayGan: -1 };
    
    const yearZhi = (liuNianYear - 4) % 12;
    const douJunPalace = baseChartData.palaces[2];
    const nameIdx = PALACE_NAMES.indexOf(douJunPalace.name);
    const offset = (12 - nameIdx) % 12;
    const flowMonthAnchor = (yearZhi + offset) % 12;
    const lunarYear = LunarYear.fromYear(liuNianYear);
    const leapMonth = lunarYear.getLeapMonth();
    let monthSteps = liuMonth - 1;
    if (leapMonth > 0) {
      if (liuMonth > leapMonth) monthSteps += 1;
      else if (liuMonth === leapMonth && isLiuMonthLeap) monthSteps += 1;
    }
    const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;
    const effectiveMonth = isLiuMonthLeap ? -Math.abs(liuMonth) : Math.abs(liuMonth);
    const naturalMonthObj = Lunar.fromYmd(liuNianYear, effectiveMonth, 1);
    const mGan = naturalMonthObj.getMonthGanIndex();

    if (liuDay === null) return { liuMonthIdx: flowMonthIdx, liuDayIdx: -1, liuMonthGan: mGan, liuDayGan: -1 };

    const flowDayIdx = (flowMonthIdx + (liuDay - 1)) % 12;
    const naturalDayObj = Lunar.fromYmd(liuNianYear, effectiveMonth, liuDay);
    const dGan = naturalDayObj.getDayGanIndex();

    return { liuMonthIdx: flowMonthIdx, liuDayIdx: flowDayIdx, liuMonthGan: mGan, liuDayGan: dGan };
  }, [baseChartData, liuNianYear, liuMonth, isLiuMonthLeap, liuDay]);

  const daXianList = useMemo(() => {
    if (!baseChartData || !baseEngine || mode === 'divination') return [];
    const list: any[] = [];
    const startPos = baseEngine.getMingPos();
    const direction = baseChartData.direction || 1;
    for (let i = 0; i < 10; i++) {
      const offset = i * direction;
      const palaceIdx = (startPos + offset + 120) % 12;
      const palace = baseChartData.palaces[palaceIdx];
      if (palace) {
        const startYear = baseChartData.lunarYear + palace.ages[0];
        list.push({
          seq: i,
          name: `${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]}限`,
          ganZhi: `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`,
          palaceIdx, startAge: palace.ages[0], endAge: palace.ages[1], startYear,
        });
      }
    }
    return list;
  }, [baseChartData, baseEngine, mode]);

  const liuNianList = useMemo(() => {
    if (mode === 'divination') return [];
    const targetSeq = daXianSeq === -1 ? 0 : daXianSeq;
    const targetDaXian = daXianList[targetSeq];
    
    if (!targetDaXian) return [];

    const list: any[] = [];
    for (let i = 0; i < 10; i++) {
      const year = targetDaXian.startYear + i;
      const age = targetDaXian.startAge + i;
      const gan = (year - 4) % 10;
      const zhi = (year - 4) % 12;
      list.push({ year, age, label: `${year}${GAN[gan]}${ZHI[zhi]} ${age}` });
    }
    return list;
  }, [daXianSeq, daXianList, mode]);

  const currentRealTime = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    if (!baseChartData || !baseEngine) return undefined;
    const virtualAge = year - baseChartData.lunarYear + 1;
    const daSeq = daXianList.findIndex((d: any) => virtualAge >= d.startAge && virtualAge <= d.endAge);
    return { year, daSeq: daSeq >= 0 ? daSeq : -1 };
  }, [baseChartData, baseEngine, daXianList]);

  useEffect(() => {
    if (liuNianYear && liuNianList.length > 0) {
      const exists = liuNianList.find((l: any) => l.year === liuNianYear);
      if (!exists && daXianSeq !== -1) {
         handleLiuNianClick(liuNianList[0].year);
      }
    }
  }, [liuNianList, daXianSeq]);

  const chartData = useMemo(() => {
    if (!client || currentHour === -1) return null;
    let displayEngine: ZiWeiEngine;
    try {
      displayEngine = new ZiWeiEngine(client.birthYear, client.birthMonth, client.birthDay, currentHour, client.birthMinute, client.gender);
    } catch { return null; }
    if (mode === 'divination') return displayEngine.getChartData();

    const effectiveDaXianSeq = daXianSeq === -1 ? 0 : daXianSeq;

    let daGan = -1, liuGan = -1, liuZhi = -1, xiaoGan = -1;
    const tempBaseData = displayEngine.getChartData();
    const startPos = displayEngine.getMingPos();
    const direction = tempBaseData.direction || 1;

    if (effectiveDaXianSeq >= 0) {
      const offset = effectiveDaXianSeq * direction;
      const daXianPalaceIdx = (startPos + offset + 120) % 12;
      const p = tempBaseData.palaces[daXianPalaceIdx];
      if (p) daGan = p.ganIndex;
    }
    if (liuNianYear) {
      liuGan = (liuNianYear - 4) % 10;
      liuZhi = (liuNianYear - 4) % 12;
    }
    if (liuNianYear && showXiaoXian) {
      const virtualAge = liuNianYear - tempBaseData.lunarYear + 1;
      const xiaoPos = displayEngine.getXiaoXianPos(virtualAge);
      if (xiaoPos >= 0) xiaoGan = tempBaseData.palaces[xiaoPos].ganIndex;
    }

    displayEngine.computeLimitStars(daGan, liuGan, liuZhi, xiaoGan, showXiaoXian);
    displayEngine.computeSiHua(daGan, liuGan, xiaoGan);

    return displayEngine.getChartData();
  }, [client, currentHour, daXianSeq, liuNianYear, showXiaoXian, mode, isDivinationReady, divNum]);

  const adviceResult = useMemo(() => {
    if (!chartData || !analysisYear) return undefined;
    return scanYearlyAdvice(chartData, analysisYear);
  }, [chartData, analysisYear]);
  
  const { divMingIndex, divSiHuaMap } = useMemo(() => {
    if (mode !== 'divination' || !divNum || divNum.length !== 4) return { divMingIndex: -1, divSiHuaMap: undefined };
    const numAB = parseInt(divNum[0] + divNum[1]);
    const finalAB = getRecursiveSum(numAB);
    const targetZhiIndex = finalAB - 1;
    const foundMingIdx = chartData?.palaces.findIndex((p) => p.zhiIndex === targetZhiIndex) ?? -1;
    const numCD = parseInt(divNum[2] + divNum[3]);
    const finalCD = getRecursiveSum(numCD);
    const ganIdx = getDivinationStem(finalCD);
    return { divMingIndex: foundMingIdx, divSiHuaMap: getSiHuaMap(ganIdx) };
  }, [divNum, mode, chartData]);

  const activeExtraSiHua = useMemo(() => {
    if (externalGan !== null) return getSiHuaMap(externalGan);
    if (liuDayGan !== -1) return getSiHuaMap(liuDayGan);
    if (liuMonthGan !== -1) return getSiHuaMap(liuMonthGan);
    return undefined;
  }, [externalGan, liuDayGan, liuMonthGan]);

  const flyingStarsLookup = (() => {
    if (flyingPalace === null) return {};
    const targetPalace = chartData!.palaces[flyingPalace];
    if (!targetPalace) return {};
    return getSiHuaMap(targetPalace.ganIndex);
  })();

  const benMingPos = baseEngine ? baseEngine.getMingPos() : 0;
  const getIsBenMingMing = (palaceIdx: number) => {
    if (mode === 'divination') return palaceIdx === divMingIndex;
    return palaceIdx === benMingPos;
  };

  const benMingMajorStarsStr = useMemo(() => {
    if (!baseEngine || !baseChartData) return '';
    const pos = mode === 'divination' && divMingIndex !== -1 ? divMingIndex : baseEngine.getMingPos();
    if (pos === -1) return '';
    const p = chartData?.palaces[pos] || baseChartData.palaces[pos];
    if (p && p.majorStars.length > 0) return `(${p.majorStars.map((s) => s.name).join('、')})`;
    return '(無主星)';
  }, [baseEngine, baseChartData, mode, chartData, divMingIndex]);

  const handleDaXianClick = (seq: number) => {
    setDaXianSeq(daXianSeq === seq ? -1 : seq);
    setLiuNianYear(null);
    setLiuMonth(null); setLiuDay(null); setShowXiaoXian(false); setFlyingPalace(null); setSelectedPalace(null);
  };

  const handleLiuNianClick = (year: number) => {
    setLiuNianYear(liuNianYear === year ? null : year);
    setLiuMonth(null); setLiuDay(null); setShowXiaoXian(false); setFlyingPalace(null); setSelectedPalace(null);
  };

  const handleExternalYearSubmit = () => {
    if (!externalYearStr) return;
    const val = parseInt(externalYearStr);
    if (isNaN(val)) return; 
    let westYear = val;
    if (externalYearType === 'roc') westYear = val + 1911;
    let gan = (westYear - 4) % 10;
    if (gan < 0) gan += 10;
    setExternalGan(gan);
    setIsExternalInputOpen(false);
  };

  const resetAllStates = () => {
    setDaXianSeq(-1); setLiuNianYear(null); setShowXiaoXian(false);
    setLiuMonth(null); setIsLiuMonthLeap(false); setLiuDay(null);
    setSelectedPalace(null); setFlyingPalace(null); setIsTwinMode(false); setReverseMap({});
  };

  const changeHour = (delta: number) => {
    const nextHour = calcNextHour(currentHour, delta);
    setCurrentHour(nextHour);
    resetAllStates();
  };
  const resetTime = () => { setCurrentHour(client!.birthHour); resetAllStates(); };
  
  const handleBack = () => { if (onBack) onBack(); else navigate(-1); };
  
  const handleHistoryBack = () => {
    if (historyStack.length > 0) {
      const prevClient = historyStack[historyStack.length - 1];
      setHistoryStack((prev) => prev.slice(0, -1));
      setClient(prevClient);
      setCurrentHour(prevClient.birthHour);
      resetAllStates();
    } else {
      handleBack();
    }
  };
  
  const handleNavigateToRelation = (target: Client) => {
    if (client) {
      setHistoryStack((prev) => [...prev, client]);
      setClient(target);
      setCurrentHour(target.birthHour);
      resetAllStates();
    }
  };
  
  const handleCompatibility = (target: Client) => {
    if (!client) return;
    navigate('/compatibility', {
        state: {
            clientA: client,
            clientB: target,
        },
    });
  };
  
  const toggleXiaoXian = () => {
    setShowXiaoXian(!showXiaoXian);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };
  const handlePalaceClick = (palaceIdx: number) => setSelectedPalace(selectedPalace === palaceIdx ? null : palaceIdx);
  const handleTriggerClick = (palaceIdx: number) => setFlyingPalace(flyingPalace === palaceIdx ? null : palaceIdx);

  // [P0] 使用 Hook 的動態價格，不再引用常數
  const handleDivinationClick = async () => {
    const access = checkAccess();
    setCurrentCost(access.cost);
    setCurrentAnnouncement(access.announcement);

    if (access.canAccess) {
      if (access.mode === 'SOFT_NOTICE' || access.mode === 'CONFIRM_DEDUCT') {
        setPaywallMode(access.mode);
        setIsPaywallOpen(true);
        return;
      }
      navigate('/lucky');
    } else {
      setPaywallMode(access.mode);
      setIsPaywallOpen(true);
    }
  };

  useEffect(() => {
    if (liuNianYear) setAnalysisYear(liuNianYear);
    else setAnalysisYear(new Date().getFullYear());
  }, [liuNianYear]);

  const isBenMingState = daXianSeq === -1 && liuNianYear === null;
  const isCleanState = isBenMingState && flyingPalace === null && selectedPalace === null && externalGan === null && mode !== 'divination';
  const isTimeModified = currentHour !== client?.birthHour;
  let currentHourZhi = ZHI[Math.floor((currentHour + 1) / 2) % 12];
  if (Math.floor((currentHour + 1) / 2) % 12 === 0) currentHourZhi = currentHour === 23 ? '晚子' : '早子';

  const connections = (() => {
    if (selectedPalace === null) return { self: -1, tri1: -1, tri2: -1, opp: -1 };
    return { self: selectedPalace, tri1: (selectedPalace + 4) % 12, tri2: (selectedPalace + 8) % 12, opp: (selectedPalace + 6) % 12 };
  })();
  const getAnchorCoord = (palaceIdx: number) => {
    const map: { [key: number]: { x: number; y: number } } = {
      5: { x: 25, y: 25 }, 6: { x: 37.5, y: 25 }, 7: { x: 62.5, y: 25 }, 8: { x: 75, y: 25 },
      4: { x: 25, y: 37.5 }, 9: { x: 75, y: 37.5 }, 3: { x: 25, y: 62.5 }, 10: { x: 75, y: 62.5 },
      2: { x: 25, y: 75 }, 1: { x: 37.5, y: 75 }, 0: { x: 62.5, y: 75 }, 11: { x: 75, y: 75 },
    };
    return map[palaceIdx] || { x: 50, y: 50 };
  };
  
  const xiaoXianMingIdx = useMemo(() => {
    if (!liuNianYear || !baseChartData || !baseEngine) return -1;
    const virtualAge = liuNianYear - baseChartData.lunarYear + 1;
    return baseEngine.getXiaoXianPos(virtualAge);
  }, [liuNianYear, baseChartData, baseEngine]);

  const handleToggleReverse = () => {
    if (canInvert === 'hidden' || canInvert === 'disabled') return;
    let key = '';
    if (liuDay !== null && liuMonth !== null && liuNianYear !== null) key = `ri-${liuNianYear}-${liuMonth}-${liuDay}`;
    else if (liuMonth !== null && liuNianYear !== null) key = `yue-${liuNianYear}-${liuMonth}`;
    else if (liuNianYear !== null) key = `liu-${liuNianYear}`;
    else if (daXianSeq >= 0) key = `da-${daXianSeq}`;
    else return;
    setReverseMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isDaRev = daXianSeq >= 0 ? !!reverseMap[`da-${daXianSeq}`] : false;
  const isLiuRev = liuNianYear ? !!reverseMap[`liu-${liuNianYear}`] : false;
  const isYueRev = liuNianYear && liuMonth ? !!reverseMap[`yue-${liuNianYear}-${liuMonth}`] : false;
  const isRiRev = liuNianYear && liuMonth && liuDay ? !!reverseMap[`ri-${liuNianYear}-${liuMonth}-${liuDay}`] : false;

  const reverseFlags = { da: isDaRev, liu: isLiuRev, yue: isYueRev, ri: isRiRev };

  let isCurrentReverseOn = false;
  if (liuDay !== null) isCurrentReverseOn = isRiRev;
  else if (liuMonth !== null) isCurrentReverseOn = isYueRev;
  else if (liuNianYear !== null) isCurrentReverseOn = isLiuRev;
  else if (daXianSeq >= 0) isCurrentReverseOn = isDaRev;

  const getRelativeNames = (currentIdx: number) => {
    const mingIdx = mode === 'divination' && divMingIndex !== -1 ? divMingIndex : daXianSeq >= 0 ? daXianList[daXianSeq].palaceIdx : liuNianYear ? chartData!.palaces.findIndex((p) => p.zhiIndex === (liuNianYear - 4) % 12) : benMingPos;
    if (mode === 'divination') {
        if (divMingIndex === -1) return {};
        const offset = (divMingIndex - currentIdx + 12) % 12;
        return { divinationName: PALACE_NAMES[offset] };
    }
    let daName, liuName, xiaoName, yueName, riName;
    if (daXianSeq >= 0 && daXianList[daXianSeq]) {
        const daMingIdx = daXianList[daXianSeq].palaceIdx;
        const offset = (daMingIdx - currentIdx + 12) % 12;
        daName = `大${PALACE_NAMES[offset].substring(0, 1)}`;
    }
    if (liuNianYear) {
        const liuZhi = (liuNianYear - 4) % 12;
        const liuMingIdx = chartData!.palaces.findIndex(p => p.zhiIndex === liuZhi);
        if (liuMingIdx >= 0) {
            const offset = (liuMingIdx - currentIdx + 12) % 12;
            liuName = `流${PALACE_NAMES[offset].substring(0, 1)}`;
        }
    }
    if (xiaoXianMingIdx >= 0 && showXiaoXian) {
        const offset = (xiaoXianMingIdx - currentIdx + 12) % 12;
        xiaoName = `小${PALACE_NAMES[offset].substring(0, 1)}`;
    }
    if (liuMonthIdx >= 0) { const offset = (liuMonthIdx - currentIdx + 12) % 12; yueName = `月${PALACE_NAMES[offset].substring(0, 1)}`; }
    if (liuDayIdx >= 0) { const offset = (liuDayIdx - currentIdx + 12) % 12; riName = `日${PALACE_NAMES[offset].substring(0, 1)}`; }
    return { daName, liuName, xiaoName, yueName, riName };
  };

  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { cacheBust: true, backgroundColor: '#ffffff', filter: (node) => !(node.classList?.contains('no-screenshot')) });
      const link = document.createElement('a');
      let suffix = mode === 'divination' ? '_紫占' : '_本命盤';
      if (isCurrentReverseOn) suffix += '_顛倒';
      link.download = `${client!.name}${suffix}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error(err); }
  };

  if (loading || !client || !baseChartData || !baseEngine || !chartData) {
    return <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-gray-500" size={48} /></div>;
  }

  // Bottom Bar (保持原樣，省略)
  const bottomBar = (<div className="sc-bottomWrap"><div className="sc-bottomInner"><div className="sc-row" ref={majorRowRef}>{daXianList.map((m:any,i:number)=>{const isActive=daXianSeq===m.seq;const isRealTime=currentRealTime&&currentRealTime.daSeq===m.seq;return(<button key={`${m.name}-${i}`} className={classNames('sc-chip',isActive&&'sc-chipActive')} onClick={()=>handleDaXianClick(m.seq)} type="button">{isRealTime&&<div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"/>}{m.name} {m.ganZhi}</button>)})}</div><div className="sc-row">{liuNianList.map((y:any)=>{const isActive=liuNianYear===y.year;const isRealTime=currentRealTime&&currentRealTime.year===y.year;return(<button key={String(y.year)} className={classNames('sc-chip',isActive&&'sc-chipActive')} onClick={()=>handleLiuNianClick(y.year)} type="button">{isRealTime&&<div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"/>}{y.label}</button>)})}</div></div><style>{`.sc-bottomWrap{position:sticky;bottom:0;z-index:50;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid rgba(0,0,0,0.08);}.sc-bottomInner{padding:8px;display:flex;flex-direction:column;gap:6px;}.sc-row{display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;}.sc-row::-webkit-scrollbar{display:none;}.sc-chip{flex:0 0 auto;height:32px;padding:0 12px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;color:#4b5563;font-size:13px;font-weight:500;line-height:30px;white-space:nowrap;user-select:none;-webkit-tap-highlight-color:transparent;position:relative;transition:all 0.2s;}.sc-chip:active{transform:scale(0.98);}.sc-chipActive{border-color:#4f46e5;background:#4f46e5;color:white;font-weight:700;box-shadow:0 2px 4px rgba(79, 70, 229, 0.2);}`}</style></div>);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden relative sc-page">
      <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0 z-50 h-[56px]">
        <button onClick={handleBack} className="bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm"><ChevronLeft size={16} /> 列表</button>
        {mode === 'standard' && (
          <div className="flex gap-2">
             <button onClick={() => setShowCompass(!showCompass)} className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm border ${showCompass ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}><Compass size={16} /></button>
             
             {canFlying !== 'hidden' && (externalGan !== null ? (<div className="flex items-center gap-1 bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg animate-in fade-in"><span className="text-sm font-bold text-purple-700">{GAN[externalGan]}干飛化</span><button onClick={() => { setExternalGan(null); setExternalYearStr(''); }} className="text-purple-400 hover:text-purple-600 ml-1"><X size={16} /></button></div>) : (<button onClick={() => setIsExternalInputOpen(true)} className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm bg-white text-purple-700 border-purple-200 hover:bg-purple-50"><UserPlus size={16} /><span className="hidden sm:inline">看他人生年飛化</span><span className="sm:hidden">他年</span></button>))}
             
             <button onClick={() => { setAnalysisYear(new Date().getFullYear()); setIsYearlyDrawerOpen(true); }} className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50" title="查看年度建議"><Sparkles size={16} /><span className="hidden sm:inline">年度建議</span><span className="sm:hidden">年度</span></button>

             {canDual !== 'hidden' && (
              <button onClick={() => handleCompatibility(client!)} disabled={canDual === 'disabled'} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-sm font-bold shadow-md shadow-purple-200 ${canDual === 'disabled' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`} title={canDual === 'disabled' ? '權限已到期' : '雙人合盤'}><Users size={16} /><span className="hidden sm:inline">雙人合盤</span><span className="sm:hidden">合盤</span></button>
            )}
             
             {canScreenshot !== 'hidden' && isCleanState && (
              <button onClick={handleDownload} disabled={canScreenshot === 'disabled'} className={`bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm ${canScreenshot === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`} title="截圖" type="button"><Camera size={16} /><span className="hidden sm:inline">截圖</span></button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 w-full relative">
        {isExternalInputOpen && (
          <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in">
               <button onClick={() => setIsExternalInputOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
               {/* ... Input UI ... */}
               <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-purple-600" /> 他人生年看飛化</h3>
               <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                  <button onClick={() => setExternalYearType('roc')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${externalYearType === 'roc' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>民國</button>
                  <button onClick={() => setExternalYearType('west')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${externalYearType === 'west' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>西元</button>
               </div>
               <div className="flex gap-2 mb-6">
                  <input type="text" inputMode="numeric" className="flex-1 px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center text-lg font-bold text-gray-700" value={externalYearStr} onChange={(e) => setExternalYearStr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleExternalYearSubmit()} autoFocus />
               </div>
               <button onClick={handleExternalYearSubmit} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-all">顯示四化</button>
             </div>
          </div>
        )}

        <PalaceGrid ref={chartRef} client={client!} chartData={chartData} relationships={relationships} historyStack={historyStack} mode={mode} selectedPalace={selectedPalace} flyingPalace={flyingPalace} daXianSeq={daXianSeq} liuNianYear={liuNianYear} showXiaoXian={showXiaoXian} isReverse={isCurrentReverseOn} reverseFlags={reverseFlags} onToggleInverted={handleToggleReverse} isTwinMode={isTwinMode} onToggleTwin={() => canTwin !== 'hidden' && canTwin !== 'disabled' && setIsTwinMode(!isTwinMode)} showCompass={showCompass} divNum={divNum} isDivinationReady={isDivinationReady} divSiHuaMap={divSiHuaMap} externalGan={externalGan} externalSiHuaMap={activeExtraSiHua} benMingMajorStarsStr={benMingMajorStarsStr} currentHourZhi={currentHourZhi} isTimeModified={isTimeModified} connections={connections} daXianList={daXianList} xiaoXianMingIdx={xiaoXianMingIdx} getRelativeNames={getRelativeNames} getIsBenMingMing={getIsBenMingMing} getAnchorCoord={getAnchorCoord} onHistoryBack={handleHistoryBack} onNavigate={handleNavigateToRelation} onCompatibility={handleCompatibility} onChangeHour={changeHour} onResetTime={resetTime} onToggleSmallLimit={toggleXiaoXian} onPalaceClick={handlePalaceClick} onTriggerClick={handleTriggerClick} flyingStarsLookup={flyingStarsLookup} permissionFlags={{ twin: canTwin, inverted: canInvert, xiao: canXiao, liu_month: canLiuMonth, liu_day: canLiuDay, dual_chart: canDual }} liuMonth={liuMonth} isLiuMonthLeap={isLiuMonthLeap} liuDay={liuDay} onSetLiuMonth={(m, isLeap) => { setLiuMonth(m); setIsLiuMonthLeap(isLeap); setLiuDay(null); }} onSetLiuDay={setLiuDay} liuMonthGan={liuMonthGan} liuDayGan={liuDayGan} liuMonthIdx={liuMonthIdx} liuDayIdx={liuDayIdx} currentRealTime={currentRealTime} onOpenYearlyAnalysis={(year) => { setAnalysisYear(year); setIsYearlyDrawerOpen(true); }} />
      </div>

      {mode !== 'divination' && bottomBar}

      <YearlyAnalysisDrawer open={isYearlyDrawerOpen} onClose={() => setIsYearlyDrawerOpen(false)} title={`${analysisYear} 年度分析`} adviceResult={adviceResult} adviceRules={adviceRules}>
        {baseEngine && client && <YearlyAnalysisBoard engine={baseEngine} year={analysisYear} userId={userProfile?.id || 'guest'} chartId={client.id} />}
      </YearlyAnalysisDrawer>

      <PaywallModal isOpen={isPaywallOpen} mode={paywallMode} balance={(userProfile as any)?.points_balance ?? 0} cost={currentCost} announcement={currentAnnouncement} onDeductConfirm={async () => { 
          const profileId = (userProfile as any)?.id ?? (userProfile as any)?.user_id ?? (userProfile as any)?.uuid;
          if (profileId) {
            const result = await consumeDivinationV2({});
            const isSuccess = (result?.ok === true && result?.skipped === true) || result?.success === true;
            if (isSuccess) {
              const updatedProfile = await getMyProfile();
              setUserProfile(updatedProfile);
              setIsPaywallOpen(false);
              navigate('/lucky');
            } else { console.error('Deduct failed:', result?.message); }
          }
      }} onSoftProceed={() => { setIsPaywallOpen(false); navigate('/lucky'); }} onGoToTopup={() => window.open(OFFICIAL_SITE_URL, '_blank')} onLogin={() => navigate('/login')} onClose={() => setIsPaywallOpen(false)} />
    </div>
  );
};