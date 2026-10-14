import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSync } from 'esbuild';
import { birthDateToSolar, solarToBirthDate, birthDatePreview, birthYearToAd, getBirthLeapMonth, GAN_ZHI_YEARS, getBirthGanZhi, getGanZhiYearCandidates, getLunarBirthMonths, getLunarBirthDayLabel } from '../src/logic/birthDate.ts';
const engineBundle = buildSync({ entryPoints: ['src/logic/engine.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { ZiWeiEngine } = await import(`data:text/javascript;base64,${Buffer.from(engineBundle.outputFiles[0].text).toString('base64')}`);
const input = (year,month,day,extra={}) => ({year:String(year),month:String(month),day:String(day),calendar:'solar',era:'ad',leap:false,...extra});

test('Gan-Zhi input exposes all 60 names and requires disambiguation across cycles', () => {
  assert.equal(new Set(GAN_ZHI_YEARS).size,60);
  const years = getGanZhiYearCandidates('丙午',2026);
  assert.deepEqual(years.slice(0,3),[2026,1966,1906]);
  for (const year of years) assert.equal(getBirthGanZhi(year),'丙午');
  assert.deepEqual(getGanZhiYearCandidates('丙',2026),[]);
  assert.equal(getBirthGanZhi(1984),'甲子');
});
test('Gan-Zhi year choices exclude years before 1800 and retain the boundary', () => {
  for (const name of GAN_ZHI_YEARS) {
    const years = getGanZhiYearCandidates(name,2026);
    assert.ok(years.every(year => year >= 1800 && year <= 2026));
  }
  assert.ok(getGanZhiYearCandidates(getBirthGanZhi(1800),2026).includes(1800));
  assert.deepEqual(getGanZhiYearCandidates('丙午',2026),[2026,1966,1906,1846]);
  assert.deepEqual(getGanZhiYearCandidates('甲子',1799),[]);
});
test('lunar dropdowns contain only the selected year’s real months and valid days', () => {
  const months = getLunarBirthMonths(2023);
  assert.equal(months.length,13);
  assert.deepEqual(months.slice(1,4).map(item => item.value),[2,-2,3]);
  assert.equal(months.find(item=>item.value===-2).label,'閏二月');
  assert.equal(months.find(item=>item.value===-2).days,29);
  assert.equal(getLunarBirthMonths(2024).length,12);
  assert.deepEqual([1,10,11,19,20,21,29,30].map(getLunarBirthDayLabel),['初一','初十','十一','十九','二十','廿一','廿九','三十']);
  assert.deepEqual(birthDateToSolar(input(2023,2,1,{calendar:'lunar',leap:true})),{year:2023,month:3,day:22});
});

test('ROC conversion and existing Gregorian date remain unchanged', () => {
  assert.equal(birthYearToAd('68','roc'),1979);
  assert.deepEqual(birthDateToSolar(input(68,9,26,{era:'roc'})),{year:1979,month:9,day:26});
  assert.deepEqual(birthDateToSolar(input(1979,9,26)),{year:1979,month:9,day:26});
  assert.throws(()=>birthYearToAd('0','roc'));
  assert.throws(()=>birthYearToAd('abc','ad'));
});
test('all four input modes round-trip the same civil day across lunar new year and leap month boundaries', () => {
  for (const date of [
    {year:1979,month:9,day:26},{year:2024,month:2,day:9},{year:2024,month:2,day:10},
    {year:2023,month:3,day:21},{year:2023,month:3,day:22},{year:2023,month:4,day:19},
    {year:2024,month:2,day:29},{year:2025,month:12,day:31},
  ]) for (const calendar of ['solar','lunar']) for (const era of ['ad','roc']) {
    assert.deepEqual(birthDateToSolar(solarToBirthDate(date,calendar,era)),date);
  }
});
test('leap-month selection is distinct, validated and survives a date conversion', () => {
  assert.equal(getBirthLeapMonth('112','roc'),2);
  const lunar = solarToBirthDate({year:2023,month:3,day:22},'lunar','roc');
  assert.equal(lunar.leap,true);
  const ordinary = birthDateToSolar({...lunar,leap:false});
  assert.notDeepEqual(ordinary,birthDateToSolar(lunar));
  assert.throws(()=>birthDateToSolar(input(2023,3,1,{calendar:'lunar',leap:true})),/沒有這個閏月/);
  assert.throws(()=>birthDateToSolar(input(2024,1,1,{calendar:'lunar',leap:true})),/沒有這個閏月/);
});
test('invalid dates do not silently normalize into another birthday', () => {
  for (const date of [input(2023,2,29),input(2024,4,31),input(2024,0,1),input(2024,1,0),input(2024,13,1),input('',1,1)]) {
    assert.throws(()=>birthDateToSolar(date));
  }
  assert.throws(()=>birthDateToSolar(input(2023,2,30,{calendar:'lunar',leap:true})),/只有/);
  assert.throws(()=>solarToBirthDate({year:1911,month:9,day:26},'solar','roc'),/民國元年/);
});
test('preview includes the true civil lunar date, ROC year and leap marker', () => {
  const preview = birthDatePreview(input(2023,3,22));
  assert.match(preview,/2023\/3\/22/); assert.match(preview,/民國 112 年/); assert.match(preview,/闰|閏/);
});
test('identical input modes yield identical charts, including late-zi and leap-month split days', () => {
  for (const date of [{year:2024,month:2,day:9},{year:2023,month:3,day:22},{year:2023,month:4,day:10}]) {
    for (const hour of [0,1,12,23]) {
      const expected = new ZiWeiEngine(date.year,date.month,date.day,hour,37,'女').getChartData();
      for (const calendar of ['solar','lunar']) for (const era of ['ad','roc']) {
        const converted = birthDateToSolar(solarToBirthDate(date,calendar,era));
        assert.deepEqual(new ZiWeiEngine(converted.year,converted.month,converted.day,hour,37,'女').getChartData(),expected);
      }
    }
  }
});
