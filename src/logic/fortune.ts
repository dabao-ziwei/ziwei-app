import { ZiWeiEngine } from './engine';
import type { ChartData, Palace } from './types';
import { Solar, LunarYear, Lunar } from 'lunar-typescript';

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

  debug?: {
    flowDayZhi: string;
    calcLog: string[];
  }
}

// --- 靜態資料表 (安星法輔助) ---
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 四化表 (祿, 權, 科, 忌) - 對應星曜名稱
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
// 順序: [祿存宮位地支Index, 擎羊, 陀羅]
// 擎羊在祿存前一位(順)，陀羅在後一位(逆)
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
  const logs: string[] = [];

  // 1. 計算時空參數 (流日、流月、流年、大限)
  const timeParams = calcTimeParameters(chart, today, logs);
  const { flowDayIdx } = timeParams;

  // 2. 建立掃描器 (計算所有層級的星曜位置)
  const scanner = new StarScanner(chart, timeParams, logs);

  // 3. 定義五大維度對應的「流日宮位 (相對位置)」
  // 命宮(0), 兄(11), 夫(10), 子(9), 財(8), 疾(7), 遷(6), 僕(5), 官(4), 田(3), 福(2), 父(1)
  // [注意] 這裡是標準紫微斗數逆布命宮的邏輯，相對流日命宮的 Index 偏移量
  const getP = (offset: number) => (flowDayIdx + offset) % 12;

  const targets = {
    self:   [getP(0), getP(6), getP(4), getP(8)],   // 命, 遷, 官, 財
    social: [getP(5), getP(11), getP(1), getP(9)],  // 僕, 兄, 父, 子
    love:   [getP(10), getP(4), getP(6), getP(2)],  // 夫, 官, 遷, 福
    travel: [getP(9), getP(3), getP(11), getP(7)],  // 子, 田, 兄, 疾
    wealth: [getP(8), getP(2), getP(6), getP(10)],  // 財, 福, 遷, 夫
  };

  // 4. 計算得分 (基準 60)
  const calcScore = (indices: number[]) => {
    let delta = 0;
    indices.forEach(idx => {
      delta += scanner.scanPalace(idx);
    });
    // 限制範圍 20 ~ 100
    let final = 60 + delta;
    if (final > 100) final = 100;
    if (final < 20) final = 20;
    return final;
  };

  const scores = {
    self: calcScore(targets.self),
    social: calcScore(targets.social),
    love: calcScore(targets.love),
    travel: calcScore(targets.travel),
    wealth: calcScore(targets.wealth),
  };

  // 5. 總結
  const avg = Math.round((scores.self + scores.social + scores.love + scores.travel + scores.wealth) / 5);

  return {
    score: avg,
    weather: getWeather(avg),
    summary: getSummary(avg),
    scores,
    details: {
        overall: `今日氣場: ${scores.self}分`,
        loveCareer: `感情: ${scores.love}分`,
        wealth: `理財: ${scores.wealth}分`
    },
    debug: {
      flowDayZhi: DI_ZHI[flowDayIdx],
      calcLog: logs
    }
  };
};

// --- 掃描器類別：處理繁雜的疊宮查找 ---
class StarScanner {
  chart: ChartData;
  params: any;
  logs: string[];

  // 預算各層級的四化與羊陀位置 (Map<StarName, Set<PalaceIndex>>)
  // 用 Set 是因為可能有多個來源重疊在同一宮
  luMap = new Map<string, number[]>(); // 祿存位置表 [層級] -> PalaceIndex
  yangMap = new Map<string, number[]>();
  tuoMap = new Map<string, number[]>();

  constructor(chart: ChartData, params: any, logs: string[]) {
    this.chart = chart;
    this.params = params;
    this.logs = logs;
  }

  // 檢查某宮位內的所有星曜與疊宮狀況
  scanPalace(palaceIdx: number): number {
    let score = 0;
    const palace = this.chart.palaces[palaceIdx];
    // 取得宮內所有星曜名稱 (包含主星、副星)
    const starsInPalace = [
        ...palace.majorStars, 
        ...palace.minorStars, 
        ...palace.miscStars
    ].map(s => s.name);

    // --- 1. 四化 (祿/忌) ---
    // 規則: 本命/大限/流年 (+1/-1), 流月/流日 (+2/-2)
    // 我們需要檢查「這宮位裡的星星」是否在「某一層級」化祿或化忌了
    
    starsInPalace.forEach(starName => {
        // A. 本命四化 (Chart 資料裡已有)
        const starObj = [...palace.majorStars, ...palace.minorStars].find(s => s.name === starName);
        if (starObj?.sihua) {
            starObj.sihua.forEach(sh => {
                if (sh.type === '祿') score += 1;
                if (sh.type === '忌') score -= 1;
            });
        }

        // B. 動態四化 (大限、流年、流月、流日)
        // 檢查該星曜是否在該層級的天干四化表中
        this.checkDynamicSiHua(starName, this.params.daGan, 1, '大限', ref => score += ref);
        this.checkDynamicSiHua(starName, this.params.nianGan, 1, '流年', ref => score += ref);
        this.checkDynamicSiHua(starName, this.params.yueGan, 2, '流月', ref => score += ref);
        this.checkDynamicSiHua(starName, this.params.riGan, 2, '流日', ref => score += ref);
    });

    // --- 2. 煞星 (火星/鈴星) ---
    // 規則: 火星-2, 鈴星-1
    if (starsInPalace.includes('火星')) score -= 2;
    if (starsInPalace.includes('鈴星')) score -= 1;

    // --- 3. 羊陀祿存 (動態計算位置) ---
    // 規則: 
    // 祿存: 本/大/流 (+1)
    // 擎羊: 本/大 (-1), 流年 (-2)
    // 陀羅: 本/大/流 (-1)

    // 本命羊陀祿 (Chart 資料裡已有)
    if (starsInPalace.includes('祿存')) score += 1;
    if (starsInPalace.includes('擎羊')) score -= 1;
    if (starsInPalace.includes('陀羅')) score -= 1;

    // 大限
    if (this.isStarHere('祿存', this.params.daGan, palaceIdx)) score += 1;
    if (this.isStarHere('擎羊', this.params.daGan, palaceIdx)) score -= 1;
    if (this.isStarHere('陀羅', this.params.daGan, palaceIdx)) score -= 1;

    // 流年 (擎羊特別兇 -2)
    if (this.isStarHere('祿存', this.params.nianGan, palaceIdx)) score += 1;
    if (this.isStarHere('擎羊', this.params.nianGan, palaceIdx)) score -= 2; // 流年羊 -2
    if (this.isStarHere('陀羅', this.params.nianGan, palaceIdx)) score -= 1;

    // (規則未提流月流日羊陀，故不計)

    return score;
  }

  // 輔助: 檢查某星是否因某天干而飛入此宮
  private checkDynamicSiHua(starName: string, ganIdx: number, weight: number, layer: string, apply: (s: number) => void) {
     const ganChar = TIAN_GAN[ganIdx];
     const map = SI_HUA_MAP[ganChar];
     if (!map) return;
     
     // map[0]=祿, map[3]=忌
     if (map[0] === starName) apply(weight);   // 化祿
     if (map[3] === starName) apply(-weight);  // 化忌
  }

  // 輔助: 計算祿羊陀是否落入此宮 (使用天干)
  private isStarHere(starType: '祿存'|'擎羊'|'陀羅', ganIdx: number, targetPalaceIdx: number): boolean {
     const ganChar = TIAN_GAN[ganIdx];
     const luIndex = LU_YANG_TUO_MAP[ganChar];
     if (luIndex === undefined) return false;

     let actualIndex = -1;
     if (starType === '祿存') actualIndex = luIndex;
     if (starType === '擎羊') actualIndex = (luIndex + 1) % 12; // 順一位
     if (starType === '陀羅') actualIndex = (luIndex + 11) % 12; // 逆一位 (或+11)

     return actualIndex === targetPalaceIdx;
  }
}

// --- 時空參數計算 ---
const calcTimeParameters = (chart: ChartData, date: Date, logs: string[]) => {
    // 1. 轉換農曆
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    
    // 2. 流年天干 (Lunar Year Stem)
    const nianGan = lunar.getYearGanIndex(); // 0=甲, 1=乙...

    // 3. 流月天干 (五虎遁)
    // Lunar Month Stem from Lunar library
    const yueGan = lunar.getMonthGanIndex();

    // 4. 流日天干
    const riGan = lunar.getDayGanIndex();

    // 5. 大限天干 (需計算目前大限宮位)
    // 簡易算法：根據歲數找大限宮
    // ChartData 裡面的 palaces[i].ages (e.g., [14, 23])
    // 找出包含虛歲的宮位
    // 虛歲計算: 農曆年 - 出生年 + 1
    const age = lunar.getYear() - chart.lunarYear + 1;
    const daXianPalace = chart.palaces.find(p => {
        const [start, end] = p.ages;
        return age >= start && age <= end;
    });
    const daGan = daXianPalace ? daXianPalace.ganIndex : 0; // Fallback

    // 6. 流日命宮位置 (引用之前的邏輯)
    const yinPalace = chart.palaces[2].name; 
    const palaceNames = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"];
    const douJunIdx = palaceNames.indexOf(yinPalace);
    const nianZhi = lunar.getYearZhiIndex(); // 0=子
    
    // 流年命宮地支 (簡單公式: 寅位順數流年支? 不，這裡用標準公式)
    // 流年命宮 = (流年支 - 出生年支 + 命宮支)? 
    // 採用: 流年斗君法
    // 正月 = (流年支 - 4) % 12 ... 這裡沿用您原本的邏輯，或標準起流日法
    // 修正: 簡單起例
    // 流年命宮 = (年支 - 4) ... 這其實是起寅首。
    // 讓我們用最穩的：流年命宮在「流年地支」的宮位 (一般流派) 或 「小限法」。
    // 這裡假設使用【流年地支】為流年命宮 (最常見)。
    // 則: 流年命宮 Index = nianZhi.
    // 但您之前用的是「寅首法」找流月，再找流日。
    // 為了符合您之前的 code，我們沿用之前的 getFlowDayPalaceIndex 邏輯 (經過修正的)
    
    // 重寫流日計算 (確保準確)
    // 1. 本命斗君 (寅位宮職)
    // 2. 流年斗君 (流年寅位) -> 決定流月起點
    // 3. 流日 -> 流月宮起初一
    
    // 這裡直接使用 lunar 庫輔助計算流月流日支會更準
    // 但斗數的流月流日與八字不同。斗數是「宮位推移」。
    
    // 沿用經過修正的邏輯:
    // 流年命宮(假設地支法): nianZhi.
    // 斗君(正月): (nianZhi - 4 + 12) % 12 ? 不，這是求干。
    // 公式: 流年斗君 = (本命斗君 + (流年支 - 生年支)) ? 
    // 簡化版(通則): 
    // 流年正月 = 寅位宮支 (固定?) 不。
    // 讓我們用之前寫好的 `getFlowDayPalaceIndex` 邏輯，那是通用的「本命寅位起流年」法。
    
    const flowDayIdx = getFlowDayPalaceIndex(chart, date);

    return { nianGan, yueGan, riGan, daGan, flowDayIdx };
};

const getFlowDayPalaceIndex = (chart: ChartData, date: Date): number => {
    // 1. 找本命盤寅宮 (Index 2) 是什麼宮位 (e.g. 命宮, 父母...)
    const yinPalaceName = chart.palaces[2].name;
    const palaceOrder = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"];
    const yinOrder = palaceOrder.indexOf(yinPalaceName); 
    
    // 2. 流年斗君 (正月所在宮位)
    // 公式: (流年支 - 4) ... 這是求流年寅宮的位置?
    // 常用: 流年支 所在的宮位 為 流年命宮。
    // 正月 恆起於 流年命宮 的 哪裡? 
    // 抱歉，最通用的：流年正月起於「寅」。
    // 但在盤上怎麼飛？
    // 簡單算法：流月順數。正月在「流年斗君」。
    // 流年斗君 = (年支 - 生年支) + 本命斗君(寅宮) ?
    
    // 為求穩定，採用最簡單的：【流年命宮起正月】(部分流派) 或 【寅宮起正月】
    // 鑑於您的邏輯是「疊宮」，我們採用：
    // 流年命宮 = 流年地支 (Index = (year-4)%12 是錯誤的，那是地支序)
    // Year Zhi: 子=0, 丑=1...
    // Chart Palaces: 0=子, 1=丑...
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth()+1, date.getDate());
    const lunar = solar.getLunar();
    const yearZhi = lunar.getYearZhiIndex(); // 0=Zi
    
    // 流年命宮 = yearZhi
    // 斗數流月：正月起於「流年命宮」或「寅申巳亥」(子年起申?)
    // 採用【起子法】：流年命宮起正月 (最常見於 App)
    const month = Math.abs(lunar.getMonth());
    const flowMonthIdx = (yearZhi + (month - 1)) % 12; // 順數

    // 流日：流月宮起初一
    const day = lunar.getDay();
    const flowDayIdx = (flowMonthIdx + (day - 1)) % 12;

    return flowDayIdx;
}

const getWeather = (score: number): 'sunny' | 'cloudy' | 'rainy' => {
    if (score >= 80) return 'sunny';
    if (score >= 60) return 'cloudy';
    return 'rainy';
};

const getSummary = (score: number): string => {
    if (score >= 80) return "氣勢如虹，五行順暢";
    if (score >= 65) return "運勢平穩，穩中求進";
    if (score >= 50) return "稍有波折，謹慎行事";
    return "諸事不宜，低調沉潛";
};