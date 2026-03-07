// FILE: src/components/Admin/AICodeExporter.tsx
import React, { useState, useEffect } from 'react';
import { Copy, Loader2, Database, Code, CheckCircle, Sparkles, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../supabase';

export const AICodeExporter: React.FC = () => {
    // 狀態管理：驗證解鎖
    const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
        return sessionStorage.getItem('ai_exporter_unlocked') === 'true';
    });
    const [otpCode, setOtpCode] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [authMessage, setAuthMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // 狀態管理：匯出選項與內容
    const [includeDB, setIncludeDB] = useState(true);
    const [includeCode, setIncludeCode] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [exportText, setExportText] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // 處理倒數計時
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    // 寄送安全碼
    const handleSendOtp = async () => {
        setIsSending(true);
        setAuthMessage(null);
        try {
            const { data, error } = await supabase.functions.invoke('send-admin-otp');
            if (error) throw new Error('API 呼叫失敗，請檢查 Edge Function 狀態或金鑰設定');
            if (data?.error) throw new Error(data.error);

            setAuthMessage({ type: 'success', text: '安全碼已發送至 stephenwu.0926@gmail.com，有效時間 5 分鐘。' });
            setCooldown(60); // 60秒冷卻
        } catch (err: any) {
            console.error("OTP 發送失敗:", err);
            setAuthMessage({ type: 'error', text: err.message || '發送失敗，請稍後再試。' });
        } finally {
            setIsSending(false);
        }
    };

    // 驗證安全碼
    const handleVerifyOtp = async () => {
        if (otpCode.length !== 6) {
            setAuthMessage({ type: 'error', text: '請輸入 6 碼數字安全碼。' });
            return;
        }

        setIsVerifying(true);
        setAuthMessage(null);
        try {
            const { data: isValid, error } = await supabase.rpc('verify_admin_otp', { p_code: otpCode });
            
            if (error) throw error;

            if (isValid) {
                sessionStorage.setItem('ai_exporter_unlocked', 'true');
                setIsUnlocked(true);
            } else {
                setAuthMessage({ type: 'error', text: '驗證碼錯誤或已過期。' });
            }
        } catch (err: any) {
            setAuthMessage({ type: 'error', text: '驗證過程發生錯誤。' });
        } finally {
            setIsVerifying(false);
        }
    };

    // 預設的 AI 提示詞 (固定不變的部分)
    const SYSTEM_PROMPT_HEAD = `
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
`;

    const generateExportContent = async () => {
        if (!includeDB && !includeCode) {
            alert('請至少選擇一種匯出內容！');
            return;
        }

        setIsGenerating(true);
        try {
            let finalOutput = SYSTEM_PROMPT_HEAD.trim() + '\n\n';

            // 動態產生提示詞結尾
            let introText = "以下是本專案最新的";
            const parts = [];
            if (includeDB) parts.push("資料庫結構");
            if (includeCode) parts.push("完整的原始碼");
            introText += parts.join("與") + "，請基於這些內容與我協作：\n\n";
            
            finalOutput += introText;

            // ==========================================
            // 1. 取得資料庫結構與範例資料 (若有勾選)
            // ==========================================
            if (includeDB) {
                finalOutput += '================================================\n';
                finalOutput += 'DATABASE SCHEMA & SAMPLE DATA (Supabase)\n';
                finalOutput += '================================================\n';
                
                const { data: dbSchema, error } = await supabase.rpc('get_db_schema_export');
                
                if (error) {
                    finalOutput += `[無法取得資料庫結構: ${error.message}]\n\n`;
                } else if (dbSchema && Array.isArray(dbSchema)) {
                    dbSchema.forEach((table: any) => {
                        finalOutput += `\n[ TABLE: ${table.table_name} ]\n`;
                        finalOutput += `- 欄位結構:\n`;
                        table.columns.forEach((col: any) => {
                            finalOutput += `  * ${col.column_name} (${col.data_type})\n`;
                        });
                        finalOutput += `- 第一筆假資料範例 (Sample):\n`;
                        finalOutput += `  ${JSON.stringify(table.sample_data, null, 2).replace(/\n/g, '\n  ')}\n`;
                    });
                    finalOutput += '\n';
                }
            }

            // ==========================================
            // 2. 取得前端原始碼 (若有勾選)
            // ==========================================
            if (includeCode) {
                finalOutput += '================================================\n';
                finalOutput += 'SOURCE CODE FILES\n';
                finalOutput += '================================================\n';

                const modules = import.meta.glob([
                    '/src/**/*.{ts,tsx,css}',
                    '/package.json',
                    '/vite.config.ts',
                    '/index.html',
                    '/tailwind.config.js'
                ], { query: '?raw', import: 'default', eager: true });

                const filePaths = Object.keys(modules).sort();

                filePaths.forEach((path) => {
                    const content = modules[path] as string;
                    if (path.includes('vite-env.d.ts') || path.includes('supabase.ts')) {
                        return; 
                    }
                    finalOutput += `\n================================================\n`;
                    finalOutput += `FILE: ${path.replace('/', '')}\n`;
                    finalOutput += `================================================\n`;
                    finalOutput += `${content}\n`;
                });
            }

            setExportText(finalOutput);

        } catch (err) {
            console.error("Export Failed:", err);
            alert("生成匯出文字失敗，請檢查 Console");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (!exportText) return;
        navigator.clipboard.writeText(exportText).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 3000);
        }).catch(err => {
            alert('複製失敗，請手動全選複製。');
        });
    };

    // 🔒 鎖定畫面 (未解鎖時顯示)
    if (!isUnlocked) {
        return (
            <div className="p-6 max-w-2xl mx-auto h-full flex flex-col items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center w-full max-w-md">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">核心系統保護</h2>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                        「AI 協作匯出中心」包含完整的商業邏輯與資料庫結構。為了保護您的資產，請先進行安全碼驗證。
                    </p>

                    <div className="space-y-4">
                        {authMessage && (
                            <div className={`p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in ${authMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                {authMessage.text}
                            </div>
                        )}

                        {cooldown === 0 ? (
                            <button 
                                onClick={handleSendOtp}
                                disabled={isSending}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isSending ? <Loader2 className="animate-spin" size={18}/> : <Mail size={18}/>}
                                寄送驗證碼至信箱
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    placeholder="輸入 6 碼數字"
                                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    value={otpCode}
                                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                />
                                <button 
                                    onClick={handleVerifyOtp}
                                    disabled={isVerifying || otpCode.length !== 6}
                                    className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isVerifying ? <Loader2 className="animate-spin" size={18}/> : <ArrowRight size={20}/>}
                                </button>
                            </div>
                        )}

                        {cooldown > 0 && (
                            <p className="text-xs text-gray-400 font-mono">
                                請前往 stephenwu.0926@gmail.com 收信。<br/>
                                重新發送等待：{cooldown} 秒
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 🔓 解鎖後的匯出畫面
    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto h-full flex flex-col animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col gap-4 mb-6 shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 tracking-wider">安全驗證已通過</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Code className="text-emerald-600" /> AI 協作匯出中心
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        自訂打包系統提示詞、資料庫 Schema 與前端原始碼，方便快速餵給 AI 進行開發協作。
                    </p>
                </div>
                
                {/* 匯出選項控制面板 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setIncludeDB(!includeDB)}
                            className={`px-4 py-2 rounded-lg border text-sm font-bold flex items-center gap-2 transition-all ${
                                includeDB ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            <Database size={16} /> {includeDB ? '✔️ 匯出資料庫 (DB Schema)' : '❌ 不含資料庫'}
                        </button>
                        <button
                            onClick={() => setIncludeCode(!includeCode)}
                            className={`px-4 py-2 rounded-lg border text-sm font-bold flex items-center gap-2 transition-all ${
                                includeCode ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                            }`}
                        >
                            <Code size={16} /> {includeCode ? '✔️ 匯出原始碼 (Source Code)' : '❌ 不含原始碼'}
                        </button>
                    </div>
                    
                    <button
                        onClick={generateExportContent}
                        disabled={isGenerating || (!includeDB && !includeCode)}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all disabled:opacity-50 whitespace-nowrap w-full sm:w-auto"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        {isGenerating ? '資料搜集中...' : '產生超級提示詞 (Prompt)'}
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
                {/* 複製按鈕懸浮列 */}
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                        {exportText ? (
                            <>
                                {includeDB && <><Database size={16} className="hidden sm:block" /> <span className="hidden sm:inline">包含 DB Schema</span></>}
                                {includeDB && includeCode && <span className="text-gray-300 hidden sm:inline">|</span>}
                                {includeCode && <><Code size={16} /> 包含原始碼</>}
                            </>
                        ) : (
                            <span className="text-gray-400 font-normal text-xs">尚未產生內容</span>
                        )}
                    </div>
                    <button
                        onClick={handleCopy}
                        disabled={!exportText}
                        className={`px-4 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                            !exportText ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                            isCopied ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                    >
                        {isCopied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        {isCopied ? '已複製到剪貼簿' : '一鍵複製全部'}
                    </button>
                </div>

                {/* 文字顯示區 */}
                <textarea
                    className="flex-1 w-full p-4 sm:p-6 text-sm font-mono text-gray-700 bg-slate-900/5 resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-emerald-500/50"
                    readOnly
                    value={exportText}
                    placeholder="請點擊上方「產生超級提示詞」按鈕..."
                />
            </div>
        </div>
    );
};