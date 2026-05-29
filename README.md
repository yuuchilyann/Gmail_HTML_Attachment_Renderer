# Gmail HTML Attachment Renderer

在 Gmail HTML 附件預覽中安全地渲染內容(Shadow DOM + Trusted Types + DOMPurify)。

## 開發

```bash
npm install
npm run dev      # vite dev server,即時 reload userscript
npm run build    # 產生 dist/gmail-html-attachment-renderer.user.js
npm run typecheck
```

`npm run dev` 會啟動 Vite,Tampermonkey 可改用本地 `http://localhost:5173/...` 載入；
`npm run build` 後將 `dist/` 內的 `.user.js` 拖入瀏覽器即可安裝。

## 專案結構

```
src/
├── main.ts          # 入口:啟動掃描 + MutationObserver
├── scanner.ts       # 掃描 / MutationObserver
├── renderer.ts      # 渲染單一附件 (Shadow DOM + 按鈕事件)
├── sanitizer.ts     # DOMPurify 設定 + img/href hook
├── cssFixer.ts      # quirks-mode CSS 修補
├── template.ts      # Shadow DOM HTML 範本
├── trustedTypes.ts  # Trusted Types policy + setHTML
└── logger.ts        # console log helper
```

## 工具列功能

渲染後的附件上方會出現一條工具列,提供下列按鈕:

| 按鈕 | 說明 |
|------|------|
| **顯示原始碼 / 渲染 HTML** | 在「渲染畫面」與「原始 HTML 文字」之間切換 |
| **複製原始碼** | 將原始 HTML 複製到剪貼簿(`navigator.clipboard`,並對舊環境保留 `execCommand` 後備);成功顯示「已複製」、失敗顯示「複製失敗」,1.5 秒後復原 |
| **載入圖片** | 預設封鎖外連圖片以防 email tracker,點擊並確認後才載入(避免洩漏 IP) |
| **下載** | 將原始 HTML 以附件原檔名下載成 `.html` |

## 渲染架構

- 消毒採 **`WHOLE_DOCUMENT: true`**,保留 `<head><style>` 內的樣式(許多 HTML 附件如電子發票的表格邊框、字級都定義在這裡;若只取 `<body>` 會整段遺失而失去外框)。
- 採**雙層 Shadow DOM**:
  - 外層 shadow 放工具列(toolbar)。
  - 附件內容注入**獨立的 inner shadow root**,讓附件自己的 `<style>` 只作用於內容層,不會洩漏到 toolbar(避免信件裡 `*{}`、`div{}`、`body{}` 等廣域選擇器蓋掉工具列)。
- `<body>` 包裹標籤注入後會被 parser 拆掉,故以純字串解析(不使用 `DOMParser`,避開 Trusted Types 風險)讀出 `bgcolor` / `font-family` 套回內容容器,還原信件外觀。
- 先接上 host、隱藏原始 `<pre>` 再注入內容,且注入包在 `try/catch`:內容萬一失敗,工具列仍會出現,不會整個渲染消失。

## 安全模型

- **DOMPurify** 移除 script / iframe / form / 事件處理屬性
- **雙層 Shadow DOM** 隔離附件樣式,既不污染 Gmail UI,也不讓附件 CSS 蓋掉工具列
- **Trusted Types policy** 滿足 Gmail 啟用的 TT 限制
- **預設封鎖外連圖片** (避免 email tracker),使用者可手動載入
- **連結強制** `target="_blank"` + `rel="noopener noreferrer"`,並擋掉 `javascript:`

## 版本

0.0.2 — 修正 `<head><style>` 被丟棄導致表格無外框;新增「複製原始碼」按鈕;保留 body `bgcolor`/`font-family`;改用雙層 Shadow DOM 隔離附件樣式。
