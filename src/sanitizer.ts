import DOMPurify from 'dompurify';

const FORBID_TAGS = [
  'script', 'iframe', 'frame', 'frameset', 'object', 'embed',
  'form', 'input', 'button', 'textarea', 'select', 'option',
  'meta', 'link', 'base', 'applet', 'title',
];

const FORBID_ATTR = [
  'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
  'onfocus', 'onblur', 'onchange', 'onsubmit', 'onreset',
  'onkeydown', 'onkeyup', 'onkeypress',
  'formaction', 'srcset', 'ping',
];

DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  const el = node as Element;

  if (el.tagName === 'IMG' && data.attrName === 'src') {
    const src = data.attrValue || '';
    if (src && !src.startsWith('data:') && !src.startsWith('cid:')) {
      el.setAttribute('data-original-src', src);
      el.setAttribute(
        'alt',
        `[圖片已封鎖] ${(el.getAttribute('alt') || src).slice(0, 60)}`
      );
      el.setAttribute(
        'style',
        'border:1px dashed #c66;padding:4px;color:#c66;font-size:12px;display:inline-block;min-width:60px;min-height:20px;'
      );
      data.keepAttr = false;
    }
  }

  if (el.tagName === 'A' && data.attrName === 'href') {
    const href = data.attrValue || '';
    if (/^javascript:/i.test(href)) {
      data.keepAttr = false;
    } else if (/^https?:/i.test(href)) {
      el.setAttribute('rel', 'noopener noreferrer');
      el.setAttribute('target', '_blank');
    }
  }
});

export const sanitize = (rawHtml: string): string =>
  DOMPurify.sanitize(rawHtml, {
    FORBID_TAGS,
    FORBID_ATTR,
    ALLOW_DATA_ATTR: false,
    // 保留整份文件:許多 HTML 附件(如電子發票)把 <style> 放在 <head>,
    // 用 WHOLE_DOCUMENT:false 會讓 DOMPurify 只回傳 <body>,整段 <head><style>
    // (含表格邊框/字級等規則)被丟棄,渲染後就沒有外框。改 true 保住 <style>。
    // <head>/<body> 包裹標籤在塞進 .content 的 div 時會被 parser 自動拆掉,只留 <style> 與內容。
    WHOLE_DOCUMENT: true,
  }) as string;
