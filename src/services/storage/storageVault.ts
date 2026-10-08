/**
 * مخزن ایزوله کش داده‌ها با مقاومت در برابر محدودیت‌های آی‌فریم و مرورگر
 * (Ashk24 Secure Resilient Storage Vault)
 */

const inMemoryCache = new Map<string, string>();

export const storageVault = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {}
    return inMemoryCache.get(key) || null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
        return;
      }
    } catch (e) {}
    inMemoryCache.set(key, val);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    inMemoryCache.delete(key);
  },
  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    inMemoryCache.clear();
  },
};
