import React, { useState, useEffect } from 'react';
import { Sparkles, Lock, ShieldAlert, ChevronRight, Eye } from 'lucide-react';
import { scanYearlyRisk } from '../../logic/analysis/riskScanner';
import { generateAnalysisContent } from '../../logic/analysis/contentGenerator';
import { AnalysisViewState, RawAnalysisResult } from '../../logic/analysis/types';
import { ZiWeiEngine } from '../../logic/engine';

interface Props {
    engine: ZiWeiEngine;
    year: number;
    userId: string;
    chartId: string;
}

export const YearlyAnalysisBoard: React.FC<Props> = ({ engine, year, userId, chartId }) => {
    const [viewData, setViewData] = useState<AnalysisViewState[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // 關鍵：解鎖狀態綁定 userId + chartId + year
    const lockKey = `unlock_${userId}_${chartId}_${year}`;
    const [isUnlocked, setIsUnlocked] = useState(() => localStorage.getItem(lockKey) === 'true');

    useEffect(() => {
        // 當年度切換，重新驗證鎖定狀態並重置顯示
        setIsUnlocked(localStorage.getItem(lockKey) === 'true');
        setViewData([]);
    }, [year, lockKey]);

    const handleRunAnalysis = () => {
        setIsProcessing(true);
        setTimeout(() => {
            const rawResults = scanYearlyRisk(engine, year);
            const formatted = rawResults.map((res, idx) => ({
                line: res.line,
                isLocked: idx > 0 && !isUnlocked, // 只解鎖第一條
                tags: res.riskTags,
                content: generateAnalysisContent(res),
                status: res.status
            }));
            setViewData(formatted);
            setIsProcessing(false);
        }, 800);
    };

    if (viewData.length === 0) {
        return (
            <button 
                onClick={handleRunAnalysis}
                disabled={isProcessing}
                className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition-all text-white no-screenshot"
            >
                {isProcessing ? <><Loader2 className="animate-spin" size={18}/> 推算中...</> : <><Sparkles size={18}/> 生成年度運勢課題分析</>}
            </button>
        );
    }

    return (
        <div className="mt-4 space-y-3">
            {viewData.map((item, idx) => (
                item.status !== 'hidden' && (
                    <div key={item.line} className={`relative p-4 rounded-xl border ${item.isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-purple-100 shadow-sm'} overflow-hidden transition-all`}>
                        <div className="flex justify-between items-center mb-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.isLocked ? 'bg-slate-200 text-slate-500' : 'bg-purple-100 text-purple-700'}`}>
                                {item.line}
                            </span>
                            {item.isLocked && <Lock size={14} className="text-slate-400"/>}
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {item.tags.map(tag => <span key={tag} className="text-[11px] font-medium text-slate-600"># {tag}</span>)}
                        </div>

                        <div className={`text-sm leading-relaxed text-slate-700 ${item.isLocked ? 'blur-md select-none opacity-40' : 'animate-in fade-in duration-500'}`}>
                            {item.content}
                        </div>

                        {item.isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center pt-8">
                                <button 
                                    onClick={() => { localStorage.setItem(lockKey, 'true'); setIsUnlocked(true); handleRunAnalysis(); }}
                                    className="px-4 py-1.5 bg-white border border-purple-300 text-purple-700 text-xs font-bold rounded-full shadow-md hover:bg-purple-50 transition-colors flex items-center gap-1"
                                >
                                    解鎖完整分析
                                </button>
                            </div>
                        )}
                    </div>
                )
            ))}
        </div>
    );
};

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);