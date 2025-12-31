import { ZiWeiEngine } from './engine';
import type { ChartData, Palace } from './types';
import { Solar, LunarYear } from 'lunar-typescript';

// 定義五大維度
export interface DailyFortune {
  score: number;       // 總分 (加權平均)
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

const SI_HUA_MAP: Record<string, string[]> = {
  '甲': ['廉貞', '破軍', '武曲', '太陽'],
  '乙': ['天機', '天梁', '紫微', '太陰'],
  '丙': ['天同', '天機', '文昌', '廉貞'],
  '丁': ['太陰', '天同', '天機', '巨門'],
  '戊': ['貪狼', '太陰', '右弼', '天機'],
  '己': ['武曲', '貪狼', '天梁', '文曲'],
  '庚': ['太陽', '武曲', '太陰', '天同'],
  '辛': ['巨門', '太陽', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左輔', '武曲'],
  '癸': ['破軍', '巨門', '太陰', '貪狼'],
};

const LU_YANG_TUO_MAP: Record<string, number> = {
  '甲': 2, '乙': 3, '丙': 5, '丁': 6, '戊': 5, 
  '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0,
};

// 主函式
export const calculateDailyFortune = (engine: ZiWeiEngine): DailyFortune => {
  const chart = engine.getChartData();
  const today = new Date();
  
  // 1. 計算時空參數
  const timeParams = calcTimeParameters(chart, today);
  const { flowDayIdx, flowMonthIdx, lunarStr } = timeParams;

  // 2. 建立掃描器
  const scanner = new StarScanner(chart, timeParams);

  // 3. 定義五大維度對應的「流日宮位」
  const getP = (offset: number) => (flowDayIdx + offset) % 12;

  // 定義每個維度要檢查哪幾個宮位 (根據您的規則)
  // 格式: [PalaceIndex, PalaceNameForLog]
  const targets = {
    self:   [[getP(0), '命宮'], [getP(6), '遷移'], [getP(4), '官祿'], [getP(8), '財帛']],
    social: [[getP(5), '僕役'], [getP(11), '兄弟'], [getP(1), '父母'], [getP(9), '子女']],
    love:   [[getP(10), '夫妻'], [getP(4), '官祿'], [getP(6), '遷移'], [getP(2), '福德']],
    travel: [[getP(9), '子女'], [getP(3), '田宅'], [getP(11), '兄弟'], [getP(7), '疾厄']],
    wealth: [[getP(8), '財帛'], [getP(2), '福德'], [getP(6), '遷移'], [getP(10), '夫妻']],
  };

  // 4. 計算得分與紀錄算式
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

  const avg = Math.round((scores.self + scores.social + scores.love + scores.travel + scores.wealth) / 5);

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

// 計算單一維度的分數與Log
const calcCategoryScore = (scanner: StarScanner, targets: [number, string][]) => {
    let totalDelta = 0;
    const logs: string[] = [];

    targets.forEach(([idx, name]) => {
        const res = scanner.scanPalace(idx);
        if (res.score !== 0) {
            totalDelta += res.score;
            // 紀錄格式: [命宮] 廉貞化祿(+1) 火星(-2)
            logs.push(`[${name}]: ${res.logs.join(' ')}`);
        }
    });

    let final = 60 + totalDelta;
    if (final > 100) final = 100;
    if (final < 20) final = 20;

    // 總結 Log
    logs.unshift(`基準(60) + 變動(${totalDelta}) = ${final}`);
    
    return { finalScore: final, logs };
};

// --- 掃描器類別 ---
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
    
    // 取得宮內所有星曜
    const starsInPalace = [
        ...palace.majorStars, 
        ...palace.minorStars, 
        ...palace.miscStars
    ].map(s => s.name);

    // 1. 四化 (祿/忌)
    starsInPalace.forEach(starName => {
        // A. 本命四化
        const starObj = [...palace.majorStars, ...palace.minorStars].find(s => s.name === starName);
        if (starObj?.sihua) {
            starObj.sihua.forEach(sh => {
                if (sh.type === '祿') { score += 1; logs.push(`${starName}本命祿(+1)`); }
                if (sh.type === '忌') { score -= 1; logs.push(`${starName}本命忌(-1)`); }
            });
        }

        // B. 動態四化
        this.checkDynamicSiHua(starName, this.params.daGan, 1, '大限', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.nianGan, 1, '流年', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.yueGan, 2, '流月', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.riGan, 2, '流日', (w, n) => { score += w; logs.push(n); });
    });

    // 2. 煞星 (火/鈴)
    if (starsInPalace.includes('火星')) { score -= 2; logs.push('火星(-2)'); }
    if (starsInPalace.includes('鈴星')) { score -= 1; logs.push('鈴星(-1)'); }

    // 3. 羊陀祿存
    // 本命
    if (starsInPalace.includes('祿存')) { score += 1; logs.push('本命祿存(+1)'); }
    if (starsInPalace.includes('擎羊')) { score -= 1; logs.push('本命擎羊(-1)'); }
    if (starsInPalace.includes('陀羅')) { score -= 1; logs.push('本命陀羅(-1)'); }

    // 大限
    if (this.isStarHere('祿存', this.params.daGan, palaceIdx)) { score += 1; logs.push('大限祿存(+1)'); }
    if (this.isStarHere('擎羊', this.params.daGan, palaceIdx)) { score -= 1; logs.push('大限擎羊(-1)'); }
    if (this.isStarHere('陀羅', this.params.daGan, palaceIdx)) { score -= 1; logs.push('大限陀羅(-1)'); }

    // 流年
    if (this.isStarHere('祿存', this.params.nianGan, palaceIdx)) { score += 1; logs.push('流年祿存(+1)'); }
    if (this.isStarHere('擎羊', this.params.nianGan, palaceIdx)) { score -= 2; logs.push('流年擎羊(-2)'); }
    if (this.isStarHere('陀羅', this.params.nianGan, palaceIdx)) { score -= 1; logs.push('流年陀羅(-1)'); }

    return { score, logs };
  }

  private checkDynamicSiHua(starName: string, ganIdx: number, weight: number, layer: string, apply: (w: number, log: string) => void) {
     const ganChar = TIAN_GAN[ganIdx];
     const map = SI_HUA_MAP[ganChar];
     if (!map) return;
     
     if (map[0] === starName) apply(weight, `${starName}${layer}祿(+${weight})`);
     if (map[3] === starName) apply(-weight, `${starName}${layer}忌(-${weight})`);
  }

  private isStarHere(starType: '祿存'|'擎羊'|'陀羅', ganIdx: number, targetPalaceIdx: number): boolean {
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
    
    // Lunar Info
    const lunarStr = `${lunar.getYear()}年 ${Math.abs(lunar.getMonth())}月 ${lunar.getDay()}日 (${lunar.getYearInGanZhi()}年)`;

    const nianGan = lunar.getYearGanIndex();
    const yueGan = lunar.getMonthGanIndex();
    const riGan = lunar.getDayGanIndex();

    // 大限
    const age = lunar.getYear() - chart.lunarYear + 1;
    const daXianPalace = chart.palaces.find(p => {
        const [start, end] = p.ages;
        return age >= start && age <= end;
    });
    const daGan = daXianPalace ? daXianPalace.ganIndex : 0;

    // 流年命宮 (起子法)
    const yearZhi = lunar.getYearZhiIndex(); 
    // 流月 (流年命宮起正月)
    const month = Math.abs(lunar.getMonth());
    const flowMonthIdx = (yearZhi + (month - 1)) % 12;
    // 流日 (流月宮起初一)
    const day = lunar.getDay();
    const flowDayIdx = (flowMonthIdx + (day - 1)) % 12;

    return { nianGan, yueGan, riGan, daGan, flowDayIdx, flowMonthIdx, lunarStr };
};

const getWeather = (score: number): 'sunny' | 'cloudy' | 'rainy' => {
    if (score >= 80) return 'sunny';
    if (score >= 60) return 'cloudy';
    return 'rainy';
};

const getSummary = (score: number): string => {
    if (score >= 80) return "五行順暢，氣勢如虹！";
    if (score >= 60) return "運勢平穩，穩中求進。";
    return "諸事不宜，低調沉潛。";
};

const getAdvice = (type: string, score: number): string => {
    if (score > 75) return "吉星高照，把握良機。";
    if (score > 55) return "平平淡淡，才是真。";
    return "煞星干擾，注意防範。";
};