// FILE: src/components/Chart/YearAdvicePanel.tsx
import React, { useMemo } from 'react';
import { Lock, Sparkles, Calendar, AlertCircle } from 'lucide-react';
import { Lunar } from 'lunar-typescript';
import type { YearAdviceResult, YearAdviceRule, AdviceTokens } from '../../logic/types';

interface Props {
    result: YearAdviceResult;
    rules: YearAdviceRule[];
    currentYear?: number; // 預設為 new Date().getFullYear()
}

const getLunarYearRange = (year: number) => {
    const lunarStart = Lunar.fromYmd(year, 1, 1);
    const solarStart = lunarStart.getSolar();
    const nextLunarStart = Lunar.fromYmd(year + 1, 1, 1);
    const solarEnd = nextLunarStart.getSolar().next(-1);

    return {
        startStr: solarStart.toYmd(),
        endStr: solarEnd.toYmd(),
        startDate: new Date(solarStart.toYmd().replace(/-/g, '/')) 
    };
};

// Token Replacer Function
const replaceTokens = (text: string, tokens: AdviceTokens): string => {
    let output = text;
    (Object.keys(tokens) as Array<keyof AdviceTokens>).forEach(key => {
        const val = tokens[key];
        output = output.replace(new RegExp(`{${key}}`, 'g'), val);
    });
    return output;
};

export const YearAdvicePanel: React.FC<Props> = ({ result, rules, currentYear }) => {
    const now = new Date();
    const nowYear = currentYear || now.getFullYear();
    const targetYear = result.year;

    // --- 1. 曆法區間計算 ---
    const { startStr, endStr, startDate } = useMemo(() => getLunarYearRange(targetYear), [targetYear]);
    const isNotYetLunarNewYear = targetYear === nowYear && now < startDate;

    // --- 2. 解鎖規則 ---
    const isFullUnlock = targetYear >= nowYear - 3 && targetYear <= nowYear;
    const isPartialUnlock = targetYear === nowYear + 1;
    const isLocked = !isFullUnlock && !isPartialUnlock;

    // --- 3. 文案匹配 ---
    const rawContent = useMemo(() => {
        if (isLocked) return null;

        // Match by Focus Palace & Line Score
        const palaceRules = rules.filter(r => r.palace === result.focusPalaceOffset);
        
        let matched = palaceRules.find(r => {
            const min = r.min_score;
            const max = r.max_score === null ? Infinity : r.max_score;
            // Use Line Score for matching
            return result.topLineScore >= min && result.topLineScore <= max;
        });

        if (!matched) {
            matched = rules.find(r => r.is_default);
        }

        return matched ? matched.content : "本年度煞忌訊號較少，運勢相對平穩，可依原定計畫前行。";
    }, [result, rules, isLocked]);

    // --- 4. Token Replacement ---
    const finalContent = useMemo(() => {
        if (!rawContent) return "";
        return replaceTokens(rawContent, result.tokens);
    }, [rawContent, result.tokens]);

    const CTA_TEXT = "想看完整流年提醒？之後將開放付費解鎖；也可預約大寶老師做深度論命。";

    // --- Render ---
    if (isLocked) {
        return (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center space-y-3 relative overflow-hidden">
                <div className="flex justify-center mb-2">
                    <div className="bg-slate-200 p-3 rounded-full">
                        <Lock size={24} className="text-slate-400" />
                    </div>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">{targetYear} 流年建議</h3>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono bg-slate-100 py-1 px-2 rounded-full mx-auto w-fit">
                    <Calendar size={10} />
                    {startStr} ~ {endStr}
                </div>
                <p className="text-sm text-slate-500 mt-2">{CTA_TEXT}</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden transition-all duration-300">
            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                    <h3 className="text-indigo-900 font-bold text-lg flex items-center gap-2">
                        <Sparkles size={18} className="text-indigo-500" />
                        {targetYear} 流年建議
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-indigo-400/80 font-mono mt-1 font-medium">
                        <Calendar size={10} />
                        命理流年：{startStr} ~ {endStr}
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-400 mb-0.5">煞忌指數</span>
                    {/* Display Line Score */}
                    <span className="text-2xl font-black text-indigo-600 leading-none">{result.topLineScore}</span>
                </div>
            </div>

            {/* Warning */}
            {isNotYetLunarNewYear && (
                <div className="mb-3 bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-start gap-2 relative z-10">
                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-tight">
                        目前仍在上一個農曆流年，本建議將於 <span className="font-bold">{startStr}</span> (農曆新年) 後完全對應當年度運勢。
                    </p>
                </div>
            )}

            {/* Content */}
            <div className="mb-2 relative z-10">
                <div className="flex gap-2 mb-2">
                    <div className="inline-block bg-indigo-600 text-white text-xs px-2 py-1 rounded font-bold shadow-sm">
                        {result.focusPalaceName}
                    </div>
                    {/* Optionally display Top Line name */}
                    <div className="inline-block bg-white border border-indigo-200 text-indigo-600 text-xs px-2 py-1 rounded font-bold shadow-sm">
                        {result.tokens.top_line}
                    </div>
                </div>
                
                <div className={`text-sm leading-relaxed text-slate-700 whitespace-pre-wrap ${isPartialUnlock ? 'blur-sm select-none opacity-60' : ''}`}>
                    {isPartialUnlock ? (
                        "此處包含針對該宮位的詳細流年運勢分析與建議，協助您趨吉避凶..."
                    ) : (
                        finalContent
                    )}
                </div>
            </div>

            {/* Preview Overlay */}
            {isPartialUnlock && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                    <div className="bg-white/95 p-4 rounded-xl shadow-lg border border-indigo-100 max-w-[85%] text-center">
                        <p className="text-xs font-bold text-indigo-800 mb-1">{targetYear} 運勢預告</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{CTA_TEXT}</p>
                    </div>
                </div>
            )}
            
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
        </div>
    );
};