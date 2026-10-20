import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSync } from 'esbuild';
import { resolveSiHuaSource } from '../src/logic/siHuaSource.ts';

const bundle = buildSync({ entryPoints:['src/logic/engine.ts'], bundle:true, write:false, platform:'node', format:'esm' });
const { ZiWeiEngine } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const fixture = () => new ZiWeiEngine(1978,12,3,22,0,'男');
const types = ['祿','權','科','忌'];
const scopeStars = (chart,scope) => {
  const map = {};
  for (const p of chart.palaces) for (const s of [...p.majorStars,...p.minorStars,...p.miscStars,...p.limitStars]) {
    for (const hua of s.sihua || []) if (hua.scope === scope) map[hua.type] = s.name;
  }
  return types.map(type=>map[type]);
};

test('戊午 natal trace originates at 午/僕役, never 乙丑 natal Ming', () => {
  const engine=fixture();
  engine.computeSiHua(-1,-1,null);
  const chart=engine.getChartData();
  const source=resolveSiHuaSource(chart,'ben',-1,null,-1);
  assert.equal(engine.getMingPos(),1);
  assert.deepEqual(source,{sourcePalaceIndices:[6],sourceGanIdx:4});
  assert.equal(chart.palaces[source.sourcePalaceIndices[0]].name,'僕役');
  assert.ok(!source.sourcePalaceIndices.includes(engine.getMingPos()));
  assert.deepEqual(scopeStars(chart,'ben'),['貪狼','太陰','右弼','天機']);
});

test('Da uses selected Da Ming palace stem 壬, not birth stem or annual stem', () => {
  const engine=fixture(); const base=engine.getChartData();
  const daIdx=base.palaces.findIndex(p=>p.ganIndex===8);
  const source=resolveSiHuaSource(base,'da',daIdx,2026,1);
  assert.deepEqual(source,{sourcePalaceIndices:[daIdx],sourceGanIdx:8});
  engine.computeSiHua(source.sourceGanIdx,2,1);
  assert.deepEqual(scopeStars(engine.getChartData(),'da'),['天梁','紫微','左輔','武曲']);
});

test('丙午 annual trace marks 丙辰, not the 戊午 year-branch palace', () => {
  const engine=fixture(); const chart=engine.getChartData();
  const source=resolveSiHuaSource(chart,'liu',10,2026,1);
  assert.deepEqual(source,{sourcePalaceIndices:[4],sourceGanIdx:2});
  assert.equal(chart.palaces[4].ganIndex,2);
  assert.equal(chart.palaces[6].ganIndex,4);
  engine.computeSiHua(8,source.sourceGanIdx,1);
  assert.deepEqual(scopeStars(engine.getChartData(),'liu'),['天同','天機','文昌','廉貞']);
});

test('Xiao uses its own Ming palace stem, independently of natal, Da and annual stems', () => {
  const engine=fixture(); const chart=engine.getChartData();
  const source=resolveSiHuaSource(chart,'xiao',10,2026,1);
  assert.deepEqual(source,{sourcePalaceIndices:[1],sourceGanIdx:1});
  engine.computeSiHua(8,2,source.sourceGanIdx);
  assert.deepEqual(scopeStars(engine.getChartData(),'xiao'),['天機','天梁','紫微','太陰']);
});

test('birthday before lunar new year retains 戊午, not Gregorian 1979 己未', () => {
  const engine=new ZiWeiEngine(1979,1,10,13,15,'女');
  const chart=engine.getChartData();
  assert.equal(chart.lunarYear,1978);
  assert.deepEqual(resolveSiHuaSource(chart,'ben',-1,null,-1),{sourcePalaceIndices:[6],sourceGanIdx:4});
});

test('己未 natal 天梁科/貪狼權 trace marks 己巳僕役, not 辛未疾厄', () => {
  const engine=new ZiWeiEngine(1979,9,26,18,26,'男');
  engine.computeSiHua(-1,-1,null);
  const chart=engine.getChartData();
  assert.deepEqual(scopeStars(chart,'ben'),['武曲','貪狼','天梁','文曲']);
  const source=resolveSiHuaSource(chart,'ben',-1,null,-1);
  assert.deepEqual(source,{sourcePalaceIndices:[5],sourceGanIdx:5});
  assert.equal(chart.palaces[5].name,'僕役');
  assert.equal(chart.palaces[5].ganIndex,5);
  assert.equal(chart.palaces[7].ganIndex,7);
  assert.ok(!source.sourcePalaceIndices.includes(7));
});

test('duplicate stems are all marked for year scopes; Da/Xiao stay at their specified palace', () => {
  const chart=fixture().getChartData();
  // In this chart 甲 appears in 子 and 寅; do not arbitrarily keep the first match.
  assert.deepEqual(resolveSiHuaSource(chart,'liu',-1,2024,-1),{sourcePalaceIndices:[0,2],sourceGanIdx:0});
  assert.deepEqual(resolveSiHuaSource({...chart,lunarYear:1984},'ben',-1,null,-1),{sourcePalaceIndices:[0,2],sourceGanIdx:0});
  assert.deepEqual(resolveSiHuaSource(chart,'da',2,null,-1),{sourcePalaceIndices:[2],sourceGanIdx:0});
  assert.deepEqual(resolveSiHuaSource(chart,'xiao',-1,null,0),{sourcePalaceIndices:[0],sourceGanIdx:0});
});

test('missing annual year or disabled scope fails closed instead of pointing at natal Ming', () => {
  const chart=fixture().getChartData();
  assert.equal(resolveSiHuaSource(chart,'da',-1,2026,1),null);
  assert.equal(resolveSiHuaSource(chart,'liu',10,null,1),null);
  assert.equal(resolveSiHuaSource(chart,'xiao',10,2026,-1),null);
  assert.equal(resolveSiHuaSource({...chart,palaces:[]},'ben',-1,null,-1),null);
});
