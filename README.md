# 大寶紫微斗數 (Dabao Ziwei) - AI 智能命理分析系統

本專案為全端（Frontend + BaaS）建構之紫微斗數命理、占卜、預約與會員訂閱系統。
專為命理師營運所設計，結合專業排盤演算法、流年運勢分析、3D 互動占卜及全自動線上預約功能。

## 🛠 技術棧 (Tech Stack)
* **前端框架**: React 18 + TypeScript + Vite
* **樣式與 UI**: Tailwind CSS + Framer Motion (動畫) + Recharts (圖表) + Lucide React (圖示)
* **3D 渲染 (占卜)**: Three.js + React Three Fiber + React Three Drei
* **後端與資料庫**: Supabase (PostgreSQL + Auth + Edge Functions)
* **曆法引擎**: lunar-typescript
* **截圖分享**: html-to-image

---

## 📂 核心架構與檔案對照表 (File Structure & Routing)

想要修改或擴充功能時，請參考以下對照表尋找對應的檔案：

### 1. 系統進入點與全局設定 (Root & Config)
* `src/main.tsx`: 程式進入點，負責綁定 React DOM 與 PWA Service Worker (離線與更新機制)。
* `src/App.tsx`: **全站路由中樞 (Router)**。管理「公開頁面(預約/占卜/法規)」與「保護頁面(須登入)」，並控制全域攔截器(如強制建立本命盤 `RequireMeChart`)。
* `src/db.ts`: **資料庫 API 中樞**。所有對 Supabase 的查詢、寫入、刪除 (會員、命盤、預約、商店、占卜矩陣) 皆在此檔案，是前後端溝通的唯一橋樑。
* `src/supabase.ts`: Supabase 連線初始化設定 (讀取 `.env`)。
* `src/config.ts`: 系統全域變數 (APP_CONFIG)，如網站名稱、品牌字樣等。
* `src/index.css` & `src/App.css`: 全域 CSS，負責隱藏滾動條、設定字體與鎖定畫面捲動。
* `tailwind.config.js`: Tailwind 設定，包含自訂顏色 (本命`ben`、大限`da`、流年`liu`、小限`xiao`)。
* `vite.config.ts`: Vite 打包設定，包含 PWA 的 Manifest (App icon、名稱) 與快取容量設定。

---

### 2. 命理演算法核心 (src/logic/)
**⚠️ 修改排盤邏輯、星曜亮度、分數計算，請找這裡！**
* `engine.ts`: **絕對核心！排盤引擎**。負責農民曆轉換、定命宮、安星訣、算四化、起大限流年小限，並產出 `ChartData`。
* `constants.ts`: 命理常數。包含天干地支、五行局、星曜簡稱、亮度表、六線定義(命遷線等)。
* `types.ts`: 命理引擎的 TypeScript 型別定義 (Star, Palace, ChartData 等)。
* `fortune.ts`: **運勢計分器**。負責根據 `engine.ts` 的星曜配置，算出每日/每週運勢分數 (工作、理財、感情等)，並產出提示文案。
* `permissions.ts`: **權限控制系統**。定義功能開關 (Feature Flags)，判斷使用者(一般、VIP、同業、管理員)是否能看到雙胞胎、顛倒盤等功能。
* `advice/yearAdvice.ts`: 流年/年度建議的分析掃描演算法。
* `analysis/riskScanner.ts` & `contentGenerator.ts`: 針對年度高風險宮位進行掃描並組合文案。

---

### 3. 主要頁面 (src/pages/)
* `Dashboard.tsx`: **登入後首頁**。顯示歡迎精靈、會員專屬禮、以及個人的每日/一週運勢儀表板 (FortuneWidget)。
* `ClientList.tsx`: **命盤列表頁**。管理所有客戶命盤，包含搜尋、過濾(最愛/性別/主星)、分類折疊，以及管理員專屬的「只看我的」與「資料修復」工具。
* `BookingPage.tsx`: **前台線上預約系統**。3 步驟免登入預約 (選服務 -> 選時段 -> 填資料)，內建急件雙倍計算、早鳥優惠、防佔位提醒與 LINE 跳轉。
* `StorePage.tsx`: **訂閱方案中心**。展示虛擬商品(天數)、VIP 到期日，與購買引導。
* `LuckyPage.tsx`: **吉凶占卜入口**。檢查使用者是否有免費次數或 VIP 權限，若通過則啟動 `LuckyDivinationGame`。
* `CompatibilitySetup.tsx`: 雙人合盤的選擇對象頁面 (從關係網或搜尋庫挑選)。
* `SystemAdmin.tsx`: **管理員後台入口**。負責切換各個子後台面板。
* `LegalPage.tsx`: 服務條款與隱私權政策 (LINE Messaging API 審核與金流必備)。

---

### 4. 命盤繪製與圖表組件 (src/components/Chart/)
**⚠️ 修改排盤畫面、宮位長相、雙人合盤，請找這裡！**
* `PalaceGrid.tsx`: 12宮位的外框網格 (Grid) 佈局，控制飛化連線 (SVG Line) 與宮位高亮動畫。
* `SingleChart.tsx`: 單人排盤主畫面。整合 `PalaceGrid` 與中央資訊板，處理大限/流年切換、截圖下載、飛化觸發。
* `DualChart.tsx`: 雙人合盤主畫面。並排顯示兩個 `PalaceGrid`，內建「時間鎖定」同步切換功能。
* `PalaceCard.tsx`: **單一宮位卡片**。渲染該宮位的星曜、亮度、干支、四化(紅藍綠黑標籤)、大限/流年標籤與指南針方位。
* `YearlyAnalysisBoard.tsx` & `YearlyAnalysisDrawer.tsx`: 流年運勢分析的抽屜滑出介面與內容渲染。

---

### 5. 核心互動組件 (src/components/)
* `CenterInfoBoard.tsx`: 命盤**正中央的資訊板**。顯示命主基本資料、大限流年操作按鈕、功能切換(顛倒盤/雙胞胎)，以及**星狀人際關係圖 (RelationshipGraph)**。
* `FortuneWidget.tsx`: 首頁的運勢儀表板，整合果凍管動畫 (`JellyBarChart`)、折線圖，並負責產出「運勢分享圖 (SharePreviewModal)」。
* `LuckyDivinationGame.tsx`: **3D 吉凶占卜核心**。包含深呼吸引導、氣泡選數、3D 擲筊動畫 (`JiaoBlock3D`) 與動態結果卡片產生。
* `Auth.tsx` & `UpdatePassword.tsx`: 登入、註冊、忘記密碼與重設密碼介面。
* `AddChartModal.tsx`: 新增/編輯命盤表單 (包含西元轉農曆、自動計算時辰)。
* `RelationshipModal.tsx` & `RelationshipGraph.tsx`: 人際關係網的管理(增刪)與視覺化連線呈現。
* `RequireMeChart.tsx`: 路由守衛，確保新帳號必須先完成「自己的命盤」建立 (OnboardingWizard) 才能進入系統。
* `ParallelTrendCharts.tsx` & `FocusTrendChart.tsx`: 首頁一週運勢的折線圖與漸層面積圖組件。
* `TagSelect.tsx` / `DateInput.tsx`: 共用之基礎表單組件。

---

### 6. 後台管理組件 (src/components/Admin/)
* `BookingManagement.tsx`: **預約系統後台**。包含三大分頁：
    1. **行程設定**：月曆休假、自訂營業時間、插入私人保留時段。
    2. **訂單總覽**：未來預約(含逾時紅單警示與狀態切換) + 歷史與黑名單查詢(放鳥次數過濾)。
    3. **規則設定**：設定預約項目、價格、早鳥規則、防呆保留時間。
* `ProductManagement.tsx`: **商店與金流後台**。管理訂閱方案(新增/修改/上下架)、檢視銷售統計、匯出 Excel(CSV) 報表。
* `UserManagementModal.tsx` (在 `src/components/` 下): **會員管理後台**。列表顯示會員，可切換角色(同業/學員)、封鎖、批次展延權限、批次增加盤數、檢視歷史交易紀錄。
* `FeatureConfigPanel.tsx`: **功能開關總控**。設定特定功能是否收費、收費點數及促銷公告。
* `DivinationAdminPanel.tsx` (在 `src/components/` 下): **占卜文案矩陣後台**。視覺化 12地支 x 10天干 的點選格，用於編輯吉凶占卜的文案與判定，並支援本機與雲端同步。

---

## 🚀 常用開發指引 (Quick Guide)

1. **要修改「命盤排出來的星曜不對」**：
   👉 去 `src/logic/engine.ts` 修改安星邏輯。
2. **要修改「預約成功後跳轉 LINE 的罐頭訊息」**：
   👉 去 `src/pages/BookingPage.tsx` 搜尋 `rawLineText`。
3. **要修改「首頁吉凶占卜的次數限制或付費邏輯」**：
   👉 去 `src/db.ts` 找 `consumeDivinationV2` 函數。
4. **要修改「各種權限(學員/同業)能不能看到什麼按鈕」**：
   👉 去 `src/logic/permissions.ts` 調整 `getFeaturePermission` 規則。
5. **要擴充「新的服務條款或隱私權」**：
   👉 去 `src/pages/LegalPage.tsx` 直接修改文字。