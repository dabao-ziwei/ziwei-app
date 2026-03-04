import fs from 'fs';
import path from 'path';

// 定義要掃描的目錄
const dirToRead = './src'; 

// ==========================================
// 1. 給 AI 讀的「系統提示詞與架構說明」
// ==========================================
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

let output = aiSystemPrompt;

// ==========================================
// 2. 自動產生目錄樹結構 (Tree)
// ==========================================
function generateTree(dir, prefix = '') {
  let tree = '';
  const files = fs.readdirSync(dir);
  const filteredFiles = files.filter(f => !['node_modules', '.git', 'dist', '.swc'].includes(f));
  
  filteredFiles.forEach((file, index) => {
    const isLast = index === filteredFiles.length - 1;
    const fullPath = path.join(dir, file);
    tree += `${prefix}${isLast ? '└── ' : '├── '}${file}\n`;
    if (fs.statSync(fullPath).isDirectory()) {
      tree += generateTree(fullPath, prefix + (isLast ? '    ' : '│   '));
    }
  });
  return tree;
}

try {
  output += `\n================================================\n專案目錄結構 (Directory Tree):\n================================================\n`;
  output += generateTree('./');
  
// ==========================================
// 3. 讀取並合併檔案內容
// ==========================================
  function readFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        readFiles(fullPath);
      } else if (/\.(ts|tsx|css|json|html)$/.test(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        output += `\n\n================================================\nFILE: ${fullPath}\n================================================\n${content}`;
      }
    }
  }

  readFiles(dirToRead);
  
  // 加上根目錄的重要設定檔
  const rootFiles = ['package.json', 'vite.config.ts', 'tailwind.config.js', 'vercel.json'];
  rootFiles.forEach(file => {
      if(fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          output += `\n\n================================================\nFILE: ${file}\n================================================\n${content}`;
      }
  });

  fs.writeFileSync('my-code.txt', output);
  console.log('✅ 打包成功！包含架構說明與 AI Prompt 的 my-code.txt 已生成。');
} catch (err) {
  console.error('打包失敗:', err);
}