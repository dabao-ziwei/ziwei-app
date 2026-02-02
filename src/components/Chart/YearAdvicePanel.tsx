// FILE: src/components/Chart/YearAdvicePanel.tsx
import React, { useMemo } from 'react';
import { Lock, Sparkles, Calendar, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Lunar } from 'lunar-typescript';
import type { YearAdviceResult, YearAdviceRule, AdviceTokens } from '../../logic/types';

interface Props {
    result: YearAdviceResult;
    rules: YearAdviceRule[];
    currentYear?: number;
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

const replaceTokens = (text: string, tokens: AdviceTokens): string => {
    let output = text;
    (Object.keys(tokens) as Array<keyof AdviceTokens>).forEach(key => {
        const val = tokens[key];
        output = output.replace(new RegExp(`{${key}}`, 'g'), val);
    });
    return output;
};

const DEFAULT_EXTENSION = "若想知道這個課題在你人生哪個位置最關鍵，可以再深入拆盤。";
const V2_FALLBACK_ANCHOR = "年度運勢重點";

export const YearAdvicePanel: React.FC<Props> = ({ result, rules, currentYear }) => {
    const now = new Date();
    const nowYear = currentYear || now.getFullYear();
    const targetYear = result.year;

    // --- 1. 曆法區間 ---
    const { startStr, endStr, startDate } = useMemo(() => getLunarYearRange(targetYear), [targetYear]);
    const isNotYetLunarNewYear = targetYear === nowYear && now < startDate;

    // --- 2. 解鎖規則 ---
    const isFullUnlock = targetYear >= nowYear - 3 && targetYear <= nowYear;
    const isPartialUnlock = targetYear === nowYear + 1;
    const isLocked = !isFullUnlock && !isPartialUnlock;

    // --- 3. 內容匹配 (Patch A: 使用 focusPalaceScore) ---
    const matchedRule = useMemo(() => {
        if (isLocked) return null;

        const palaceRules = rules.filter(r => r.palace === result.focusPalaceOffset);
        
        let matched = palaceRules.find(r => {
            const min = r.min_score;
            const max = r.max_score === null ? Infinity : r.max_score;
            // [Patch A] 使用 focusPalaceScore 比對
            return result.focusPalaceScore >= min && result.focusPalaceScore <= max;
        });

        if (!matched) {
            matched = rules.find(r => r.is_default);
        }
        return matched;
    }, [result, rules, isLocked]);

    const contentV3 = matchedRule?.content_struct;
    const fallbackContent = matchedRule?.content ? replaceTokens(matchedRule.content, result.tokens) : "本年度運勢平穩，可依原定計畫前行。";

    // Neutral cooling text
    const COOLING_TEXT = "此年度建議尚未開放，請專注於當下的生活累積。";

    // --- Render Locked ---
    if (isLocked) {
        return (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center space-y-3 relative overflow-hidden">
                <div className="flex justify-center mb-2">
                    <div className="bg-slate-200 p-3 rounded-full">
                        <Lock size={24} className="text-slate-400" />
                    </div>
                </div>
                <h3 className="font-bold text-gray-800 text-lg">{targetYear} 年度建議</h3>
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono bg-slate-100 py-1 px-2 rounded-full mx-auto w-fit">
                    <Calendar size={10} />
                    適用期間：{startStr} ~ {endStr}
                </div>
                <p className="text-sm text-slate-500 mt-2">{COOLING_TEXT}</p>
            </div>
        );
    }

    // --- Preview Mode Helpers (Patch B) ---
    const getPreviewAnchor = () => {
        if (contentV3) return replaceTokens(contentV3.anchor || '尚未設定年度定錨', result.tokens);
        // v2 Fallback logic: extract first line
        return fallbackContent.split('\n').find(line => line.trim().length > 0)?.trim() || V2_FALLBACK_ANCHOR;
    };

    const getPreviewExtension = () => {
        if (contentV3) return replaceTokens(contentV3.extension || DEFAULT_EXTENSION, result.tokens);
        return DEFAULT_EXTENSION; // v2 fallback always uses default
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl p-5 border border-indigo-100 shadow-sm relative overflow-hidden transition-all duration-300">
            {/* Header: No Jargon */}
            <div className="flex flex-col mb-4 relative z-10">
                <h3 className="text-indigo-900 font-bold text-lg flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-500" />
                    {targetYear} 年度課題
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-indigo-400/80 font-mono mt-1 font-medium">
                    <Calendar size={10} />
                    適用期間：{startStr} ~ {endStr}
                </div>
            </div>

            {/* Warning */}
            {isNotYetLunarNewYear && (
                <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg p-2 flex items-start gap-2 relative z-10">
                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-tight">
                        目前仍在上一個農曆流年，本建議將於 <span className="font-bold">{startStr}</span> (農曆新年) 後完全對應當年度運勢。
                    </p>
                </div>
            )}

            {/* Content Area */}
            <div className="relative z-10 space-y-5">
                {isPartialUnlock ? (
                    // [Patch B] Preview Mode: Show Block A + D Only
                    <>
                        <div className="text-lg font-bold text-slate-800 leading-snug">
                            {getPreviewAnchor()}
                        </div>
                         <div className="pt-2 border-t border-indigo-100/50">
                            <p className="text-xs text-indigo-400/80 italic text-center">
                                {getPreviewExtension()}
                            </p>
                        </div>
                    </>
                ) : (
                    // Full Mode
                    contentV3 ? (
                        <>
                            {/* Block A */}
                            <div className="text-lg font-bold text-slate-800 leading-snug">
                                {replaceTokens(contentV3.anchor || '尚未設定年度定錨', result.tokens)}
                            </div>

                            {/* Block B */}
                            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {replaceTokens(contentV3.scenario, result.tokens)}
                            </div>

                            {/* Block C */}
                            <div className="grid grid-cols-1 gap-3">
                                <div className="bg-emerald-50/50 rounded-lg p-3 border border-emerald-100/50">
                                    <h4 className="text-xs font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                                        <CheckCircle size={14}/> 適合做的事
                                    </h4>
                                    <ul className="space-y-1.5">
                                        {contentV3.todo.map((item, idx) => (
                                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                                <span className="text-emerald-400 mt-1.5">•</span> {replaceTokens(item, result.tokens)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-100/50">
                                    <h4 className="text-xs font-bold text-rose-700 mb-2 flex items-center gap-1.5">
                                        <AlertTriangle size={14}/> 今年要避免
                                    </h4>
                                    <ul className="space-y-1.5">
                                        {contentV3.avoid.map((item, idx) => (
                                            <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                                                <span className="text-rose-400 mt-1.5">•</span> {replaceTokens(item, result.tokens)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Block D */}
                            <div className="pt-2 border-t border-indigo-100/50">
                                <p className="text-xs text-indigo-400/80 italic text-center">
                                    {replaceTokens(contentV3.extension || DEFAULT_EXTENSION, result.tokens)}
                                </p>
                            </div>
                        </>
                    ) : (
                        // v2 Full Fallback
                        <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {fallbackContent}
                        </div>
                    )
                )}
            </div>
            
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
        </div>
    );
};