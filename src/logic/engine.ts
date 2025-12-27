import { Solar, Lunar } from 'lunar-typescript';
import type {
  ChartData,
  Palace,
  Star,
  StarLevel,
  SiHuaType,
  Scope,
  Brightness,
} from './types';
import { GAN, ZHI, PALACE_NAMES, SIHUA_TABLE, BUREAU_TABLE } from './constants';

const STAR_BRIGHTNESS_TABLE: Record<string, string> = {
  紫微: '平廟廟旺得得平旺得旺平平',
  天機: '廟陷廟旺利平廟陷得旺陷平',
  太陽: '陷陷平平旺廟廟廟旺得陷陷',
  武曲: '旺廟平平廟平旺廟平廟陷平',
  天同: '旺得廟平平廟陷陷廟平平廟',
  廉貞: '平利廟平廟陷平廟廟平得陷',
  天府: '廟廟旺廟廟得廟廟旺得廟旺',
  太陰: '廟廟平陷陷陷陷得豪廟廟旺',
  貪狼: '旺廟旺平廟陷旺廟廟旺平廟陷',
  巨門: '旺廟廟旺平平旺廟廟旺平平',
  天相: '廟廟廟陷廟平廟廟廟陷廟平',
  天梁: '廟旺廟廟旺陷廟旺廟廟旺陷',
  七殺: '旺廟廟旺廟平旺廟廟旺廟平',
  破軍: '廟旺陷陷旺平廟旺陷陷旺平',
};

const BRIGHTNESS_MAP: Record<string, Brightness> = {
  廟: '廟',
  旺: '旺',
  得: '得',
  利: '利',
  平: '平',
  不: '不',
  陷: '陷',
  豪: '廟',
};

const MING_ZHU_TABLE = [
  '貪狼',
  '巨門',
  '祿存',
  '文曲',
  '廉貞',
  '武曲',
  '破軍',
  '武曲',
  '廉貞',
  '文曲',
  '祿存',
  '巨門',
];
// 身主 (依生年地支) - 子(0)、午(6) 為「鈴星」
const SHEN_ZHU_TABLE = [
  '鈴星',
  '天相',
  '天梁',
  '天同',
  '文昌',
  '天機',
  '鈴星',
  '天相',
  '天梁',
  '天同',
  '文昌',
  '天機',
];

export class ZiWeiEngine {
  private solar: Solar;
  private lunar: Lunar;
  private gender: '男' | '女';

  private lunarYearGanIdx: number = 0;
  private lunarYearZhiIdx: number = 0;
  private lunarMonth: number = 0;
  private lunarDay: number = 0;
  private timeZhiIdx: number = 0;
  private mingPos: number = 0;
  private shenPos: number = 0;
  private bureauNum: number = 2;
  private bureauName: string = '';
  private direction: number = 1;

  public palaces: Palace[] = [];

  constructor(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    gender: '男' | '女'
  ) {
    this.gender = gender;
    this.solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    this.lunar = this.solar.getLunar();

    this.lunarYearGanIdx = this.lunar.getYearGanIndex();
    this.lunarYearZhiIdx = this.lunar.getYearZhiIndex();
    
    // 【修正 1】將月份取絕對值，解決閏月為負數 (如 -6) 導致計算錯誤的問題
    this.lunarMonth = Math.abs(this.lunar.getMonth());
    
    this.lunarDay = this.lunar.getDay();
    this.timeZhiIdx = Math.floor((hour + 1) / 2) % 12;

    const isYangYear = this.lunarYearGanIdx % 2 === 0;
    const isMale = this.gender === '男';
    if ((isYangYear && isMale) || (!isYangYear && !isMale)) {
      this.direction = 1;
    } else {
      this.direction = -1;
    }

    this.initPalaces();
  }

  private initPalaces() {
    for (let i = 0; i < 12; i++) {
      this.palaces.push({
        index: i,
        name: '',
        ganIndex: 0,
        zhiIndex: i,
        majorStars: [],
        minorStars: [],
        miscStars: [],
        limitStars: [],
        ages: [],
        isBody: false,
        boshi12: '',
        sui12: '',
        jiang12: '',
      });
    }

    // 【修正 2】加強餘數計算的安全性，確保結果永遠為正整數
    // 原始公式可能因為減法產生負數，這裡使用 ((n % 12) + 12) % 12 技巧
    const rawMingPos = (2 + (this.lunarMonth - 1) - this.timeZhiIdx);
    this.mingPos = ((rawMingPos % 12) + 12) % 12;
    
    // 身宮計算同理，確保安全
    const rawShenPos = (2 + (this.lunarMonth - 1) + this.timeZhiIdx);
    this.shenPos = ((rawShenPos % 12) + 12) % 12;
    
    this.palaces[this.shenPos].isBody = true;

    for (let i = 0; i < 12; i++) {
      // 計算相對位置時也加上安全餘數保護
      const pos = ((this.mingPos - i) % 12 + 12) % 12;
      this.palaces[pos].name = PALACE_NAMES[i];
    }

    const startGan = (this.lunarYearGanIdx % 5) * 2 + 2;
    for (let i = 0; i < 12; i++) {
      const offset = (i - 2 + 12) % 12;
      this.palaces[i].ganIndex = (startGan + offset) % 10;
    }

    const mingGan = this.palaces[this.mingPos].ganIndex;
    const mingZhi = this.mingPos;
    const tableRow = Math.floor(mingGan / 2);
    this.bureauNum = BUREAU_TABLE[tableRow][mingZhi];
    const bureauMap: { [key: number]: string } = {
      2: '水二局',
      3: '木三局',
      4: '金四局',
      5: '土五局',
      6: '火六局',
    };
    this.bureauName = bureauMap[this.bureauNum] || '未知局';

    let currentAge = this.bureauNum;
    for (let i = 0; i < 12; i++) {
      const offset = i * this.direction;
      const pos = (this.mingPos + offset + 120) % 12;
      const endAge = currentAge + 9;
      this.palaces[pos].ages = [currentAge, endAge];
      currentAge += 10;
    }

    this.placeMainStars();
    this.placeMinorStars();
    this.placeMiscStars();
    this.placeShenSha();
  }

  private getBrightness(
    starName: string,
    zhiIdx: number
  ): Brightness | undefined {
    const table = STAR_BRIGHTNESS_TABLE[starName];
    if (!table) return undefined;
    const char = table[zhiIdx];
    return BRIGHTNESS_MAP[char];
  }

  private placeMainStars() {
    const b = this.bureauNum;
    const d = this.lunarDay;
    let q, r, zw;

    if (b === 0) return;

    if (d % b === 0) {
      q = d / b;
      zw = (2 + q - 1 + 12) % 12;
    } else {
      r = d % b;
      const a = b - r;
      q = (d + a) / b;
      if (a % 2 === 1) {
        zw = (2 + q - 1 - a + 12) % 12;
      } else {
        zw = (2 + q - 1 + a + 12) % 12;
      }
    }

    const zMap = [
      { o: 0, n: '紫微' },
      { o: -1, n: '天機' },
      { o: -3, n: '太陽' },
      { o: -4, n: '武曲' },
      { o: -5, n: '天同' },
      { o: -8, n: '廉貞' },
    ];
    zMap.forEach((s) => this.addStar((zw + s.o + 12) % 12, s.n, 'major'));

    const tfPos = (4 - zw + 12) % 12;
    const tMap = [
      { o: 0, n: '天府' },
      { o: 1, n: '太陰' },
      { o: 2, n: '貪狼' },
      { o: 3, n: '巨門' },
      { o: 4, n: '天相' },
      { o: 5, n: '天梁' },
      { o: 6, n: '七殺' },
      { o: 10, n: '破軍' },
    ];
    tMap.forEach((s) => this.addStar((tfPos + s.o + 12) % 12, s.n, 'major'));
  }

  private placeMinorStars() {
    const m = this.lunarMonth;
    const h = this.timeZhiIdx;
    const yg = this.lunarYearGanIdx;
    const yz = this.lunarYearZhiIdx;

    this.addStar((4 + m - 1) % 12, '左輔', 'minor');
    this.addStar((10 - (m - 1) + 12) % 12, '右弼', 'minor');
    this.addStar((10 - h + 12) % 12, '文昌', 'minor');
    this.addStar((4 + h) % 12, '文曲', 'minor');

    const luIndex = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][yg];
    this.addStar(luIndex, '祿存', 'minor');
    this.addStar((luIndex + 1) % 12, '擎羊', 'minor');
    this.addStar((luIndex - 1 + 12) % 12, '陀羅', 'minor');

    let kuiIndex, yueIndex;
    switch (yg) {
      case 0:
      case 4:
      case 6:
        kuiIndex = 1;
        yueIndex = 7;
        break;
      case 1:
      case 5:
        kuiIndex = 0;
        yueIndex = 8;
        break;
      case 2:
      case 3:
        kuiIndex = 11;
        yueIndex = 9;
        break;
      case 7:
        kuiIndex = 6;
        yueIndex = 2;
        break;
      case 8:
      case 9:
        kuiIndex = 3;
        yueIndex = 5;
        break;
      default:
        kuiIndex = 0;
        yueIndex = 0;
    }
    this.addStar(kuiIndex, '天魁', 'minor');
    this.addStar(yueIndex, '天鉞', 'minor');

    const fb: { [key: number]: number[] } = {
      2: [1, 3],
      6: [1, 3],
      10: [1, 3],
      8: [2, 10],
      0: [2, 10],
      4: [2, 10],
      5: [3, 10],
      9: [3, 10],
      1: [3, 10],
      11: [9, 10],
      3: [9, 10],
      7: [9, 10],
    };
    const [fireStart, ringStart] = fb[yz] || [0, 0];
    this.addStar((fireStart + h) % 12, '火星', 'minor');
    this.addStar((ringStart + h) % 12, '鈴星', 'minor');

    this.addStar((11 - h + 12) % 12, '地空', 'minor');
    this.addStar((11 + h) % 12, '地劫', 'minor');
  }

  private placeMiscStars() {
    const yg = this.lunarYearGanIdx;
    const yz = this.lunarYearZhiIdx;
    const m = this.lunarMonth;
    const d = this.lunarDay;
    const h = this.timeZhiIdx;

    const wc = (10 - h + 12) % 12;
    const wq = (4 + h) % 12;
    const zf = (4 + m - 1) % 12;
    const yb = (10 - (m - 1) + 12) % 12;

    this.addStar((wc + d - 2 + 12) % 12, '恩光', 'misc');
    this.addStar((wq + d - 2 + 12) % 12, '天貴', 'misc');

    this.addStar((zf + d - 1) % 12, '三台', 'misc');
    this.addStar((yb - d + 1 + 24) % 12, '八座', 'misc');

    const jkBase = (8 - (yg % 5) * 2 + 12) % 12;
    const jkFinal = yg % 2 === 0 ? jkBase : jkBase + 1;
    this.addStar(jkFinal, '截空', 'misc');

    const xb = (yz - yg + 12) % 12;
    this.addStar((xb - 2 + 12) % 12, '旬空', 'misc');

    const psMap: { [key: number]: number } = {
      0: 5,
      6: 5,
      3: 5,
      9: 5,
      4: 1,
      10: 1,
      1: 1,
      7: 1,
      2: 9,
      8: 9,
      5: 9,
      11: 9,
    };
    this.addStar(psMap[yz], '破碎', 'misc');
    this.addStar((yz + 8) % 12, '蜚廉', 'misc');

    this.addStar((6 + yz) % 12, '天虛', 'misc');
    this.addStar((6 - yz + 12) % 12, '天哭', 'misc');

    this.addStar((4 + yz) % 12, '龍池', 'misc');
    this.addStar((10 - yz + 12) % 12, '鳳閣', 'misc');
    this.addStar((3 - yz + 12) % 12, '紅鸞', 'misc');
    this.addStar((3 - yz + 6 + 12) % 12, '天喜', 'misc');

    this.addStar((this.mingPos + yz) % 12, '天才', 'misc');
    this.addStar((this.shenPos + yz) % 12, '天壽', 'misc');

    const gu = {
      11: 2,
      0: 2,
      1: 2,
      2: 5,
      3: 5,
      4: 5,
      5: 8,
      6: 8,
      7: 8,
      8: 11,
      9: 11,
      10: 11,
    }[yz]!;
    this.addStar(gu, '孤辰', 'misc');
    this.addStar((gu - 4 + 12) % 12, '寡宿', 'misc');

    const tg = [7, 4, 5, 2, 3, 9, 11, 9, 10, 6],
      tf = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5],
      tc = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11];
    this.addStar(tg[yg], '天官', 'misc');
    this.addStar(tf[yg], '天福', 'misc');
    this.addStar(tc[yg], '天廚', 'misc');

    this.addStar((yz + 1) % 12, '天空', 'misc');

    this.addStar((9 + m - 1) % 12, '天刑', 'misc');
    this.addStar((1 + m - 1) % 12, '天姚', 'misc');

    const ty = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2];
    this.addStar(ty[m - 1], '天月', 'misc');
    this.addStar((2 - (m - 1) * 2 + 24) % 12, '陰煞', 'misc');
    const tw = {
      1: 5,
      5: 5,
      9: 5,
      2: 8,
      6: 8,
      10: 8,
      3: 2,
      7: 2,
      11: 2,
      4: 11,
      8: 11,
      12: 11,
    }[m]!;
    this.addStar(tw, '天巫', 'misc');
    const js = [8, 8, 10, 10, 0, 0, 2, 2, 4, 4, 6, 6];
    this.addStar(js[m - 1], '解神', 'misc');
    this.addStar((5 + m - 1) % 12, '月德', 'misc');

    this.addStar((6 + h) % 12, '臺輔', 'misc');
    this.addStar((2 + h) % 12, '封誥', 'misc');

    const servantPos = this.palaces.findIndex((p) => p.name === '僕役');
    const diseasePos = this.palaces.findIndex((p) => p.name === '疾厄');
    if (servantPos >= 0) this.addStar(servantPos, '天傷', 'misc');
    if (diseasePos >= 0) this.addStar(diseasePos, '天使', 'misc');
  }

  private placeShenSha() {
    const l = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][this.lunarYearGanIdx];
    [
      '博士',
      '力士',
      '青龍',
      '小耗',
      '將軍',
      '奏書',
      '飛廉',
      '喜神',
      '病符',
      '大耗',
      '伏兵',
      '官府',
    ].forEach(
      (n, i) => (this.palaces[(l + i * this.direction + 120) % 12].boshi12 = n)
    );

    const csMap: { [key: number]: number } = { 3: 11, 6: 2, 4: 5, 2: 8, 5: 8 };
    const csStart = csMap[this.bureauNum] || 8;
    [
      '長生',
      '沐浴',
      '冠帶',
      '臨官',
      '帝旺',
      '衰',
      '病',
      '死',
      '墓',
      '絕',
      '胎',
      '養',
    ].forEach(
      (n, i) =>
        (this.palaces[(csStart + i * this.direction + 120) % 12].changsheng12 =
          n)
    );

    const ss = this.lunarYearZhiIdx;
    [
      '歲建',
      '晦氣',
      '喪門',
      '貫索',
      '官符',
      '小耗',
      '大耗',
      '龍德',
      '白虎',
      '天德',
      '吊客',
      '病符',
    ].forEach((n, i) => (this.palaces[(ss + i) % 12].sui12 = n));

    const jsMap = {
      2: 6,
      6: 6,
      10: 6,
      8: 0,
      0: 0,
      4: 0,
      5: 9,
      9: 9,
      1: 9,
      11: 3,
      3: 3,
      7: 3,
    }[this.lunarYearZhiIdx]!;
    [
      '將星',
      '攀鞍',
      '歲驛',
      '息神',
      '華蓋',
      '劫煞',
      '災煞',
      '天煞',
      '指背',
      '咸池',
      '月煞',
      '亡神',
    ].forEach((n, i) => (this.palaces[(jsMap + i) % 12].jiang12 = n));
  }

  private addStar(pos: number, name: string, level: StarLevel) {
    if (!this.palaces[pos]) return;
    const brightness = this.getBrightness(name, pos);
    const s: Star = { name, type: level, sihua: [], brightness };
    if (level === 'major') this.palaces[pos].majorStars.push(s);
    else if (level === 'minor') this.palaces[pos].minorStars.push(s);
    else if (level === 'misc') this.palaces[pos].miscStars.push(s);
    else if (level === 'limit') this.palaces[pos].limitStars.push(s);
  }

  public computeSiHua(dg: number, lg: number, xg: number | null) {
    this.palaces.forEach((p) => {
      [
        ...p.majorStars,
        ...p.minorStars,
        ...p.miscStars,
        ...p.limitStars,
      ].forEach((s) => (s.sihua = []));
    });

    const apply = (g: number, sc: Scope) => {
      if (g < 0 || g > 9) return;
      SIHUA_TABLE[GAN[g]]?.forEach((n, i) => {
        const t = ['祿', '權', '科', '忌'][i] as SiHuaType;
        this.palaces.forEach((p) => {
          [
            ...p.majorStars,
            ...p.minorStars,
            ...p.miscStars,
            ...p.limitStars,
          ].forEach((s) => {
            if (s.name === n) s.sihua?.push({ type: t, scope: sc });
          });
        });
      });
    };

    apply(this.lunarYearGanIdx, 'ben');
    if (dg >= 0) apply(dg, 'da');
    if (lg >= 0) apply(lg, 'liu');
    if (xg !== null && xg >= 0) apply(xg, 'xiao');
  }

  public computeLimitStars(
    dg: number,
    lg: number,
    lz: number,
    xg: number | null,
    showXiao: boolean
  ) {
    this.palaces.forEach((p) => (p.limitStars = []));
    const placeLyt = (gan: number, prefix: string) => {
      if (gan < 0 || gan > 9) return;
      const luIndex = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][gan];
      this.addStar(luIndex, `${prefix}祿`, 'limit');
      this.addStar((luIndex + 1) % 12, `${prefix}羊`, 'limit');
      this.addStar((luIndex - 1 + 12) % 12, `${prefix}陀`, 'limit');
    };

    if (dg >= 0) placeLyt(dg, '大');
    if (lg >= 0) placeLyt(lg, '年');
    if (xg !== null && xg >= 0 && showXiao) placeLyt(xg, '小');

    if (lz >= 0) {
      const luanPos = (3 - lz + 12) % 12;
      const xiPos = (luanPos + 6) % 12;
      this.addStar(luanPos, '年鸞', 'limit');
      this.addStar(xiPos, '年喜', 'limit');
    }
  }

  public getSiHuaMap(ganIndex: number): Record<string, SiHuaType> {
    const map: Record<string, SiHuaType> = {};
    if (ganIndex < 0 || ganIndex > 9) return map;

    const stars = SIHUA_TABLE[GAN[ganIndex]];
    if (stars) {
      map[stars[0]] = '祿';
      map[stars[1]] = '權';
      map[stars[2]] = '科';
      map[stars[3]] = '忌';
    }
    return map;
  }

  public getChartData(): ChartData {
    const mingZhu = MING_ZHU_TABLE[this.palaces[this.mingPos].zhiIndex];
    const shenZhu = SHEN_ZHU_TABLE[this.lunarYearZhiIdx];

    return {
      gender: this.gender,
      solarDate: `${this.solar.getYear()}-${this.solar.getMonth()}-${this.solar.getDay()} ${this.solar.getHour()}:${this.solar.getMinute()}`,
      lunarDate: `${this.lunar.getYearInGanZhi()}年 ${this.lunar.getMonthInChinese()}月 ${this.lunar.getDayInChinese()} ${
        ZHI[this.timeZhiIdx]
      }時`,
      // 關鍵新增：回傳 lunarYear 供 ChartBoard 計算大限年份
      lunarYear: this.lunar.getYear(),
      bazi: `${this.lunar.getYearInGanZhi()} ${this.lunar.getMonthInGanZhi()} ${this.lunar.getDayInGanZhi()} ${this.lunar.getTimeInGanZhi()}`,
      bureau: this.bureauName,
      mingZhu: mingZhu,
      shenZhu: shenZhu,
      palaces: this.palaces,
      direction: this.direction,
    };
  }

  public getMingPos() {
    return this.mingPos;
  }

  public getXiaoXianPos(age: number): number {
    const yz = this.lunarYearZhiIdx;
    let startPos = 0;
    if ([2, 6, 10].includes(yz)) startPos = 4;
    else if ([8, 0, 4].includes(yz)) startPos = 10;
    else if ([5, 9, 1].includes(yz)) startPos = 7;
    else if ([11, 3, 7].includes(yz)) startPos = 1;

    const direction = this.gender === '男' ? 1 : -1;
    let pos = (startPos + (age - 1) * direction) % 12;
    if (pos < 0) pos += 12;
    return pos;
  }
}