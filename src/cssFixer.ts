/**
 * CSS 預處理:處理 quirks mode HTML 的相容性
 * - 將大寫屬性名小寫化
 * - 替 `border: 1px solid;` 補上預設色,避免顏色繼承造成全黑邊框
 */
export const fixCss = (html: string): string =>
  html
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css: string) => {
      const lower = css.replace(
        /\b([A-Z][A-Z\-]+)(\s*:)/g,
        (_m, prop: string, colon: string) => prop.toLowerCase() + colon
      );
      return match.replace(css, lower);
    })
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (match, css: string) => {
      const fixed = css.replace(
        /(border(?:-(?:top|bottom|left|right))?:\s*[\d.]+px\s+solid)\s*;/gi,
        '$1 #666666;'
      );
      return match.replace(css, fixed);
    });
