import type { ChartData, Scope } from './types';

const cycleIndex = (year: number, length: number) => ((year - 4) % length + length) % length;

// Keep the trace origin consistent with the stem actually used by computeSiHua.
// Birth/year markers match palace STEMS, never the birth/annual year branch.
// Preserve every matching palace when a stem occurs twice in the twelve palaces.
export const resolveSiHuaSource = (
  chart: Pick<ChartData, 'palaces' | 'lunarYear'>,
  scope: Scope,
  daPalaceIdx: number,
  liuYear: number | null,
  xiaoPalaceIdx: number,
): { sourcePalaceIndices: number[]; sourceGanIdx: number } | null => {
  let sourcePalaceIndices: number[] = [];
  let sourceGanIdx = -1;
  if (scope === 'ben' || scope === 'liu') {
    const year = scope === 'ben' ? chart.lunarYear : liuYear;
    if (year === null || !Number.isInteger(year)) return null;
    sourceGanIdx = cycleIndex(year, 10);
    sourcePalaceIndices = chart.palaces.flatMap((p, index) => p.ganIndex === sourceGanIdx ? [index] : []);
  } else if (scope === 'da' || scope === 'xiao') {
    const sourcePalaceIdx = scope === 'da' ? daPalaceIdx : xiaoPalaceIdx;
    if (!Number.isInteger(sourcePalaceIdx) || !chart.palaces[sourcePalaceIdx]) return null;
    sourcePalaceIndices = [sourcePalaceIdx];
    sourceGanIdx = chart.palaces[sourcePalaceIdx].ganIndex;
  }
  if (!sourcePalaceIndices.length || !Number.isInteger(sourceGanIdx) || sourceGanIdx < 0 || sourceGanIdx > 9) return null;
  return { sourcePalaceIndices, sourceGanIdx };
};
