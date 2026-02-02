// FILE: src/components/Chart/YearlyAnalysisDrawer.tsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { YearAdvicePanel } from './YearAdvicePanel';
import type { YearAdviceResult, YearAdviceRule } from '../../logic/types';

type YearlyAnalysisDrawerProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  adviceResult?: YearAdviceResult;
  adviceRules?: YearAdviceRule[];
};

export const YearlyAnalysisDrawer: React.FC<YearlyAnalysisDrawerProps> = ({
  open,
  title = '年度分析',
  onClose,
  children,
  adviceResult,
  adviceRules
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed top-0 right-0 z-[210] h-[100dvh] w-[480px] max-w-[92vw] bg-white shadow-2xl border-l border-gray-200 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="h-[56px] shrink-0 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="font-bold text-gray-800">{title}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700 leading-relaxed">
            <p className="font-bold mb-1">💡 提示</p>
            這裡是年度建議。你可以點命盤下方的年份列，切換查看近三年＋今年（例如 2023–2026）的建議。
          </div>
          <div>{children}</div>
          {adviceResult && adviceRules && (
             <div className="border-t border-gray-100 pt-6 animate-in slide-in-from-bottom-4 duration-500">
                 <YearAdvicePanel result={adviceResult} rules={adviceRules} />
             </div>
          )}
        </div>
      </div>
    </>
  );
};