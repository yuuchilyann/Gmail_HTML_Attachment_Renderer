import { log } from './logger';
import { scan, startObserver } from './scanner';

(function bootstrap(): void {
  'use strict';
  startObserver();
  scan();
  setTimeout(scan, 1000);
  setTimeout(scan, 3000);
  log('v0.0.1 已載入');
})();
