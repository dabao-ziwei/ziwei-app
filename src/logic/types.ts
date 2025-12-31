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

// 完整的命盤資料結構
export interface ChartData {
  gender: '男' | '女';
  solarDate: string;
  lunarDate: string;
  lunarYear: number;
  bazi: string;
  bureau: string;      // 五行局
  mingZhu: string;     // 命主
  shenZhu: string;     // 身主
  palaces: Palace[];   // 十二宮資料
  direction: number;   // 陰陽順逆 (1 or -1)
}