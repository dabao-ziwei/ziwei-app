import { Lunar, LunarYear, Solar } from 'lunar-typescript';

export type BirthCalendar = 'solar' | 'lunar';
export type BirthEra = 'ad' | 'roc';
export interface CivilDate { year: number; month: number; day: number }
export interface BirthDateInput {
  year: string; month: string; day: string;
  calendar: BirthCalendar; era: BirthEra; leap: boolean;
}

export const GAN_ZHI_YEARS = Array.from({ length: 60 }, (_, i) => '甲乙丙丁戊己庚辛壬癸'[i % 10] + '子丑寅卯辰巳午未申酉戌亥'[i % 12]);
export const getBirthGanZhi = (adYear: number): string => GAN_ZHI_YEARS[((adYear - 4) % 60 + 60) % 60];
export const getGanZhiYearCandidates = (ganZhi: string, maxYear = new Date().getFullYear()): number[] => {
  const index = GAN_ZHI_YEARS.indexOf(ganZhi.trim());
  if (index < 0) return [];
  const firstYear = (index + 4) % 60 || 60;
  const result: number[] = [];
  for (let year = maxYear - ((maxYear - firstYear) % 60 + 60) % 60; year >= 1800; year -= 60) result.push(year);
  return result;
};
export const getLunarBirthMonths = (adYear: number): { value: number; label: string; days: number }[] => {
  const names = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月'];
  return LunarYear.fromYear(adYear).getMonthsInYear().map(month => ({
    value: month.getMonth(), label: `${month.getMonth() < 0 ? '閏' : ''}${names[Math.abs(month.getMonth()) - 1]}`, days: month.getDayCount(),
  }));
};
export const getLunarBirthDayLabel = (day: number): string => {
  const digits = '一二三四五六七八九';
  if (day < 10) return `初${digits[day - 1]}`;
  if (day === 10) return '初十';
  if (day < 20) return `十${digits[day - 11]}`;
  if (day === 20) return '二十';
  if (day < 30) return `廿${digits[day - 21]}`;
  return '三十';
};

const integer = (value: string, label: string) => {
  if (!/^\d+$/.test(value)) throw new Error(`請輸入完整的${label}`);
  return Number(value);
};
export const birthYearToAd = (year: string, era: BirthEra): number => {
  const value = integer(year, era === 'roc' ? '民國年' : '西元年');
  const ad = value + (era === 'roc' ? 1911 : 0);
  if (value < 1 || ad > 9999) throw new Error('年份超出可輸入範圍；民國前出生請使用西元');
  return ad;
};
export const getBirthLeapMonth = (year: string, era: BirthEra): number => {
  try { return LunarYear.fromYear(birthYearToAd(year, era)).getLeapMonth(); }
  catch { return 0; }
};

// Convert the actual civil birthday only. Late-zi rollover and leap-month chart
// conventions remain exclusively in ZiWeiEngine, never in this input adapter.
export const birthDateToSolar = (input: BirthDateInput): CivilDate => {
  const year = birthYearToAd(input.year, input.era);
  const month = integer(input.month, '月份');
  const day = integer(input.day, '日期');
  if (month < 1 || month > 12 || day < 1) throw new Error('月份或日期不正確');
  if (input.calendar === 'solar') {
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > days[month - 1]) throw new Error('此國曆日期不存在');
    Solar.fromYmd(year, month, day); // also enforce the library's calendar constraints
    return { year, month, day };
  }
  const lunarMonth = LunarYear.fromYear(year).getMonth(input.leap ? -month : month);
  if (!lunarMonth) throw new Error(input.leap ? '該年沒有這個閏月' : '此農曆月份不存在');
  if (day > lunarMonth.getDayCount()) throw new Error(`此農曆月份只有 ${lunarMonth.getDayCount()} 天`);
  const solar = Lunar.fromYmd(year, input.leap ? -month : month, day).getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
};

export const solarToBirthDate = (date: CivilDate, calendar: BirthCalendar, era: BirthEra): BirthDateInput => {
  const lunar = Solar.fromYmd(date.year, date.month, date.day).getLunar();
  const calendarYear = calendar === 'lunar' ? lunar.getYear() : date.year;
  const year = calendarYear - (era === 'roc' ? 1911 : 0);
  if (year < 1) throw new Error('此日期在民國元年之前，請使用西元年');
  return {
    year: String(year), month: String(calendar === 'lunar' ? Math.abs(lunar.getMonth()) : date.month).padStart(2, '0'),
    day: String(calendar === 'lunar' ? lunar.getDay() : date.day).padStart(2, '0'),
    calendar, era, leap: calendar === 'lunar' && lunar.getMonth() < 0,
  };
};

export const birthDatePreview = (input: BirthDateInput): string => {
  const date = birthDateToSolar(input);
  const lunar = Solar.fromYmd(date.year, date.month, date.day).getLunar();
  const roc = date.year > 1911 ? `民國 ${date.year - 1911} 年` : `民國前 ${1912 - date.year} 年`;
  return `國曆 ${date.year}/${date.month}/${date.day}（${roc}）｜農曆 ${lunar.getYear()} 年 ${lunar.getMonthInChinese().replace('闰', '閏')}月${lunar.getDayInChinese()}`;
};
