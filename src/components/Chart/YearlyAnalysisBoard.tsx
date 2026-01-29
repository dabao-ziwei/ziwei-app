// FILE: src/components/Chart/YearlyAnalysisBoard.tsx

import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Lock, Unlock, AlertCircle, ChevronRight } from 'lucide-react';
import { scanYearlyRisk } from '../../logic/analysis/riskScanner';
import type { AnalysisViewState, AnalysisLine, AnalysisDetails } from '../../logic/analysis/types';
import type { ZiWeiEngine } from '../../logic/engine';

interface Props {
  engine: ZiWeiEngine;
  year: number;
  userId: string;
  chartId: string;
}

const DEFAULT_UNLOCKED: Record<AnalysisLine, boolean> = {
  '命遷線': false,
  '夫官線': false,
  '財福線': false,
};

const VALID_KEYS: AnalysisLine[] = ['命遷線', '夫官線', '財福線'];

export const YearlyAnalysisBoard: React.FC<Props> = ({ engine, year, userId, chartId }) => {
  const [viewData, setViewData] = useState<AnalysisViewState[]>([]);
  // 移除 redundant isProcessing state，通過 CI/Lint
  const [lineLoading, setLineLoading] = useState<Partial<Record<AnalysisLine, boolean>>>({});

  const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  const lockStorageKey = useMemo(() => `unlock_record_${userId}_${chartId}_${year}`, [userId, chartId, year]);

  const [unlockedLines, setUnlockedLines] = useState<Record<AnalysisLine, boolean>>(DEFAULT_UNLOCKED);
  
  const initialUnlockedRef = useRef<Record<AnalysisLine, boolean>>(DEFAULT_UNLOCKED);
  const hasLoadedRef = useRef(false);
  const reqSeqRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const fetchLineDetails = useCallback(async (line: AnalysisLine): Promise<AnalysisDetails | undefined> => {
      return new Promise((resolve) => {
          setTimeout(() => {
              const fullRes = scanYearlyRisk(engine, year, { includeDetails: true });
              resolve(fullRes.find(r => r.line === line)?.details);
          }, 50);
      });
  }, [engine, year]);

  // 1. 初始化讀取 LocalStorage & 重置狀態
  // 負責所有的 Reset 與世代更新
  useEffect(() => {
    reqSeqRef.current += 1; // 世代 + 1

    let initialUnlocked = { ...DEFAULT_UNLOCKED };
    
    if (canUseStorage) {
      try {
        const stored = window.localStorage.getItem(lockStorageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            VALID_KEYS.forEach(key => {
                if (key in parsed) {
                    initialUnlocked[key] = !!parsed[key];
                }
            });
        }
      } catch (e) {
        // Fallback
      }
    }
    setUnlockedLines(initialUnlocked);
    initialUnlockedRef.current = initialUnlocked;
    
    // 重置狀態 (StrictMode 友好：這裡才是唯一 reset hasLoadedRef 的地方)
    hasLoadedRef.current = false;
    setLineLoading({}); 
    setViewData([]);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [lockStorageKey, canUseStorage, engine]); 

  // 2. 核心計算 Effect
  useEffect(() => {
     if (hasLoadedRef.current) return;

     const runAnalysis = () => {
        hasLoadedRef.current = true;
        
        const seq = reqSeqRef.current;
        
        timerRef.current = window.setTimeout(() => {
            // StrictMode 完美修正：只 Return，不操作 Ref
            // 世代變更的 Reset 權力完全交給 Init Effect
            if (seq !== reqSeqRef.current) return;

            // L0 掃描 (不含 Details)
            const rawResults = scanYearlyRisk(engine, year, { includeDetails: false });
            
            const initialView: AnalysisViewState[] = rawResults.map(res => ({
                line: res.line,
                status: res.status,
                isPrimary: res.isPrimary,
                summary: res.summary,
                details: undefined, 
            }));

            // 使用 Snapshot 進行 Hydrate
            const snapshot = initialUnlockedRef.current;
            // .some 優化
            const hasAnyUnlocked = initialView.some(v => snapshot[v.line]);
            
            if (hasAnyUnlocked) {
                // 補抓已解鎖的 Details
                const fullResults = scanYearlyRisk(engine, year, { includeDetails: true });
                initialView.forEach(v => {
                    if (snapshot[v.line]) {
                        const match = fullResults.find(r => r.line === v.line);
                        if (match) v.details = match.details;
                    }
                });
            }

            setViewData(initialView);
            timerRef.current = null;
        }, 600);
     };

     runAnalysis();
     
     return () => {
         if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
         }
     };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, year, lockStorageKey]);

  // 3. 解鎖動作
  const handleUnlockLine = async (line: AnalysisLine) => {
    const seq = reqSeqRef.current;

    // Optimistic Update
    setUnlockedLines(prev => {
        const next = { ...prev, [line]: true };
        if (canUseStorage) {
            window.localStorage.setItem(lockStorageKey, JSON.stringify(next));
        }
        return next;
    });

    initialUnlockedRef.current = { ...initialUnlockedRef.current, [line]: true };

    setLineLoading(prev => ({ ...prev, [line]: true }));

    try {
        const details = await fetchLineDetails(line);
        
        // Guard: 世代檢查
        if (seq !== reqSeqRef.current) return;

        if (details) {
            setViewData(prev => prev.map(item => {
                if (item.line === line) {
                    return { ...item, details };
                }
                return item;
            }));
        }
    } finally {
        if (seq === reqSeqRef.current) {
            setLineLoading(prev => ({ ...prev, [line]: false }));
        }
    }
  };

  if (viewData.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <AnnouncementCard />
        <div className="w-full h-32 flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100">
             <div className="flex items-center gap-2 text-slate-400 text-sm font-bold animate-pulse">
                <Loader2 className="animate-spin" size={18} /> 分析運勢結構中...
             </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-4 pb-20">
      <AnnouncementCard />

      <div className="space-y-4">
        {viewData.map((item) => {
          if (item.status === 'hidden') return null;

          const isUnlocked = unlockedLines[item.line] || false;
          const isLoading = lineLoading[item.line] || false;
          const showSummary = item.isPrimary || isUnlocked;

          const displayHeadline = showSummary 
            ? item.summary.headline 
            : '點擊解鎖查看此線年度提醒';

          return (
            <div
              key={item.line}
              className={`relative rounded-xl border transition-all duration-300 overflow-hidden ${
                item.isPrimary
                  ? 'bg-white border-purple-200 shadow-md ring-1 ring-purple-100'
                  : isUnlocked
                  ? 'bg-white border-gray-200 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Header */}
              <div className="flex justify-between items-start p-4 pb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold ${item.isPrimary ? 'text-purple-800' : 'text-slate-700'}`}>
                            {item.line}
                        </span>
                        {item.isPrimary && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                                <AlertCircle size={10} /> 年度重點
                            </span>
                        )}
                    </div>
                    <div className={`text-sm font-medium ${showSummary ? 'text-slate-600' : 'text-slate-400 italic'}`}>
                        {displayHeadline}
                    </div>
                </div>

                {!isUnlocked ? (
                  <Lock size={16} className="text-slate-400 mt-1" />
                ) : (
                   <Unlock size={16} className="text-green-500 mt-1" />
                )}
              </div>

              {/* Summary Bullets */}
              {showSummary && (
                 <div className="px-4 pb-3 animate-in fade-in duration-300">
                     <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.summary.bullets.map(tag => (
                            <span key={tag} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                {tag}
                            </span>
                        ))}
                     </div>
                 </div>
              )}

              {/* L1 Details */}
              {isUnlocked && item.details ? (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50/50">
                      {item.details.structure && item.details.structure.length > 0 && (
                          <div className="mb-3">
                              <div className="text-xs font-bold text-purple-700 mb-1">星曜結構</div>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                                  {item.details.structure.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                          </div>
                      )}
                       {item.details.reasoning && item.details.reasoning.length > 0 && (
                          <div className="mb-3">
                              <div className="text-xs font-bold text-purple-700 mb-1">判斷依據</div>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                                  {item.details.reasoning.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                          </div>
                      )}
                       {item.details.suggestions && item.details.suggestions.length > 0 && (
                          <div>
                              <div className="text-xs font-bold text-purple-700 mb-1">策略建議</div>
                              <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                                  {item.details.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                          </div>
                      )}
                  </div>
              ) : (
                  // Locked CTA
                  !isUnlocked && (
                      <div className="px-4 pb-4 pt-2">
                          <button
                            onClick={() => handleUnlockLine(item.line)}
                            disabled={isLoading}
                            className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all
                                ${item.isPrimary 
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100' 
                                    : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                                } disabled:opacity-70 disabled:cursor-not-allowed`}
                          >
                             {isLoading ? (
                                <Loader2 className="animate-spin" size={12} />
                             ) : (
                                <>
                                    {item.isPrimary ? '解鎖完整解析' : '解鎖此課題'} 
                                    <ChevronRight size={12} />
                                </>
                             )}
                          </button>
                      </div>
                  )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 公告元件
const AnnouncementCard = () => (
  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-lg p-3 flex gap-3 shadow-sm mb-2">
    <div className="text-xl shrink-0">🎉</div>
    <div className="flex-1 min-w-0 flex items-center">
      <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
        2026 公測中！AI 自動偵測年度最大課題。完整解析與人生策略，請預約大寶老師諮詢。
      </p>
    </div>
  </div>
);

const Loader2 = ({ className, size }: { className?: string; size?: number }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);