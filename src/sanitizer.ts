import DOMPurify from 'dompurify';

const FORBID_TAGS = [
  'script', 'iframe', 'frame', 'frameset', 'object', 'embed',
  'form', 'input', 'button', 'textarea', 'select', 'option',
  'meta', 'link', 'base', 'applet',
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
    WHOLE_DOCUMENT: false,
  }) as string;
