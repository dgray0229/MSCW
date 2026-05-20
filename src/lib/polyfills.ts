// Unconditionally polyfill setImmediate and clearImmediate if they are not present.
// This file MUST NOT import anything (like 'react-native') to prevent evaluation order issues in Metro.

const _global = typeof globalThis !== 'undefined'
  ? globalThis
  : typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
      ? global
      : typeof self !== 'undefined'
        ? self
        : {};

if (typeof (_global as any).setImmediate === 'undefined') {
  const setImmediatePolyfill = function (fn: (...args: any[]) => void, ...args: any[]) {
    return setTimeout(fn, 0, ...args);
  };
  const clearImmediatePolyfill = function (id: any) {
    clearTimeout(id);
  };

  (_global as any).setImmediate = setImmediatePolyfill;
  (_global as any).clearImmediate = clearImmediatePolyfill;

  if (typeof window !== 'undefined') {
    (window as any).setImmediate = setImmediatePolyfill;
    (window as any).clearImmediate = clearImmediatePolyfill;
  }
  if (typeof global !== 'undefined') {
    (global as any).setImmediate = setImmediatePolyfill;
    (global as any).clearImmediate = clearImmediatePolyfill;
  }
  if (typeof self !== 'undefined') {
    (self as any).setImmediate = setImmediatePolyfill;
    (self as any).clearImmediate = clearImmediatePolyfill;
  }
}

