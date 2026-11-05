# 諮詢命盤串接契約 v1

狀態：本機實作與測試已完成，**尚未部署，正式網址目前不代表此 API 已上線**。
範圍僅「大寶紫微斗數」。錄影、諮詢綁定、Google Drive 上傳／共享／期限由原生 App 負責。

## 1. 決策與身分驗證

- 採同步 HTTP API，成功直接回傳 PNG，不需原生 App 控制瀏覽器、不需手動下載、不建立公開圖檔 URL。
- 沿用 Supabase Auth 的**使用者登入 session**。不提供免登入永久 API key；不可把 service_role key 放入原生 App，也不可複製網站瀏覽器的 refresh token。
- 原生 App 向公開 discovery 取得 Supabase URL／publishable（anon）key，以自己的 Supabase Swift client 登入：`try await supabase.auth.signIn(email: email, password: password)`。此為現有排盤帳號，不是 Google 帳號。原生 App 保存自己的 session 至 macOS Keychain，透過 SDK 更新 access token；不保存登入密碼、不在記錄檔列印 token。
- 只信任預先設定的排盤 HTTPS 主機與對應 Supabase 專案，不從客戶資料或 Drive 檔案指定的任意網址取得登入設定。Google Meet／Drive 的 access token 不能拿來呼叫此 API。
- 每次搜尋、讀取、產圖都送 `Authorization: Bearer <access_token>`。伺服器使用 `auth.getUser` 驗證，並以該 JWT 查詢 Supabase，**不使用管理員身分繞過 RLS**。既有 owner 可讀全部命盤，其他帳號僅限 RLS 允許的命盤。
- 會檢查目前 profile（停權／到期）與 `password_reset_status`。需強制改密碼或舊 session 一律拒絕；原生 App 開啟網站完成改密碼，再重新登入自己的 session。401 可由 SDK 更新 token 後重試一次；更新失敗需互動登入。
- PNG 輸出另沿用既有 `screenshot` 功能權限：owner 可用，其他角色依後台開關。不新增獨立角色、不開放原本關閉的截圖功能。搜尋結果會標示 `can_export`。
- 本契約不要求 Google Drive OAuth scope，排盤系統不接收 Drive token。

正式基底網址預定 `https://ziweiapp.dabao.life`；本機 `http://127.0.0.1:5173`。正式環境必須 HTTPS，macOS App 僅為本機開發允許 loopback HTTP。

## 2. Discovery（不需登入）

`GET /api/consultation-charts?operation=capabilities`

```json
{
  "contract_version": "1",
  "authentication": {
    "provider": "supabase",
    "url": "https://<project>.supabase.co",
    "publishable_key": "<public anon/publishable key>",
    "grant": "password"
  },
  "image": {"format":"png","width":2560,"height":1920,"mode":"pure-natal","synchronous":true},
  "search_path": "/api/consultation-charts",
  "export_path": "/api/consultation-chart-export"
}
```

公開 key 是 Supabase 用戶端原本即公開的 key，**不是權限憑證**；資料權限仍取決於使用者 JWT／RLS。不得將 token 放在 URL。
若 discovery 的 contract_version 不為 `1`，應提示升級，不猜測未知版本欄位。

若不使用 Swift SDK，登入等價於 `POST <authentication.url>/auth/v1/token?grant_type=password`，標頭 `apikey: <publishable_key>`、`Content-Type: application/json`，body `{"email":"使用者信箱","password":"使用者輸入的密碼"}`；回應的 access_token 用於 API。更新使用 Supabase SDK，或同一路徑 `grant_type=refresh_token` 與 `{"refresh_token":"..."}`。SDK 是建議方式，避免 refresh token rotation 競態。

## 3. 搜尋與選取（不產圖）

`GET /api/consultation-charts?q=<姓名片段>&limit=20&cursor=<上一頁next_cursor>`

- `q` 可省略（列出所有可讀命盤），最多 100 字元，字面、大小寫不敏感姓名片段搜尋，`%`、`_` 不作萬用字元。
- `limit` 為 1–100，預設 20。依 UUID 升冪 keyset 分頁，`cursor` 為上一頁最後的 UUID；換搜尋條件時清空 cursor。新增／刪除期間不是資料庫快照，原生 App 以 UUID 去重，重新整理時從第一頁開始。
- 不回傳已軟刪除命盤；不以姓名作為識別碼。

```http
GET /api/consultation-charts?q=%E7%8E%8B&limit=20
Authorization: Bearer <access_token>
```

```json
{
  "contract_version":"1",
  "charts":[{
    "chart_id":"11111111-1111-4111-8111-111111111111",
    "name":"王範例",
    "gender":"女",
    "birth":{"calendar":"gregorian","year":1988,"month":6,"day":15,"hour":14,"minute":30},
    "category":"客戶",
    "created_at":"2026-01-01T00:00:00Z",
    "source_revision":"<sha256 hex>",
    "can_export":true
  }],
  "has_more":false,
  "next_cursor":null
}
```

欄位為已儲存的民用年月日時分，不進行 UTC／macOS 時區轉換。沒有新增時區假設。UUID 為 clients.id，編輯／改名不變，刪除重建則是新 UUID。`source_revision` 是本次出生資料、姓名、性別與 UUID 的 SHA-256，不是更新時間；相同資料可跨搜尋／產圖對照。

原生 App 需讓人檢查姓名＋出生日期時間＋性別，保存諮詢的 `chart_ids: [UUID]`，可選多筆（例如合盤）。每個 UUID 各取得一張純本命盤，不輸出合盤疊圖。重新登入不同帳號不可沿用前一帳號的搜尋快取作為授權。

### 取得一張命盤的辨識資料

`GET /api/consultation-charts?chart_id=<UUID>`，需 Bearer。

成功：`{"contract_version":"1","chart":{...同上...}}`。如綁定後要確認命盤是否仍可讀，使用此呼叫。

## 4. 取得 PNG（同步二進位）

```http
POST /api/consultation-chart-export
Authorization: Bearer <access_token>
Content-Type: application/json

{"chart_id":"11111111-1111-4111-8111-111111111111","expected_revision":"<先前選取的 source_revision，可省略>"}
```

- 僅接受上述欄位。不接受姓名代替 UUID、不接受出生資料／時辰／圖片網址／儲存位置／任意尺寸等覆寫。
- 每次以 JWT 讀取該命盤目前已存資料，使用相同 ZiWeiEngine、PalaceGrid、CenterInfoBoard、PalaceCard 產生全新的純本命輸出。不讀取 localStorage、畫面切換時辰、白板、當前大限／流年／流月／流日、顛倒盤或任何暫時選取狀態。
- 保留命主基本資料、十二宮、本命星曜、本命四化與原有身宮標示；不含關係圖、操作按鈕、白板、連線、選取高亮、動態疊加星曜與期間控制列。宮位底部原有本命固定資訊維持一致。
- 固定白底 PNG，**2560 × 1920 px**（1280 × 960 CSS px，2x），無浮水印，不裁切成目前視窗大小。
- 使用封裝的 Noto Sans TC 字型、同版樣式；等待 `document.fonts.ready`、字型確認與兩個繪製週期後擷取完整元素，不依賴遠端 Google Fonts。若字型／渲染未完成則回錯誤，不回傳假成功圖片。
- 產圖後重新驗證 session、權限與該 UUID；若中途刪除／失權不回圖，若資料中途修改回 409。`expected_revision` 若與現在不符也回 409，原生 App 重新確認後再用新 revision 請求。

```http
HTTP/1.1 200 OK
Content-Type: image/png
Content-Disposition: attachment; filename="natal-11111111-1111-4111-8111-111111111111.png"
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
X-Chart-Id: 11111111-1111-4111-8111-111111111111
X-Chart-Source-Revision: <sha256>
X-Chart-Renderer-Revision: natal-v1-<build hash>
X-Content-SHA256: <PNG bytes sha256>

<PNG bytes>
```

原生 App 驗證 HTTP 200、MIME、PNG signature、尺寸及 SHA-256，再以 binary data 存檔或上傳 Drive。不要把 JSON 錯誤 body 當成 PNG。檔名不承擔識別用途，以諮詢綁定 UUID 為準。

原生呼叫範例（不涉及 Drive）：

```swift
var request = URLRequest(url: baseURL.appendingPathComponent("api/consultation-chart-export"))
request.httpMethod = "POST"
request.timeoutInterval = 60
request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try JSONSerialization.data(withJSONObject: [
  "chart_id": selectedChartID, "expected_revision": selectedRevision
])
let (data, response) = try await URLSession.shared.data(for: request)
// 先驗證 HTTP status、MIME、PNG 尺寸和 checksum，再將 data 交給錄影管理 App 的 Drive 流程。
```

### 同步等待、重試、並行

沒有 job_id、查詢結果 URL、輪詢端點或背景工作佇列：此版是同步回應。原生 App 建議請求 timeout 60 秒，逐張處理選取的 UUID。伺服器有執行個體內的並行／節流限制，忙碌時回 429；不是跨執行個體的全域配額。部署仍應搭配 Vercel WAF rate limit，避免濫用資源。

GET 可直接重試；PNG POST 是唯讀、無付款／寫入副作用，可用同 UUID＋expected_revision 重試。429 遵守 Retry-After；502／504 用指數退避、最多重試 2 次。401 更新登入、403 人工處理、404 解除／重新選取綁定、409 重新確認資料；不要無限重試。

## 5. 錯誤格式與資訊保護

所有錯誤為 JSON：

```json
{"error":{"code":"CHART_NOT_FOUND","message":"命盤不存在或目前無權存取"},"request_id":"<uuid>"}
```

| HTTP | code | 意義／處理 |
|---|---|---|
| 400 | INVALID_REQUEST | UUID、搜尋、分頁、JSON 或不支援欄位不合法 |
| 401 | AUTH_REQUIRED | 未登入或 access token 無效／過期 |
| 403 | ACCOUNT_DISABLED / ACCOUNT_EXPIRED | 帳號停權／使用期限已到 |
| 403 | PASSWORD_CHANGE_REQUIRED | 須到網站完成改密碼並重新登入；可能含 password_change_url |
| 403 | EXPORT_FORBIDDEN | 目前帳號截圖功能未開放 |
| 405 | METHOD_NOT_ALLOWED | 方法不支援，依 Allow 標頭調整 |
| 404 | CHART_NOT_FOUND | 不存在、軟刪除或 RLS 不可讀，統一回應避免猜測別人的 UUID 是否存在 |
| 409 | CHART_CHANGED | revision 不符／產圖期間被修改；含目前 current_revision |
| 413 | REQUEST_TOO_LARGE | request body 超過 4 KiB |
| 429 | EXPORT_BUSY | 執行個體忙碌／節流，含 Retry-After |
| 502 | RENDER_FAILED | 字型、排盤資料或產圖失敗；不含出生資料、SQL 或瀏覽器原始錯誤 |
| 503 | EXPORT_UNAVAILABLE | 功能未開、缺少設定、狀態服務／資料庫不可用或建置資產未備妥 |
| 504 | RENDER_TIMEOUT | 產圖逾時 |

不回傳「這筆屬於某某人」之類的越權資訊。所有成功／錯誤回應 no-store，不寫入公開 bucket／CDN；應用層不記錄 Bearer、姓名、出生資料、HTML、PNG。平台本身的存取紀錄可能包含 GET 的姓名搜尋字串，部署端須另設定紀錄可見權限／保留期限，不能宣稱所有基礎設施均不留 query。產圖瀏覽器無帳號憑證、無使用者 browser profile，禁止外部網路請求；只渲染已授權且經 React escape 的文字。

## 6. 部署與本機

- 無新增資料表／RLS migration，沿用現有已部署的會員命盤與強制改密碼規則。
- 伺服器：`CONSULTATION_EXPORT_ENABLED=true`、`SUPABASE_URL`（或既有 VITE_SUPABASE_URL）、`SUPABASE_ANON_KEY`（或既有 VITE_SUPABASE_KEY）。僅使用公開 anon/publishable key；誤設 service_role 會拒絕啟動。既有正式 Vercel public 設定可沿用。
- Node 22.17+／24，Linux 部署使用固定配對版本 Puppeteer Core＋Sparticuz Chromium，打包字型／樣式／SSR 元件；需在預覽確認函式大小、記憶體與 60 秒執行上限符合方案。macOS 開發／測試透過 `CONSULTATION_CHROME_EXECUTABLE` 指定**獨立 headless 測試瀏覽器**，不使用登入中的 Chrome profile。
- 已固定 Puppeteer Core 25.16.0／Sparticuz Chromium 153.0.0，Zod 4.6.7。Puppeteer 官方對應 Chrome 156，但目前 Sparticuz 最新為 153；此組合使用 CDP，已通過 macOS Chrome Headless Shell 153.0.8010.36 及 Linux x86_64／Node 24 實際 HTTP→PNG 測試，不宣稱是官方同版本配對。自備字型為 Noto Sans TC（OFL 授權），建置會封裝字型並附授權檔。呼叫端不需安裝該字型。
- `npm run build` 產生前端及隔離的產圖資產。`CONSULTATION_EXPORT_ENABLED=true CONSULTATION_CHROME_EXECUTABLE=/path/to/headless-shell npm run dev -- --host 0.0.0.0` 提供同路徑本機 API；先建置資產。
- 原手動截圖、白板及其權限保持原樣。本次不要執行修改 Google Meet錄影管理專案的指令。
- PR 預覽若有 Vercel Deployment Protection，可能在進入本 API 前被 Vercel 回 401；不要誤當成 Supabase 過期而無限重登。正式 API 必須可經 HTTPS 到達，且僅由本文的 Supabase JWT 控制資料存取。

下載獨立測試瀏覽器（僅開發環境，不讀取現有 Chrome 設定檔）：

```sh
npx @puppeteer/browsers install chrome-headless-shell@153.0.8010.36 --path node_modules/.cache/consultation-browser
npm run build
# 將上述安裝輸出的 executable 絕對路徑帶入：
CONSULTATION_CHROME_EXECUTABLE=/absolute/path/to/chrome-headless-shell node --experimental-strip-types --test tests/*.test.mjs
```

沒有設定瀏覽器路徑時，實際 PNG 的整合測試會明確標示 skipped；API／權限／排盤單元測試仍可執行，不能將 skipped 宣稱為完整產圖驗證。

Linux x86_64 隔離驗證（只使用假帳號／假命盤，不讀取 `.env` 或真實帳號；需可用的 Docker）：

```sh
npm run build
docker build --platform linux/amd64 -f scripts/consultation-linux.Dockerfile -t ziwei-consultation-linux .
docker run --rm --platform linux/amd64 --memory=1536m --cpus=2 ziwei-consultation-linux
```

容器使用官方 Amazon Linux 2023／Node 24 基底，`VERCEL=1` 模擬 Sparticuz 在 Vercel 的共享函式庫解壓路徑；不取代真正 Vercel 的路由／打包驗證。

## 7. 驗收／交接

需驗證：owner／一般帳號 RLS、無效 token、強制改密碼、關閉截圖、同名不同 UUID、分頁、軟刪除、修改 revision、產圖後失權、圖片尺寸與字型、十二宮／本命四化與既有引擎一致、已儲存時辰不受畫面影響。測試僅假資料與隔離資料庫，不重設真實帳號、不產生客戶資料寫入。

原生 App 開發者只需依此文件實作登入、選盤 UI、保存 chart_ids、下載 PNG 與 Drive 流程。排盤端不保存諮詢或 Drive folder ID。

### 本次驗證紀錄（2026-11-05）

- 完整測試以獨立 Chrome Headless Shell 執行：78 項通過、0 失敗、0 skipped。包含 11 項新增契約／產圖資料測試、1 項真實 HTTP→PNG 整合、1 項實際 PostgreSQL RLS 串接測試，其餘為既有回歸測試。
- 實際 PNG 整合使用本機假 Auth／DB HTTP 服務與真實 headless Chromium，產圖前後均驗證 Auth／資料，不是只測 mock PNG；另在 PGlite 套用既有兩份正式 RLS migration，證明跨帳號、刪除與待改密碼狀態被拒絕。未以真實客戶帳號做寫入、改密碼或產圖測試。
- 真實圖片 2560 × 1920，已人工檢查中文字型、完整十二宮與四個本命四化印章；無白板、操作列、連線或期間疊加。API 整合驗證 MIME、PNG signature／尺寸、revision 與 SHA-256。
- `npm run build` 通過，產出約 9.4 MiB 的隔離 SSR／字型／CSS 資產；Sparticuz 壓縮瀏覽器約 67 MiB，已指定 Vercel includeFiles。這些本機大小不等於正式函式打包完成的驗證。
- 本機 `http://127.0.0.1:5174` discovery 回 200；未帶登入憑證的搜尋與產圖回 401 `AUTH_REQUIRED`，不需／未使用 service_role key。
- **尚未 PR、尚未部署，正式站目前不可呼叫新 API。**上線前仍須在 Vercel Linux 預覽驗證 Node 版本、函式 trace／大小、Chromium 啟動、時間／記憶體限制，並以專用測試帳號跑真實 Supabase Auth 端到端流程，再啟用 `CONSULTATION_EXPORT_ENABLED=true`。不需新增 SQL migration，不需 Google Drive 授權。
- 修改範圍只有本排盤專案；沒有修改 Google Meet錄影管理專案、正式帳號、命盤資料或雲端設定。
- 產圖相關 Puppeteer／Chromium BiDi／Zod 告警已透過 Puppeteer 25.16.0、Zod 4.6.7 升級消除（[原告警 GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)）。升級後再次完整 78 項測試通過；Linux x86_64／Node 24、1536 MiB／2 CPU 容器另 1 項實際 HTTP→PNG 測試通過，0 skipped。
- `npm audit --omit=dev` 尚有既有 React Router／React Router DOM 的 2 項 moderate 告警，無 high／critical；完整開發相依仍有 29 項告警（3 low／11 moderate／15 high）。本次沒有對 UI／PWA 建置工具執行整批 `npm audit fix` 或跨主版升級；這些既有風險未宣稱已全部修復。

參考依據：[Supabase Swift 登入](https://supabase.com/docs/reference/swift/auth-signinwithpassword)、[Vercel Puppeteer 部署](https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel)、[Puppeteer 瀏覽器配對](https://pptr.dev/supported-browsers)、[Sparticuz Chromium](https://github.com/Sparticuz/chromium)。
