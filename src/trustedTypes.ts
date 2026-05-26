import { log } from './logger';

type HtmlSink = TrustedHTML | string;

interface HtmlPolicy {
  createHTML(s: string): HtmlSink;
}

let ttPolicy: HtmlPolicy | null = null;

if (window.trustedTypes?.createPolicy) {
  try {
    ttPolicy = window.trustedTypes.createPolicy('html-attachment-renderer', {
      createHTML: (s: string) => s,
    }) as unknown as HtmlPolicy;
    log('Trusted Types policy 已建立');
  } catch (e) {
    log('TT policy 建立失敗:', (e as Error).message);
  }
}

export const setHTML = (el: Element | ShadowRoot, html: string): void => {
  el.innerHTML = (ttPolicy ? ttPolicy.createHTML(html) : html) as string;
};
