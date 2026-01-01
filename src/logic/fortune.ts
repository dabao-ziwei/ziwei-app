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
  '庚': ['太陽', '武曲', '太陰', '天同'],
  '辛': ['巨門', '太陽', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左輔', '武曲'],
  '癸': ['破軍', '巨門', '太陰', '貪狼'],
};

// 祿存、擎羊、陀羅表 (依天干)
// 順序: [祿存宮位地支Index] (擎羊在前, 陀羅在後)
const LU_YANG_TUO_MAP: Record<string, number> = {
  '甲': 2, // 寅
  '乙': 3, // 卯
  '丙': 5, // 巳
  '丁': 6, // 午
  '戊': 5, // 巳
  '己': 6, // 午
  '庚': 8, // 申
  '辛': 9, // 酉
  '壬': 11, // 亥
  '癸': 0, // 子
};

// 主函式
export const calculateDailyFortune = (engine: ZiWeiEngine): DailyFortune => {
  const chart = engine.getChartData();
  const today = new Date();
  
  // 1. 計算時空參數
  const timeParams = calcTimeParameters(chart, today);
  const { flowDayIdx, flowMonthIdx, lunarStr, flowYearZhi, flowMonthAnchor } = timeParams;

  // 2. 建立掃描器
  const scanner = new StarScanner(chart, timeParams);

  // 3. 定義五大維度對應的「流日宮位」 (相對流日命宮的位置)
  // 命(0), 父(1), 福(2), 田(3), 官(4), 僕(5), 遷(6), 疾(7), 財(8), 子(9), 夫(10), 兄(11) -- 這是順數索引? 
  // 不，紫微斗數標準盤是：命(0) -> 兄(11) -> 夫(10)... (逆布)
  // [修正] getP 函式必須符合您的命盤陣列邏輯。
  // 在 db.ts 或 engine.ts 中，palaces[0] 是子位，palaces[1] 是丑位。
  // flowDayIdx 是流日命宮的地支 Index (例如午位=6)。
  // 紫微斗數宮職是逆布的：
  // 命=flowDayIdx
  // 兄=(flowDayIdx - 1 + 12) % 12
  // 夫=(flowDayIdx - 2 + 12) % 12
  // ...
  // 但我們為了方便，直接定義相對偏移量 (Offset) 
  // 假設 flowDayIdx 是 0 (子)。
  // 命=0, 兄=11, 夫=10, 子=9, 財=8, 疾=7, 遷=6, 僕=5, 官=4, 田=3, 福=2, 父=1
  
  const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;

  // 依據您的三方四正規則：
  // 自身(命宮三方): 命(0), 遷(-6=6), 官(-8=4), 財(-4=8) -> 命,遷,官,財
  // 交友(僕役三方): 僕(5), 兄(11), 父(1), 子(9) -> 僕,兄,父,子 (修正: 兄是僕的對宮? 不，僕的對宮是兄)
  // 感情(夫妻三方): 夫(10), 官(4), 遷(6), 福(2) -> 夫,官,遷,福
  // 外出(子女三方): 子(9), 田(3), 僕(5), 父(1) -> 子,田,僕,父 (修正: 子女三方是 子、田、僕、父)
  // 理財(福德三方): 福(2), 財(8), 遷(6), 夫(10) -> 福,財,遷,夫

  // 注意：這裡的 offset 是指從流日命宮(0)起算的 Index 偏移
  // 命=0, 兄=11, 夫=10, 子=9, 財=8, 疾=7, 遷=6, 僕=5, 官=4, 田=3, 福=2, 父=1
  
  const targets = {
    // 自身: 命、遷、官、財
    self:   [[getP(0), '命宮'], [getP(6), '遷移'], [getP(4), '官祿'], [getP(8), '財帛']],
    
    // 交友: 僕、兄、父、子 (僕役的三方四正)
    social: [[getP(5), '僕役'], [getP(11), '兄弟'], [getP(1), '父母'], [getP(9), '子女']],
    
    // 感情: 夫、官、遷、福 (夫妻的三方四正)
    love:   [[getP(10), '夫妻'], [getP(4), '官祿'], [getP(6), '遷移'], [getP(2), '福德']],
    
    // 外出: 子、田、僕、父 (子女的三方四正)
    travel: [[getP(9), '子女'], [getP(3), '田宅'], [getP(5), '僕役'], [getP(1), '父母']],
    
    // 理財: 福、財、遷、夫 (福德的三方四正)
    wealth: [[getP(2), '福德'], [getP(8), '財帛'], [getP(6), '遷移'], [getP(10), '夫妻']],
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

  // 總分加權
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

// 計算單一維度的分數與Log (基準 60)
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
    if (final < 20) final = 20;

    if (totalDelta !== 0) {
        logs.unshift(`基準(60) + 變動(${totalDelta}) = ${final}`);
    } else {
        logs.unshift(`平運 (60)`);
    }
    
    return { finalScore: final, logs };
};

// --- 核心：星曜掃描與計分器 (Updated Weights) ---
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

    // --- 1. 四化掃描 (祿/忌/權) ---
    // 規則:
    // 祿: 本(+1), 大(+2), 年(+3), 月(+4), 日(+5)
    // 忌: 本(-1), 大(-2), 年(-3), 月(-4), 日(-5)
    // 權: 本(+1), 大(+1), 年(+2), 月(+3), 日(+4)
    
    starsInPalace.forEach(starName => {
        // A. 本命四化
        const starObj = [...palace.majorStars, ...palace.minorStars].find(s => s.name === starName);
        if (starObj?.sihua) {
            starObj.sihua.forEach(sh => {
                if (sh.type === '祿') { score += 1; logs.push(`${starName}本命祿(+1)`); }
                if (sh.type === '忌') { score -= 1; logs.push(`${starName}本命忌(-1)`); }
                if (sh.type === '權') { score += 1; logs.push(`${starName}本命權(+1)`); }
            });
        }

        // B. 動態四化
        this.checkDynamicSiHua(starName, this.params.daGan,   2, -2, 1, '大限', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.nianGan, 3, -3, 2, '流年', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.yueGan,  4, -4, 3, '流月', (w, n) => { score += w; logs.push(n); });
        this.checkDynamicSiHua(starName, this.params.riGan,   5, -5, 4, '流日', (w, n) => { score += w; logs.push(n); });
    });

    // --- 2. 靜態煞星 (火/鈴) ---
    // 規則: 火星-6, 鈴星-2
    if (starsInPalace.includes('火星')) { score -= 6; logs.push('本命火星(-6)'); }
    if (starsInPalace.includes('鈴星')) { score -= 2; logs.push('本命鈴星(-2)'); }

    // --- 3. 羊陀祿存 (本命、大限、流年) ---
    
    // A. 本命: 祿(+2), 羊(-3), 陀(-3)
    if (starsInPalace.includes('祿存')) { score += 2; logs.push('本命祿存(+2)'); }
    if (starsInPalace.includes('擎羊')) { score -= 3; logs.push('本命擎羊(-3)'); }
    if (starsInPalace.includes('陀羅')) { score -= 3; logs.push('本命陀羅(-3)'); }

    // B. 大限: 祿(+3), 羊(-2), 陀(-2)
    if (this.isStarHere('祿存', this.params.daGan, palaceIdx)) { score += 3; logs.push('大限祿存(+3)'); }
    if (this.isStarHere('擎羊', this.params.daGan, palaceIdx)) { score -= 2; logs.push('大限擎羊(-2)'); }
    if (this.isStarHere('陀羅', this.params.daGan, palaceIdx)) { score -= 2; logs.push('大限陀羅(-2)'); }

    // C. 流年: 祿(+4), 羊(-1), 陀(-1)
    if (this.isStarHere('祿存', this.params.nianGan, palaceIdx)) { score += 4; logs.push('流年祿存(+4)'); }
    if (this.isStarHere('擎羊', this.params.nianGan, palaceIdx)) { score -= 1; logs.push('流年擎羊(-1)'); }
    if (this.isStarHere('陀羅', this.params.nianGan, palaceIdx)) { score -= 1; logs.push('流年陀羅(-1)'); }

    return { score, logs };
  }

  // 檢查動態四化 (增加 權 的權重參數)
  private checkDynamicSiHua(
      starName: string, ganIdx: number, 
      luWeight: number, jiWeight: number, quanWeight: number,
      layer: string, 
      apply: (w: number, log: string) => void
  ) {
     const ganChar = TIAN_GAN[ganIdx];
     const map = SI_HUA_MAP[ganChar];
     if (!map) return;
     
     // map[0]=祿, map[1]=權, map[2]=科, map[3]=忌
     if (map[0] === starName) apply(luWeight, `${starName}${layer}祿(+${luWeight})`);
     if (map[1] === starName) apply(quanWeight, `${starName}${layer}權(+${quanWeight})`);
     // 科 暫不計分
     if (map[3] === starName) apply(jiWeight, `${starName}${layer}忌(${jiWeight})`);
  }

  // 檢查動態羊陀祿
  private isStarHere(starType: '祿存'|'擎羊'|'陀羅', ganIdx: number, targetPalaceIdx: number): boolean {
     const ganChar = TIAN_GAN[ganIdx];
     const luIndex = LU_YANG_TUO_MAP[ganChar];
     if (luIndex === undefined) return false;

     let actualIndex = -1;
     if (starType === '祿存') actualIndex = luIndex;
     if (starType === '擎羊') actualIndex = (luIndex + 1) % 12; // 順一位
     if (starType === '陀羅') actualIndex = (luIndex + 11) % 12; // 逆一位

     return actualIndex === targetPalaceIdx;
  }
}

// --- 時空參數計算 ---
const calcTimeParameters = (chart: ChartData, date: Date) => {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    const lunarYear = LunarYear.fromYear(lunar.getYear());
    
    // Lunar Info String
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

    // --- 流運計算核心 ---

    // 1. 流年命宮 (在流年地支位)
    const yearZhi = lunar.getYearZhiIndex(); // 0=子, 1=丑...
    
    // 2. 流年正月起點 (Anchor) = 流年福德宮
    // 從流年命宮(0)順數到福德(2)
    const flowMonthAnchor = (yearZhi + 2) % 12;

    // 3. 流月計算 (考慮閏月)
    const month = Math.abs(lunar.getMonth());
    const leapMonth = lunarYear.getLeapMonth();
    
    let monthSteps = month - 1; // 1月走0步

    if (leapMonth > 0) {
        if (month > leapMonth) {
            monthSteps += 1;
        } 
        else if (lunar.getMonth() < 0) {
            monthSteps += 1;
        }
    }
    
    const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;

    // 4. 流日計算 (流月宮起初一)
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