import { log } from './logger';
import { setHTML } from './trustedTypes';
import { sanitize } from './sanitizer';
import { fixCss } from './cssFixer';
import { shadowTemplate } from './template';

export const MARKER_ATTR = 'data-html-rendered-v5';

export interface RenderTarget {
  container: HTMLElement;
  pre: HTMLPreElement;
  text: string;
}

export function findRenderTargets(): RenderTarget[] {
  const targets: RenderTarget[] = [];
  document.querySelectorAll('pre').forEach((pre) => {
    const container =
      (pre.closest('div[role="document"]') as HTMLElement | null) ??
      (pre.parentElement as HTMLElement | null);
    if (!container || container.hasAttribute(MARKER_ATTR)) return;
    const text = pre.textContent ?? '';
    if (!/<\s*(html|body|div|table|p|h[1-6])\b/i.test(text)) return;
    if (text.length < 100) return;
    targets.push({ container, pre, text });
  });
  return targets;
}

export function renderTarget({ container, pre, text: rawHtml }: RenderTarget): void {
  log('渲染附件,原始長度', rawHtml.length);
  container.setAttribute(MARKER_ATTR, '1');

  const cleanHtml = sanitize(rawHtml);
  log('消毒後長度', cleanHtml.length, '前 100 字:', cleanHtml.slice(0, 100));

  const fixedHtml = fixCss(cleanHtml);

  const host = document.createElement('div');
  host.style.cssText =
    'all:initial;display:flex;flex-direction:column;width:100%;background:white;color:black;';
  const shadow = host.attachShadow({ mode: 'open' });

  bindHostHeightToContainer(host, container);

  setHTML(shadow, shadowTemplate);

  const contentDiv = shadow.querySelector<HTMLDivElement>('.content');
  if (!contentDiv) return;

  // 附件內容放進獨立的 inner shadow root:附件自己的 <style> 只作用在這層,
  // 不會洩漏到外層 toolbar(否則信件裡的 *{}、div{}、body{} 等廣域選擇器會蓋掉工具列)。
  const contentRoot = contentDiv.attachShadow({ mode: 'open' });

  // 先接上 host、隱藏原始 <pre>,確保 toolbar 一定出現;
  // 內容注入萬一出錯(try/catch)也不會讓整個渲染與工具列一起消失。
  pre.style.display = 'none';
  pre.parentNode?.insertBefore(host, pre);

  try {
    setHTML(contentRoot, fixedHtml);
    applyBodyStyles(fixedHtml, contentDiv);
    log('Shadow DOM 內容子元素數:', contentRoot.childElementCount);
  } catch (e) {
    log('內容注入失敗', (e as Error).message);
  }

  const zoom = findZoomControl(pre);
  setZoomHidden(zoom, true);

  wireToggle(shadow, pre, contentDiv, zoom, container);
  wireCopy(shadow, rawHtml);
  wireLoadImages(shadow, contentRoot);
  wireDownload(shadow, container, rawHtml);
}

/**
 * 注入時 <body> 包裹標籤會被 parser 拆掉,body 上的 bgcolor / font-family 會遺失。
 * 這裡從 <body> 開頭標籤以純字串解析讀出底色與字體,套到 .content 容器(inner shadow 的 host),
 * 由內容繼承,還原信件原本外觀(覆蓋 template 的預設 white / 新細明體)。
 * 刻意不用 DOMParser,避免在 Gmail 的 Trusted Types 環境踩到風險。
 */
function applyBodyStyles(html: string, contentDiv: HTMLDivElement): void {
  const bodyTag = html.match(/<body\b([^>]*)>/i)?.[1] ?? '';
  if (!bodyTag) return;

  const styleAttr =
    bodyTag.match(/style\s*=\s*"([^"]*)"/i)?.[1] ??
    bodyTag.match(/style\s*=\s*'([^']*)'/i)?.[1] ??
    '';
  const bgcolorAttr = bodyTag.match(/bgcolor\s*=\s*["']?([^"'\s>]+)/i)?.[1];

  const bg =
    styleAttr.match(/background(?:-color)?\s*:\s*([^;]+)/i)?.[1]?.trim() ??
    bgcolorAttr;
  if (bg) contentDiv.style.background = bg;

  const font = styleAttr.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim();
  if (font) contentDiv.style.fontFamily = font;
}

/**
 * Gmail 直接在 div[role="document"](即 container)上 set inline `height: NNNpx`,
 * 這就是附件預覽框的可視高度。直接觀察 container 而非往上找可捲動祖先,
 * 對 Gmail 來說最精準,也最不依賴脆弱的 overflow 判斷。
 *
 * Gmail 初始載入時尺寸尚未套用最終值,需 dispatch 一次 resize 觸發 Gmail 自己重新 layout;
 * ResizeObserver 會接住結果。再用 rAF + setTimeout 補測,涵蓋非同步 layout 的時序變動。
 */
function bindHostHeightToContainer(host: HTMLElement, container: HTMLElement): void {
  // 渲染期間先隱藏,避免第一次測量時 Gmail 還沒設好 container 高度而看到尺寸跳動
  host.style.visibility = 'hidden';
  let revealed = false;
  const reveal = (): void => {
    if (revealed) return;
    revealed = true;
    host.style.visibility = '';
  };

  const setMaxHeight = (): void => {
    const h = container.clientHeight || Math.min(window.innerHeight - 200, 600);
    host.style.maxHeight = `${h}px`;
  };
  setMaxHeight();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(setMaxHeight);
    ro.observe(container);
  }

  // dispatch resize 推 Gmail 自己重新 layout container.height,
  // 等下一幀 Gmail 反應後再 reveal,使用者不會看到尺寸跳動。
  // setTimeout 兜底:Gmail 若延遲反應,也在 500ms 後強制顯示,避免永遠隱形。
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => {
      setMaxHeight();
      reveal();
    });
    setTimeout(setMaxHeight, 300);
    setTimeout(reveal, 500);
  });
}

/**
 * 從 <pre> 往上爬,找到最近一個祖先,其子樹內含 Gmail 附件預覽的縮放控制 .aLF-aPX-bhN。
 * 多個附件並存時,確保不會誤抓到別的附件的縮放器。
 */
function findZoomControl(pre: HTMLPreElement): HTMLElement | null {
  let node: HTMLElement | null = pre.parentElement;
  while (node && node !== document.body) {
    const zoom = node.querySelector<HTMLElement>('.aLF-aPX-bhN');
    if (zoom) return zoom;
    node = node.parentElement;
  }
  return null;
}

function setZoomHidden(zoom: HTMLElement | null, hidden: boolean): void {
  if (!zoom) return;
  if (hidden) {
    zoom.style.display = 'none';
  } else {
    zoom.style.removeProperty('display');
  }
}

function wireToggle(
  shadow: ShadowRoot,
  pre: HTMLPreElement,
  contentDiv: HTMLDivElement,
  zoom: HTMLElement | null,
  container: HTMLElement
): void {
  // Gmail 在原始碼模式會主動把 container.style.height 縮短(~400px),
  // 且切回渲染時不會還原。記下「渲染模式時的高度」,切回時主動寫回。
  let renderModeHeight = '';

  const btn = shadow.querySelector<HTMLButtonElement>('.toggle');
  btn?.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLButtonElement;
    const switchingToSource = pre.style.display === 'none';

    if (switchingToSource) {
      const h = container.style.height;
      if (h) renderModeHeight = h;
      pre.style.display = '';
      contentDiv.style.display = 'none';
      setZoomHidden(zoom, false);
    } else {
      pre.style.display = 'none';
      contentDiv.style.display = '';
      setZoomHidden(zoom, true);
      if (renderModeHeight) {
        container.style.height = renderModeHeight;
      }
    }

    target.textContent = switchingToSource ? '渲染 HTML' : '顯示原始碼';
  });
}

function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // 後備:execCommand('copy')。grant:none 下無 GM_setClipboard,但頁面有 https + 點擊手勢。
  return new Promise<void>((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    ok ? resolve() : reject(new Error('execCommand copy failed'));
  });
}

function wireCopy(shadow: ShadowRoot, rawHtml: string): void {
  const btn = shadow.querySelector<HTMLButtonElement>('.copy');
  btn?.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLButtonElement;
    const original = target.textContent;
    copyText(rawHtml)
      .then(() => {
        target.textContent = '已複製';
        log('已複製原始碼,長度', rawHtml.length);
      })
      .catch((err) => {
        target.textContent = '複製失敗';
        log('複製失敗', err);
      })
      .finally(() => {
        setTimeout(() => {
          target.textContent = original;
        }, 1500);
      });
  });
}

function wireLoadImages(shadow: ShadowRoot, contentRoot: ShadowRoot): void {
  const btn = shadow.querySelector<HTMLButtonElement>('.images');
  btn?.addEventListener('click', (e) => {
    if (!confirm('載入圖片可能會洩漏 IP 給寄件者(email tracker)。確定載入?')) return;
    contentRoot
      .querySelectorAll<HTMLImageElement>('img[data-original-src]')
      .forEach((img) => {
        const src = img.dataset.originalSrc;
        if (src) img.setAttribute('src', src);
        img.removeAttribute('style');
        img.alt = '';
      });
    const target = e.currentTarget as HTMLButtonElement;
    target.disabled = true;
    target.style.opacity = '.5';
    target.textContent = '圖片已載入';
  });
}

function safeFilename(raw: string): string {
  const cleaned = raw
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 200);
  return cleaned || 'attachment.html';
}

function wireDownload(
  shadow: ShadowRoot,
  container: HTMLElement,
  rawHtml: string
): void {
  const btn = shadow.querySelector<HTMLButtonElement>('.download');
  btn?.addEventListener('click', () => {
    const ariaLabel = container.getAttribute('aria-label') ?? '';
    const match = ariaLabel.match(/「(.+?)」/);
    const filename = safeFilename(match ? match[1] : 'attachment.html');
    const blob = new Blob([rawHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    log('已下載:', filename);
  });
}
