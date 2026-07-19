// FILE: src/components/Chart/SingleChart.tsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PalaceGrid, type SiHuaTrace } from './PalaceGrid';
import type { SiHuaClickPayload } from '../PalaceCard';
import {
  getClient,
  getRelationships,
  getMyProfile,
  loadYearAdviceRules,
  type Client,
  type Relationship,
  type UserProfile,
  type YearAdviceRule,
  consumeDivinationV2,
  issueGuestToken,
  toggleFavorite
} from '../../db';
import { ZiWeiEngine } from '../../logic/engine';
import { GAN, ZHI, PALACE_NAMES, SIHUA_TABLE } from '../../logic/constants';
import { Loader2, UserPlus, X, ChevronLeft, Camera, Users, Compass, Sparkles, MessageCircle, Star } from 'lucide-react';
import { getFeaturePermission } from '../../logic/permissions';
import { Lunar, LunarYear } from 'lunar-typescript';
import { YearlyAnalysisBoard } from './YearlyAnalysisBoard';
import { YearlyAnalysisDrawer } from './YearlyAnalysisDrawer';
import { scanYearlyAdvice } from '../../logic/advice/yearAdvice';
import { usePaywall, type PaywallMode, FEATURE_YEARLY_ADVICE_ENABLED, DIVINATION_COST } from '../../hooks/usePaywall';
import PaywallModal from '../Paywall/PaywallModal';

const OFFICIAL_SITE_URL = 'https://www.dabao.life';
const MOBILE_LIMIT_GUIDE_KEY = 'ziwei_mobile_limit_guide_seen_v2';

interface SingleChartProps {
  client?: Client;
  onBack?: () => void;
  mode?: 'standard' | 'divination';
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

const getDivinationStem = (n: number): number => {
  return (n - 3 + 10) % 10;
};

const calcNextHour = (currentHour: number, delta: number) => {
  const hours = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
  let currentIndex = hours.indexOf(currentHour);
  if (currentIndex === -1) {
    currentIndex = hours.findIndex((h) => h >= currentHour);
  }

  let nextIndex = currentIndex + delta;
  if (nextIndex < 0) nextIndex = hours.length - 1;
  if (nextIndex >= hours.length) nextIndex = 0;

  return hours[nextIndex];
};

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
  const [activeSiHuaTrace, setActiveSiHuaTrace] = useState<SiHuaTrace | null>(null);
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

  // Yearly Analysis States
  const [isYearlyDrawerOpen, setIsYearlyDrawerOpen] = useState(false);
  const [analysisYear, setAnalysisYear] = useState<number>(new Date().getFullYear());
  const [adviceRules, setAdviceRules] = useState<YearAdviceRule[]>([]);
  const [mobileGuideStep, setMobileGuideStep] = useState<number | null>(null);
  const [mobileGuideRect, setMobileGuideRect] = useState<DOMRect | null>(null);

  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallMode, setPaywallMode] = useState<PaywallMode>('CONFIRM_DEDUCT');
  const { checkAccess } = usePaywall(userProfile);

  const chartRef = useRef<HTMLDivElement>(null);
  const mobileDaOverviewRef = useRef<HTMLDivElement | null>(null);
  const mobileSelectedControlsRef = useRef<HTMLDivElement | null>(null);

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
            alert('找不到此命盤');
            navigate('/list');
          }
        } catch (e) {
          navigate('/list');
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/list');
      }
    };
    fetchData();
  }, [id, client, navigate, mode]);

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
    } catch (e) {
      return null;
    }
  }, [client, currentHour]);

  const baseChartData = useMemo(() => baseEngine?.getChartData(), [baseEngine]);

  const { liuMonthIdx, liuDayIdx, liuMonthGan, liuDayGan } = useMemo(() => {
    if (!baseChartData || !liuNianYear || liuMonth === null) {
      return { liuMonthIdx: -1, liuDayIdx: -1, liuMonthGan: -1, liuDayGan: -1 };
    }

    try {
      const yearZhi = (liuNianYear - 4) % 12;
      const douJunPalace = baseChartData.palaces[2];
      const douJunName = douJunPalace.name;
      const nameIdx = PALACE_NAMES.indexOf(douJunName);
      const offset = (12 - nameIdx) % 12;
      const flowMonthAnchor = (yearZhi + offset) % 12;

      const lunarYear = LunarYear.fromYear(liuNianYear);
      const leapMonth = lunarYear.getLeapMonth();

      let monthSteps = liuMonth - 1;
      if (leapMonth > 0) {
        if (liuMonth > leapMonth) {
          monthSteps += 1;
        } else if (liuMonth === leapMonth && isLiuMonthLeap) {
          monthSteps += 1;
        }
      }
      const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;

      let effectiveMonth = isLiuMonthLeap ? -Math.abs(liuMonth) : Math.abs(liuMonth);
      let mGan = -1;
      try {
        const naturalMonthObj = Lunar.fromYmd(liuNianYear, effectiveMonth, 1);
        mGan = naturalMonthObj.getMonthGanIndex();
      } catch (e) {
        // 若閏月等不存在，退回原本月份
        effectiveMonth = Math.abs(liuMonth);
        const fallbackObj = Lunar.fromYmd(liuNianYear, effectiveMonth, 1);
        mGan = fallbackObj.getMonthGanIndex();
      }

      if (liuDay === null) {
        return { liuMonthIdx: flowMonthIdx, liuDayIdx: -1, liuMonthGan: mGan, liuDayGan: -1 };
      }

      // 防護層：尋找合法的日期上限，避免越界
      let safeDay = Math.min(liuDay, 30);
      let dGan = -1;
      while (safeDay >= 1) {
        try {
          const naturalDayObj = Lunar.fromYmd(liuNianYear, effectiveMonth, safeDay);
          dGan = naturalDayObj.getDayGanIndex();
          break; // 成功找到合法日期
        } catch (e) {
          safeDay--; // 若越界則往下遞減 (例如 30 -> 29)
        }
      }

      const flowDayIdx = (flowMonthIdx + (safeDay - 1)) % 12;

      return {
        liuMonthIdx: flowMonthIdx,
        liuDayIdx: flowDayIdx,
        liuMonthGan: mGan,
        liuDayGan: dGan,
      };
    } catch (e) {
      // 萬一有任何例外，回傳安全的預設值，絕不讓畫面空白
      return { liuMonthIdx: -1, liuDayIdx: -1, liuMonthGan: -1, liuDayGan: -1 };
    }
  }, [baseChartData, liuNianYear, liuMonth, isLiuMonthLeap, liuDay]);

  const chartData = useMemo(() => {
    if (!client || currentHour === -1) return null;
    let displayEngine: ZiWeiEngine;
    try {
      displayEngine = new ZiWeiEngine(client.birthYear, client.birthMonth, client.birthDay, currentHour, client.birthMinute, client.gender);
    } catch (e) {
      return null;
    }

    if (mode === 'divination') return displayEngine.getChartData();

    let daGan = -1,
      liuGan = -1,
      liuZhi = -1,
      xiaoGan = -1;
    const tempBaseData = displayEngine.getChartData();
    const startPos = displayEngine.getMingPos();
    const direction = tempBaseData.direction || 1;

    if (daXianSeq >= 0) {
      const offset = daXianSeq * direction;
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

  const { divMingIndex, divSiHuaMap, divSiHuaGanIdx } = useMemo(() => {
    if (mode !== 'divination' || !divNum || divNum.length !== 4) return { divMingIndex: -1, divSiHuaMap: undefined, divSiHuaGanIdx: -1 };
    const numAB = parseInt(divNum[0] + divNum[1]);
    const finalAB = getRecursiveSum(numAB);
    const targetZhiIndex = finalAB - 1;
    const foundMingIdx = chartData?.palaces.findIndex((p) => p.zhiIndex === targetZhiIndex) ?? -1;
    const numCD = parseInt(divNum[2] + divNum[3]);
    const finalCD = getRecursiveSum(numCD);
    const ganIdx = getDivinationStem(finalCD);
    const siHuaMap = getSiHuaMap(ganIdx);
    return { divMingIndex: foundMingIdx, divSiHuaMap: siHuaMap, divSiHuaGanIdx: ganIdx };
  }, [divNum, mode, chartData]);

  const activeExtraSiHua = useMemo(() => {
    if (externalGan !== null) return getSiHuaMap(externalGan);
    if (liuDayGan !== -1) return getSiHuaMap(liuDayGan);
    if (liuMonthGan !== -1) return getSiHuaMap(liuMonthGan);
    return undefined;
  }, [externalGan, liuDayGan, liuMonthGan]);

  const handleExternalYearSubmit = () => {
    if (!externalYearStr) return;
    const val = parseInt(externalYearStr);
    if (isNaN(val)) {
      alert('請輸入有效數字');
      return;
    }
    let westYear = val;
    if (externalYearType === 'roc') westYear = val + 1911;
    let gan = (westYear - 4) % 10;
    if (gan < 0) gan += 10;
    setExternalGan(gan);
    setIsExternalInputOpen(false);
  };

  const handleNavigateToRelation = (target: Client) => {
    if (client) {
      setHistoryStack((prev) => [...prev, client]);
      setClient(target);
      setCurrentHour(target.birthHour);
      resetAllStates();
    }
  };

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

  const handleCompatibility = (target: Client) => {
    alert(`即將與 ${target.name} 進行合盤分析 (開發中)`);
  };

  const handleToggleFavorite = async () => {
      if (!client || !client.id || client.id.startsWith('temp-')) return;
      
      const currentFav = !!client.is_favorite;
      const newFav = !currentFav;
      
      // 樂觀更新 UI
      setClient(prev => prev ? { ...prev, is_favorite: newFav } : prev);
      
      try {
          const success = await toggleFavorite(client.id, newFav);
          if (!success) {
              setClient(prev => prev ? { ...prev, is_favorite: currentFav } : prev);
              alert('設定最愛失敗，請檢查網路連線');
          }
      } catch (err) {
          setClient(prev => prev ? { ...prev, is_favorite: currentFav } : prev);
          console.error("Toggle Favorite Error:", err);
      }
  };

  const benMingMajorStarsStr = useMemo(() => {
    if (!baseEngine || !baseChartData) return '';
    const pos = mode === 'divination' && divMingIndex !== -1 ? divMingIndex : baseEngine.getMingPos();
    if (pos === -1) return '';
    const p = chartData?.palaces[pos] || baseChartData.palaces[pos];
    if (p && p.majorStars.length > 0) return `(${p.majorStars.map((s) => s.name).join('、')})`;
    return '(無主星)';
  }, [baseEngine, baseChartData, mode, chartData, divMingIndex]);

  const resetAllStates = () => {
    setDaXianSeq(-1);
    setLiuNianYear(null);
    setShowXiaoXian(false);
    setLiuMonth(null);
    setIsLiuMonthLeap(false);
    setLiuDay(null);
    setSelectedPalace(null);
    setFlyingPalace(null);
    setIsTwinMode(false);
    setReverseMap({});
  };

  const changeHour = (delta: number) => {
    const nextHour = calcNextHour(currentHour, delta);
    setCurrentHour(nextHour);
    resetAllStates();
  };
  const resetTime = () => {
    setCurrentHour(client!.birthHour);
    resetAllStates();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleDivinationClick = async () => {
    const access = checkAccess();
    if (access.canAccess) {
      if (access.mode === 'SOFT_NOTICE') {
        setPaywallMode('SOFT_NOTICE');
        setIsPaywallOpen(true);
        return;
      }

      if (access.mode === 'CONFIRM_DEDUCT') {
        setPaywallMode('CONFIRM_DEDUCT');
        setIsPaywallOpen(true);
        return;
      }

      if (access.mode === 'GUEST_FREE') {
        let token = localStorage.getItem('dabao_guest_token');
        let result = await consumeDivinationV2(0, token);

        if (!result.success && (result.message === 'MISSING_GUEST_TOKEN' || result.message === 'INVALID_GUEST_TOKEN')) {
          const newToken = await issueGuestToken();
          if (newToken) {
            localStorage.setItem('dabao_guest_token', newToken);
            token = newToken;
            result = await consumeDivinationV2(0, newToken);
          }
        }

        if (result.success) {
          navigate('/lucky');
        } else if (result.message === 'GUEST_ALREADY_USED') {
          setPaywallMode('GUEST_ALREADY_USED');
          setIsPaywallOpen(true);
        } else {
          alert(result.message || '系統忙碌，請重試');
        }
        return;
      }

      if (access.mode === 'MEMBER_FREE' && userProfile?.id) {
        const result = await consumeDivinationV2(0);
        if (result.success) {
          const updatedProfile = await getMyProfile();
          setUserProfile(updatedProfile);
          navigate('/lucky');
        } else {
          alert(result.message || '免費次數使用失敗');
        }
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
  if (Math.floor((currentHour + 1) / 2) % 12 === 0) {
    currentHourZhi = currentHour === 23 ? '晚子' : '早子';
  }

  const connections = (() => {
    if (selectedPalace === null) return { self: -1, tri1: -1, tri2: -1, opp: -1 };
    return {
      self: selectedPalace,
      tri1: (selectedPalace + 4) % 12,
      tri2: (selectedPalace + 8) % 12,
      opp: (selectedPalace + 6) % 12,
    };
  })();

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
        const endYear = baseChartData.lunarYear + palace.ages[1];
        list.push({
          seq: i,
          name: `${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]}限`,
          ganZhi: `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`,
          palaceIdx,
          startAge: palace.ages[0],
          endAge: palace.ages[1],
          startYear,
          endYear,
        });
      }
    }
    return list;
  }, [baseChartData, baseEngine, mode]);

  const effectiveDaXianSeq = daXianSeq === -1 ? 0 : daXianSeq;

  const liuNianList = useMemo(() => {
    if (mode === 'divination') return [];
    const targetDaXian = daXianList[effectiveDaXianSeq];
    if (!targetDaXian) return [];
    const list: { year: number; age: number; label: string }[] = [];
    for (let i = 0; i < 10; i++) {
      const year = targetDaXian.startYear + i;
      const age = targetDaXian.startAge + i;
      const gan = (year - 4) % 10;
      const zhi = (year - 4) % 12;
      list.push({ year, age, label: `${year}${GAN[gan]}${ZHI[zhi]} ${age}` });
    }
    return list;
  }, [effectiveDaXianSeq, daXianList, mode]);

  const xiaoXianMingIdx = useMemo(() => {
    if (!liuNianYear || !baseChartData || !baseEngine) return -1;
    const virtualAge = liuNianYear - baseChartData.lunarYear + 1;
    return baseEngine.getXiaoXianPos(virtualAge);
  }, [liuNianYear, baseChartData, baseEngine]);

  const benMingPos = baseEngine ? baseEngine.getMingPos() : 0;

  const getIsBenMingMing = (palaceIdx: number) => {
    if (mode === 'divination') return palaceIdx === divMingIndex;
    return palaceIdx === benMingPos;
  };

  const handleToggleReverse = () => {
    if (canInvert === 'hidden' || canInvert === 'disabled') return;

    let key = '';
    if (liuDay !== null && liuMonth !== null && liuNianYear !== null) key = `ri-${liuNianYear}-${liuMonth}-${liuDay}`;
    else if (liuMonth !== null && liuNianYear !== null) key = `yue-${liuNianYear}-${liuMonth}`;
    else if (liuNianYear !== null) key = `liu-${liuNianYear}`;
    else if (daXianSeq >= 0) key = `da-${daXianSeq}`;
    else key = 'ben'; // [修正] 加入對本命盤的狀態支援

    setReverseMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isDaRev = daXianSeq >= 0 ? !!reverseMap[`da-${daXianSeq}`] : false;
  const isLiuRev = liuNianYear ? !!reverseMap[`liu-${liuNianYear}`] : false;
  const isYueRev = liuNianYear && liuMonth ? !!reverseMap[`yue-${liuNianYear}-${liuMonth}`] : false;
  const isRiRev = liuNianYear && liuMonth && liuDay ? !!reverseMap[`ri-${liuNianYear}-${liuMonth}-${liuDay}`] : false;
  const isBenRev = !!reverseMap['ben']; // [修正] 讀取本命盤反轉狀態

  const reverseFlags = { da: isDaRev, liu: isLiuRev, yue: isYueRev, ri: isRiRev, ben: isBenRev };

  let isCurrentReverseOn = false;
  if (liuDay !== null) isCurrentReverseOn = isRiRev;
  else if (liuMonth !== null) isCurrentReverseOn = isYueRev;
  else if (liuNianYear !== null) isCurrentReverseOn = isLiuRev;
  else if (daXianSeq >= 0) isCurrentReverseOn = isDaRev;
  else isCurrentReverseOn = isBenRev; // [修正] 如果都沒有選，就看本命盤反轉狀態

  const handleDaXianClick = (seq: number) => {
    setDaXianSeq(daXianSeq === seq ? -1 : seq);
    setLiuNianYear(null);
    setLiuMonth(null);
    setLiuDay(null);
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const handleLiuNianClick = (year: number) => {
    setLiuNianYear(liuNianYear === year ? null : year);
    setLiuMonth(null);
    setLiuDay(null);
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const handleSetLiuNianYear = (year: number | null) => {
      setLiuNianYear(year);
      if (year !== null) {
          const targetDa = daXianList.find(d => year >= d.startYear && year <= d.endYear);
          if (targetDa) setDaXianSeq(targetDa.seq);
      }
  };

  const toggleXiaoXian = () => {
    setShowXiaoXian(!showXiaoXian);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const handlePalaceClick = (palaceIdx: number) => {
    setSelectedPalace(selectedPalace === palaceIdx ? null : palaceIdx);
  };

  const handleTriggerClick = (palaceIdx: number) => {
    setFlyingPalace(flyingPalace === palaceIdx ? null : palaceIdx);
  };

  const handleSiHuaClick = (payload: SiHuaClickPayload) => {
    if (!chartData) return;
    if (activeSiHuaTrace?.key === payload.key) {
      setActiveSiHuaTrace(null);
      return;
    }

    let sourcePalaceIdx = -1;
    let sourceGanIdx = -1;

    if (mode === 'divination' && payload.scope === 'ben' && divSiHuaMap?.[payload.starName] === payload.type) {
      sourcePalaceIdx = divMingIndex;
      sourceGanIdx = divSiHuaGanIdx;
    } else if (payload.scope === 'ben') {
      sourcePalaceIdx = benMingPos;
      sourceGanIdx = GAN.indexOf(chartData.bazi[0]);
    } else if (payload.scope === 'da') {
      sourcePalaceIdx = daXianList[daXianSeq]?.palaceIdx ?? -1;
      sourceGanIdx = sourcePalaceIdx >= 0 ? chartData.palaces[sourcePalaceIdx]?.ganIndex ?? -1 : -1;
    } else if (payload.scope === 'liu' && liuNianYear !== null) {
      sourcePalaceIdx = chartData.palaces.findIndex((p) => p.zhiIndex === ((liuNianYear - 4) % 12 + 12) % 12);
      sourceGanIdx = ((liuNianYear - 4) % 10 + 10) % 10;
    } else if (payload.scope === 'xiao') {
      sourcePalaceIdx = xiaoXianMingIdx;
      sourceGanIdx = sourcePalaceIdx >= 0 ? chartData.palaces[sourcePalaceIdx]?.ganIndex ?? -1 : -1;
    }

    if (sourcePalaceIdx < 0 || sourceGanIdx < 0) return;

    setActiveSiHuaTrace({
      key: payload.key,
      sourcePalaceIdx,
      targetPalaceIdx: payload.palaceIdx,
      sourceGan: GAN[sourceGanIdx],
      starName: payload.starName,
      scope: payload.scope,
      type: payload.type,
    });
  };

  useEffect(() => {
    setActiveSiHuaTrace(null);
  }, [currentHour, daXianSeq, liuNianYear, showXiaoXian, liuMonth, liuDay, externalGan, mode]);

  const flyingStarsLookup = (() => {
    if (flyingPalace === null) return {};
    const targetPalace = chartData!.palaces[flyingPalace];
    if (!targetPalace) return {};
    return baseEngine!.getSiHuaMap(targetPalace.ganIndex);
  })();

  const getRelativeNames = (currentIdx: number) => {
    const mingIdx =
      mode === 'divination' && divMingIndex !== -1
        ? divMingIndex
        : daXianSeq >= 0
        ? daXianList[daXianSeq]?.palaceIdx
        : liuNianYear
        ? chartData!.palaces.findIndex((p) => p.zhiIndex === (liuNianYear - 4) % 12)
        : benMingPos;

    if (mode === 'divination') {
      if (divMingIndex === -1) return {};
      const offset = (divMingIndex - currentIdx + 12) % 12;
      return { divinationName: PALACE_NAMES[offset] };
    }

    let daName = undefined,
      liuName = undefined,
      xiaoName = undefined,
      yueName = undefined,
      riName = undefined;

    if (daXianSeq >= 0 && daXianList[daXianSeq]) {
      const daMingIdx = daXianList[daXianSeq].palaceIdx;
      const offset = (daMingIdx - currentIdx + 12) % 12;
      daName = `大${PALACE_NAMES[offset].substring(0, 1)}`;
    }

    if (liuNianYear) {
      const liuZhi = (liuNianYear - 4) % 12;
      const liuMingIdx = chartData!.palaces.findIndex((p) => p.zhiIndex === liuZhi);
      if (liuMingIdx >= 0) {
        const offset = (liuMingIdx - currentIdx + 12) % 12;
        liuName = `流${PALACE_NAMES[offset].substring(0, 1)}`;
      }
    }

    if (xiaoXianMingIdx >= 0 && showXiaoXian) {
      const offset = (xiaoXianMingIdx - currentIdx + 12) % 12;
      xiaoName = `小${PALACE_NAMES[offset].substring(0, 1)}`;
    }

    if (liuMonthIdx >= 0) {
      const offset = (liuMonthIdx - currentIdx + 12) % 12;
      yueName = `月${PALACE_NAMES[offset].substring(0, 1)}`;
    }
    if (liuDayIdx >= 0) {
      const offset = (liuDayIdx - currentIdx + 12) % 12;
      riName = `日${PALACE_NAMES[offset].substring(0, 1)}`;
    }

    return { daName, liuName, xiaoName, yueName, riName };
  };

  const currentRealTime = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    if (!baseChartData || !baseEngine) return undefined;
    const daSeq = daXianList.findIndex((d: any) => year >= d.startYear && year <= d.endYear);
    return { year, daSeq: daSeq >= 0 ? daSeq : -1 };
  }, [baseChartData, baseEngine, daXianList]);

  const getDefaultMobileLiuYear = (seq: number) => {
    const targetDa = daXianList[seq];
    if (!targetDa) return null;
    if (currentRealTime?.daSeq === seq && currentRealTime.year >= targetDa.startYear && currentRealTime.year <= targetDa.endYear) {
      return currentRealTime.year;
    }
    return targetDa.startYear;
  };

  const resetMobileLimitState = () => {
    setDaXianSeq(-1);
    setLiuNianYear(null);
    setLiuMonth(null);
    setLiuDay(null);
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const selectMobileDaXian = (seq: number, allowToggle = false) => {
    if (allowToggle && daXianSeq === seq) {
      resetMobileLimitState();
      return;
    }

    const defaultYear = getDefaultMobileLiuYear(seq);
    setDaXianSeq(seq);
    setLiuNianYear(defaultYear);
    setLiuMonth(null);
    setLiuDay(null);
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const stepMobileDaXian = (delta: number) => {
    if (daXianList.length === 0) return;
    const currentSeq = daXianSeq >= 0 ? daXianSeq : currentRealTime?.daSeq ?? 0;
    const nextSeq = Math.max(0, Math.min(daXianList.length - 1, currentSeq + delta));
    selectMobileDaXian(nextSeq);
  };

  const stepMobileLiuYear = (delta: number) => {
    const targetDa = daXianSeq >= 0 ? daXianList[daXianSeq] : null;
    if (!targetDa) return;
    const baseYear = liuNianYear ?? getDefaultMobileLiuYear(daXianSeq) ?? targetDa.startYear;
    const nextYear = Math.max(targetDa.startYear, Math.min(targetDa.endYear, baseYear + delta));
    if (nextYear === baseYear) return;
    setLiuNianYear(nextYear);
    setLiuMonth(null);
    setLiuDay(null);
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
  };

  const mobileSelectedDa = daXianSeq >= 0 ? daXianList[daXianSeq] : null;
  const mobileSelectedYear = mobileSelectedDa ? (liuNianYear ?? getDefaultMobileLiuYear(daXianSeq) ?? mobileSelectedDa.startYear) : null;
  const mobileSelectedYearGanZhi = mobileSelectedYear !== null ? `${GAN[((mobileSelectedYear - 4) % 10 + 10) % 10]}${ZHI[((mobileSelectedYear - 4) % 12 + 12) % 12]}` : '';
  const mobileSelectedAge = mobileSelectedDa && mobileSelectedYear !== null ? mobileSelectedDa.startAge + (mobileSelectedYear - mobileSelectedDa.startYear) : null;

  useEffect(() => {
    if (mode === 'divination' || daXianList.length === 0) return;
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 639px)').matches) return;
    if (localStorage.getItem(MOBILE_LIMIT_GUIDE_KEY) === '1') return;
    setMobileGuideStep(0);
  }, [mode, daXianList.length]);

  useEffect(() => {
    if (mobileGuideStep === null) return;
    const updateRect = () => {
      const target = mobileGuideStep === 0 ? mobileDaOverviewRef.current : mobileSelectedControlsRef.current;
      setMobileGuideRect(target ? target.getBoundingClientRect() : null);
    };

    const timer = window.setTimeout(updateRect, 60);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [mobileGuideStep, daXianSeq, liuNianYear]);

  const finishMobileLimitGuide = () => {
    localStorage.setItem(MOBILE_LIMIT_GUIDE_KEY, '1');
    setMobileGuideStep(null);
    setMobileGuideRect(null);
  };

  const nextMobileLimitGuide = () => {
    if (mobileGuideStep === 0) {
      const guideSeq = currentRealTime?.daSeq !== undefined && currentRealTime.daSeq >= 0 ? currentRealTime.daSeq : 0;
      selectMobileDaXian(guideSeq);
      setMobileGuideStep(1);
      return;
    }

    if (mobileGuideStep === 1) {
      if (currentRealTime?.daSeq !== undefined && currentRealTime.daSeq >= 0) {
        selectMobileDaXian(currentRealTime.daSeq);
      }
      setMobileGuideStep(2);
      return;
    }

    finishMobileLimitGuide();
  };

  const mobileGuideCopy = mobileGuideStep === 0
    ? {
        title: '手機版大限選擇',
        body: '大限改成上下兩排，一次看完十個大限，不需要左右滑動。點任一大限即可進入流年選擇。',
        action: '下一步',
      }
    : mobileGuideStep === 1
    ? {
        title: '切換大限與流年',
        body: '上排左右切換大限，下排左右切換流年。再按一次中間的大限按鈕，就會回到大限總覽。',
        action: '下一步',
      }
    : {
        title: '目前大限',
        body: '選到目前大限時，流年會自動停在今年；選其他大限時，流年會從該大限第一年開始。',
        action: '知道了',
      };

  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        filter: (node) => !(node.classList?.contains('no-screenshot')),
      });
      const link = document.createElement('a');
      let suffix = mode === 'divination' ? '_紫占' : '_本命盤';
      if (isCurrentReverseOn) suffix += '_顛倒';
      link.download = `${client!.name}${suffix}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading || !client || !baseChartData || !baseEngine || !chartData) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-gray-500" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-100 overflow-hidden relative">
      <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0 z-50 h-[56px]">
        <button
          onClick={handleBack}
          className="bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm"
        >
          <ChevronLeft size={16} /> 列表
        </button>

        {mode === 'standard' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowCompass(!showCompass)}
              className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm border
                ${showCompass ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
              `}
              title="顯示方位"
            >
              <Compass size={16} />
            </button>

            {(!client?.id?.startsWith('temp-')) && (
              <button
                onClick={handleToggleFavorite}
                className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm border
                  ${client?.is_favorite ? 'bg-yellow-50 text-yellow-600 border-yellow-300' : 'bg-white text-gray-400 border-gray-300 hover:text-yellow-500 hover:bg-yellow-50'}
                `}
                title={client?.is_favorite ? "移除最愛" : "加入最愛"}
              >
                <Star size={16} className={client?.is_favorite ? "fill-current" : ""} />
              </button>
            )}

            {FEATURE_YEARLY_ADVICE_ENABLED && (
              <button
                onClick={() => {
                  setAnalysisYear(new Date().getFullYear());
                  setIsYearlyDrawerOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                title="查看年度建議"
              >
                <Sparkles size={16} />
                <span className="hidden sm:inline">年度建議</span>
                <span className="sm:hidden">年度</span>
              </button>
            )}

            {canDual !== 'hidden' && (
              <button
                onClick={() => navigate('/compatibility', { state: { clientA: client } })}
                disabled={canDual === 'disabled'}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-sm font-bold shadow-md shadow-purple-200 ${
                  canDual === 'disabled' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
                title={canDual === 'disabled' ? '權限已到期' : '雙人合盤'}
              >
                <Users size={16} />
                <span className="hidden sm:inline">雙人合盤</span>
                <span className="sm:hidden">合盤</span>
              </button>
            )}

            {canFlying !== 'hidden' &&
              (externalGan !== null ? (
                <div className="flex items-center gap-1 bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg animate-in fade-in">
                  <span className="text-sm font-bold text-purple-700">{GAN[externalGan]}干飛化</span>
                  <button
                    onClick={() => {
                      setExternalGan(null);
                      setExternalYearStr('');
                    }}
                    className="text-purple-400 hover:text-purple-600 ml-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsExternalInputOpen(true)}
                  disabled={canFlying === 'disabled'}
                  className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm ${
                    canFlying === 'disabled'
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                  }`}
                  title={canFlying === 'disabled' ? '權限已到期' : '看他人生年飛化'}
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">看他人生年飛化</span>
                  <span className="sm:hidden">他年</span>
                </button>
              ))}

            {canScreenshot !== 'hidden' && isCleanState && (
              <button
                onClick={handleDownload}
                disabled={canScreenshot === 'disabled'}
                className={`bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm ${
                  canScreenshot === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="截圖"
              >
                <Camera size={16} />
                <span className="hidden sm:inline">截圖</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className={`flex-1 min-h-0 w-full relative ${mode === 'divination' ? 'pb-[env(safe-area-inset-bottom)]' : ''}`}>
        {isExternalInputOpen && (
          <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in">
              <button onClick={() => setIsExternalInputOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserPlus size={20} className="text-purple-600" /> 他人生年看飛化
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                <button
                  onClick={() => setExternalYearType('roc')}
                  className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
                    externalYearType === 'roc' ? 'bg-white shadow text-purple-700' : 'text-gray-500'
                  }`}
                >
                  民國
                </button>
                <button
                  onClick={() => setExternalYearType('west')}
                  className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${
                    externalYearType === 'west' ? 'bg-white shadow text-purple-700' : 'text-gray-500'
                  }`}
                >
                  西元
                </button>
              </div>
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={externalYearType === 'roc' ? '例如: 74' : '例如: 1985'}
                  className="flex-1 px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center text-lg font-bold text-gray-700"
                  value={externalYearStr}
                  onChange={(e) => setExternalYearStr(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExternalYearSubmit()}
                  autoFocus
                />
              </div>
              <button onClick={handleExternalYearSubmit} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-all">
                顯示四化
              </button>
            </div>
          </div>
        )}

        <PalaceGrid
          ref={chartRef}
          client={client!}
          chartData={chartData}
          relationships={relationships}
          historyStack={historyStack}
          mode={mode}
          selectedPalace={selectedPalace}
          flyingPalace={flyingPalace}
          daXianSeq={daXianSeq}
          liuNianYear={liuNianYear}
          showXiaoXian={showXiaoXian}
          isReverse={isCurrentReverseOn}
          reverseFlags={reverseFlags}
          onToggleInverted={handleToggleReverse}
          isTwinMode={isTwinMode}
          onToggleTwin={() => canTwin !== 'hidden' && canTwin !== 'disabled' && setIsTwinMode(!isTwinMode)}
          showCompass={showCompass}
          divNum={divNum}
          isDivinationReady={isDivinationReady}
          divSiHuaMap={divSiHuaMap}
          externalGan={externalGan}
          externalSiHuaMap={activeExtraSiHua}
          benMingMajorStarsStr={benMingMajorStarsStr}
          currentHourZhi={currentHourZhi}
          isTimeModified={isTimeModified}
          connections={connections}
          daXianList={daXianList}
          xiaoXianMingIdx={xiaoXianMingIdx}
          getRelativeNames={getRelativeNames}
          getIsBenMingMing={getIsBenMingMing}
          getAnchorCoord={getAnchorCoord}
          onHistoryBack={handleHistoryBack}
          onNavigate={handleNavigateToRelation}
          onCompatibility={handleCompatibility}
          onChangeHour={changeHour}
          onResetTime={resetTime}
          onToggleSmallLimit={toggleXiaoXian}
          onPalaceClick={handlePalaceClick}
          onTriggerClick={handleTriggerClick}
          onSiHuaClick={handleSiHuaClick}
          onBlankClick={() => setActiveSiHuaTrace(null)}
          activeSiHuaTrace={activeSiHuaTrace}
          flyingStarsLookup={flyingStarsLookup}
          permissionFlags={{
            twin: canTwin,
            inverted: canInvert,
            xiao: canXiao,
            liu_month: canLiuMonth,
            liu_day: canLiuDay,
            dual_chart: canDual,
          }}
          liuMonth={liuMonth}
          isLiuMonthLeap={isLiuMonthLeap}
          liuDay={liuDay}
          onSetLiuYear={handleSetLiuNianYear}
          onSetLiuMonth={(m, isLeap) => {
            setLiuMonth(m);
            setIsLiuMonthLeap(isLeap);
            setLiuDay(null);
          }}
          onSetLiuDay={setLiuDay}
          liuMonthGan={liuMonthGan}
          liuDayGan={liuDayGan}
          liuMonthIdx={liuMonthIdx}
          liuDayIdx={liuDayIdx}
          currentRealTime={currentRealTime}
          onOpenYearlyAnalysis={(year) => {
            setAnalysisYear(year);
            setIsYearlyDrawerOpen(true);
          }}
        />
      </div>

      {mode !== 'divination' && daXianList.length > 0 && (
        <div className="sm:hidden shrink-0 bg-white border-t border-gray-200 w-full z-40 pb-[env(safe-area-inset-bottom)]">
          {mobileSelectedDa ? (
            <div ref={mobileSelectedControlsRef} className="grid grid-rows-2 border-t border-slate-100">
              <div className="grid grid-cols-[44px_1fr_44px] h-11 border-b border-slate-200">
                <button
                  onClick={() => stepMobileDaXian(-1)}
                  disabled={daXianSeq <= 0}
                  className="text-lg font-bold text-slate-500 disabled:text-slate-200 border-r border-slate-200"
                >
                  &lt;
                </button>
                <button
                  onClick={() => selectMobileDaXian(daXianSeq, true)}
                  className="flex flex-col items-center justify-center bg-indigo-600 text-white font-bold leading-tight"
                >
                  <span className="text-sm">{mobileSelectedDa.name} {mobileSelectedDa.ganZhi}</span>
                  <span className="text-[10px] opacity-80">{mobileSelectedDa.startAge}-{mobileSelectedDa.endAge} 歲</span>
                </button>
                <button
                  onClick={() => stepMobileDaXian(1)}
                  disabled={daXianSeq >= daXianList.length - 1}
                  className="text-lg font-bold text-slate-500 disabled:text-slate-200 border-l border-slate-200"
                >
                  &gt;
                </button>
              </div>
              <div className="grid grid-cols-[44px_1fr_44px] h-11">
                <button
                  onClick={() => stepMobileLiuYear(-1)}
                  disabled={!mobileSelectedDa || mobileSelectedYear === null || mobileSelectedYear <= mobileSelectedDa.startYear}
                  className="text-lg font-bold text-slate-500 disabled:text-slate-200 border-r border-slate-200"
                >
                  &lt;
                </button>
                <div className="flex flex-col items-center justify-center bg-blue-600 text-white font-bold leading-tight">
                  <span className="text-sm">{mobileSelectedYear}{mobileSelectedYearGanZhi}</span>
                  <span className="text-[10px] opacity-80">{mobileSelectedAge !== null ? `${mobileSelectedAge} 歲` : ''}</span>
                </div>
                <button
                  onClick={() => stepMobileLiuYear(1)}
                  disabled={!mobileSelectedDa || mobileSelectedYear === null || mobileSelectedYear >= mobileSelectedDa.endYear}
                  className="text-lg font-bold text-slate-500 disabled:text-slate-200 border-l border-slate-200"
                >
                  &gt;
                </button>
              </div>
            </div>
          ) : (
            <div ref={mobileDaOverviewRef} className="grid grid-cols-5 grid-rows-2 w-full">
              {daXianList.map((item: any) => {
                const isRealTime = currentRealTime && currentRealTime.daSeq === item.seq;
                return (
                  <button
                    key={item.seq}
                    onClick={() => selectMobileDaXian(item.seq, true)}
                    className="relative h-12 border-r border-b border-slate-200 last:border-r-0 bg-white text-slate-600 active:bg-indigo-50"
                  >
                    {isRealTime && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                    <div className="flex flex-col items-center justify-center leading-tight">
                      <span className="text-xs font-bold">{item.name}</span>
                      <span className="text-[10px] opacity-70">{item.ganZhi}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode !== 'divination' && daXianList.length > 0 && (
        <div className="hidden sm:block shrink-0 bg-white border-t border-gray-200 w-full z-40 overflow-hidden">
          <div className="flex overflow-x-auto no-scrollbar w-full">
            {daXianList.map((item: any) => {
              const isActive = daXianSeq === item.seq;
              const isRealTime = currentRealTime && currentRealTime.daSeq === item.seq;
              return (
                <button
                  key={item.seq}
                  onClick={() => handleDaXianClick(item.seq)}
                  className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs relative ${
                    isActive ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-indigo-50 text-gray-600'
                  }`}
                >
                  {isRealTime && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                  <div className="flex flex-col items-center">
                    <span>{item.name}</span>
                    <span className="scale-75 opacity-80">{item.ganZhi}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode !== 'divination' && daXianList.length > 0 && (
        <div className="hidden sm:block shrink-0 bg-slate-50 border-t border-gray-200 w-full z-40 overflow-hidden pb-[env(safe-area-inset-bottom)]">
          <div className="flex overflow-x-auto no-scrollbar w-full pt-0.5 pb-1">
            {liuNianList.map((item) => {
              const isActive = liuNianYear === item.year;
              const isRealTime = currentRealTime && currentRealTime.year === item.year;
              return (
                <button
                  key={item.year}
                  onClick={() => handleLiuNianClick(item.year)}
                  className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs relative ${
                    isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-100 text-gray-600'
                  }`}
                >
                  {isRealTime && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mobileGuideStep !== null && mobileGuideRect && (
        <div className="sm:hidden fixed inset-0 z-[300] pointer-events-auto">
          <div className="absolute inset-0 bg-black/35"></div>
          <div
            className="absolute rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] pointer-events-none"
            style={{
              left: mobileGuideRect.left - 6,
              top: mobileGuideRect.top - 6,
              width: mobileGuideRect.width + 12,
              height: mobileGuideRect.height + 12,
            }}
          ></div>
          <div
            className="absolute left-4 right-4 bg-white rounded-xl shadow-2xl border border-slate-200 p-4"
            style={{
              top: mobileGuideRect.top > 180 ? mobileGuideRect.top - 166 : mobileGuideRect.bottom + 18,
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base font-bold text-slate-800">{mobileGuideCopy.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">{mobileGuideCopy.body}</p>
              </div>
              <button onClick={finishMobileLimitGuide} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-slate-400">{mobileGuideStep + 1} / 3</span>
              <button onClick={nextMobileLimitGuide} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold shadow-sm">
                {mobileGuideCopy.action}
              </button>
            </div>
          </div>
        </div>
      )}

      <YearlyAnalysisDrawer
        open={isYearlyDrawerOpen}
        onClose={() => setIsYearlyDrawerOpen(false)}
        title={`${analysisYear} 年度分析`}
        adviceResult={adviceResult}
        adviceRules={adviceRules}
      >
        {baseEngine && client && (
          <YearlyAnalysisBoard engine={baseEngine} year={analysisYear} userId={userProfile?.id || 'guest'} chartId={client.id} />
        )}
      </YearlyAnalysisDrawer>

      <PaywallModal
        isOpen={isPaywallOpen}
        mode={paywallMode}
        balance={(userProfile as any)?.credits ?? 0}
        onDeductConfirm={async () => {
          if (userProfile?.id) {
            const result = await consumeDivinationV2(DIVINATION_COST);
            if (result.success) {
              const updatedProfile = await getMyProfile();
              setUserProfile(updatedProfile);
              setIsPaywallOpen(false);
              navigate('/lucky');
            } else {
              alert(result.message || '扣點失敗');
            }
          }
        }}
        onSoftProceed={() => {
          setIsPaywallOpen(false);
          navigate('/lucky');
        }}
        onGoToTopup={() => window.open(OFFICIAL_SITE_URL, '_blank')}
        onLogin={() => navigate('/login')}
        onClose={() => setIsPaywallOpen(false)}
      />
    </div>
  );
};
