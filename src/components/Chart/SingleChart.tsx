import React, { useMemo, useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PalaceGrid } from './PalaceGrid';
import { getClient, getRelationships, getMyProfile, type Client, type Relationship, type UserProfile } from '../../db';
import { ZiWeiEngine } from '../../logic/engine';
import { GAN, ZHI, PALACE_NAMES, SIHUA_TABLE } from '../../logic/constants';
import { Loader2, UserPlus, X, ChevronLeft, Camera, Users, Compass } from 'lucide-react';
import { getFeaturePermission, type PermissionState } from '../../logic/permissions';
import { Lunar, LunarYear } from 'lunar-typescript';

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
        digits.forEach(d => tempSum += d);
        sum = tempSum;
    }
    return sum;
};

const getDivinationStem = (n: number): number => {
    return (n - 3 + 10) % 10;
};

export const SingleChart: React.FC<SingleChartProps> = ({ client: propClient, onBack, mode = 'standard' }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [client, setClient] = useState<Client | null>(
      propClient || location.state?.client || null
  );

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
  // 指南針顯示狀態
  const [showCompass, setShowCompass] = useState<boolean>(false);

  // 狀態持久化：使用 Map 記錄狀態，不隨便清空
  const [reverseMap, setReverseMap] = useState<Record<string, boolean>>({});

  // 流月流日狀態
  const [liuMonth, setLiuMonth] = useState<number | null>(null); // 1-12
  const [isLiuMonthLeap, setIsLiuMonthLeap] = useState<boolean>(false);
  const [liuDay, setLiuDay] = useState<number | null>(null); // 1-30

  const divNum = location.state?.divNum || (client as any)?.divNum;
  const isDivinationReady = !!divNum;
  
  const [isExternalInputOpen, setIsExternalInputOpen] = useState(false);
  const [externalYearStr, setExternalYearStr] = useState('');
  const [externalYearType, setExternalYearType] = useState<'west' | 'roc'>('roc'); 
  const [externalGan, setExternalGan] = useState<number | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMyProfile().then(setUserProfile);
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
                alert("找不到此命盤");
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
    } catch (e) { return null; }
  }, [client, currentHour]);

  const baseChartData = useMemo(() => baseEngine?.getChartData(), [baseEngine]);

  const { liuMonthIdx, liuDayIdx, liuMonthGan, liuDayGan } = useMemo(() => {
      if (!baseChartData || !liuNianYear || liuMonth === null) {
          return { liuMonthIdx: -1, liuDayIdx: -1, liuMonthGan: -1, liuDayGan: -1 };
      }

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
      
      const effectiveMonth = isLiuMonthLeap ? -Math.abs(liuMonth) : Math.abs(liuMonth);
      const naturalMonthObj = Lunar.fromYmd(liuNianYear, effectiveMonth, 1);
      const mGan = naturalMonthObj.getMonthGanIndex();

      if (liuDay === null) {
          return { liuMonthIdx: flowMonthIdx, liuDayIdx: -1, liuMonthGan: mGan, liuDayGan: -1 };
      }
      
      const flowDayIdx = (flowMonthIdx + (liuDay - 1)) % 12;
      
      const naturalDayObj = Lunar.fromYmd(liuNianYear, effectiveMonth, liuDay);
      const dGan = naturalDayObj.getDayGanIndex();

      return { 
          liuMonthIdx: flowMonthIdx, 
          liuDayIdx: flowDayIdx, 
          liuMonthGan: mGan, 
          liuDayGan: dGan 
      };

  }, [baseChartData, liuNianYear, liuMonth, isLiuMonthLeap, liuDay]);

  const chartData = useMemo(() => {
    if (!client || currentHour === -1) return null;
    let displayEngine: ZiWeiEngine;
    try {
        displayEngine = new ZiWeiEngine(client.birthYear, client.birthMonth, client.birthDay, currentHour, client.birthMinute, client.gender);
    } catch (e) { return null; }

    if (mode === 'divination') return displayEngine.getChartData();

    let daGan = -1, liuGan = -1, liuZhi = -1, xiaoGan = -1;
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

  const { divMingIndex, divSiHuaMap } = useMemo(() => {
      if (mode !== 'divination' || !divNum || divNum.length !== 4) return { divMingIndex: -1, divSiHuaMap: undefined };
      const numAB = parseInt(divNum[0] + divNum[1]);
      const finalAB = getRecursiveSum(numAB);
      const targetZhiIndex = finalAB - 1;
      const foundMingIdx = chartData?.palaces.findIndex(p => p.zhiIndex === targetZhiIndex) ?? -1;
      const numCD = parseInt(divNum[2] + divNum[3]);
      const finalCD = getRecursiveSum(numCD);
      const ganIdx = getDivinationStem(finalCD);
      const siHuaMap = getSiHuaMap(ganIdx);
      return { divMingIndex: foundMingIdx, divSiHuaMap: siHuaMap };
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
      if (isNaN(val)) { alert('請輸入有效數字'); return; }
      let westYear = val;
      if (externalYearType === 'roc') westYear = val + 1911;
      let gan = (westYear - 4) % 10;
      if (gan < 0) gan += 10;
      setExternalGan(gan);
      setIsExternalInputOpen(false);
  };

  const handleNavigateToRelation = (target: Client) => {
      if (client) {
          setHistoryStack(prev => [...prev, client]);
          setClient(target);
          setCurrentHour(target.birthHour);
          resetAllStates();
      }
  };

  const handleHistoryBack = () => {
      if (historyStack.length > 0) {
          const prevClient = historyStack[historyStack.length - 1];
          setHistoryStack(prev => prev.slice(0, -1));
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

  const benMingMajorStarsStr = useMemo(() => {
      if (!baseEngine || !baseChartData) return '';
      const pos = mode === 'divination' && divMingIndex !== -1 ? divMingIndex : baseEngine.getMingPos();
      if (pos === -1) return '';
      const p = chartData?.palaces[pos] || baseChartData.palaces[pos];
      if (p && p.majorStars.length > 0) return `(${p.majorStars.map(s => s.name).join('、')})`;
      return '(無主星)';
  }, [baseEngine, baseChartData, mode, chartData, divMingIndex]);

  const resetAllStates = () => {
    setDaXianSeq(-1); setLiuNianYear(null); setShowXiaoXian(false);
    setLiuMonth(null); setIsLiuMonthLeap(false); setLiuDay(null);
    setSelectedPalace(null); setFlyingPalace(null); setIsTwinMode(false);
    setReverseMap({}); // 只有在換人或重置時間時，才清空狀態
  };
  
  const changeHour = (delta: number) => {
    const currentZhiIdx = Math.floor((currentHour + 1) / 2) % 12;
    let nextZhiIdx = currentZhiIdx + delta;
    if (nextZhiIdx < 0) nextZhiIdx = 11;
    if (nextZhiIdx > 11) nextZhiIdx = 0;
    let nextHour = nextZhiIdx === 0 ? 0 : nextZhiIdx * 2;
    setCurrentHour(nextHour);
    resetAllStates();
  };
  const resetTime = () => { setCurrentHour(client!.birthHour); resetAllStates(); };
  
  const handleBack = () => { 
      if (onBack) { 
          onBack(); 
      } else { 
          navigate(-1); 
      }
  };
  
  const isBenMingState = daXianSeq === -1 && liuNianYear === null;
  const isCleanState = isBenMingState && flyingPalace === null && selectedPalace === null && externalGan === null && mode !== 'divination';

  const isTimeModified = currentHour !== client?.birthHour;
  let currentHourZhi = ZHI[Math.floor((currentHour + 1) / 2) % 12];
  if (Math.floor((currentHour + 1) / 2) % 12 === 0) { currentHourZhi = currentHour === 23 ? '晚子' : '早子'; }

  const connections = (() => { if (selectedPalace === null) return { self: -1, tri1: -1, tri2: -1, opp: -1 }; return { self: selectedPalace, tri1: (selectedPalace + 4) % 12, tri2: (selectedPalace + 8) % 12, opp: (selectedPalace + 6) % 12 }; })();
  const getAnchorCoord = (palaceIdx: number) => { const map: { [key: number]: { x: number; y: number } } = { 5: { x: 25, y: 25 }, 6: { x: 37.5, y: 25 }, 7: { x: 62.5, y: 25 }, 8: { x: 75, y: 25 }, 4: { x: 25, y: 37.5 }, 9: { x: 75, y: 37.5 }, 3: { x: 25, y: 62.5 }, 10: { x: 75, y: 62.5 }, 2: { x: 25, y: 75 }, 1: { x: 37.5, y: 75 }, 0: { x: 62.5, y: 75 }, 11: { x: 75, y: 75 } }; return map[palaceIdx] || { x: 50, y: 50 }; };

  const daXianList = useMemo(() => { if (!baseChartData || !baseEngine || mode === 'divination') return []; const list = []; const startPos = baseEngine.getMingPos(); const direction = baseChartData.direction || 1; for (let i = 0; i < 10; i++) { const offset = i * direction; const palaceIdx = (startPos + offset + 120) % 12; const palace = baseChartData.palaces[palaceIdx]; if (palace) { const startYear = baseChartData.lunarYear + palace.ages[0]; list.push({ seq: i, name: `${['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][i]}限`, ganZhi: `${GAN[palace.ganIndex]}${ZHI[palace.zhiIndex]}`, palaceIdx: palaceIdx, startAge: palace.ages[0], endAge: palace.ages[1], startYear: startYear }); } } return list; }, [baseChartData, baseEngine, mode]);
  const liuNianList = useMemo(() => { if (mode === 'divination') return []; const targetSeq = daXianSeq === -1 ? 0 : daXianSeq; const targetDaXian = daXianList[targetSeq]; if (!targetDaXian) return []; const list = []; for (let i = 0; i < 10; i++) { const year = targetDaXian.startYear + i; const age = targetDaXian.startAge + i; const gan = (year - 4) % 10; const zhi = (year - 4) % 12; list.push({ year, age, label: `${year}${GAN[gan]}${ZHI[zhi]} ${age}` }); } return list; }, [daXianSeq, daXianList, mode]);
  const xiaoXianMingIdx = useMemo(() => { if (!liuNianYear || !baseChartData || !baseEngine) return -1; const virtualAge = liuNianYear - baseChartData.lunarYear + 1; return baseEngine.getXiaoXianPos(virtualAge); }, [liuNianYear, baseChartData, baseEngine]);
  const benMingPos = baseEngine ? baseEngine.getMingPos() : 0;
  
  const getIsBenMingMing = (palaceIdx: number) => {
      if (mode === 'divination') return palaceIdx === divMingIndex;
      return palaceIdx === benMingPos;
  }

  // 顛倒盤切換邏輯
  const handleToggleReverse = () => {
    if (canInvert === 'hidden' || canInvert === 'disabled') return;
    
    let key = '';
    // 優先級：日 > 月 > 年 > 大限
    if (liuDay !== null && liuMonth !== null && liuNianYear !== null) {
        key = `ri-${liuNianYear}-${liuMonth}-${liuDay}`;
    } else if (liuMonth !== null && liuNianYear !== null) {
        key = `yue-${liuNianYear}-${liuMonth}`;
    } else if (liuNianYear !== null) {
        key = `liu-${liuNianYear}`;
    } else if (daXianSeq >= 0) {
        key = `da-${daXianSeq}`;
    } else {
        return;
    }

    setReverseMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 計算各層級旗標
  const isDaRev = daXianSeq >= 0 ? !!reverseMap[`da-${daXianSeq}`] : false;
  const isLiuRev = liuNianYear ? !!reverseMap[`liu-${liuNianYear}`] : false;
  const isYueRev = (liuNianYear && liuMonth) ? !!reverseMap[`yue-${liuNianYear}-${liuMonth}`] : false;
  const isRiRev = (liuNianYear && liuMonth && liuDay) ? !!reverseMap[`ri-${liuNianYear}-${liuMonth}-${liuDay}`] : false;

  const reverseFlags = {
      da: isDaRev,
      liu: isLiuRev,
      yue: isYueRev,
      ri: isRiRev
  };

  // 計算按鈕亮燈狀態
  let isCurrentReverseOn = false;
  if (liuDay !== null) isCurrentReverseOn = isRiRev;
  else if (liuMonth !== null) isCurrentReverseOn = isYueRev;
  else if (liuNianYear !== null) isCurrentReverseOn = isLiuRev;
  else if (daXianSeq >= 0) isCurrentReverseOn = isDaRev;

  // 切換大限與流年時，不呼叫 resetAllStates，也不清空 reverseMap
  const handleDaXianClick = (seq: number) => { 
      setDaXianSeq(daXianSeq === seq ? -1 : seq); 
      setLiuNianYear(null); 
      setLiuMonth(null); setLiuDay(null);
      setShowXiaoXian(false); setFlyingPalace(null); setSelectedPalace(null); 
  };
  const handleLiuNianClick = (year: number) => { 
      setLiuNianYear(liuNianYear === year ? null : year); 
      setLiuMonth(null); setLiuDay(null);
      setShowXiaoXian(false); setFlyingPalace(null); setSelectedPalace(null); 
  };
  const toggleXiaoXian = () => { setShowXiaoXian(!showXiaoXian); setFlyingPalace(null); setSelectedPalace(null); };
  const handlePalaceClick = (palaceIdx: number) => { setSelectedPalace(selectedPalace === palaceIdx ? null : palaceIdx); };
  const handleTriggerClick = (palaceIdx: number) => { setFlyingPalace(flyingPalace === palaceIdx ? null : palaceIdx); };
  
  const flyingStarsLookup = (() => { if (flyingPalace === null) return {}; const targetPalace = chartData!.palaces[flyingPalace]; if (!targetPalace) return {}; return baseEngine!.getSiHuaMap(targetPalace.ganIndex); })();
  
  const getRelativeNames = (currentIdx: number) => { 
      const mingIdx = mode === 'divination' && divMingIndex !== -1 ? divMingIndex : (daXianSeq >= 0 ? daXianList[daXianSeq].palaceIdx : (liuNianYear ? chartData!.palaces.findIndex(p => p.zhiIndex === (liuNianYear - 4) % 12) : benMingPos));
      if (mode === 'divination') {
          if (divMingIndex === -1) return {};
          const offset = (divMingIndex - currentIdx + 12) % 12;
          return { divinationName: PALACE_NAMES[offset] };
      }
      let daName = undefined, liuName = undefined, xiaoName = undefined, yueName = undefined, riName = undefined; 
      
      if (daXianSeq >= 0) { const daMingIdx = daXianList[daXianSeq].palaceIdx; const offset = (daMingIdx - currentIdx + 12) % 12; daName = `大${PALACE_NAMES[offset].substring(0, 1)}`; } 
      
      if (liuNianYear) { const liuZhi = (liuNianYear - 4) % 12; const liuMingIdx = chartData!.palaces.findIndex(p => p.zhiIndex === liuZhi); if (liuMingIdx >= 0) { const offset = (liuMingIdx - currentIdx + 12) % 12; liuName = `流${PALACE_NAMES[offset].substring(0, 1)}`; } } 
      
      if (xiaoXianMingIdx >= 0 && showXiaoXian) { const offset = (xiaoXianMingIdx - currentIdx + 12) % 12; xiaoName = `小${PALACE_NAMES[offset].substring(0, 1)}`; } 
      
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
      const virtualAge = year - baseChartData.lunarYear + 1;
      const daSeq = daXianList.findIndex(d => virtualAge >= d.startAge && virtualAge <= d.endAge);
      return { year, daSeq: daSeq >= 0 ? daSeq : -1 };
  }, [baseChartData, baseEngine, daXianList]);

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
      } catch (err) { console.error('Download failed:', err); } 
  };

  if (loading || !client || !baseChartData || !baseEngine || !chartData) {
    return <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-100"><Loader2 className="animate-spin text-gray-500" size={48} /></div>;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0 z-50 h-[56px]">
        {/* 返回按鈕行為 */}
        <button onClick={handleBack} className="bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm">
            <ChevronLeft size={16} /> 列表
        </button>

        {mode === 'standard' && (
            <div className="flex gap-2">
                
                {/* [修正] 指南針 (方位) 按鈕 - 移除文字 */}
                <button 
                    onClick={() => setShowCompass(!showCompass)}
                    className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm border
                        ${showCompass ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                    `}
                    title="顯示方位"
                >
                    <Compass size={16} />
                </button>

                {canDual !== 'hidden' && (
                    <button 
                        onClick={() => navigate('/compatibility', { state: { clientA: client } })}
                        disabled={canDual === 'disabled'}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-sm font-bold shadow-md shadow-purple-200 ${canDual === 'disabled' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                        title={canDual === 'disabled' ? '權限已到期' : '雙人合盤'}
                    >
                        <Users size={16} />
                        <span className="hidden sm:inline">雙人合盤</span><span className="sm:hidden">合盤</span>
                    </button>
                )}

                {canFlying !== 'hidden' && (
                    externalGan !== null ? (
                        <div className="flex items-center gap-1 bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg animate-in fade-in">
                            <span className="text-sm font-bold text-purple-700">{GAN[externalGan]}干飛化</span>
                            <button onClick={() => { setExternalGan(null); setExternalYearStr(''); }} className="text-purple-400 hover:text-purple-600 ml-1"><X size={16} /></button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsExternalInputOpen(true)} 
                            disabled={canFlying === 'disabled'}
                            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm ${canFlying === 'disabled' ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
                            title={canFlying === 'disabled' ? '權限已到期' : '看他人生年飛化'}
                        >
                            <UserPlus size={16} />
                            <span className="hidden sm:inline">看他人生年飛化</span><span className="sm:hidden">他年</span>
                        </button>
                    )
                )}

                {canScreenshot !== 'hidden' && isCleanState && (
                    <button 
                        onClick={handleDownload}
                        disabled={canScreenshot === 'disabled'}
                        className={`bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm ${canScreenshot === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="截圖"
                    >
                        <Camera size={16} />
                        <span className="hidden sm:inline">截圖</span>
                    </button>
                )}
            </div>
        )}
      </div>

      <div className="flex-1 min-h-0 w-full relative">
        {isExternalInputOpen && (
            <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in">
                    <button onClick={() => setIsExternalInputOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-purple-600" /> 他人生年看飛化</h3>
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                        <button onClick={() => setExternalYearType('roc')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${externalYearType === 'roc' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>民國</button>
                        <button onClick={() => setExternalYearType('west')} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${externalYearType === 'west' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>西元</button>
                    </div>
                    <div className="flex gap-2 mb-6">
                        <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder={externalYearType === 'roc' ? "例如: 74" : "例如: 1985"} className="flex-1 px-4 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-center text-lg font-bold text-gray-700" value={externalYearStr} onChange={e => setExternalYearStr(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleExternalYearSubmit()} autoFocus />
                    </div>
                    <button onClick={handleExternalYearSubmit} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-all">顯示四化</button>
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
            flyingStarsLookup={flyingStarsLookup}
            permissionFlags={{ 
                twin: canTwin, 
                inverted: canInvert, 
                xiao: canXiao, 
                liu_month: canLiuMonth, 
                liu_day: canLiuDay 
            }}
            
            liuMonth={liuMonth}
            isLiuMonthLeap={isLiuMonthLeap}
            liuDay={liuDay}
            onSetLiuMonth={(m, isLeap) => { setLiuMonth(m); setIsLiuMonthLeap(isLeap); setLiuDay(null); }}
            onSetLiuDay={setLiuDay}
            liuMonthGan={liuMonthGan}
            liuDayGan={liuDayGan}
            liuNianYear={liuNianYear}
            liuMonthIdx={liuMonthIdx}
            liuDayIdx={liuDayIdx}
            currentRealTime={currentRealTime}
        />
      </div>

      {mode !== 'divination' && (
          <div className="w-full shrink-0 border-t-2 border-gray-800 bg-gray-100 z-50">
            <div className="w-full">
                <div className="flex w-full overflow-x-auto scrollbar-hide border-b border-gray-300">
                    {daXianList.map((limit) => {
                    const isActive = daXianSeq === limit.seq;
                    const isRealTime = currentRealTime && currentRealTime.daSeq === limit.seq;
                    return (
                        <button key={limit.seq} onClick={() => handleDaXianClick(limit.seq)} className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs relative ${isActive ? 'bg-gray-600 text-white font-bold' : 'hover:bg-gray-200 text-gray-700'}`}>
                            {isRealTime && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                            <div>{limit.name} {limit.ganZhi}</div>
                        </button>
                    );
                    })}
                </div>
                <div className="flex w-full overflow-x-auto scrollbar-hide">
                    {liuNianList.map((item) => {
                    const isActive = liuNianYear === item.year;
                    const isRealTime = currentRealTime && currentRealTime.year === item.year;
                    return (
                        <button key={item.year} onClick={() => handleLiuNianClick(item.year)} className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs relative ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-100 text-gray-600'}`}>
                        {isRealTime && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm"></div>}
                        {item.label}
                        </button>
                    );
                    })}
                </div>
            </div>
          </div>
      )}
    </div>
  );
};