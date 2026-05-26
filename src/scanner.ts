import { log } from './logger';
import { findRenderTargets, renderTarget } from './renderer';

const DEBOUNCE_MS = 150;

export function scan(): void {
  const targets = findRenderTargets();
  if (targets.length) log(`找到 ${targets.length} 個目標`);
  targets.forEach(renderTarget);
}

function createDebouncedScan(): () => void {
  let scheduled = false;
  const ric: (cb: () => void) => void =
    (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback ?? ((cb) => window.setTimeout(cb, 0));

  return () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      ric(() => {
        scheduled = false;
        scan();
      });
    }, DEBOUNCE_MS);
  };
}

export function startObserver(): void {
  const debounced = createDebouncedScan();
  const observer = new MutationObserver(debounced);
  observer.observe(document.body, { childList: true, subtree: true });
}
