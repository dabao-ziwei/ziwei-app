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

// --- 流年建議相關型別 ---

// Block A/B/C/D 結構化文案
export interface AdviceContentV3 {
    anchor: string;        // Block A: 年度一句話定錨 (Max 25字)
    scenario: string;      // Block B: 情境式說明
    todo: string[];        // Block C1: 適合做的事
    avoid: string[];       // Block C2: 今年要避免的事
    extension: string;     // Block D: 延伸引導
}

// 後台規則
export interface YearAdviceRule {
    id: string;
    palace: number; // 0-11
    min_score: number;
    max_score: number | null; 
    content: string; // v2 Fallback
    content_struct?: AdviceContentV3; // v3 Struct
    priority: number;
    is_default: boolean;
    updated_at?: string;
}

// 事件紀錄 (僅供內部 Debug 或 Logic 使用，不前台顯示)
export interface PalaceEventLog {
    sheepHits: string[];  
    toroHits: string[];   
    huoHits: number;      
    lingHits: number;     
    jiHits: { star: string; scope?: string }[];
    totalScore: number;
}

// Token 輸出 (僅支援語義型，目前預留擴充，v3 不使用結構型)
export interface AdviceTokens {
    year: string;
    [key: string]: string;
}

// 分析結果
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