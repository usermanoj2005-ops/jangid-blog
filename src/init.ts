// Prevent read-only window.fetch assignment errors in sandbox/iframe environments
if (typeof window !== 'undefined') {
  // Maintain a reference to the active fetch function
  let currentFetch = window.fetch;

  // 1. Attempt to patch window.fetch with a setter to allow third-party instrumentation
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (!desc || desc.configurable) {
      Object.defineProperty(window, 'fetch', {
        get: () => currentFetch,
        set: (v) => { currentFetch = v; },
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    // If the instance property is locked, try the prototype
    try {
      const protoDesc = Object.getOwnPropertyDescriptor(Window.prototype, 'fetch');
      if (protoDesc && protoDesc.configurable) {
        Object.defineProperty(Window.prototype, 'fetch', {
          get: () => currentFetch,
          set: (v) => { currentFetch = v; },
          configurable: true,
          enumerable: true
        });
      }
    } catch (e2) {
      // In extremely locked environments (like some sandboxes), we may reach here.
    }
  }

  // 2. Globally suppress the specific "only a getter" TypeError to prevent app breakage
  const isFetchGetterError = (msg: string) => {
    const s = String(msg).toLowerCase();
    return s.includes('fetch') && (
      s.includes('getter') || 
      s.includes('read only') || 
      s.includes('assignment to constant') || 
      s.includes('cannot set property') ||
      s.includes('only a getter')
    );
  };

  const blockError = (e: any) => {
    const msg = e.message || (e.reason && e.reason.message) || String(e || '');
    if (isFetchGetterError(msg)) {
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      return true;
    }
    return false;
  };

  window.addEventListener('error', blockError, true);
  window.addEventListener('unhandledrejection', (e) => {
    if (blockError(e)) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
  }, true);

  // Fallback for older browsers or specific sandbox error reporting
  const prevOnError = window.onerror;
  window.onerror = function(msg: any) {
    if (isFetchGetterError(String(msg))) return true;
    if (prevOnError) return prevOnError.apply(this, arguments as any);
  };

  // 3. Prevent JSON.parse("undefined") SyntaxErrors which can occur in some storage edge cases
  try {
    const originalParse = JSON.parse;
    JSON.parse = function(text: string, reviver?: any) {
      if (text === 'undefined') return undefined;
      return originalParse.call(JSON, text, reviver);
    };
  } catch (e) {}

  // 4. Wrap Storage.getItem to prevent 'undefined' string pollution
  try {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key: string) {
      try {
        const val = originalGetItem.call(this, key);
        return val === 'undefined' ? null : val;
      } catch (e) {
        return null;
      }
    };
  } catch (e) {}

  // 5. Safe storage cleanup
  try {
    const safeCleanup = (storage: Storage) => {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && storage.getItem(key) === 'undefined') {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => storage.removeItem(k));
      } catch (e) {}
    };
    safeCleanup(localStorage);
    safeCleanup(sessionStorage);
  } catch (e) {}
}
