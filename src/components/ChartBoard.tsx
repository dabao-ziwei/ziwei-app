import React, { useMemo, useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { useParams, useNavigate } from 'react-router-dom';
import { PalaceCard } from './PalaceCard';
import { getClient, type Client } from '../db';
import { ZiWeiEngine } from '../logic/engine';
import { GAN, ZHI, PALACE_NAMES, SIHUA_TABLE } from '../logic/constants';
import { Loader2, RefreshCw, Sparkles, Check, ArrowRight } from 'lucide-react';

interface ChartBoardProps {
  client?: Client;
  onBack?: () => void;
  mode?: 'standard' | 'divination';
}

const HOUR_SEQUENCE = [23, 0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];

export const ChartBoard: React.FC<ChartBoardProps> = ({ client: propClient, onBack, mode = 'standard' }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<Client | null>(propClient || null);
  const [currentHour, setCurrentHour] = useState<number>(() => propClient ? propClient.birthHour : -1);
  const [loading, setLoading] = useState(!propClient);
  
  const [selectedPalace, setSelectedPalace] = useState<number | null>(null);
  const [flyingPalace, setFlyingPalace] = useState<number | null>(null);
  const [daXianSeq, setDaXianSeq] = useState<number>(-1);
  const [liuNianYear, setLiuNianYear] = useState<number | null>(null);
  const [showXiaoXian, setShowXiaoXian] = useState<boolean>(false);
  const [isReverse, setIsReverse] = useState<boolean>(false);
  const [isTwinMode, setIsTwinMode] = useState<boolean>(false);

  // 紫占數字狀態
  const [divNum, setDivNum] = useState<string[]>(['', '', '', '']);
  const [isDivinationReady, setIsDivinationReady] = useState(false);

  const divRefs = [
      useRef<HTMLInputElement>(null),
      useRef<HTMLInputElement>(null),
      useRef<HTMLInputElement>(null),
      useRef<HTMLInputElement>(null)
  ];

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (client) return;
    const fetchData = async () => {
      if (id) {
        setLoading(true);
        try {
            const data = await getClient(id);
            if (data) {
                setClient(data);
                setCurrentHour(data.birthHour);
            } else {
                alert("找不到此命盤");
                navigate('/');
            }
        } catch (e) {
            console.error(e);
            navigate('/');
        } finally {
            setLoading(false);
        }
      }
    };
    fetchData();
  }, [id, client, navigate]);

  useEffect(() => {
      if (mode === 'divination' && !isDivinationReady && !loading) {
          setTimeout(() => divRefs[0].current?.focus(), 300);
      }
  }, [mode, isDivinationReady, loading]);

  // 1. 基礎引擎：加入錯誤防護
  const baseEngine = useMemo(() => {
    if (!client || currentHour === -1) return null;
    try {
        // 額外檢查日期有效性
        if (client.birthDay < 1 || client.birthDay > 31) {
            console.error("Invalid BirthDay:", client.birthDay);
            return null;
        }
        return new ZiWeiEngine(
          client.birthYear,
          client.birthMonth,
          client.birthDay,
          currentHour,
          client.birthMinute,
          client.gender
        );
    } catch (e) {
        console.error("ZiWeiEngine Initialization Failed:", e);
        return null;
    }
  }, [client, currentHour]);

  const baseChartData = useMemo(() => baseEngine?.getChartData(), [baseEngine]);

  // 2. ChartData 計算
  const chartData = useMemo(() => {
    if (!client || currentHour === -1) return null;

    let displayEngine: ZiWeiEngine;
    try {
        displayEngine = new ZiWeiEngine(
          client.birthYear,
          client.birthMonth,
          client.birthDay,
          currentHour,
          client.birthMinute,
          client.gender
        );
    } catch (e) {
        return null;
    }

    if (mode === 'divination') {
        const data = displayEngine.getChartData();
        
        // 【修正邏輯】
        if (isDivinationReady && divNum.every(d => d !== '')) {
            // 1. 計算命宮數字 (AB)
            let mingNum = parseInt(divNum[0] + divNum[1], 10);
            
            // 規則：大於 12 才拆分相加
            while (mingNum > 12) {
                const s = mingNum.toString();
                mingNum = parseInt(s[0]) + parseInt(s[1]);
            }
            
            // 轉換為地支 index (1=子(0), 2=丑(1)... 12=亥(11))
            const targetZhiIdx = (mingNum - 1) % 12;
            
            // 2. 計算四化數字 (CD)
            let sihuaNum = parseInt(divNum[2] + divNum[3], 10);
            
            // 規則：大於 12 才拆分相加
            while (sihuaNum > 12) {
                const s = sihuaNum.toString();
                sihuaNum = parseInt(s[0]) + parseInt(s[1]);
            }
            
            // 查表取天干 index (0=甲 ... 9=癸)
            let ganIdx = -1;
            if (sihuaNum === 3) ganIdx = 0; // 甲
            else if (sihuaNum === 4) ganIdx = 1; // 乙
            else if (sihuaNum === 5) ganIdx = 2; // 丙
            else if (sihuaNum === 6) ganIdx = 3; // 丁
            else if (sihuaNum === 7) ganIdx = 4; // 戊
            else if (sihuaNum === 8) ganIdx = 5; // 己
            else if (sihuaNum === 9) ganIdx = 6; // 庚
            else if (sihuaNum === 10 || sihuaNum === 0) ganIdx = 7; // 辛
            else if (sihuaNum === 11 || sihuaNum === 1) ganIdx = 8; // 壬
            else if (sihuaNum === 12 || sihuaNum === 2) ganIdx = 9; // 癸

            if (ganIdx !== -1) {
                data.palaces.forEach(p => {
                    [...p.majorStars, ...p.minorStars, ...p.miscStars].forEach(s => {
                        s.sihua = [];
                    });
                });

                const newSihua = SIHUA_TABLE[GAN[ganIdx]];
                if (newSihua) {
                    const types = ['祿', '權', '科', '忌'] as const;
                    newSihua.forEach((starName, idx) => {
                        data.palaces.forEach(p => {
                            const allStars = [...p.majorStars, ...p.minorStars, ...p.miscStars];
                            const star = allStars.find(s => s.name === starName);
                            if (star) {
                                if (!star.sihua) star.sihua = [];
                                star.sihua.push({ type: types[idx], scope: 'ben' });
                            }
                        });
                    });
                }
            }
        }
        return data;
    }

    // Standard Mode
    let daGan = -1;
    let liuGan = -1;
    let liuZhi = -1;
    let xiaoGan = -1;

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
       if (xiaoPos >= 0) {
           xiaoGan = tempBaseData.palaces[xiaoPos].ganIndex;
       }
    }

    displayEngine.computeLimitStars(daGan, liuGan, liuZhi, xiaoGan, showXiaoXian);
    displayEngine.computeSiHua(daGan, liuGan, xiaoGan);

    return displayEngine.getChartData();
  }, [client, currentHour, daXianSeq, liuNianYear, showXiaoXian, mode, isDivinationReady]);

  // 3. UI 顯示用變數 - 修正 divMingIndex 邏輯以匹配上方
  const divMingIndex = useMemo(() => {
      if (mode !== 'divination') return -1;
      if (!isDivinationReady) return -1;
      
      // 計算 AB
      let mingNum = parseInt(divNum[0] + divNum[1], 10);
      while (mingNum > 12) {
          const s = mingNum.toString();
          mingNum = parseInt(s[0]) + parseInt(s[1]);
      }
      
      const targetZhiIdx = (mingNum - 1) % 12;
      return chartData?.palaces.findIndex(p => p.zhiIndex === targetZhiIdx) ?? -1;
  }, [mode, divNum, chartData, isDivinationReady]);

  const daXianList = useMemo(() => {
    if (!baseChartData || !baseEngine || mode === 'divination') return []; 
    const list = [];
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
          palaceIdx: palaceIdx,
          startAge: palace.ages[0],
          endAge: palace.ages[1],
          startYear: startYear,
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

    const list = [];
    for (let i = 0; i < 10; i++) {
      const year = targetDaXian.startYear + i;
      const age = targetDaXian.startAge + i;
      const gan = (year - 4) % 10;
      const zhi = (year - 4) % 12;
      list.push({ year, age, label: `${year}${GAN[gan]}${ZHI[zhi]} ${age}` });
    }
    return list;
  }, [daXianSeq, daXianList, mode]);

  const xiaoXianMingIdx = useMemo(() => {
    if (!liuNianYear || !baseChartData || !baseEngine) return -1;
    const virtualAge = liuNianYear - baseChartData.lunarYear + 1;
    return baseEngine.getXiaoXianPos(virtualAge);
  }, [liuNianYear, baseChartData, baseEngine]);

  const benMingMajorStarsStr = useMemo(() => {
      if (!baseEngine || !baseChartData) return '';
      const pos = (mode === 'divination' && divMingIndex !== -1) ? divMingIndex : baseEngine.getMingPos();
      const p = chartData?.palaces[pos] || baseChartData.palaces[pos];
      if (p && p.majorStars.length > 0) {
          return `(${p.majorStars.map(s => s.name).join('、')})`;
      }
      return '(無主星)';
  }, [baseEngine, baseChartData, mode, divMingIndex, chartData]);

  if (loading || !client || !baseChartData || !baseEngine || !chartData) {
    return (
        <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-100">
            <Loader2 className="animate-spin text-gray-500" size={48} />
        </div>
    );
  }

  // --- 變數宣告 ---
  const benMingPos = baseEngine.getMingPos();
  
  const isLimitActive = daXianSeq >= 0 || liuNianYear !== null || showXiaoXian;
  
  const isCleanState =
    daXianSeq === -1 &&
    liuNianYear === null &&
    selectedPalace === null &&
    flyingPalace === null &&
    !isReverse;

  const isTimeModified = currentHour !== client.birthHour;

  let currentHourZhi = ZHI[Math.floor((currentHour + 1) / 2) % 12];
  if (Math.floor((currentHour + 1) / 2) % 12 === 0) {
     currentHourZhi = currentHour === 23 ? '晚子' : '早子';
  }

  // --- Helper Functions ---

  const resetAllStates = () => {
    setDaXianSeq(-1);
    setLiuNianYear(null);
    setShowXiaoXian(false);
    setSelectedPalace(null);
    setFlyingPalace(null);
    setIsReverse(false);
    setIsTwinMode(false);
  };

  const changeHour = (delta: number) => {
    const currentIndex = HOUR_SEQUENCE.indexOf(currentHour);
    if (currentIndex === -1) return; 

    let nextIndex = currentIndex + delta;
    if (nextIndex < 0) nextIndex = HOUR_SEQUENCE.length - 1;
    if (nextIndex >= HOUR_SEQUENCE.length) nextIndex = 0;
    
    const newHour = HOUR_SEQUENCE[nextIndex];
    setCurrentHour(newHour);
    resetAllStates();
  };

  const resetTime = () => {
    setCurrentHour(client.birthHour);
    resetAllStates();
  };

  const handleBack = () => {
      if (onBack) onBack();
      else navigate('/');
  };

  const handleDownload = async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        filter: (node) => {
            if (node.classList && node.classList.contains('no-screenshot')) {
                return false;
            }
            return true;
        }
      });
      const link = document.createElement('a');
      const suffix = mode === 'divination' ? '_紫占' : (isTwinMode ? '_雙胞胎' : (isReverse ? '_顛倒盤' : '_本命盤'));
      link.download = `${client.name}${suffix}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleDivInput = (index: number, val: string) => {
      if (val === '') {
          const newArr = [...divNum];
          newArr[index] = '';
          setDivNum(newArr);
          return;
      }

      const v = val.slice(-1); 
      if (!/^\d$/.test(v)) return; 

      if (v === '0') {
          const zeroCount = divNum.filter((n, i) => n === '0' && i !== index).length;
          if (zeroCount >= 1) return; 
      }

      const newArr = [...divNum];
      newArr[index] = v;
      setDivNum(newArr);

      if (index < 3) {
          divRefs[index + 1].current?.focus();
      }
  };

  const handleDivKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Backspace' && divNum[index] === '' && index > 0) {
          divRefs[index - 1].current?.focus();
      }
  };

  const handleStartDivination = () => {
      if (divNum.some(d => d === '')) {
          alert('請輸入完整 4 個數字');
          return;
      }
      setIsDivinationReady(true);
  };

  const getRelativeNames = (currentIdx: number) => {
    if (mode === 'divination') return {};

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
      const liuMingIdx = chartData.palaces.findIndex(
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
    setIsReverse(false);
  };

  const handleLiuNianClick = (year: number) => {
    if (liuNianYear === year) setLiuNianYear(null);
    else setLiuNianYear(year);
    setShowXiaoXian(false);
    setFlyingPalace(null);
    setSelectedPalace(null);
    setIsReverse(false);
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

  const toggleViewMode = () => {
      if (isLimitActive) {
          setIsReverse(!isReverse);
      } else {
          setIsTwinMode(!isTwinMode);
      }
  };

  const toggleReverse = () => {
      setIsReverse(!isReverse);
  };

  const flyingStarsLookup = (() => {
    if (flyingPalace === null) return {};
    const targetPalace = chartData.palaces[flyingPalace];
    if (!targetPalace) return {};
    return baseEngine.getSiHuaMap(targetPalace.ganIndex);
  })();

  const gridLayout = [
    5, 6, 7, 8,
    4, null, null, 9,
    3, null, null, 10,
    2, 1, 0, 11,
  ];

  const connections = (() => {
    if (selectedPalace === null)
      return { self: -1, tri1: -1, tri2: -1, opp: -1 };
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

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-white relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-white border-b border-gray-200 shadow-sm shrink-0 z-50 h-[56px]">
        <button
          onClick={handleBack}
          className="bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          列表
        </button>

        {isCleanState && (
          <button
            onClick={handleDownload}
            className="bg-white text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-sm font-bold shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            截圖
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 w-full relative">
        
        {/* 紫占輸入遮罩 */}
        {mode === 'divination' && !isDivinationReady && (
            <div className="absolute inset-0 z-[60] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-white p-8 rounded-2xl shadow-2xl border border-purple-100 max-w-sm w-full text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
                        <Sparkles size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">紫微占卜</h2>
                    <p className="text-gray-500 text-sm mb-6">請輸入 4 個數字 (0~9，0 不可重複)</p>
                    
                    <div className="flex gap-3 justify-center mb-8">
                        {divNum.map((v, i) => (
                            <input 
                                key={i}
                                ref={divRefs[i]}
                                type="text" 
                                inputMode="numeric"
                                value={v}
                                onChange={e => handleDivInput(i, e.target.value)}
                                onKeyDown={e => handleDivKeyDown(e, i)}
                                className="w-14 h-16 border-2 border-purple-200 rounded-xl text-center text-3xl font-bold focus:border-purple-600 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-purple-800 shadow-sm"
                                placeholder="-"
                            />
                        ))}
                    </div>

                    <button 
                        onClick={handleStartDivination}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2 text-lg active:scale-95"
                    >
                        開始占卜 <ArrowRight size={20} />
                    </button>
                </div>
            </div>
        )}

        <div
            ref={chartRef}
            className="w-full h-full bg-white border-2 border-gray-800 shadow-xl z-10 grid grid-cols-4 grid-rows-4"
        >
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
            {selectedPalace !== null &&
                (() => {
                const pSelf = getAnchorCoord(connections.self);
                const pTri1 = getAnchorCoord(connections.tri1);
                const pTri2 = getAnchorCoord(connections.tri2);
                const pOpp = getAnchorCoord(connections.opp);
                return (
                    <>
                    <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pTri1.x}%`} y2={`${pTri1.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
                    <line x1={`${pTri1.x}%`} y1={`${pTri1.y}%`} x2={`${pTri2.x}%`} y2={`${pTri2.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
                    <line x1={`${pTri2.x}%`} y1={`${pTri2.y}%`} x2={`${pSelf.x}%`} y2={`${pSelf.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
                    <line x1={`${pSelf.x}%`} y1={`${pSelf.y}%`} x2={`${pOpp.x}%`} y2={`${pOpp.y}%`} stroke="#4b5563" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke"/>
                    </>
                );
                })()}
            </svg>

            {gridLayout.map((palaceIdx, gridPos) => {
            if (palaceIdx === null) {
                if (gridPos === 5)
                return (
                    <div key="center" className="col-span-2 row-span-2 flex flex-col items-center justify-center p-2 border border-gray-300 bg-white z-10 relative">
                        {/* 1. 時辰切換 */}
                        <div className="flex w-full justify-center gap-6 items-center mb-1 mt-2">
                            <button onClick={() => changeHour(-1)} className="text-gray-400 hover:text-gray-800 font-bold text-2xl select-none">&lt;</button>
                            <div onClick={isTimeModified ? resetTime : undefined} className={`text-lg font-bold select-none ${isTimeModified ? 'text-blue-600 cursor-pointer underline' : 'text-gray-600'}`} title={isTimeModified ? '點擊還原出生時辰' : ''}>
                                {currentHourZhi}時
                            </div>
                            <button onClick={() => changeHour(1)} className="text-gray-400 hover:text-gray-800 font-bold text-2xl select-none">&gt;</button>
                        </div>

                        {/* 2. 名字 + 本命主星 */}
                        <div className="flex flex-col items-center gap-1 mb-2">
                            <div className="text-3xl sm:text-4xl font-bold text-black tracking-widest text-center">
                                {client.name}
                            </div>
                            <div className="text-sm font-bold text-gray-500 tracking-wide">
                                {benMingMajorStarsStr}
                            </div>
                        </div>

                        {/* 3. 命主資訊 */}
                        <div className="flex flex-col items-center w-full leading-tight gap-1">
                            <div className="text-gray-700 text-sm sm:text-base font-medium">
                                {client.gender} {chartData.bureau}
                            </div>
                            
                            <div className="flex flex-col items-start text-sm sm:text-base text-gray-600">
                                <div>西元：{chartData.solarDate}</div>
                                <div>農曆：{chartData.lunarDate}</div>
                                <div className="text-gray-700 font-medium">命主：{chartData.mingZhu} 身主：{chartData.shenZhu}</div>
                            </div>
                        </div>

                        {mode === 'divination' && isDivinationReady && (
                            <div className="absolute top-2 right-2 flex gap-1 z-50 opacity-50">
                                {divNum.map((n, i) => (
                                    <span key={i} className="text-xs font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded border border-purple-200">{n}</span>
                                ))}
                            </div>
                        )}

                        {mode === 'standard' && (
                            <div className="absolute top-2 right-2 flex flex-col items-center gap-2 z-50">
                                <div className="flex flex-col items-center gap-0.5 no-screenshot">
                                    <span className="text-[9px] text-gray-400 font-bold transform scale-90">
                                        {isLimitActive ? '顛倒盤' : '雙胞胎'}
                                    </span>
                                    <button 
                                        onClick={toggleViewMode} 
                                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out
                                            ${(isLimitActive ? isReverse : isTwinMode) 
                                                ? 'bg-purple-600' 
                                                : 'bg-gray-300'
                                            }`}
                                    >
                                        <div 
                                            className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out
                                                ${(isLimitActive ? isReverse : isTwinMode) 
                                                    ? 'translate-x-4' 
                                                    : 'translate-x-0'
                                                }`}
                                        />
                                    </button>
                                </div>

                                {liuNianYear && (
                                    <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-[9px] text-gray-400 font-bold transform scale-90">小限盤</span>
                                    <button 
                                        onClick={toggleXiaoXian} 
                                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out
                                            ${showXiaoXian ? 'bg-green-500' : 'bg-gray-300'}`}
                                    >
                                        <div 
                                            className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out
                                                ${showXiaoXian ? 'translate-x-4' : 'translate-x-0'}`} 
                                        />
                                    </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
                return null;
            }

            const { daName, liuName, xiaoName } = getRelativeNames(palaceIdx);
            const oppPalaceIdx = (palaceIdx + 6) % 12;
            const { daName: reverseDaName, liuName: reverseLiuName } = getRelativeNames(oppPalaceIdx);

            const isBenMingMing = mode === 'divination' 
                ? palaceIdx === divMingIndex 
                : palaceIdx === benMingPos;

            const isDaXianMing = daXianSeq >= 0 && daXianList[daXianSeq].palaceIdx === palaceIdx;
            const isLiuNianMing = liuNianYear !== null && chartData.palaces[palaceIdx].zhiIndex === (liuNianYear - 4) % 12;
            const isXiaoXianMingPalace = liuNianYear !== null && palaceIdx === xiaoXianMingIdx;
            const isDaXianActive = daXianSeq >= 0;
            const isLiuNianActive = liuNianYear !== null;
            const isXiaoXianActive = showXiaoXian;
            const isConnected = selectedPalace !== null && Object.values(connections).includes(palaceIdx);
            const showXiaoXianSeal = isXiaoXianMingPalace && !showXiaoXian;
            const isFlyingSource = flyingPalace === palaceIdx;

            return (
                <div key={palaceIdx} onClick={() => handlePalaceClick(palaceIdx)} className={`relative cursor-pointer transition-all duration-200 border border-gray-300 box-border overflow-visible ${isConnected ? 'bg-red-50' : 'hover:bg-gray-50'} ${isFlyingSource ? 'ring-4 ring-purple-400 z-50 animate-pulse' : ''}`} style={isFlyingSource ? { animationIterationCount: 3 } : {}}>
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
                    isXiaoXianMingPalace={isXiaoXianMingPalace && (isLiuNianActive || isXiaoXianActive)}
                    onTriggerClick={() => handleTriggerClick(palaceIdx)}
                    flyingStars={flyingStarsLookup}
                    isTwinMode={isTwinMode}
                    isReverse={isReverse}
                    reverseDaName={reverseDaName}
                    reverseLiuName={reverseLiuName}
                />
                {isDaXianMing && isDaXianActive && <div className="absolute inset-0 border-[3px] border-gray-600 pointer-events-none z-20 opacity-70"></div>}
                {isConnected && <div className="absolute inset-0 border-2 border-red-500 pointer-events-none z-30"></div>}
                </div>
            );
            })}
        </div>
      </div>

      {mode !== 'divination' && (
          <div className="w-full shrink-0 border-t-2 border-gray-800 bg-gray-100 z-50">
            <div className="w-full">
                <div className="flex w-full overflow-x-auto scrollbar-hide border-b border-gray-300">
                    {daXianList.map((limit) => {
                    const isActive = daXianSeq === limit.seq;
                    return (
                        <button key={limit.seq} onClick={() => handleDaXianClick(limit.seq)} className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs ${isActive ? 'bg-gray-600 text-white font-bold' : 'hover:bg-gray-200 text-gray-700'}`}>
                        <div>{limit.name} {limit.ganZhi}</div>
                        </button>
                    );
                    })}
                </div>
                <div className="flex w-full overflow-x-auto scrollbar-hide">
                    {liuNianList.map((item) => {
                    const isActive = liuNianYear === item.year;
                    return (
                        <button key={item.year} onClick={() => handleLiuNianClick(item.year)} className={`flex-1 min-w-[70px] py-1 px-1 border-r border-gray-300 last:border-r-0 transition-colors text-xs ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-100 text-gray-600'}`}>
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