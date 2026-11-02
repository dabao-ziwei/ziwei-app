# 管理者核發臨時密碼

2026-11-02 經使用者確認後，已備份並套用正式資料庫 migration，Vercel Production／Preview 已設定前後端啟用旗標。程式仍需合併本 PR 才會部署到正式站；不得重複執行 migration。沒有重設任何真實帳號密碼。

正式驗證：158 個 profiles、693 個 clients、161 個 relationships 前後一致；16 條 restrictive session policies、14 個既有 RPC 守衛，私有狀態／轉換 RPC 不開放一般會員，狀態與稽核列皆為 0。`user_statistics` 保持 security_invoker。備份在 Git 外的 `backups/temporary-password-20261102`，含規則 CSV、snapshot.json、restore.sql；不含會員資料列。已用正式備份中的 14 個函式在隔離 PostgreSQL 演練 migration→rollback，函式定義與原 RLS 狀態恢復一致。

## 使用流程

1. 擁有者在使用者管理內確認本人提出申請，按「產生隨機臨時密碼」，核對 Email 後確認。
2. 伺服器產生強隨機密碼，立即替換原密碼；只在這次回應顯示，管理者私下交給本人。不寄信、不保存明文、不寫入瀏覽器儲存空間。
3. 24 小時內登入，僅能設定自己的新密碼（12–128 字元，含英文、數字；不可與臨時密碼相同）。不能使用會員畫面／命盤資料。
4. 成功後清除私有臨時密碼雜湊，要求重新登入；舊 session 即使刷新 JWT 仍不得存取受保護資料。
5. 過期需由擁有者重新核發。同一帳號一分鐘內不能重發；處理中租約兩分鐘內也不能重發。

固定擁有者 UID 與現有權限一致，不可對擁有者核發。信箱未驗證、Auth 停權者不得核發。不更動角色、額度、到期日、命盤或原本忘記密碼流程。

## 啟用順序（本專案已套用，以下供追溯／其他環境使用）

1. 優先建立獨立 Supabase 測試專案，檢查目前所有 public 表、view、RPC 和外部 API。此功能不是全站安全稽核；既有匿名可讀資料、舊 definer view、非 PL/pgSQL RPC／外部服務等不應被誤認為已全面封鎖。若有額外的會員資料通路，先補上相同 session gate 才啟用。
2. 更新前執行 `supabase/operations/backup_temporary_password.sql`（唯讀），將 `restore_sql` 儲存在 Git 外並在測試資料庫演練回復；另保留完整 schema 備份。也可匯出 pg_class／pg_policies／pg_get_functiondef 的 JSON snapshot CSV，搭配 `scripts/prepare-password-reset-backup.mjs` 產生私有回復檔，舊格式須傳入現場核對過的 view 名稱。舊的 `backup_member_chart_rls.sql` 是初次 RLS 專用，不能拿來備份目前規則。
3. 套用 `supabase/migrations/202611010001_temporary_password.sql`。單一 transaction，不修改既有客戶列。私有狀態／稽核表不開放 anon、authenticated；只有後端 service_role 可寫。
4. 後端設定 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`TEMP_PASSWORD_RESET_ENABLED=true`。service-role key 絕不可使用 `VITE_` 前綴，也不能以 anon key 代替。Vercel `/api/temporary-password` 是 Node API。
5. 前端設定 `VITE_TEMP_PASSWORD_RESET_ENABLED=true` 並重新建置／部署；須同時部署 API。未啟用時後台顯示尚未設定，不會讓原會員無故卡在不存在的 RPC。此旗標只控制 UI，不能繞過資料庫限制。
6. 以專用測試帳號驗證擁有者核發、一般會員拒絕、完整換密碼／重新登入、過期、重新核發、舊裝置 session、Email recovery 與錯誤回復。不可拿客戶帳號做測試。

本機 `npm run dev` 已包含同路徑 API adapter；在 `.env.local` 設以上環境變數，連到獨立測試 Supabase，重啟 Vite 後測試。不能只打開前端旗標卻不套用資料庫。不可在尚未授權時把本機指向正式資料庫核發密碼。

## 資料庫影響

- 對 public 應用表增加 restrictive session policy；原先已開 RLS 的政策保留。原先未開 RLS 的表啟用 RLS，補上原 grant-based 存取的 permissive policy，再加 session gate。正常會員／訪客原先可用的表權限不改；撤銷 anon／authenticated／PUBLIC 的 TRUNCATE，避免繞過 RLS。
- 對既有 public PL/pgSQL SECURITY DEFINER 非 trigger RPC 加入口守衛，僅拒絕有待重設／舊 session 的登入者；原業務計算不變，匿名 guest 呼叫仍沿用原規則。正式套用前必須核對實際函式清單。
- 無狀態列的會員保持原存取；待處理帳號拒絕存取；完成後比對 `auth.sessions.created_at` 與伺服器截止時間，不信任可自行修改的 user_metadata，也不靠 localStorage。
- 稽核記錄目標 UUID、reset UUID、動作、時間；不含明文密碼或 token。核發者記於私有狀態列。

## 失敗與回復

Auth 密碼更新與 PostgreSQL 不是跨服務原子交易。流程先上鎖資料，再變更 Auth，最後更新狀態；中途失敗寧可保持封鎖，不能自動放行。

- 核發回應失敗／遺失：不能查回密碼，等待一至兩分鐘後重新核發。
- 新密碼被 Auth 拒絕：回到 required，使用者可修改後重試。
- Auth 已成功但最後資料庫寫入失敗：維持 changing／issuing，擁有者待兩分鐘租約到期後重新核發；不宣稱舊密碼仍有效。
- 完成後嘗試 global signOut 撤銷 refresh tokens；若服務失敗，舊 session 仍因 DB 截止時間被拒絕，前端仍登出。不存在「撤銷 JWT 後立即全世界失效」的假設。
- 回復政策會移除強制限制，必須先確認沒有待重設帳號並取得授權，不能直接關 RLS。回復不會恢復已被替換的 Auth 密碼；保留私有狀態、稽核資料供追查，不刪除。需要正式備份才能準確恢復原政策／RPC／TRUNCATE grants。

## 自動測試

`node --experimental-strip-types --test tests/*.test.mjs`

PGlite 執行真實 SQL：狀態保護、RLS、RPC、舊 session、重新登入、到期、併發鎖、訪客不變。API 以注入假 Auth 測試授權、核發、強密碼、相同密碼、失敗狀態；沒有對正式 Auth 寫入。另執行 `npm run build`。這些測試不取代實際 Supabase Auth 整合驗證。

2026-11-01 本機驗證：53 項自動測試通過、production build 通過、Vite Node 設定型別檢查通過、備份 SQL 產生後可在隔離資料庫成功回復。App 全量 `tsc` 則被既有 Vite／vite-plugin-pwa 的 client.d.ts 解析錯誤（TS6053）擋住，未宣稱全量型別檢查通過。本機 `/admin` HTTP 200；未設定 API 回傳 no-store 503，沒有執行真實核發。
