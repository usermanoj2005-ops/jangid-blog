// Prevent read-only window.fetch assignment errors in sandbox/iframe environments
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return originalFetch;
      },
      set(val) {
        console.warn("Muted attempt to overwrite window.fetch:", val);
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.warn("Failed to patch window.fetch property descriptor:", e);
  }

  // Prevent JSON.parse("undefined") SyntaxErrors
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
