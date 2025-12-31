import { ZiWeiEngine } from './engine';
import { ChartData, Palace, Star } from './types';

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

  // 偵錯資訊 (讓老師驗證流日位置對不對)
  debug?: {
    flowDayZhi: string; // 流日地支
  }
}

// 評分規則設定 (MVP版)
const RULES = {
  // 吉星加分
  LUCKY_STARS: ['化祿', '化權', '化科', '祿存', '天魁', '天鉞', '左輔', '右弼', '紫微', '天府', '太陽', '太陰', '武曲', '貪狼'],
  // 凶星扣分
  UNLUCKY_STARS: ['化忌', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '七殺', '破軍'],
  
  // 分數權重
  WEIGHTS: {
    LU: 15,   // 化祿
    QUAN: 10, // 化權
    KE: 8,    // 化科
    JI: -18,  // 化忌 (殺傷力大)
    
    LUCKY_MAJOR: 5,   // 吉主星
    UNLUCKY_MAJOR: -3,// 凶主星 (如七殺破軍，雖不一定是凶，但波動大，先扣分保守估計)
    
    LUCKY_MINOR: 3,   // 吉輔星
    UNLUCKY_MINOR: -4 // 煞星
  }
};

/**
 * 計算今日運勢的主函數
 */
export const calculateDailyFortune = (engine: ZiWeiEngine): DailyFortune => {
  const chart = engine.getChartData();
  const today = new Date(); // 使用當下時間，也可以傳入指定日期
  
  // 1. 定位流日命宮 (使用本命寅位斗君法)
  const flowDayPalaceIdx = getFlowDayPalaceIndex(chart, today);
  const flowDayPalace = chart.palaces[flowDayPalaceIdx];

  // 2. 獲取三方四正宮位
  const flowMoneyPalace = chart.palaces[(flowDayPalaceIdx + 8) % 12]; // 財帛 (逆時針4格 = 順時針8格? 不對，紫微是逆布宮位嗎？通常三方是命+4,+8。這裡我們用標準相對位置：命(0), 財(8), 官(4), 遷(6))
  // 修正：標準盤三合是 命(0) -> 財(4) -> 官(8)? 不，是 命(子) -> 財(申) -> 官(辰)。
  // 逆布宮位下：命(0) -> 兄(1) -> 夫(2) -> 子(3) -> 財(4)。所以財帛是 index+4 ?
  // 等等，engine.ts 裡的 palaces 是按地支順序排的 (子=0, 丑=1...) 還是按命宮排的？
  // 看 engine.ts: palaces[i].index = i, zhiIndex = i。所以 palaces 是固定的地支盤 (0=子, 1=丑...)。
  // 所以我們要找相對宮位，要看地支關係。
  // 命(X) -> 三合是 (X+4)%12 和 (X+8)%12。 對沖是 (X+6)%12。
  
  // 讓我們重新確認三方四正：
  // 申子辰、寅午戌、亥卯未、巳酉丑。
  // 假設流命在 子(0)。三合是 申(8) 和 辰(4)。對宮是 午(6)。
  // 所以：
  // 官祿 = (flowDay + 4) % 12
  // 遷移 = (flowDay + 6) % 12
  // 財帛 = (flowDay + 8) % 12
  // 夫妻 = (flowDay + 2) % 12 (官祿的對宮? 不，夫妻是官祿對宮，所以是 (flowDay+4+6)%12 = +10。或者命宮逆數... )
  
  // 紫微斗數標準佈局 (逆時針排)：命、兄、夫、子、財、疾、遷、奴、官、田、福、父。
  // 但我們的 engine.palaces 是按地支順序 (0子, 1丑, 2寅...)。
  // 我們不知道流日命宮是順布還是逆布，流日通常只看地支位。
  // 所以流日財帛宮，通常定義為「流日命宮的官祿位」還是「流日盤的財帛位」？
  // 簡化 MVP：我們直接看「流日命宮」的三方四正 (地支三合)。
  // 財運看：流命 + 三方 + 流財(本命財帛流化?) 
  // 為了 MVP，我們先單純看：
  // 財運指數 = 流日命宮三方四正 + 流日財帛宮(命宮地支-4) 
  // 感情指數 = 流日夫妻宮 (命宮地支-2 ? 不，命逆數第三是夫妻。子(命)->亥(兄)->戌(夫)。所以是 -2)
  // 外出指數 = 流日遷移宮 (命宮地支+6)

  const idx = flowDayPalaceIdx;
  const palaceSelf = chart.palaces[idx];
  const palaceTravel = chart.palaces[(idx + 6) % 12]; // 對宮
  const palaceMoney = chart.palaces[(idx + 8) % 12];  // 三合 (申子辰: 子->申是+8) - 這是標準三合位
  const palaceCareer = chart.palaces[(idx + 4) % 12]; // 三合 (申子辰: 子->辰是+4)
  const palaceLove = chart.palaces[(idx + 10) % 12];  // 夫妻位 (逆數第三: 0->11->10)

  // 3. 計算分數
  const baseScore = 60;
  
  // 綜合運勢 (命 + 遷 + 財 + 官)
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
    
    // 找出該宮位名稱在「標準紫微盤」中的相對位置 offset
    // 命宮=0, 兄弟=1, 夫妻=2 ... (逆時針)
    // 但我們不需要這麼複雜，我們只需要知道「本命斗君」是指哪個「宮職」。
    // 其實規則是：本命寅位的宮職，就是流年的正月命宮。
    
    // B. 找出 2025 流年盤中，該宮職在哪個地支?
    // 我們的 engine 沒有直接吐出「流年盤每個宮職在哪」，但我們可以推算。
    // 流年命宮由地支決定 (2025 乙巳 -> 巳位是流命)。
    // 既然知道流命在 巳 (index 5)，我們就可以推算其他宮職。
    // 宮職順序(逆布): 命(0), 兄(1), 夫(2), 子(3), 財(4), 疾(5), 遷(6), 奴(7), 官(8), 田(9), 福(10), 父(11)
    
    // 先反查本命寅位宮職是第幾個順位?
    const palaceOrder = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"];
    const douJunOrderIdx = palaceOrder.indexOf(yinPalaceName); // 例如 "福德" -> 10
    
    // 流年命宮在 巳 (5)
    // 流年某宮職的位置 = (流命位置 - OrderIdx + 12) % 12  <-- 逆布公式
    // 例如流年福德 = (5 - 10 + 12) % 12 = 7 (未)。
    // 驗證：巳(命)->辰(兄)->卯(夫)->寅(子)->丑(財)->子(疾)->亥(遷)->戌(奴)->酉(官)->申(田)->未(福)。 Correct!
    
    // 所以：流年正月(一月) 起點 = 流年斗君位置
    const yearStartZhi = (getLiuNianMingPosition(date.getFullYear()) - douJunOrderIdx + 12) % 12;
    
    // C. 推算流月 (順數，遇閏月+1)
    // 這裡需要農曆月份。Engine 裡面的 lunar 是生辰的，不是今天的。
    // 所以我們需要引入 lunar-typescript 算今天的農曆。
    // 為了簡化，這裡假設 engine 已經包含了 Lunar 庫，我們直接 new。
    // 注意：這裡會有一個小相依性問題，如果 logic/fortune.ts 沒有 import Lunar。
    // 解決：我們動態 import 或者假設外部傳入。為求穩，直接用 logic/engine.ts 裡的 Lunar 引用。
    
    // *重要*：為了取得「今天的」農曆，我們需要重新 new 一個 Solar。
    // 但為了不讓檔案太複雜，我們先寫一個簡單的農曆轉換 (或依賴 engine 的 helper)。
    // 暫時解法：利用 engine 傳進來的 lunarYear 只是生年，這不夠。
    // 我們在 fortune.ts 頂部 import { Solar } from 'lunar-typescript';
    
    // (補) 請確認 logic/engine.ts 是否有 export Solar? 如果沒有，我們直接在這裡 import。
    
    // D. 實作流日推算
    return calculateFlowDay(yearStartZhi, date);
};

// 引入 Solar 用於計算今日農曆
import { Solar, Lunar } from 'lunar-typescript';

const getLiuNianMingPosition = (year: number): number => {
    // 簡單推算流年地支: 2025(乙巳) -> 5(巳)
    // 2024(甲辰) -> 4(辰)
    // 算法：(year - 4) % 12 是年支 (子=0...但一般 (year-4)%12: 2024-4=2020%12=4(辰). 2008(子)-4=4... )
    // 驗證：2008 是鼠年(子)。 (2008-4)%12 = 4? 不對，2008%12 = 4。
    // 已知 1984 是甲子年。 (1984-4)%12 = 0。
    // 所以 (year - 4) % 12 就是地支 index (0=子, 1=丑... 11=亥)。
    // 修正：2025 - 4 = 2021. 2021 % 12 = 5 (巳)。 Correct.
    return (year - 4) % 12;
};

const calculateFlowDay = (startMonthZhi: number, date: Date): number => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    
    const month = Math.abs(lunar.getMonth()); // 取得月份 (1-12)
    const day = lunar.getDay(); // 取得日期 (1-30)
    
    // 處理閏月：如果 lunar.getMonth() < 0 代表是閏月
    // 邏輯：順數月份。
    // 假設正月在 未(7)。
    // 二月 = 7+1 = 8(申)
    // ...
    // 如果今年有閏月，且當前月份大於閏月，要多加1。
    // lunar-typescript 好像沒直接給「今年閏幾月」。
    // 簡易解法：直接 loop 1 到 month。
    // 這裡為了 MVP，先暫時忽略「閏月多走一格」的複雜判斷 (因為需要知道閏哪個月)，
    // 先做標準順數： 流月宮 = (正月位 + (月-1)) % 12
    // *修正*：大寶老師提到閏六月要多走。若我們能知道閏月，就加判斷。
    // 為了精確，我們可以用 lunar.getYear() 查閏月。
    const leapMonth = lunar.getLeapMonth(); // 0 表示無閏月
    
    let monthSteps = month - 1;
    // 如果今年有閏月，且當前月份已經過了閏月，或是正是閏月
    if (leapMonth > 0) {
        if (Math.abs(lunar.getMonth()) > leapMonth) {
            monthSteps += 1; // 過了閏月，多走一步
        } else if (Math.abs(lunar.getMonth()) === leapMonth && lunar.getMonth() < 0) {
            monthSteps += 1; // 正是閏月，多走一步
        }
    }
    
    const flowMonthZhi = (startMonthZhi + monthSteps) % 12;
    
    // 流日：從流月位起初一 (順數)
    // 公式：(流月位 + (日-1)) % 12
    const flowDayZhi = (flowMonthZhi + (day - 1)) % 12;
    
    return flowDayZhi;
};


// 2. 星曜計分
const calcStarsScore = (palace: Palace, ratio: number): number => {
    let score = 0;
    
    // 掃描所有星 (主、輔、雜、限)
    const allStars = [...palace.majorStars, ...palace.minorStars, ...palace.miscStars, ...palace.limitStars];
    
    allStars.forEach(star => {
        // 吉星加分
        if (RULES.LUCKY_STARS.includes(star.name)) score += (RULES.WEIGHTS.LUCKY_MINOR * ratio);
        if (['紫微','天府','太陽','太陰','武曲'].includes(star.name)) score += (RULES.WEIGHTS.LUCKY_MAJOR * ratio);
        
        // 煞星扣分
        if (RULES.UNLUCKY_STARS.includes(star.name)) score += (RULES.WEIGHTS.UNLUCKY_MINOR * ratio);
        
        // 四化特別加權 (最重要的變數)
        // 檢查該星是否有四化 (本命、大限、流年四化都會疊加)
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

// 3. 正規化 (將任意分數映射到 0-100)
const normalize = (raw: number): number => {
    // 假設 raw 分數範圍大約在 30 ~ 90 之間
    // 我們希望 60 是及格，90 是滿分，30 是不及格
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