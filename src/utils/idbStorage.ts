/**
 * GradeUp Study - Native High-Capacity IndexedDB Storage Engine
 * 
 * Provides resilient, limitless (hundreds of MBs / GBs) client-side persistence
 * for large Question Banks (up to 5,000 - 50,000 MCQs), Mock Tests, and OCR Data,
 * completely bypassing browser localStorage 5MB quota limits.
 */

const DB_NAME = 'GradeUpStudy_DB';
const DB_VERSION = 1;
const STORE_NAME = 'app_keyval_store';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };

        req.onsuccess = () => {
          resolve(req.result);
        };

        req.onerror = () => {
          console.warn('Failed to open IndexedDB:', req.error);
          reject(req.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  return dbPromise;
}

export const idbStorage = {
  get: async <T = any>(key: string): Promise<T | null> => {
    try {
      const db = await getDB();
      return new Promise<T | null>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.get(key);
          req.onsuccess = () => {
            resolve(req.result !== undefined ? req.result : null);
          };
          req.onerror = () => {
            resolve(null);
          };
        } catch {
          resolve(null);
        }
      });
    } catch {
      return null;
    }
  },

  set: async <T = any>(key: string, value: T): Promise<boolean> => {
    try {
      const db = await getDB();
      return new Promise<boolean>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(value, key);
          req.onsuccess = () => {
            resolve(true);
          };
          req.onerror = () => {
            console.warn(`IndexedDB set error for key "${key}":`, req.error);
            resolve(false);
          };
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  },

  delete: async (key: string): Promise<boolean> => {
    try {
      const db = await getDB();
      return new Promise<boolean>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  },

  clear: async (): Promise<boolean> => {
    try {
      const db = await getDB();
      return new Promise<boolean>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.clear();
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
    } catch {
      return false;
    }
  }
};
