// FILE: src/logic/types.ts
// 星曜等級
export type StarLevel = 'major' | 'minor' | 'misc' | 'limit';

// 星曜亮度
export type Brightness = '廟' | '旺' | '得' | '利' | '平' | '不' | '陷';

// 四化類型
export type SiHuaType = '祿' | '權' | '科' | '忌';

// 四化範圍 (本命、大限、流年、小限)
export type Scope = 'ben' | 'da' | 'liu' | 'xiao';

export interface SiHua {
  type: SiHuaType;
  scope: Scope;
}

export interface Star {
  name: string;
  type: StarLevel;
  sihua?: SiHua[];
  brightness?: Brightness;
}

export interface Palace {
  index: number;
  name: string;
  ganIndex: number;
  zhiIndex: number;
  majorStars: Star[];
  minorStars: Star[];
  miscStars: Star[];
  limitStars: Star[];
  ages: number[];
  isBody: boolean;
  boshi12: string;      // 博士十二神
  sui12: string;        // 歲建十二神
  jiang12: string;      // 將前十二神
  changsheng12?: string; // 長生十二神
}

export interface ChartData {
  gender: '男' | '女';
  solarDate: string;
  lunarDate: string;
  lunarYear: number;
  bazi: string;
  bureau: string;       // 五行局
  mingZhu: string;      // 命主
  shenZhu: string;      // 身主
  palaces: Palace[];    // 十二宮資料
  direction: number;    // 陰陽順逆 (1 or -1)
}

// --- [Patch Spec v2.1] 流年建議相關型別 ---

// 後台規則
export interface YearAdviceRule {
    id: string;
    palace: number; // 0-11
    min_score: number;
    max_score: number | null; 
    content: string;
    priority: number;
    is_default: boolean;
    updated_at?: string;
}

// 事件紀錄
export interface PalaceEventLog {
    sheepHits: string[];  // 擎羊/大羊/年羊
    toroHits: string[];   // 陀羅/大陀/年陀
    huoHits: number;      // 0/1
    lingHits: number;     // 0/1
    jiHits: { star: string; scope?: string }[]; // 化忌明細
    totalScore: number;
}

// Token 輸出
export interface AdviceTokens {
    focus_palace: string;
    focus_score: string;
    line_score: string;
    top_line: string;
    sheep_count: string;
    sheep_word: string;
    toro_count: string;
    toro_word: string;
    huo_phrase: string;
    huo_block: string;
    ling_phrase: string;
    ling_block: string;
}

// 分析結果 v2.1 (移除 starsFound)
export interface YearAdviceResult {
    year: number;
    topLineId: string;
    topLineScore: number;
    focusPalaceOffset: number; // 0-11
    focusPalaceName: string;
    focusPalaceScore: number;
    palaceScores: number[];
    palaceEvents: PalaceEventLog[];
    tokens: AdviceTokens;
}