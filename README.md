# Travel Planner SPA

一個本地優先的旅遊規劃 SPA。資料存在瀏覽器 `localStorage`，不打後端、不登入。

## 功能

- 多行程管理（側邊欄切換）
- 每個行程 5 個分頁：總覽 / 行程 / 打包 / 預算 / 筆記
- 行程分日（day-by-day），含時間 + 文字
- 打包清單（含 done 狀態）
- 預算追蹤（總預算 vs 已花 + 分類 tag）
- 自由筆記
- 暗色模式自動跟系統
- RWD，手機也能用
- 匯入 / 匯出 JSON
- URL hash 匯入（`#import=<base64>`）— 別人傳連結給你，打開就自動加行程

## 開發

```bash
npm install
npm run dev      # 開發伺服器
npm run build    # 輸出到 dist/
npm run preview  # 預覽 build
```

## 部署

推到 GitHub `main`，Cloudflare Pages 自動 build + deploy。

Cloudflare Pages 設定：
- Framework preset: **Vite**
- Build command: `npm run build`
- Build output: `dist`
- Node version: 20

## 資料結構（localStorage key = `travel-planner:v1`）

每個 trip：
```json
{
  "id": "...",
  "name": "名古屋親子遊 2027",
  "destination": "日本 名古屋",
  "start": "2027-01-30",
  "end": "2027-02-04",
  "notes": "...",
  "freeNotes": "...",
  "budgetTotal": 220000,
  "itinerary": [{ "id": "...", "dayIndex": 0, "time": "09:00", "text": "..." }],
  "packing": [{ "id": "...", "text": "...", "done": false }],
  "budget": [{ "id": "...", "name": "...", "amount": 1000, "date": "...", "category": "餐飲" }],
  "createdAt": "..."
}
```

## 匯入行程

兩種方式：

**1. 點 loader HTML 連結**
打開對方給的 `.html` 檔（內容是 `meta refresh` 到 SPA + `#import=...`），自動跳轉並匯入。

**2. JSON 貼上**
SPA 左下角「匯入」→ 貼單一 trip 的 JSON → 完成。

JSON → base64url → `#import=` 編碼方式見 `src/main.js` 的 `tryHashImport()`。
