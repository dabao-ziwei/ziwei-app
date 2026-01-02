import { ZiWeiEngine } from './engine';
import type { ChartData, Palace } from './types';
import { Solar, LunarYear } from 'lunar-typescript';
import { PALACE_NAMES } from './constants'; 

// 定義五大維度
export interface DailyFortune {
  score: number;       // 總分 (加權平均, 保留一位小數)
  weather: 'sunny' | 'cloudy' | 'rainy';
  summary: string;
  
  // 五角圖數據 (動態基礎分 + 變化分)
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
    baseScore: number;      // 基礎分
    lunarDateStr: string;   // 農曆日期
    flowYearZhi: string;    // 流年地支
    flowMonthAnchor: string;// 流月起點
    flowMonthZhi: string;   // 流月地支
    flowDayZhi: string;     // 流日地支
    formulas: {             // 各維度算式細節
        base: string[];     // 基礎分算式 (三層結構)
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
// 規則: 祿前一為羊，祿後一為陀
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
  
  // 1. 計算時空參數
  const timeParams = calcTimeParameters(chart, targetDate);
  const { flowDayIdx, flowMonthIdx, lunarStr, flowYearZhi, flowMonthAnchor } = timeParams;

  // 2. 取得重要天干參數
  const flowMonthGan = chart.palaces[flowMonthIdx].ganIndex;
  const flowDayGan = chart.palaces[flowDayIdx].ganIndex;
  const nianGan = timeParams.nianGan;
  const daGan = timeParams.daGan;
  const birthGan = (chart.lunarYear - 4) % 10;

  // 3. 取得各層級命宮位置 (用於計算基礎分)
  const benMingPos = engine.getMingPos();
  
  // 大限命宮: 根據大限位置
  const age = timeParams.virtualAge;
  const daXianPalace = chart.palaces.find(p => age >= p.ages[0] && age <= p.ages[1]);
  const daMingPos = daXianPalace ? daXianPalace.index : 0; 

  // 流年命宮: 根據流年地支
  const liuMingPos = chart.palaces.findIndex(p => p.zhiIndex === flowYearZhi);

  // 4. 計算【基礎分 (Base Score)】: 三層結構 (本命+大限+流年)
  const baseResult = calcBaseScore(chart, {
      benMingPos, daMingPos, liuMingPos,
      birthGan, daGan, nianGan
  });
  const baseScore = baseResult.score;

  // 5. 建立掃描器 (用於計算運勢變化分 - Delta)
  const scanner = new StarScanner(chart, { 
      ...timeParams, 
      birthGan,      
      flowMonthGan, 
      flowDayGan 
  });

  // 6. 定義五大維度掃描範圍 (三方四正)
  const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;

  const targets = {
    // 工作：官祿(4)、夫妻(10)、命宮(0)、財帛(8)
    self:   [[getP(4), '官祿'], [getP(10), '夫妻'], [getP(0), '命宮'], [getP(8), '財帛']],
    
    // 理財：財帛(8)、福德(2)、官祿(4)、命宮(0)
    wealth: [[getP(8), '財帛'], [getP(2), '福德'], [getP(4), '官祿'], [getP(0), '命宮']],
    
    // 交友：僕役(5)、兄弟(11)、父母(1)、子女(9)
    social: [[getP(5), '僕役'], [getP(11), '兄弟'], [getP(1), '父母'], [getP(9), '子女']],
    
    // 外出：子女(9)、田宅(3)、僕役(5)、父母(1)
    travel: [[getP(9), '子女'], [getP(3), '田宅'], [getP(5), '僕役'], [getP(1), '父母']],

    // 感情：夫妻(10)、官祿(4)、遷移(6)、福德(2)
    love:   [[getP(10), '夫妻'], [getP(4), '官祿'], [getP(6), '遷移'], [getP(2), '福德']],
  };

  // 7. 計算各維度得分 (以 Base Score 為底)
  const results = {
      self: calcCategoryScore(scanner, targets.self as any, baseScore),   // 工作
      social: calcCategoryScore(scanner, targets.social as any, baseScore), // 交友
      love: calcCategoryScore(scanner, targets.love as any, baseScore),     // 感情
      travel: calcCategoryScore(scanner, targets.travel as any, baseScore), // 外出
      wealth: calcCategoryScore(scanner, targets.wealth as any, baseScore), // 理財
  };

  const scores = {
    self: results.self.finalScore,
    social: results.social.finalScore,
    love: results.love.finalScore,
    travel: results.travel.finalScore,
    wealth: results.wealth.finalScore,
  };

  // 總分平均
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
        baseScore: baseScore,
        lunarDateStr: lunarStr,
        flowYearZhi: DI_ZHI[flowYearZhi],        
        flowMonthAnchor: DI_ZHI[flowMonthAnchor], 
        flowMonthZhi: DI_ZHI[flowMonthIdx],
        flowDayZhi: DI_ZHI[flowDayIdx],
        formulas: {
            base: baseResult.logs,
            self: results.self.logs,
            social: results.social.logs,
            love: results.love.logs,
            travel: results.travel.logs,
            wealth: results.wealth.logs,
        }
    }
  };
};

// ============================================================================
// 核心：基礎分計算邏輯 (三層時空疊加)
// ============================================================================
interface BaseScoreParams {
    benMingPos: number;
    daMingPos: number;
    liuMingPos: number;
    birthGan: number;
    daGan: number;
    nianGan: number;
}

const calcBaseScore = (chart: ChartData, params: BaseScoreParams) => {
    let score = 50; // 初始分
    const logs: string[] = [`初始(50)`];

    // Helper: 掃描單一層級
    const scanLayer = (
        layerName: string, 
        mingIdx: number, 
        mainGan: number, 
        // 額外檢查的四化來源 (例如大限層也要看生年四化)
        extraSiHuaGans: { gan: number, name: string }[] = [], 
        // 額外檢查的祿羊陀來源 (例如流年層要看大限祿存)
        extraLuGans: { gan: number, name: string, w: number }[] = [],
        luWeight: number // 本層級祿存的權重
    ) => {
        let layerScore = 0;
        const targetIndices = [mingIdx, (mingIdx + 6) % 12]; // 命宮 & 遷移宮

        targetIndices.forEach(idx => {
            if (idx < 0) return; 
            const palace = chart.palaces[idx];
            const pName = idx === mingIdx ? `${layerName}命` : `${layerName}遷`;
            
            // 取得宮內星星名稱 (包含主星、輔星、雜曜)
            const starNames = [
                ...palace.majorStars, 
                ...palace.minorStars, 
                ...palace.miscStars
            ].map(s => s.name);

            // 1. 檢查四化 (Main Gan + Extra Gans)
            const gansToCheck = [{ gan: mainGan, name: layerName }, ...extraSiHuaGans];
            
            gansToCheck.forEach(g => {
                const ganChar = TIAN_GAN[g.gan];
                const siHua = SI_HUA_MAP[ganChar]; // [祿, 權, 科, 忌]
                if (siHua) {
                    starNames.forEach(star => {
                        // 四化權重固定: 祿+10, 權+5, 忌-10
                        if (star === siHua[0]) { layerScore += 10; logs.push(`${pName}.${star}${g.name}祿(+10)`); }
                        if (star === siHua[1]) { layerScore += 5;  logs.push(`${pName}.${star}${g.name}權(+5)`); }
                        if (star === siHua[3]) { layerScore -= 10; logs.push(`${pName}.${star}${g.name}忌(-10)`); }
                    });
                }
            });

            // 2. 檢查靜態煞星 (火星/鈴星) - 永遠生效
            if (starNames.some(s => s.includes('火星'))) { layerScore -= 6; logs.push(`${pName}.火星(-6)`); }
            if (starNames.some(s => s.includes('鈴星'))) { layerScore -= 2; logs.push(`${pName}.鈴星(-2)`); }

            // 3. 檢查動態祿羊陀 (Main Gan + Extra Lu Gans)
            const luChecks = [{ gan: mainGan, name: layerName, w: luWeight }, ...extraLuGans];
            
            luChecks.forEach(l => {
                const ganChar = TIAN_GAN[l.gan];
                const luIndex = LU_YANG_TUO_MAP[ganChar];
                
                if (luIndex !== undefined) {
                    // 祿存
                    if (luIndex === idx) { 
                        layerScore += l.w; 
                        logs.push(`${pName}.${l.name}祿存(+${l.w})`); 
                    }
                    // 擎羊 (祿前一宮)
                    if ((luIndex + 1) % 12 === idx) { 
                        layerScore -= 3; 
                        logs.push(`${pName}.${l.name}擎羊(-3)`); 
                    }
                    // 陀羅 (祿後一宮)
                    if ((luIndex + 11) % 12 === idx) { 
                        layerScore -= 3; 
                        logs.push(`${pName}.${l.name}陀羅(-3)`); 
                    }
                }
            });
        });

        score += layerScore;
        if (layerScore !== 0) logs.push(`> [${layerName}層] 小計: ${layerScore > 0 ? '+' : ''}${layerScore}`);
    };

    // --- 開始逐層掃描 ---

    // 1. 本命層 (Ben Ming)
    // 規則: 
    // - 四化: 生年干
    // - 祿羊陀: 生年干 (權重+2)
    scanLayer('本命', params.benMingPos, params.birthGan, [], [], 2);

    // 2. 大限層 (Da Xian)
    // 規則:
    // - 四化: 大限干 (不看生年) [修正]
    // - 祿羊陀: 大限干 (權重+3)
    scanLayer('大限', params.daMingPos, params.daGan, 
        [], // [修正] 移除生年四化檢查
        [], 
        3
    );

    // 3. 流年層 (Liu Nian)
    // 規則:
    // - 四化: 流年干 (不看生年) [修正]
    // - 祿羊陀: 流年干 (權重+4) + 大限干 (權重+3)
    scanLayer('流年', params.liuMingPos, params.nianGan,
        [], // [修正] 移除生年四化檢查
        [{ gan: params.daGan, name: '大限', w: 3 }], 
        4
    );

    return { score, logs };
};

// --- 其他輔助運算 ---

const calcCategoryScore = (scanner: StarScanner, targets: [number, string][], baseScore: number) => {
    let totalDelta = 0;
    const logs: string[] = [];

    targets.forEach(([idx, name]) => {
        const res = scanner.scanPalace(idx);
        if (res.score !== 0) {
            totalDelta += res.score;
            logs.push(`[${name}]: ${res.logs.join(' ')}`);
        }
    });

    // 基礎分 + 變動分
    let final = baseScore + totalDelta;
    
    // 邊界檢查
    if (final > 100) final = 100;
    if (final < 0) final = 0;

    if (totalDelta !== 0) {
        logs.unshift(`基礎(${baseScore}) + 變動(${totalDelta}) = ${final}`);
    } else {
        logs.unshift(`基礎(${baseScore}) + 平運(0) = ${final}`);
    }
    
    return { finalScore: Math.round(final), logs };
};

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

    const virtualAge = lunar.getYear() - chart.lunarYear + 1;
    const daXianPalace = chart.palaces.find(p => {
        const [start, end] = p.ages;
        return virtualAge >= start && virtualAge <= end;
    });
    const daGan = daXianPalace ? daXianPalace.ganIndex : 0;

    const yearZhi = lunar.getYearZhiIndex(); 

    // --- 斗君邏輯 ---
    const douJunPalace = chart.palaces[2]; 
    const douJunName = douJunPalace.name; 
    const nameIdx = PALACE_NAMES.indexOf(douJunName);
    const offset = (12 - nameIdx) % 12;
    const flowMonthAnchor = (yearZhi + offset) % 12;

    const month = Math.abs(lunar.getMonth());
    const leapMonth = lunarYear.getLeapMonth();
    
    let monthSteps = month - 1; 
    if (leapMonth > 0) {
        if (month > leapMonth) { monthSteps += 1; } 
        else if (lunar.getMonth() < 0) { monthSteps += 1; }
    }
    
    const flowMonthIdx = (flowMonthAnchor + monthSteps) % 12;
    const day = lunar.getDay();
    const flowDayIdx = (flowMonthIdx + (day - 1)) % 12;

    return { 
        nianGan, yueGan, riGan, daGan, 
        virtualAge,
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