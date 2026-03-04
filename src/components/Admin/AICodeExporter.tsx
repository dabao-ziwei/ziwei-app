// FILE: src/components/Admin/AICodeExporter.tsx
import React, { useState } from 'react';
import { Loader2, Copy, CheckCircle, Bot, FileCode2 } from 'lucide-react';

export const AICodeExporter: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [outputCode, setOutputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const aiSystemPrompt = `
# 專案背景與雲端架構說明 (Project Context & Architecture)

這是一個名為「大寶紫微斗數 (Dabao Ziwei)」的全端 AI 命理、占卜與預約系統。
請扮演一位資深的全端工程師，協助我進行開發、架構設計與問題排解。

## ☁️ 雲端與技術架構 (Tech Stack)
- **前端 (Frontend)**: React 18 + TypeScript + Vite。
- **UI / 樣式**: Tailwind CSS + Framer Motion (動畫) + Recharts (圖表) + React Three Fiber/Drei (3D 擲筊)。
- **後端與資料庫 (Backend & BaaS)**: Supabase (PostgreSQL 關聯式資料庫 + Auth 身分驗證)。
- **無伺服器函式 (Serverless)**: Supabase Edge Functions (Deno) - 主要用於處理第三方 API 串接與機密運算（例如：綠界金流 ECPay）。
- **部署環境 (Hosting)**: 前端架設於 Vercel，後端依賴 Supabase。
- **開發環境**: 雲端 StackBlitz (WebContainers) + GitHub。

## 📝 AI 協作嚴格規範 (Rules for AI)
1. 語言：請一律使用 **繁體中文** 與我對話。
2. 流程：除非我特別要求，否則請**先與我討論作法與邏輯**，確認沒問題且我下達「動工」指令後，再給出程式碼。
3. 程式碼交付：當提供修改後的程式碼時，請**務必提供該檔案的「完整」原始碼**。絕對不要只給 Diff (差異對比)，也絕對不要用省略號 (// ...existing code...) 帶過，以確保我可以一鍵全選複製覆蓋，避免貼錯位置。

以下是本專案最新的目錄結構與完整的原始碼，請基於這些內容與我協作：
`;

  // 產生純文字的目錄樹狀結構
  const generateTree = (paths: string[]) => {
    const tree: any = {};
    paths.forEach(path => {
      const parts = path.replace(/^\//, '').split('/');
      let current = tree;
      parts.forEach(part => {
        if (!current[part]) current[part] = {};
        current = current[part];
      });
    });

    let result = '';
    const drawTree = (node: any, prefix = '') => {
      const keys = Object.keys(node);
      keys.forEach((key, index) => {
        const isLast = index === keys.length - 1;
        result += `${prefix}${isLast ? '└── ' : '├── '}${key}\n`;
        if (Object.keys(node[key]).length > 0) {
          drawTree(node[key], prefix + (isLast ? '    ' : '│   '));
        }
      });
    };
    drawTree(tree);
    return result;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // 透過 Vite 特性，動態將專案檔案作為字串載入 (排除 node_modules)
      const files = import.meta.glob([
        '/src/**/*.{ts,tsx,css}',
        '/package.json',
        '/tsconfig*.json',
        '/vite.config.ts',
        '/tailwind.config.js',
        '/postcss.config.js',
        '/eslint.config.js',
        '/index.html',
        '/vercel.json'
      ], { query: '?raw', import: 'default' });

      const paths = Object.keys(files).sort();
      
      let resultText = aiSystemPrompt;
      resultText += `\n================================================\n專案目錄結構 (Directory Tree):\n================================================\n`;
      resultText += generateTree(paths);

      // 依序讀取並附加內容
      for (const path of paths) {
        const content = await files[path]() as string;
        const cleanPath = path.replace(/^\//, ''); // 移除最前面的斜線
        resultText += `\n\n================================================\nFILE: ${cleanPath}\n================================================\n${content}`;
      }

      setOutputCode(resultText);
    } catch (err) {
      console.error("生成原始碼失敗:", err);
      alert('生成失敗，請查看瀏覽器 Console');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!outputCode) return;
    navigator.clipboard.writeText(outputCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      alert("複製失敗，請手動全選文字框內容");
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Bot className="text-blue-600" /> AI 協作匯出中樞
            </h2>
            <p className="text-sm text-gray-500 mt-1">一鍵將全站程式碼與架構打包，直接貼給 AI 進行結對開發。</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
             <button 
                onClick={handleGenerate} 
                disabled={isGenerating} 
                className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-blue-200 text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
             >
                 {isGenerating ? <Loader2 className="animate-spin" size={18}/> : <FileCode2 size={18}/>}
                 {isGenerating ? '載入中...' : '1. 載入最新原始碼'}
             </button>
             <button 
                onClick={handleCopy} 
                disabled={!outputCode} 
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                    !outputCode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                    copied ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                }`}
             >
                 {copied ? <CheckCircle size={18}/> : <Copy size={18}/>}
                 {copied ? '已複製！' : '2. 一鍵複製'}
             </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-0 overflow-hidden relative bg-slate-900 group">
            {outputCode ? (
                <textarea 
                    value={outputCode} 
                    readOnly 
                    className="w-full h-full bg-transparent text-emerald-400 font-mono text-xs sm:text-sm p-6 outline-none resize-none selection:bg-emerald-700 selection:text-white"
                    placeholder="載入的原始碼會顯示在這裡..."
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <Bot size={48} className="opacity-20" />
                    <p className="text-sm font-mono">請點擊上方「載入最新原始碼」按鈕</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};