// FILE: src/components/Chart/YearlyAnalysisBoard.tsx

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { scanYearlyRisk } from '../../logic/analysis/riskScanner';
import { generateAnalysisContent } from '../../logic/analysis/contentGenerator';
import type { AnalysisViewState } from '../../logic/analysis/types';
import type { ZiWeiEngine } from '../../logic/engine';

interface Props {
  engine: ZiWeiEngine;
  year: number;
  userId: string;
  chartId: string;
}

export const YearlyAnalysisBoard: React.FC<Props> = ({ engine, year, userId, chartId }) => {
  const [viewData, setViewData] = useState<AnalysisViewState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- localStorage 安全封裝 ---
  const canUseStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  // lockKey 改用 useMemo：避免不必要的重新計算，並確保 year 切換時 key 精準變動
  const lockKey = useMemo(() => `unlock_${userId}_${chartId}_${year}`, [userId, chartId, year]);

  // 解鎖狀態初始化（SSR / 特殊環境不讀 localStorage）
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (!canUseStorage) return false;
    return window.localStorage.getItem(lockKey) === 'true';
  });

  // setTimeout 清理：避免 unmount / StrictMode 重複觸發造成 setState 衝突
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // 年度或 key 切換：同步解鎖狀態並重置顯示
    setIsUnlocked(canUseStorage ? window.localStorage.getItem(lockKey) === 'true' : false);
    setViewData([]);

    // 切換時順手清掉還在跑的 timer
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockKey, canUseStorage]);

  useEffect(() => {
    // Unmount 清理
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleRunAnalysis = () => {
    // 防止連點或 StrictMode 重入造成多個 timer 同時跑
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setIsProcessing(true);

    timerRef.current = window.setTimeout(() => {
      const rawResults = scanYearlyRisk(engine, year);

      // 先轉成 view model（先不鎖，等等再套用「第一條可見永遠不鎖」）
      const initial: AnalysisViewState[] = rawResults.map((res) => ({
        line: res.line,
        isLocked: false,
        tags: res.riskTags,
        content: generateAnalysisContent(res),
        status: res.status,
      }));

      // 鎖定策略微調：
      // 找到第一個「可見」項目（status !== 'hidden'），它永遠不鎖；其餘可見項目才依解鎖狀態套用鎖
      const firstVisibleIdx = initial.findIndex((it) => it.status !== 'hidden');

      const formatted = initial.map((it, idx) => {
        if (it.status === 'hidden') return it; // 隱藏項不需要鎖定判斷
        if (idx === firstVisibleIdx) return { ...it, isLocked: false };
        return { ...it, isLocked: !isUnlocked };
      });

      setViewData(formatted);
      setIsProcessing(false);

      timerRef.current = null;
    }, 800);
  };

  const handleUnlock = () => {
    if (canUseStorage) {
      window.localStorage.setItem(lockKey, 'true');
    }
    setIsUnlocked(true);
    // 重新跑一次，讓鎖定狀態立刻反映
    handleRunAnalysis();
  };

  if (viewData.length === 0) {
    return (
      <button
        onClick={handleRunAnalysis}
        disabled={isProcessing}
        className="w-full mt-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:brightness-110 transition-all text-white no-screenshot disabled:opacity-80"
      >
        {isProcessing ? (
          <>
            <Loader2 className="animate-spin" size={18} /> 推算中...
          </>
        ) : (
          <>
            <Sparkles size={18} /> 生成年度運勢課題分析
          </>
        )}
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {viewData.map(
        (item) =>
          item.status !== 'hidden' && (
            <div
              key={item.line}
              className={`relative p-4 rounded-xl border ${
                item.isLocked ? 'bg-slate-50 border-slate-200' : 'bg-white border-purple-100 shadow-sm'
              } overflow-hidden transition-all`}
            >
              <div className="flex justify-between items-center mb-2">
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    item.isLocked ? 'bg-slate-200 text-slate-500' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {item.line}
                </span>
                {item.isLocked && <Lock size={14} className="text-slate-400" />}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-[11px] font-medium text-slate-600">
                    # {tag}
                  </span>
                ))}
              </div>

              <div
                className={`text-sm leading-relaxed text-slate-700 ${
                  item.isLocked ? 'blur-md select-none opacity-40' : 'animate-in fade-in duration-500'
                }`}
              >
                {item.content}
              </div>

              {item.isLocked && (
                <div className="absolute inset-0 flex items-center justify-center pt-8">
                  <button
                    onClick={handleUnlock}
                    className="px-4 py-1.5 bg-white border border-purple-300 text-purple-700 text-xs font-bold rounded-full shadow-md hover:bg-purple-50 transition-colors flex items-center gap-1"
                  >
                    解鎖完整分析
                  </button>
                </div>
              )}
            </div>
          )
      )}
    </div>
  );
};

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
