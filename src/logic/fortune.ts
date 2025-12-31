import { ZiWeiEngine } from './engine';
import type { ChartData, Palace, Star } from './types';
// [修正] 引入 LunarYear 以正確計算閏月
import { Solar, LunarYear } from 'lunar-typescript';

export interface DailyFortune {
  score: number;       // 總分
  weather: 'sunny' | 'cloudy' | 'rainy';
  summary: string;
  
  // [修正] 改為生活化指標
  indexOverall: number;   // 氣場 (原命遷)
  indexLoveCareer: number; // 感情事業 (原夫官)
  indexWealth: number;    // 財運 (原財福)

  details: {
    overall: string;
    loveCareer: string;
    wealth: string;
  };

  debug?: {
    flowDayZhi: string;
    calcLog: string[];
  }
}

// 評分規則 (MVP 佔位符，之後我們再來填入您的獨門邏輯)
const RULES = {
  LUCKY_STARS: ['化祿', '化權', '化科', '祿存', '天魁', '天鉞', '左輔', '右弼', '紫微', '天府', '太陽', '太陰', '武曲', '貪狼'],
  UNLUCKY_STARS: ['化忌', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '七殺', '破軍'],
  WEIGHTS: {
    LU: 15, QUAN: 10, KE: 8, JI: -15,
    LUCKY_MAJOR: 5, UNLUCKY_MAJOR: -3,
    LUCKY_MINOR: 3, UNLUCKY_MINOR: -4 
  }
};

export const calculateDailyFortune = (engine: ZiWeiEngine): DailyFortune => {
  const chart = engine.getChartData();
  const today = new Date(); 
  const debugLogs: string[] = [];

  // 1. 定位流日命宮
  const flowDayPalaceIdx = getFlowDayPalaceIndex(chart, today, debugLogs);
  
  // 2. 定義三大戰線 (以流日命宮 index 為基準)
  // 命遷線 (氣場)
  const idxLife = flowDayPalaceIdx;
  const idxTravel = (idxLife + 6) % 12;

  // 夫官線 (感情事業)
  const idxSpouse = (idxLife + 10) % 12; // 逆數第三
  const idxCareer = (idxLife + 4) % 12;  // 官祿

  // 財福線 (財運)
  const idxWealth = (idxLife + 8) % 12;  // 財帛
  const idxFortune = (idxLife + 2) % 12; // 福德

  // 3. 計算分數 (MVP 暫定算法)
  const scoreOverall = calcStarsScore(chart.palaces[idxLife], 1) + calcStarsScore(chart.palaces[idxTravel], 0.8);
  const scoreLoveCareer = calcStarsScore(chart.palaces[idxCareer], 1) + calcStarsScore(chart.palaces[idxSpouse], 0.8);
  const scoreWealth = calcStarsScore(chart.palaces[idxWealth], 1) + calcStarsScore(chart.palaces[idxFortune], 0.8);

  // 4. 正規化 (0-100)
  const finalOverall = normalize(60 + scoreOverall);
  const finalLoveCareer = normalize(60 + scoreLoveCareer);
  const finalWealth = normalize(60 + scoreWealth);

  // 5. 總分
  const totalScore = Math.round((finalOverall + finalLoveCareer + finalWealth) / 3);

  return {
    score: totalScore,
    weather: getWeather(totalScore),
    summary: getSummary(totalScore),
    indexOverall: finalOverall,
    indexLoveCareer: finalLoveCareer,
    indexWealth: finalWealth,
    details: {
      overall: getAdvice('overall', finalOverall),
      loveCareer: getAdvice('love', finalLoveCareer),
      wealth: getAdvice('wealth', finalWealth)
    },
    debug: {
        flowDayZhi: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][flowDayPalaceIdx],
        calcLog: debugLogs
    }
  };
};

// --- 輔助函式 ---

const getFlowDayPalaceIndex = (chart: ChartData, date: Date, logs: string[]): number => {
    // A. 本命寅位斗君
    const yinPalaceName = chart.palaces[2].name; 
    const palaceOrder = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"];
    const douJunOrderIdx = palaceOrder.indexOf(yinPalaceName); 
    
    // B. 流年正月位
    const yearStartZhi = (getLiuNianMingPosition(date.getFullYear()) - douJunOrderIdx + 12) % 12;
    
    // C. 推算流日
    return calculateFlowDay(yearStartZhi, date, logs);
};

const getLiuNianMingPosition = (year: number): number => {
    return (year - 4) % 12;
};

const calculateFlowDay = (startMonthZhi: number, date: Date, logs: string[]): number => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    
    const month = Math.abs(lunar.getMonth());
    const day = lunar.getDay();
    
    // [修正 bug] 使用 LunarYear 物件來獲取閏月資訊
    const lunarYear = LunarYear.fromYear(lunar.getYear());
    const leapMonth = lunarYear.getLeapMonth(); 
    
    let monthSteps = month - 1;

    // 處理閏月邏輯
    if (leapMonth > 0) {
        if (Math.abs(lunar.getMonth()) > leapMonth) {
            monthSteps += 1; 
        } 
        else if (lunar.getMonth() < 0) {
            monthSteps += 1;
        }
    }
    
    const flowMonthZhi = (startMonthZhi + monthSteps) % 12;
    const flowDayZhi = (flowMonthZhi + (day - 1)) % 12;
    
    return flowDayZhi;
};

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

const normalize = (raw: number): number => {
    let n = raw;
    if (n > 100) n = 100;
    if (n < 0) n = 0;
    return Math.round(n);
};

const getWeather = (score: number): 'sunny' | 'cloudy' | 'rainy' => {
    if (score >= 75) return 'sunny';
    if (score >= 50) return 'cloudy';
    return 'rainy';
};

const getSummary = (score: number): string => {
    if (score >= 80) return "氣勢如虹，適合大膽進取";
    if (score >= 60) return "運勢平穩，按部就班";
    if (score >= 40) return "波折稍多，建議保守";
    return "諸事不宜，低調沉潛";
};

const getAdvice = (type: string, score: number): string => {
    if (score > 70) return "吉星高照，把握良機。";
    if (score > 40) return "平平淡淡，才是真。";
    return "煞星干擾，注意防範。";
};