// FILE: src/logic/analysis/riskScanner.ts

import type { RawAnalysisResult, AnalysisLine } from './types';
import { ZiWeiEngine } from '../engine';

// 定義六煞（以名稱包含判斷）
const SHA_STARS = ['火星', '鈴星', '擎羊', '陀羅', '地空', '地劫'] as const;

type SihuaScope = 'liu' | 'ben' | string;
type SihuaItem = { type: string; scope?: SihuaScope };
type StarLike = { name: string; sihua?: SihuaItem[] };

type PalaceLike = {
  zhiIndex: number;
  majorStars?: StarLike[];
  minorStars?: StarLike[];
  miscStars?: StarLike[];
  limitStars?: StarLike[];
};

type ChartDataLike = {
  palaces: PalaceLike[];
};

// ----------------------------
// 核心純函數：只吃 ChartData + year
// ----------------------------
export const scanYearlyRiskFromChart = (chartData: ChartDataLike, year: number): RawAnalysisResult[] => {
  const palaces = chartData?.palaces ?? [];

  // 安全 Mod：徹底杜絕負數
  const flowZhi = (((year - 4) % 12) + 12) % 12;

  // 以流年命宮為基點
  const flowDayIdx = palaces.findIndex((p) => p.zhiIndex === flowZhi);

  // Guard：找不到基點，直接回傳安全結果，不讓程式崩潰
  if (flowDayIdx === -1) {
    return buildSafeFallbackResults('資料校核中');
  }

  const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;

  const lines: Record<AnalysisLine, number[]> = {
    命遷線: [getP(0), getP(6)],
    夫官線: [getP(4), getP(10)],
    財福線: [getP(8), getP(2)],
  };

  const results = (Object.entries(lines) as Array<[AnalysisLine, number[]]>).map(([lineName, indices]) => {
    let maxSha = 0;
    let hasJi = false;

    // 掃描線路上的宮位（對宮也納入參考）
    for (const idx of indices) {
      const palace = palaces[idx];
      if (!palace) continue;

      // 星曜陣列保護：?? []
      const stars: StarLike[] = [
        ...(palace.majorStars ?? []),
        ...(palace.minorStars ?? []),
        ...(palace.miscStars ?? []),
        ...(palace.limitStars ?? []),
      ];

      const shaInPalace = stars.filter((s) => SHA_STARS.some((name) => s.name.includes(name))).length;
      const jiInPalace = stars.some((s) =>
        (s.sihua ?? []).some((sh) => sh.type === '忌' && (sh.scope === 'liu' || sh.scope === 'ben'))
      );

      maxSha = Math.max(maxSha, shaInPalace);
      if (jiInPalace) hasJi = true;
    }

    // 核心：門檻判定邏輯（Internal Severity）
    let severity = 0;
    if (maxSha >= 2) severity = 3; // 高風險門檻
    else if (maxSha >= 1 && hasJi) severity = 2; // 中風險門檻
    else if (hasJi) severity = 1; // 輕度提醒

    return {
      line: lineName,
      severity,
      riskTags: getSafeTags(lineName, maxSha, hasJi),
      status: 'active',
    };
  });

  return results.sort((a, b) => b.severity - a.severity);
};

// ----------------------------
// 呼叫包裝：維持原 API，但內部走純函數
// ----------------------------
export const scanYearlyRisk = (engine: ZiWeiEngine, year: number): RawAnalysisResult[] => {
  const chart = engine.getChartData() as unknown as ChartDataLike;
  return scanYearlyRiskFromChart(chart, year);
};

const buildSafeFallbackResults = (tag: string): RawAnalysisResult[] => {
  const lines: AnalysisLine[] = ['命遷線', '夫官線', '財福線'];
  return lines.map((line) => ({
    line,
    severity: 0,
    riskTags: [tag],
    status: 'active',
  }));
};

const getSafeTags = (line: AnalysisLine, sha: number, ji: boolean): string[] => {
  const tags: string[] = [];
  if (sha < 1 && !ji) return ['年度平穩發展'];

  if (line === '命遷線') {
    if (sha >= 2) tags.push('自我定位的重塑課題');
    if (ji) tags.push('外在環境的變動適應');
  } else if (line === '夫官線') {
    if (sha >= 2) tags.push('關係磨合與角色平衡');
    if (ji) tags.push('職業重心的階段調整');
  } else if (line === '財福線') {
    if (sha >= 2) tags.push('財務資源的穩定考驗');
    if (ji) tags.push('內在價值與回報平衡');
  }

  return tags;
};
