# 會員／命盤 RLS 部署

## 範圍與實際查核（2026-10-11）

專案 `desfvqlxyxharknnjvzi`，PostgreSQL 17.6。擁有者 UID 已由 auth.users 驗證為
`198a5af8-ea33-42bd-b810-422216a935e0`，對應 stephenwu.0926@gmail.com。
PR #116 已合併；RLS migration 是另行套用的資料庫更新，不會因前端 PR 合併而自動執行。

更新紀錄：2026-10-11 經使用者確認、要求先備份後，已套用正式站。
備份在本機工作區、Git 專案外的 `backups/rls-20261011-100618`，不隨 PR 上傳。
restore.sql 已與正式站唯讀產生的輸出逐字比對（換行正規化），並用隔離 PostgreSQL 證明 migration→rollback 還原前後 metadata 與假會員資料一致。
正式站 READ ONLY 角色模擬檢查 owner/general/student 通過；三表 RLS=true、匿名 SELECT=false、政策5條、受保護RPC7個、profiles觸發器1個、view security_invoker=true。
更新前後 profiles 152、clients 638、relationships 151。沒有在正式站執行付款／扣點／領福利等測試。
正式前端也已用既有擁有者登入狀態確認載入：管理後台顯示 152 位會員，命盤列表「只看我的」顯示 250 筆資料；未改會員設定或命盤內容。

更新前查核結果：profiles、clients 未啟用 RLS；relationships 已啟用但沒有擁有者管理政策。
profiles 舊政策允許會員自行 UPDATE 全列，管理 SELECT 政策還會讀取自身表而遞迴。
user_statistics 是預設 definer 檢視；部分 SECURITY DEFINER RPC 沒有驗證呼叫者。

## Migration 的效果

- profiles：會員只能讀自己；擁有者可管理全部。會員不能修改角色、額度、功能開關、點數、Email、到期日。
- 唯一相容例外為舊版迎新福利：觸發器只允許未停權、未領取會員將領取標記設 true，其他欄位不可更動；到期日由伺服器重算為 max(目前到期日, now) + 7 天。新前端改呼叫無參數、原子鎖定的 claim_welcome_gift RPC。
- clients：會員 CRUD 自己的命盤；擁有者 CRUD 全部。會員不可把命盤轉給其他 UID。
- relationships：會員只能存取自己的關係，且兩端命盤必須均屬自己；擁有者可跨會員管理。既有不符合條件的資料不刪除，但一般會員不再可讀。
- user_statistics：security_invoker，沿用基礎表 RLS；登出者不可讀。
- 撤銷這三表與檢視的匿名／PUBLIC 權限與不必要的 TRUNCATE 等權限。
- 七個既有 RPC 增加入口守衛，保留其計算／寫入內容：admin_add_credits、admin_adjust_points、admin_bulk_update_max_charts、admin_update_feature_runtime、get_db_schema_export、simulate_payment_success 限擁有者；deduct_points_for_divination 僅本人或擁有者且不可傳負值／NULL。admin_adjust_points 的 actor 必須等於 auth.uid()。
- 不改排盤算法、UI、VIP、命盤資料內容；不改吉凶占卜的計算、免費次數與付費模式。只封住相關 RPC 的越權／負額入口。

## 不宣稱本次已完成的安全範圍

其他表（例如 point_transactions、points_ledger、app_config、admin_otps、feature_configs）仍須另案完整盤點 ACL／RLS。
本次不是全站安全稽核。舊 simulatePaymentSuccess 前端函式未被目前頁面呼叫，普通會員的直接 expiry 寫入會被阻擋；不得為了讓模擬付款通過而放寬 profiles。
命盤數量、修改次數與純前端排盤功能目前仍由既有前端流程判定；本次 RLS 保護資料歸屬和設定完整性，不等於把所有前端算法改成伺服器授權。
服務端 service_role 仍有既有受信任權限，不可放到瀏覽器。

## 驗證與上線

**目前正式專案已於 2026-10-11 完成套用；本次 PR 是補入版本控管與配套前端，不需再執行 migration。以下保留初次部署流程供追溯。**

1. `node --experimental-strip-types --test tests/*.test.mjs`：PGlite 隔離 PostgreSQL 執行真實 migration，測試 allow/deny、舊／新迎新領取、RPC、重複套用。fixture 使用假會員，不使用正式客戶資料。此測試不是完整 Supabase API 整合測試；正式函式業務內容仍由唯讀查核確認。
2. `npm run build`。
3. 正式啟用前取得使用者對上述範圍的確認。確認後以 postgres 在 SQL Editor 執行 `202610110002_member_chart_rls.sql`。檔案是單一 transaction；錯誤全部回滾。Owner UID 不符即中止。相容目前已發布前端，不必先發布前端才能啟用。
4. 查 pg_class.relrowsecurity、pg_policies、ACL、user_statistics.reloptions 及函式守衛，確認正式生效。不要只看 Run 成功。
5. 用擁有者驗證列表、命盤、關係圖、會員設定、批次額度；另用一般／學員測試帳號驗證自身命盤與跨帳號拒絕。正式會員資料不拿來做破壞性測試。
6. 不在 SQL Editor 執行模擬付款／扣點／調額度等 RPC 作為正式測試，避免產生業務紀錄。

不要用直接關閉 RLS 當日常修復；如需緊急回復存取設定，先確認影響與授權。本 migration 不 DELETE／UPDATE 任何既有業務資料，不會清掉命盤。
