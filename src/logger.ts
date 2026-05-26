const STYLE = 'background:#1a73e8;color:white;padding:2px 6px;border-radius:3px;';

export const log = (...args: unknown[]): void => {
  console.log('%c[HTMLRenderer]', STYLE, ...args);
};
