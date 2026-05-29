export const shadowTemplate = `
  <style>
    :host { all: initial; display: flex; flex-direction: column; }
    .toolbar {
      flex: 0 0 auto;
      background:#202124;color:#e8eaed;
      font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;
      padding:6px 12px;display:flex;gap:12px;align-items:center;
      border-bottom:1px solid #3c4043;
    }
    .toolbar button {
      background:transparent;border:1px solid #5f6368;color:#e8eaed;
      padding:2px 10px;border-radius:4px;cursor:pointer;font-size:12px;
    }
    .toolbar button:hover { background:#3c4043; }
    .toolbar span { opacity:.7; flex:1; }
    .content {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding:16px;background:white;color:black;
      font-family: "新細明體", "PingFang TC", sans-serif;
    }
  </style>
  <div class="toolbar">
    <span>已渲染 HTML 附件 · JS 與外連已封鎖</span>
    <button class="toggle">顯示原始碼</button>
    <button class="copy">複製原始碼</button>
    <button class="images">載入圖片</button>
    <button class="download">下載</button>
  </div>
  <div class="content"></div>
`;
