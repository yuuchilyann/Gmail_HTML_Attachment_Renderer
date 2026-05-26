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

## 安全模型

- **DOMPurify** 移除 script / iframe / form / 事件處理屬性
- **Shadow DOM** 隔離附件樣式,避免污染 Gmail UI
- **Trusted Types policy** 滿足 Gmail 啟用的 TT 限制
- **預設封鎖外連圖片** (避免 email tracker),使用者可手動載入
- **連結強制** `target="_blank"` + `rel="noopener noreferrer"`,並擋掉 `javascript:`

## 版本

0.0.1
