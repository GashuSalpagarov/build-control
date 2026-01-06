import { CreateResourceCheckDto } from './types';

const DB_NAME = 'build-control-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-checks';

interface PendingCheck {
  id: string;
  data: CreateResourceCheckDto;
  createdAt: string;
  synced: boolean;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve();
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  async savePendingCheck(data: CreateResourceCheckDto): Promise<string> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('IndexedDB not available');

    return new Promise((resolve, reject) => {
      const id = `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pendingCheck: PendingCheck = {
        id,
        data,
        createdAt: new Date().toISOString(),
        synced: false,
      };

      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(pendingCheck);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(id);
    });
  }

  async getPendingChecks(): Promise<PendingCheck[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async markAsSynced(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const check = getRequest.result;
        if (check) {
          check.synced = true;
          const updateRequest = store.put(check);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        } else {
          resolve();
        }
      };
    });
  }

  async deletePendingCheck(id: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearSyncedChecks(): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    const syncedChecks = await this.getAllSyncedChecks();
    for (const check of syncedChecks) {
      await this.deletePendingCheck(check.id);
    }
  }

  private async getAllSyncedChecks(): Promise<PendingCheck[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
}

export const offlineStorage = new OfflineStorage();

// Хук для синхронизации при восстановлении сети
export function setupOfflineSync(syncFunction: (check: PendingCheck) => Promise<void>): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    console.log('Online: syncing pending checks...');
    try {
      const pendingChecks = await offlineStorage.getPendingChecks();
      for (const check of pendingChecks) {
        try {
          await syncFunction(check);
          await offlineStorage.markAsSynced(check.id);
        } catch (err) {
          console.error('Failed to sync check:', check.id, err);
        }
      }
      // Очищаем синхронизированные проверки
      await offlineStorage.clearSyncedChecks();
    } catch (err) {
      console.error('Sync error:', err);
    }
  };

  window.addEventListener('online', handleOnline);

  // Вернём функцию для очистки слушателя
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

// Проверка состояния сети
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
