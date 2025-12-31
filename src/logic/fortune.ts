import { ZiWeiEngine } from './engine';
// 修正重點：加上 type 關鍵字
import type { ChartData, Palace, Star } from './types'; 
// 引入 Solar 用於計算今日農曆
import { Solar } from 'lunar-typescript';

// 定義運勢結果介面
export interface DailyFortune {
  score: number;       // 總分 (0-100)
  weather: 'sunny' | 'cloudy' | 'rainy'; // 天氣
  summary: string;     // 一句話點評
  
  // 三大指數 (0-100)
  moneyScore: number;
  loveScore: number;
  travelScore: number;

  // 詳細建議 (未來可用於付費解鎖)
  details: {
    money: string;
    love: string;
    travel: string;
  };

  // 偵錯資訊
  debug?: {
    flowDayZhi: string;
  }
}

// 評分規則設定 (MVP版)
const RULES = {
  LUCKY_STARS: ['化祿', '化權', '化科', '祿存', '天魁', '天鉞', '左輔', '右弼', '紫微', '天府', '太陽', '太陰', '武曲', '貪狼'],
  UNLUCKY_STARS: ['化忌', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '七殺', '破軍'],
  WEIGHTS: {
    LU: 15,   
    QUAN: 10, 
    KE: 8,    
    JI: -18,  
    LUCKY_MAJOR: 5,   
    UNLUCKY_MAJOR: -3,
    LUCKY_MINOR: 3,   
    UNLUCKY_MINOR: -4 
  }
};

/**
 * 計算今日運勢的主函數
 */
export const calculateDailyFortune = (engine: ZiWeiEngine): DailyFortune => {
  const chart = engine.getChartData();
  const today = new Date(); 
  
  // 1. 定位流日命宮 (使用本命寅位斗君法)
  const flowDayPalaceIdx = getFlowDayPalaceIndex(chart, today);
  const flowDayPalace = chart.palaces[flowDayPalaceIdx];

  // 2. 獲取三方四正宮位
  // 簡化 MVP：看「流日命宮」的三方四正 (地支三合)。
  // 申子辰、寅午戌、亥卯未、巳酉丑
  const idx = flowDayPalaceIdx;
  const palaceSelf = chart.palaces[idx];
  const palaceTravel = chart.palaces[(idx + 6) % 12]; // 對宮
  const palaceMoney = chart.palaces[(idx + 8) % 12];  // 財帛 (標準地支三合：逆時針4=順時針8)
  const palaceCareer = chart.palaces[(idx + 4) % 12]; // 官祿 (標準地支三合：順時針4)
  const palaceLove = chart.palaces[(idx + 10) % 12];  // 夫妻位 (逆數第三: 命0->兄11->夫10)

  // 3. 計算分數
  const baseScore = 60;
  
  // 綜合運勢
  const totalRawScore = baseScore + 
    calcStarsScore(palaceSelf, 1.0) + 
    calcStarsScore(palaceTravel, 0.8) + 
    calcStarsScore(palaceMoney, 0.6) + 
    calcStarsScore(palaceCareer, 0.6);

  // 財運 (財帛宮 + 命宮)
  const moneyRawScore = baseScore + calcStarsScore(palaceMoney, 1.2) + calcStarsScore(palaceSelf, 0.5);

  // 感情 (夫妻宮 + 命宮)
  const loveRawScore = baseScore + calcStarsScore(palaceLove, 1.2) + calcStarsScore(palaceSelf, 0.5);

  // 外出 (遷移宮 + 命宮)
  const travelRawScore = baseScore + calcStarsScore(palaceTravel, 1.2) + calcStarsScore(palaceSelf, 0.5);

  // 4. 正規化分數 (0-100)
  const finalScore = normalize(totalRawScore);
  
  return {
    score: finalScore,
    weather: getWeather(finalScore),
    summary: getSummary(finalScore, palaceSelf),
    moneyScore: normalize(moneyRawScore),
    loveScore: normalize(loveRawScore),
    travelScore: normalize(travelRawScore),
    details: {
      money: getAdvice('money', normalize(moneyRawScore)),
      love: getAdvice('love', normalize(loveRawScore)),
      travel: getAdvice('travel', normalize(travelRawScore))
    },
    debug: {
        flowDayZhi: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][idx]
    }
  };
};

// --- 輔助函式 ---

// 1. 本命寅位斗君法 - 尋找流日命宮 Index
const getFlowDayPalaceIndex = (chart: ChartData, date: Date): number => {
    // A. 找出本命斗君 (本命盤寅位是什麼宮?)
    // palaces 陣列 index 2 就是寅位 (0子 1丑 2寅)
    const yinPalaceName = chart.palaces[2].name; 
    
    const palaceOrder = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"];
    const douJunOrderIdx = palaceOrder.indexOf(yinPalaceName); 
    
    // B. 找出流年盤中，該宮職在哪個地支? (即為正月起點)
    const yearStartZhi = (getLiuNianMingPosition(date.getFullYear()) - douJunOrderIdx + 12) % 12;
    
    // C. 推算流日
    return calculateFlowDay(yearStartZhi, date);
};

const getLiuNianMingPosition = (year: number): number => {
    // (year - 4) % 12 是年支 index (0=子, 1=丑... 5=巳)
    return (year - 4) % 12;
};

const calculateFlowDay = (startMonthZhi: number, date: Date): number => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    
    const month = Math.abs(lunar.getMonth()); // 取得月份 (1-12)
    const day = lunar.getDay(); // 取得日期 (1-30)
    
    // 處理閏月：如果 lunar.getMonth() < 0 代表是閏月
    // Lunar 庫: getLeapMonth() 回傳該年閏幾月(0無)，getMonth() 負數代表該月是閏月
    const leapMonth = lunar.getLeapMonth(); 
    
    let monthSteps = month - 1;
    // 如果今年有閏月
    if (leapMonth > 0) {
        // 如果當前月份數字 大於 閏月數字 (例如閏6月，現在是7月)，那前面已經多走過一個閏月了
        if (Math.abs(lunar.getMonth()) > leapMonth) {
            monthSteps += 1; 
        } 
        // 如果當前就是閏月 (month是負數，且絕對值等於閏月)，也要多走一步 (因為前面已經走過正常的該月)
        // 修正邏輯：閏月通常是接著走。例如 6月 -> 閏6月。
        // 正常6月: step = 5。 閏6月: step = 6。 7月: step = 7。
        else if (lunar.getMonth() < 0) {
            monthSteps += 1;
        }
    }
    
    const flowMonthZhi = (startMonthZhi + monthSteps) % 12;
    
    // 流日：從流月位起初一 (順數)
    const flowDayZhi = (flowMonthZhi + (day - 1)) % 12;
    
    return flowDayZhi;
};


// 2. 星曜計分
const calcStarsScore = (palace: Palace, ratio: number): number => {
    let score = 0;
    const allStars = [...palace.majorStars, ...palace.minorStars, ...palace.miscStars, ...palace.limitStars];
    
    allStars.forEach(star => {
        if (RULES.LUCKY_STARS.includes(star.name)) score += (RULES.WEIGHTS.LUCKY_MINOR * ratio);
        if (['紫微','天府','太陽','太陰','武曲'].includes(star.name)) score += (RULES.WEIGHTS.LUCKY_MAJOR * ratio);
        if (RULES.UNLUCKY_STARS.includes(star.name)) score += (RULES.WEIGHTS.UNLUCKY_MINOR * ratio);
        
        if (star.sihua) {
            star.sihua.forEach(sh => {
                if (sh.type === '祿') score += (RULES.WEIGHTS.LU * ratio);
                if (sh.type === '權') score += (RULES.WEIGHTS.QUAN * ratio);
                if (sh.type === '科') score += (RULES.WEIGHTS.KE * ratio);
                if (sh.type === '忌') score += (RULES.WEIGHTS.JI * ratio);
            });
        }
    });

    return score;
};

// 3. 正規化
const normalize = (raw: number): number => {
    let n = raw;
    if (n > 100) n = 100;
    if (n < 0) n = 0;
    return Math.round(n);
};

// 4. 文案產生器
const getWeather = (score: number): 'sunny' | 'cloudy' | 'rainy' => {
    if (score >= 75) return 'sunny';
    if (score >= 50) return 'cloudy';
    return 'rainy';
};

const getSummary = (score: number, palace: Palace): string => {
    if (score >= 80) return "氣勢如虹，適合大膽進取！";
    if (score >= 60) return "運勢平穩，按部就班即可。";
    if (score >= 40) return "稍有波折，建議保守行事。";
    return "諸事不宜，今日宜低調沉潛。";
};

const getAdvice = (type: string, score: number): string => {
    if (type === 'money') {
        return score > 60 ? "財星高照，適合投資或談判。" : "財運波動，小心衝動消費或遺失錢財。";
    }
    if (type === 'love') {
        return score > 60 ? "桃花運旺，適合約會或告白。" : "感情易生口角，少說兩句為妙。";
    }
    if (type === 'travel') {
        return score > 60 ? "外出順利，可遇貴人。" : "交通需留心，行車走路請放慢速度。";
    }
    return "";
};