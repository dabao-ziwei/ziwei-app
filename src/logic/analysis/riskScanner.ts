import { RawAnalysisResult } from './types';
import { ZiWeiEngine } from '../engine';

// 定義六煞二忌
const SHA_STARS = ['火星', '鈴星', '擎羊', '陀羅', '地空', '地劫'];
const JI_STARS = ['化忌', '年忌']; 

export const scanYearlyRisk = (engine: ZiWeiEngine, year: number): RawAnalysisResult[] => {
    const chart = engine.getChartData();
    const flowZhi = (year - 4) % 12;
    const flowDayIdx = chart.palaces.findIndex(p => p.zhiIndex === flowZhi); // 以流年命宮為基點

    const getP = (offset: number) => (flowDayIdx + offset + 12) % 12;
    const lines: Record<'命遷線' | '夫官線' | '財福線', number[]> = {
        '命遷線': [getP(0), getP(6)],
        '夫官線': [getP(4), getP(10)],
        '財福線': [getP(8), getP(2)]
    };

    return (Object.entries(lines) as [any, number[]][]).map(([lineName, indices]) => {
        let maxSha = 0;
        let hasJi = false;

        // 掃描線路上的宮位 (對宮也納入參考，權重由老師未來細調)
        indices.forEach(idx => {
            const palace = chart.palaces[idx];
            const stars = [...palace.majorStars, ...palace.minorStars, ...palace.miscStars, ...palace.limitStars];
            const shaInPalace = stars.filter(s => SHA_STARS.some(name => s.name.includes(name))).length;
            const jiInPalace = stars.some(s => s.sihua?.some(sh => sh.type === '忌' && (sh.scope === 'liu' || sh.scope === 'ben')));
            
            maxSha = Math.max(maxSha, shaInPalace);
            if (jiInPalace) hasJi = true;
        });

        // 核心：門檻判定邏輯 (Internal Severity)
        let severity = 0;
        if (maxSha >= 2) severity = 3; // 高風險門檻
        else if (maxSha >= 1 && hasJi) severity = 2; // 中風險門檻
        else if (hasJi) severity = 1; // 輕度提醒

        return {
            line: lineName,
            severity,
            riskTags: getSafeTags(lineName, maxSha, hasJi),
            status: 'active'
        };
    }).sort((a, b) => b.severity - a.severity);
};

const getSafeTags = (line: string, sha: number, ji: boolean): string[] => {
    const tags: string[] = [];
    if (sha < 1 && !ji) return ["年度平穩發展"];

    if (line === '命遷線') {
        if (sha >= 2) tags.push("自我定位的重塑課題");
        if (ji) tags.push("外在環境的變動適應");
    } else if (line === '夫官線') {
        if (sha >= 2) tags.push("關係磨合與角色平衡");
        if (ji) tags.push("職業重心的階段調整");
    } else if (line === '財福線') {
        if (sha >= 2) tags.push("財務資源的穩定考驗");
        if (ji) tags.push("內在價值與回報平衡");
    }
    return tags;
};