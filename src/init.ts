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
  const isFetchGetterError = (msg: string) => 
    msg && (msg.includes('fetch') && (msg.includes('getter') || msg.includes('read only')));

  window.addEventListener('error', (e) => {
    if (isFetchGetterError(e.message || '')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason?.message || String(e.reason || '');
    if (isFetchGetterError(reason)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

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
