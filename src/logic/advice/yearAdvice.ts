// FILE: src/logic/advice/yearAdvice.ts
import type { ChartData, YearAdviceResult, PalaceEventLog, AdviceTokens } from '../types';
import { 
    MATCH_SHEEP, MATCH_DALA, 
    PALACE_NAMES, LINE_DEFINITIONS, LINE_PRIORITY, FOCUS_PRIORITY
} from '../constants';

// 安全 Mod
const mod12 = (n: number) => ((n % 12) + 12) % 12;

// --- Anchor Helper ---
const getFlowMingIndex = (chart: ChartData, year: number): number => {
    const flowZhi = mod12(year - 4);
    return chart.palaces.findIndex((p) => p.zhiIndex === flowZhi);
};

// 產生預設的空 Log 物件
const createDefaultLog = (): PalaceEventLog => ({
    sheepHits: [],
    toroHits: [],
    huoHits: 0,
    lingHits: 0,
    jiHits: [],
    totalScore: 0
});

export const scanYearlyAdvice = (chart: ChartData, year: number): YearAdviceResult => {
    const palaces = chart.palaces;
    
    // 1. 找出流年命宮位置
    const flowMingIdx = getFlowMingIndex(chart, year);

    // Fallback
    if (flowMingIdx === -1) {
        return {
            year,
            topLineId: LINE_PRIORITY[0],
            topLineScore: 0,
            focusPalaceOffset: 0,
            focusPalaceName: '年度焦點：命宮',
            focusPalaceScore: 0,
            palaceScores: new Array(12).fill(0),
            palaceEvents: Array.from({ length: 12 }, createDefaultLog),
            tokens: { year: year.toString() }
        };
    }

    // 2. 計算 12 宮位分數與事件
    const palaceScores = new Array(12).fill(0);
    const palaceEvents: PalaceEventLog[] = [];

    for (let offset = 0; offset < 12; offset++) {
        const actualIdx = (flowMingIdx + offset + 12) % 12;
        const palace = palaces[actualIdx];
        
        let score = 0;
        const log: PalaceEventLog = {
            sheepHits: [],
            toroHits: [],
            huoHits: 0,
            lingHits: 0,
            jiHits: [],
            totalScore: 0
        };

        const staticStars = [
            ...palace.majorStars,
            ...palace.minorStars,
            ...palace.miscStars
        ];
        
        const allStars = [...staticStars, ...palace.limitStars];

        // 3.1.1 擎羊
        allStars.forEach(s => {
            if (MATCH_SHEEP.includes(s.name)) {
                score += 1;
                log.sheepHits.push(s.name);
            }
        });

        // 3.1.2 陀羅
        allStars.forEach(s => {
            if (MATCH_DALA.includes(s.name)) {
                score += 1;
                log.toroHits.push(s.name);
            }
        });

        // 3.1.3 火星
        if (staticStars.some(s => s.name === '火星')) {
            score += 1;
            log.huoHits = 1;
        }

        // 3.1.4 鈴星
        if (staticStars.some(s => s.name === '鈴星')) {
            score += 1;
            log.lingHits = 1;
        }

        // 3.2 化忌
        allStars.forEach(star => {
            if (star.sihua && star.sihua.length > 0) {
                star.sihua.forEach(sh => {
                    if (sh.type === '忌') {
                        score += 1;
                        log.jiHits.push({ star: star.name, scope: sh.scope });
                    }
                });
            }
        });

        log.totalScore = score;
        palaceScores[offset] = score;
        palaceEvents[offset] = log;
    }

    // 3. 計算 6 線分數
    let maxLineScore = -1;
    let topLineId = '';
    let maxSinglePalaceScoreInLine = -1;

    for (const lineDef of LINE_DEFINITIONS) {
        const [a, b] = lineDef.indices;
        const lineScore = palaceScores[a] + palaceScores[b];
        const singleMax = Math.max(palaceScores[a], palaceScores[b]);
        
        let isBetter = false;

        if (lineScore > maxLineScore) {
            isBetter = true;
        } else if (lineScore === maxLineScore) {
            // Tie-break #1
            if (singleMax > maxSinglePalaceScoreInLine) {
                isBetter = true;
            } else if (singleMax === maxSinglePalaceScoreInLine) {
                // Tie-break #2
                const currentPriority = LINE_PRIORITY.indexOf(lineDef.id);
                const prevPriority = LINE_PRIORITY.indexOf(topLineId);
                if (currentPriority < prevPriority) {
                    isBetter = true;
                }
            }
        }

        if (isBetter) {
            maxLineScore = lineScore;
            topLineId = lineDef.id;
            maxSinglePalaceScoreInLine = singleMax;
        }
    }

    // 5. 決定 Focus Palace
    const targetLineDef = LINE_DEFINITIONS.find(l => l.id === topLineId)!;
    const [idxA, idxB] = targetLineDef.indices;
    let focusOffset = idxA;
    
    if (palaceScores[idxA] > palaceScores[idxB]) {
        focusOffset = idxA;
    } else if (palaceScores[idxB] > palaceScores[idxA]) {
        focusOffset = idxB;
    } else {
        const priorities = FOCUS_PRIORITY[topLineId];
        if (priorities && priorities[0] === idxB) {
            focusOffset = idxB;
        } else {
            focusOffset = idxA;
        }
    }

    // [Spec 3.0.1 C] 去命理化名稱 (如：流年命宮 -> 年度焦點：命宮)
    // 檢查 PALACE_NAMES 是否含「宮」
    const rawName = PALACE_NAMES[focusOffset];
    const normalizedName = rawName.includes('宮') ? rawName : `${rawName}宮`;
    const focusPalaceName = `年度焦點：${normalizedName}`;

    // 6. Token Generation
    const tokens: AdviceTokens = {
        year: year.toString(),
    };

    return {
        year,
        topLineId,
        topLineScore: maxLineScore,
        focusPalaceOffset: focusOffset,
        focusPalaceName,
        focusPalaceScore: palaceScores[focusOffset],
        palaceScores,
        palaceEvents,
        tokens
    };
};