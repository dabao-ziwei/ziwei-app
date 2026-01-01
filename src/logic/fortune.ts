import { ZiWeiEngine } from './engine';
import type { ChartData, Palace } from './types';
import { Solar, LunarYear } from 'lunar-typescript';
import { PALACE_NAMES } from './constants'; // [新增] 引入宮位名稱常數以計算斗君

// 定義五大維度
export interface DailyFortune {
  score: number;       // 總分 (加權平均, 保留一位小數)
  weather: 'sunny' | 'cloudy' | 'rainy';
  summary: string;
  
  // 五角圖數據 (基準 60)
  scores: {
    self: number;     // 自身氣場
    social: number;   // 交友運勢
    love: number;     // 感情運勢
    travel: number;   // 外出運勢
    wealth: number;   // 理財運勢
  };

  details: {
    overall: string;
    loveCareer: string;
    wealth: string;
  };

  // 開發驗證資訊
  devInfo: {
    lunarDateStr: string;   // 農曆日期
    flowYearZhi: string;    // 流年地支 (流年命宮)
    flowMonthAnchor: string;// 流年正月起點 (流年福德)
    flowMonthZhi: string;   // 流月地支
    flowDayZhi: string;     // 流日地支
    formulas: {             // 各維度算式細節
        self: string[];
        social: string[];
        love: string[];
        travel: string[];
        wealth: string[];
    }
  }
}

// --- 靜態資料表 ---
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 四化表 (祿, 權, 科, 忌)
const SI_HUA_MAP: Record<string, string[]> = {
  '甲': ['廉貞', '破軍', '武曲', '太陽'],
  '乙': ['天機', '天梁', '紫微', '太陰'],
  '丙': ['天同', '天機', '文昌', '廉貞'],
  '丁': ['太陰', '天同', '天機', '巨門'],
  '戊': ['貪狼', '太陰', '右弼', '天機'],
  '己': ['武曲', '貪狼', '天梁', '文曲'],
  '庚': ['太陽', '武曲', '天同', '天相'], 
  '辛': ['巨門', '太陽', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左輔', '武曲'],
  '癸': ['破軍', '巨門', '太陰', '貪狼'],
};

// 祿存、擎羊、陀羅表 (依天干)
const LU_YANG_TUO_MAP: Record<string, number> = {
  '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5,
  '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0,
};

/**
 * 計算運勢的主函數
 * @param engine 紫微引擎
 * @param date 指定日期 (選填，預設為今日)
 */
export const calculateDailyFortune = (engine: ZiWeiEngine, date?: Date): DailyFortune => {
  const chart = engine.getChartData();
  const targetDate = date || new Date();
  
  // 1. 計算時空參數 (包含修正後的斗君邏輯)
  const timeParams = calcTimeParameters(chart, targetDate);
  const { flowDayIdx, flowMonthIdx, lunarStr, flowYearZhi, flowMonthAnchor } = timeParams;

  // 2. 取得「流運宮位」的天干
  const flowMonthGan = chart.palaces[flowMonthIdx].ganIndex;
  const flowDayGan = chart.palaces[flowDayIdx].ganIndex;

  // 3. 取得「本命」天干
  const birthGan = (chart.lunarYear - 4) % 10;

  // 4. 建立掃描器
  const scanner = new StarScanner(chart, { 
      ...timeParams, 
      birthGan,      
      flowMonthGan, 
      flowDayGan 
  });

  // 5. 定義五大維度 (流日宮位 Offset)
  const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;

  const targets = {
    self:   [[getP(0), '命宮'], [getP(6), '遷移'], [getP(4), '官祿'], [getP(8), '財帛']],
    social: [[getP(5), '僕役'], [getP(11), '兄弟'], [getP(1), '父母'], [getP(9), '子女']],
    love:   [[getP(10), '夫妻'], [getP(4), '官祿'], [getP(6), '遷移'], [getP(2), '福德']],
    travel: [[getP(9), '子女'], [getP(3), '田宅'], [getP(5), '僕役'], [getP(1), '父母']],
    wealth: [[getP(2), '福德'], [getP(8), '財帛'], [getP(6), '遷移'], [getP(10), '夫妻']],
  };

  // 6. 計算得分
  const results = {
      self: calcCategoryScore(scanner, targets.self as any),
      social: calcCategoryScore(scanner, targets.social as any),
      love: calcCategoryScore(scanner, targets.love as any),
      travel: calcCategoryScore(scanner, targets.travel as any),
      wealth: calcCategoryScore(scanner, targets.wealth as any),
  };

  const scores = {
    self: results.self.finalScore,
    social: results.social.finalScore,
    love: results.love.finalScore,
    travel: results.travel.finalScore,
    wealth: results.wealth.finalScore,
  };

  // 總分平均 (保留一位小數)
  const rawAvg = (scores.self + scores.social + scores.love + scores.travel + scores.wealth) / 5;
  const avg = Math.round(rawAvg * 10) / 10;

  return {
    score: avg,
    weather: getWeather(avg),
    summary: getSummary(avg),
    scores,
    details: {
        overall: getAdvice('self', scores.self),
        loveCareer: getAdvice('love', scores.love),
        wealth: getAdvice('wealth', scores.wealth)
    },
    devInfo: {
        lunarDateStr: lunarStr,
        flowYearZhi: DI_ZHI[flowYearZhi],       
        flowMonthAnchor: DI_ZHI[flowMonthAnchor], 
        flowMonthZhi: DI_ZHI[flowMonthIdx],
        flowDayZhi: DI_ZHI[flowDayIdx],
        formulas: {
            self: results.self.logs,
            social: results.social.logs,
            love: results.love.logs,
            travel: results.travel.logs,
            wealth: results.wealth.logs,
        }
    }
  };
};

const calcCategoryScore = (scanner: StarScanner, targets: [number, string][]) => {
    let totalDelta = 0;
    const logs: string[] = [];

    targets.forEach(([idx, name]) => {
        const res = scanner.scanPalace(idx);
        if (res.score !== 0) {
            totalDelta += res.score;
            logs.push(`[${name}]: ${res.logs.join(' ')}`);
        }
    });

    let final = 60 + totalDelta;
    if (final > 100) final = 100;
    if (final < 0) final = 0;

    if (totalDelta !== 0) {
        logs.unshift(`基準(60) + 變動(${totalDelta}) = ${final}`);
    } else {
        logs.unshift(`平運 (60)`);
    }
    
    // 單項分數保持整數 (四捨五入)，僅總分取小數
    return { finalScore: Math.round(final), logs };
};

// --- 核心：星曜掃描與計分器 ---
class StarScanner {
  chart: ChartData;
  params: any;

  constructor(chart: ChartData, params: any) {
    this.chart = chart;
    this.params = params;
  }

  scanPalace(palaceIdx: number): { score: number, logs: string[] } {
    let score = 0;
    const logs: string[] = [];
    const palace = this.chart.palaces[palaceIdx];
    
    const starsInPalace = [
        ...palace.majorStars, 
        ...palace.minorStars, 
        ...palace.miscStars
    ].map(s => s.name);

    starsInPalace.forEach(starName => {
        // A. 本命四化
        this.checkDynamicSiHua(starName, this.params.birthGan, 1, -1, 1, '本命', (w, n) => { score += w; logs.push(n); });
        // B. 動態四化
        this.checkDynamicSiHua(starName, this.params.daGan,   2, -2, 1, '大限', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.nianGan, 3, -3, 2, '流年', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.flowMonthGan, 4, -4, 3, '流月', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.flowDayGan,   5, -5, 4, '流日', (w, n) => { score += w; logs.push(n); });
        // C. 農曆四化
        this.checkDynamicSiHua(starName, this.params.yueGan, 2, -3, 1, '農曆月', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.riGan,  2, -3, 1, '農曆日', (w, n) => { score += w; logs.push(n); });
    });

    if (starsInPalace.includes('火星')) { score -= 6; logs.push('火星(-6)'); }
    if (starsInPalace.includes('鈴星')) { score -= 2; logs.push('鈴星(-2)'); }

    if (this.isStarHere('祿存', this.params.daGan, palaceIdx)) { score += 3; logs.push('大限祿存(+3)'); }
    if (this.isStarHere('擎羊', this.params.daGan, palaceIdx)) { score -= 2; logs.push('大限擎羊(-2)'); }
    if (this.isStarHere('陀羅', this.params.daGan, palaceIdx)) { score -= 2; logs.push('大限陀羅(-2)'); }

    if (this.isStarHere('祿存', this.params.nianGan, palaceIdx)) { score += 4; logs.push('流年祿存(+4)'); }
    if (this.isStarHere('擎羊', this.params.nianGan, palaceIdx)) { score -= 1; logs.push('流年擎羊(-1)'); }
    if (this.isStarHere('陀羅', this.params.nianGan, palaceIdx)) { score -= 1; logs.push('流年陀羅(-1)'); }
    
    // 本命祿存羊陀
    if (starsInPalace.includes('祿存')) { score += 2; logs.push('本命祿存(+2)'); }
    if (starsInPalace.includes('擎羊')) { score -= 3; logs.push('本命擎羊(-3)'); }
    if (starsInPalace.includes('陀羅')) { score -= 3; logs.push('本命陀羅(-3)'); }

    return { score, logs };
  }

  private checkDynamicSiHua(
      starName: string, ganIdx: number, 
      luWeight: number, jiWeight: number, quanWeight: number,
      layer: string, 
      apply: (w: number, log: string) => void
  ) {
      if (ganIdx === undefined || ganIdx === null) return;
      const ganChar = TIAN_GAN[ganIdx];
      const map = SI_HUA_MAP[ganChar];
      if (!map) return;
      
      if (map[0] === starName) apply(luWeight, `${starName}${layer}祿(+${luWeight})`);
      if (map[1] === starName) apply(quanWeight, `${starName}${layer}權(+${quanWeight})`);
      if (map[3] === starName) apply(jiWeight, `${starName}${layer}忌(${jiWeight})`);
  }

  private isStarHere(starType: '祿存'|'擎羊'|'陀羅', ganIdx: number, targetPalaceIdx: number): boolean {
      if (ganIdx === undefined || ganIdx === null) return false;
      const ganChar = TIAN_GAN[ganIdx];
      const luIndex = LU_YANG_TUO_MAP[ganChar];
      if (luIndex === undefined) return false;

      let actualIndex = -1;
      if (starType === '祿存') actualIndex = luIndex;
      if (starType === '擎羊') actualIndex = (luIndex + 1) % 12;
      if (starType === '陀羅') actualIndex = (luIndex + 11) % 12;

      return actualIndex === targetPalaceIdx;
  }
}

const calcTimeParameters = (chart: ChartData, date: Date) => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    const lunarYear = LunarYear.fromYear(lunar.getYear());
    
    const lunarStr = `${lunar.getYear()}年 ${Math.abs(lunar.getMonth())}月 ${lunar.getDay()}日`;

    const nianGan = lunar.getYearGanIndex();
    const yueGan = lunar.getMonthGanIndex(); 
    const riGan = lunar.getDayGanIndex();      

    const age = lunar.getYear() - chart.lunarYear + 1;
    const daXianPalace = chart.palaces.find(p => {
        const [start, end] = p.ages;
        return age >= start && age <= end;
    });
    const daGan = daXianPalace ? daXianPalace.ganIndex : 0;

    const yearZhi = lunar.getYearZhiIndex(); 

    // --- 修正斗君邏輯 (Flow Month Anchor) ---
    // 1. 找出本命盤寅宮 (Index 2) 的宮位名稱 (即斗君)
    // chart.palaces 是固定按地支排列 (0=子, 1=丑, 2=寅...)
    const douJunPalace = chart.palaces[2]; 
    const douJunName = douJunPalace.name; // e.g. "福德"

    // 2. 找出該名稱在標準宮位順序中的 Index (0=命宮, 1=兄弟... 逆時針)
    const nameIdx = PALACE_NAMES.indexOf(douJunName);
    
    // 3. 計算該宮位相當於命宮的位移
    // 公式: offset = (12 - nameIdx) % 12
    // 例如: 福德(10) -> (12-10)%12 = 2. 代表流月正月在流年命宮順時針+2的位置
    const offset = (12 - nameIdx) % 12;

    // 4. 計算流年 1 月 (正月) 的位置
    // 流年命宮在 yearZhi, 加上斗君的偏移量
    const flowMonthAnchor = (yearZhi + offset) % 12;
    // ------------------------------------

    const month = Math.abs(lunar.getMonth());
    const leapMonth = lunarYear.getLeapMonth();
    
    let monthSteps = month - 1; 
    if (leapMonth > 0) {
        // 閏月處理：若當前月 > 閏月，或正是閏月(month為負)，則往下順推一格
        if (month > leapMonth) { monthSteps += 1; } 
        else if (lunar.getMonth() < 0) { monthSteps += 1; }
    }
    
    const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;
    const day = lunar.getDay();
    const flowDayIdx = (flowMonthIdx + (day - 1)) % 12;

    return { 
        nianGan, yueGan, riGan, daGan, 
        flowYearZhi: yearZhi,
        flowMonthAnchor,
        flowDayIdx, 
        flowMonthIdx, 
        lunarStr 
    };
};

const getWeather = (score: number): 'sunny' | 'cloudy' | 'rainy' => {
  if (score >= 80) return 'sunny';
  if (score >= 60) return 'cloudy';
  return 'rainy';
};

const getSummary = (score: number): string => {
  if (score >= 85) return "運勢旺盛，大展宏圖";
  if (score >= 70) return "穩健順利，漸入佳境";
  if (score >= 50) return "平平淡淡，保守為宜";
  return "波動較大，謹言慎行";
};

const getAdvice = (type: string, score: number): string => {
  if (score > 80) return "吉星拱照，強力出擊！";
  if (score > 60) return "運勢平穩，按部就班。";
  if (score > 40) return "稍有阻礙，多加留意。";
  return "煞星干擾，避開風險。";
};