// 定義星曜等級
export type StarLevel = 'major' | 'minor' | 'misc' | 'limit';

// 定義四化類型
export type SiHuaType = '祿' | '權' | '科' | '忌';

// 定義四化作用範圍
export type Scope = 'ben' | 'da' | 'liu' | 'xiao';

// 定義亮度
export type Brightness = '廟' | '旺' | '得' | '利' | '平' | '不' | '陷';

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
  limitStars: Star[]; // 運限流曜 (祿羊陀)
  ages: number[]; // [起始歲, 結束歲]
  isBody: boolean; // 是否身宮
  boshi12: string; // 博士十二神
  changsheng12?: string; // 長生十二神
  sui12?: string; // 歲建十二神
  jiang12?: string; // 將前十二神
}

export interface ChartData {
  gender: '男' | '女';
  solarDate: string;
  lunarDate: string;
  lunarYear: number; // 新增：農曆年份 (用於精確計算虛歲)
  bazi: string;
  bureau: string;
  mingZhu: string;
  shenZhu: string;
  palaces: Palace[];
  direction: number; // 1: 順行, -1: 逆行
}
