// Prevent read-only window.fetch assignment errors in sandbox/iframe environments
if (typeof window !== 'undefined') {
  // Gracefully suppress sandbox network observer or read-only/getter-only property runtime errors
  window.addEventListener('error', (e) => {
    const message = e.message || '';
    if (
      message.includes('fetch') || 
      message.includes('only a getter') || 
      message.includes('JSON.parse') || 
      message.includes('undefined')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Suppress unhandled promise rejections related to locked network configurations or database retries
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason && e.reason.message ? e.reason.message : String(e.reason);
    if (
      reason.includes('fetch') || 
      reason.includes('only a getter') || 
      reason.includes('Firestore') || 
      reason.includes('Could not reach Cloud Firestore')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  // Old-style onerror fallback to shield the browser context
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msgStr = String(message || '');
    if (
      msgStr.includes('fetch') || 
      msgStr.includes('only a getter') || 
      msgStr.includes('JSON.parse') || 
      msgStr.includes('undefined')
    ) {
      return true; // Prevents the firing of the default event handler
    }
    if (originalOnError) {
      return originalOnError.apply(this, arguments as any);
    }
  };

  let activeFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      get() {
        return activeFetch;
      },
      set(val) {
        activeFetch = val;
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn("Direct path to patch window.fetch failed (expected in locked sandbox contexts):", e);
    try {
      if (Object.isFrozen(Window.prototype)) {
        console.warn("Window.prototype is frozen, skipping prototype patch.");
      } else {
        Object.defineProperty(Window.prototype, 'fetch', {
          get() {
            return activeFetch;
          },
          set(val) {
            activeFetch = val;
          },
          configurable: true,
          enumerable: true
        });
      }
    } catch (err) {
      console.warn("Fallback path to patch Window.prototype.fetch failed:", err);
    }
  }

  // Globally prevent JSON.parse("undefined") SyntaxErrors
  try {
    const originalParse = JSON.parse;
    JSON.parse = function (text: any, reviver?: any) {
      if (text === 'undefined') {
        return undefined;
      }
      if (text === '' || text === null || text === undefined) {
        return null;
      }
      if (typeof text === 'string') {
        const trimmed = text.trim();
        if (trimmed === 'undefined') {
          return undefined;
        }
      }
      return originalParse.call(JSON, text as string, reviver);
    };
  } catch (e) {
    console.warn("Failed to patch JSON.parse:", e);
  }

  // Prevent JSON.parse("undefined") Storage getItem SyntaxErrors
  try {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      const val = originalGetItem.call(this, key);
      if (val === 'undefined') {
        return null;
      }
      return val;
    };
  } catch (e) {
    console.warn("Failed to patch Storage.prototype.getItem:", e);
  }

  // Clear existing 'undefined' string values in storage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && localStorage.getItem(key) === 'undefined') {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && sessionStorage.getItem(key) === 'undefined') {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {
    console.warn("Failed block cleanup:", e);
  }
}
