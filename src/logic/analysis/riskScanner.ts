// FILE: src/logic/analysis/riskScanner.ts

import type { RawAnalysisResult, AnalysisLine, AnalysisSummary, AnalysisDetails } from './types';
import { ZiWeiEngine } from '../engine';

const SHA_STARS = ['火星', '鈴星', '擎羊', '陀羅', '地空', '地劫'] as const;

const LINE_PRIORITY: Record<AnalysisLine, number> = {
  '命遷線': 3,
  '夫官線': 2,
  '財福線': 1,
};

// 內部定義 Options，避免循環依賴
export interface ScanOptions {
  includeDetails?: boolean;
}

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
type ChartDataLike = { palaces: PalaceLike[] };

// ----------------------------
// 核心純函數
// ----------------------------
export const scanYearlyRiskFromChart = (
  chartData: ChartDataLike, 
  year: number,
  options: ScanOptions = { includeDetails: false } 
): RawAnalysisResult[] => {
  const palaces = chartData?.palaces ?? [];
  const flowZhi = (((year - 4) % 12) + 12) % 12;
  const flowDayIdx = palaces.findIndex((p) => p.zhiIndex === flowZhi);

  if (flowDayIdx === -1) {
    return buildSafeFallbackResults('資料校核中', !!options.includeDetails);
  }

  const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;

  const lines: Record<AnalysisLine, number[]> = {
    命遷線: [getP(0), getP(6)],
    夫官線: [getP(4), getP(10)],
    財福線: [getP(8), getP(2)],
  };

  const calculatedResults = (Object.entries(lines) as Array<[AnalysisLine, number[]]>).map(([lineName, indices]) => {
    let maxSha = 0;
    let hasJi = false;
    
    // 優化：使用 Set 收集星曜名稱，避免重複與 O(N^2)
    const starSet = new Set<string>();

    for (const idx of indices) {
      const palace = palaces[idx];
      if (!palace) continue;
      const stars: StarLike[] = [
        ...(palace.majorStars ?? []),
        ...(palace.minorStars ?? []),
        ...(palace.miscStars ?? []),
        ...(palace.limitStars ?? []),
      ];

      stars.forEach(s => {
          starSet.add(s.name);
      });

      const shaInPalace = stars.filter((s) => SHA_STARS.some((name) => s.name.includes(name))).length;
      const jiInPalace = stars.some((s) =>
        (s.sihua ?? []).some((sh) => sh.type === '忌' && (sh.scope === 'liu' || sh.scope === 'ben'))
      );

      maxSha = Math.max(maxSha, shaInPalace);
      if (jiInPalace) hasJi = true;
    }

    // 穩定排序：轉為 Array 後進行 sort，確保輸出順序一致 (對快取友善)
    const starNames = Array.from(starSet).sort();

    let severity = 0;
    if (maxSha >= 2) severity = 3; 
    else if (maxSha >= 1 && hasJi) severity = 2; 
    else if (hasJi) severity = 1; 

    const tags = getSafeTags(lineName, maxSha, hasJi);

    const summary: AnalysisSummary = {
        headline: getHeadline(lineName, severity),
        bullets: tags,
    };

    let details: AnalysisDetails | undefined = undefined;
    
    if (options.includeDetails) {
        details = {
            structure: [`關鍵星曜：${starNames.slice(0, 5).join('、')}${starNames.length > 5 ? '...' : ''}`],
            reasoning: [
                `煞星計數：${maxSha} 顆`,
                `化忌反應：${hasJi ? '有' : '無'}`,
                `風險等級評估：${severity === 3 ? '高' : severity === 2 ? '中' : '低'}`
            ],
            suggestions: [
                '詳細運勢影響需結合大限與流年四化綜合判斷。',
                '建議針對此線路進行更深度的宮位疊併分析。'
            ]
        };
    }

    return {
      line: lineName,
      severity,
      riskTags: tags,
      status: 'active' as const,
      isPrimary: false, 
      summary,
      details, 
    };
  });

  calculatedResults.sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return LINE_PRIORITY[b.line] - LINE_PRIORITY[a.line];
  });

  return calculatedResults.map((res, index) => ({
    ...res,
    isPrimary: index === 0,
  }));
};

export const scanYearlyRisk = (engine: ZiWeiEngine, year: number, options?: ScanOptions): RawAnalysisResult[] => {
  const chart = engine.getChartData() as unknown as ChartDataLike;
  return scanYearlyRiskFromChart(chart, year, options);
};

const buildSafeFallbackResults = (tag: string, includeDetails: boolean): RawAnalysisResult[] => {
  const lines: AnalysisLine[] = ['命遷線', '夫官線', '財福線'];
  return lines.map((line, index) => {
    let details: AnalysisDetails | undefined = undefined;
    if (includeDetails) {
        details = {
            structure: ['資料準備中'],
            reasoning: ['系統初始化'],
            suggestions: ['請稍後重試']
        };
    }

    return {
        line,
        severity: 0,
        riskTags: [tag],
        status: 'active',
        isPrimary: index === 0,
        summary: { headline: '資料準備中', bullets: [tag] },
        details
    };
  });
};

const getHeadline = (line: AnalysisLine, severity: number): string => {
    if (severity >= 3) return `${line}波動劇烈，需謹慎應對`;
    if (severity === 2) return `${line}存在變數，建議保守`;
    return `${line}相對平穩，可積極發展`;
};

const getSafeTags = (line: AnalysisLine, sha: number, ji: boolean): string[] => {
  const tags: string[] = [];
  if (sha < 1 && !ji) return ['年度平穩發展'];
  if (line === '命遷線') {
    if (sha >= 2) tags.push('自我定位重塑');
    if (ji) tags.push('外在環境變動');
  } else if (line === '夫官線') {
    if (sha >= 2) tags.push('關係磨合');
    if (ji) tags.push('事業重心調整');
  } else if (line === '財福線') {
    if (sha >= 2) tags.push('財務穩定考驗');
    if (ji) tags.push('內在價值平衡');
  }
  return tags;
};