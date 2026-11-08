import { LocalRunRecord, PersistedActiveSession, SyncStatus, SavedRouteDocument, HomeLocation } from '../types';

const DB_NAME = 'DailyHabitsDailyRunDB';
const DB_VERSION = 2;
const STORE_ACTIVE = 'active_session';
const STORE_RUNS = 'completed_runs';
const STORE_SAVED_ROUTES = 'saved_routes';
const STORE_HOME = 'home_location';

// In-memory fallback map for non-browser / test environments or when IndexedDB is blocked
const memoryStore = {
  activeSessions: new Map<string, PersistedActiveSession>(),
  completedRuns: new Map<string, LocalRunRecord>(),
  savedRoutes: new Map<string, SavedRouteDocument>(),
  homeLocations: new Map<string, HomeLocation>(),
};

function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB unavailable in this environment'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Active Run Session (Keyed by userId)
        if (!db.objectStoreNames.contains(STORE_ACTIVE)) {
          db.createObjectStore(STORE_ACTIVE, { keyPath: 'userId' });
        }

        // Store 2: Completed Run Records (Keyed by runId)
        if (!db.objectStoreNames.contains(STORE_RUNS)) {
          const runStore = db.createObjectStore(STORE_RUNS, { keyPath: 'runId' });
          runStore.createIndex('userId', 'userId', { unique: false });
          runStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          runStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store 3: Saved Favourite Routes (Keyed by routeId)
        if (!db.objectStoreNames.contains(STORE_SAVED_ROUTES)) {
          const routeStore = db.createObjectStore(STORE_SAVED_ROUTES, { keyPath: 'routeId' });
          routeStore.createIndex('userId', 'userId', { unique: false });
          routeStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Store 4: Saved Home Location (Keyed by userId)
        if (!db.objectStoreNames.contains(STORE_HOME)) {
          db.createObjectStore(STORE_HOME, { keyPath: 'userId' });
        }
      };

      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };

        resolve(db);
      };

      request.onerror = (event: Event) => {
        const err = (event.target as IDBOpenDBRequest).error;
        console.warn('IndexedDB failed to open:', err);
        dbPromise = null;
        reject(err);
      };
    } catch (e) {
      dbPromise = null;
      reject(e);
    }
  });

  return dbPromise;
}

export const runIndexedDB = {
  /**
   * Saves or updates an active running session in IndexedDB
   */
  async saveActiveSession(session: PersistedActiveSession): Promise<void> {
    if (!session || !session.userId) return;

    if (!isIndexedDBAvailable()) {
      memoryStore.activeSessions.set(session.userId, session);
      return;
    }

    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_ACTIVE], 'readwrite');
        const store = transaction.objectStore(STORE_ACTIVE);
        const req = store.put(session);

        req.onsuccess = () => resolve();
        req.onerror = () => {
          console.warn('Failed to save active session to IndexedDB:', req.error);
          memoryStore.activeSessions.set(session.userId, session);
          resolve();
        };
      });
    } catch (err) {
      console.warn('IndexedDB saveActiveSession error:', err);
      memoryStore.activeSessions.set(session.userId, session);
    }
  },

  /**
   * Retrieves an unfinished active session for the specified user
   */
  async getActiveSession(userId: string): Promise<PersistedActiveSession | null> {
    const key = userId || 'guest';

    if (!isIndexedDBAvailable()) {
      return memoryStore.activeSessions.get(key) || null;
    }

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_ACTIVE], 'readonly');
        const store = transaction.objectStore(STORE_ACTIVE);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result || memoryStore.activeSessions.get(key) || null);
        };
        req.onerror = () => {
          resolve(memoryStore.activeSessions.get(key) || null);
        };
      });
    } catch {
      return memoryStore.activeSessions.get(key) || null;
    }
  },

  /**
   * Clears the active run session after finish or discard
   */
  async clearActiveSession(userId: string): Promise<void> {
    const key = userId || 'guest';
    memoryStore.activeSessions.delete(key);

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_ACTIVE], 'readwrite');
        const store = transaction.objectStore(STORE_ACTIVE);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  },

  /**
   * Saves a completed run record with sync status ('synced' | 'pending' | 'syncing' | 'failed')
   */
  async saveCompletedRun(record: LocalRunRecord): Promise<void> {
    if (!record || !record.runId) return;

    memoryStore.completedRuns.set(record.runId, record);

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_RUNS], 'readwrite');
        const store = transaction.objectStore(STORE_RUNS);
        const req = store.put(record);

        req.onsuccess = () => resolve();
        req.onerror = () => {
          console.warn('Failed to save completed run to IndexedDB:', req.error);
          resolve();
        };
      });
    } catch (err) {
      console.warn('IndexedDB saveCompletedRun error:', err);
    }
  },

  /**
   * Retrieves all completed runs for a user from local storage, sorted newest first
   */
  async getCompletedRuns(userId: string): Promise<LocalRunRecord[]> {
    const targetUserId = userId || 'guest';

    if (!isIndexedDBAvailable()) {
      const runs = Array.from(memoryStore.completedRuns.values()).filter(
        (r) => r.userId === targetUserId
      );
      return runs.sort(
        (a, b) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime()
      );
    }

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_RUNS], 'readonly');
        const store = transaction.objectStore(STORE_RUNS);
        const index = store.index('userId');
        const req = index.getAll(targetUserId);

        req.onsuccess = () => {
          const results: LocalRunRecord[] = req.result || [];
          results.sort(
            (a, b) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime()
          );
          resolve(results);
        };

        req.onerror = () => {
          const runs = Array.from(memoryStore.completedRuns.values()).filter(
            (r) => r.userId === targetUserId
          );
          resolve(runs);
        };
      });
    } catch {
      const runs = Array.from(memoryStore.completedRuns.values()).filter(
        (r) => r.userId === targetUserId
      );
      return runs;
    }
  },

  /**
   * Retrieves all completed runs waiting to sync for a user
   */
  async getPendingSyncRuns(userId: string): Promise<LocalRunRecord[]> {
    if (!userId || userId === 'guest') return [];

    const allRuns = await this.getCompletedRuns(userId);
    return allRuns.filter(
      (r) => r.syncStatus === 'pending' || r.syncStatus === 'failed'
    );
  },

  /**
   * Updates sync status and optional error message for a run
   */
  async updateRunSyncStatus(
    runId: string,
    syncStatus: SyncStatus,
    error: string | null = null
  ): Promise<void> {
    const mem = memoryStore.completedRuns.get(runId);
    if (mem) {
      mem.syncStatus = syncStatus;
      mem.syncError = error;
      mem.lastSyncAttempt = new Date().toISOString();
      if (syncStatus === 'synced') {
        mem.syncedAt = new Date().toISOString();
      } else if (syncStatus === 'failed') {
        mem.retryCount = (mem.retryCount || 0) + 1;
      }
    }

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_RUNS], 'readwrite');
        const store = transaction.objectStore(STORE_RUNS);
        const getReq = store.get(runId);

        getReq.onsuccess = () => {
          const run = getReq.result as LocalRunRecord | undefined;
          if (!run) {
            resolve();
            return;
          }

          run.syncStatus = syncStatus;
          run.syncError = error;
          run.lastSyncAttempt = new Date().toISOString();
          if (syncStatus === 'synced') {
            run.syncedAt = new Date().toISOString();
          } else if (syncStatus === 'failed') {
            run.retryCount = (run.retryCount || 0) + 1;
          }

          const putReq = store.put(run);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => resolve();
        };

        getReq.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  },

  /**
   * Retrieves a single run by its runId
   */
  async getRunById(runId: string): Promise<LocalRunRecord | null> {
    if (memoryStore.completedRuns.has(runId)) {
      return memoryStore.completedRuns.get(runId) || null;
    }

    if (!isIndexedDBAvailable()) return null;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_RUNS], 'readonly');
        const store = transaction.objectStore(STORE_RUNS);
        const req = store.get(runId);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Deletes a completed run from local IndexedDB
   */
  async deleteCompletedRun(runId: string): Promise<void> {
    memoryStore.completedRuns.delete(runId);

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_RUNS], 'readwrite');
        const store = transaction.objectStore(STORE_RUNS);
        const req = store.delete(runId);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  },

  /**
   * Saves a favourite route locally in IndexedDB
   */
  async saveSavedRouteLocally(route: SavedRouteDocument): Promise<void> {
    if (!route || !route.routeId) return;
    memoryStore.savedRoutes.set(route.routeId, route);

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_SAVED_ROUTES], 'readwrite');
        const store = transaction.objectStore(STORE_SAVED_ROUTES);
        const req = store.put(route);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  },

  /**
   * Retrieves all saved favourite routes for a user, sorted newest first
   */
  async getSavedRoutesLocally(userId: string): Promise<SavedRouteDocument[]> {
    const targetUserId = userId || 'guest';

    if (!isIndexedDBAvailable()) {
      return Array.from(memoryStore.savedRoutes.values())
        .filter((r) => r.userId === targetUserId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_SAVED_ROUTES], 'readonly');
        const store = transaction.objectStore(STORE_SAVED_ROUTES);
        const index = store.index('userId');
        const req = index.getAll(IDBKeyRange.only(targetUserId));

        req.onsuccess = () => {
          const results: SavedRouteDocument[] = req.result || [];
          results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          resolve(results);
        };
        req.onerror = () => {
          const mem = Array.from(memoryStore.savedRoutes.values()).filter((r) => r.userId === targetUserId);
          resolve(mem);
        };
      });
    } catch {
      return Array.from(memoryStore.savedRoutes.values()).filter((r) => r.userId === targetUserId);
    }
  },

  /**
   * Deletes a favourite route from local IndexedDB
   */
  async deleteSavedRouteLocally(routeId: string): Promise<void> {
    memoryStore.savedRoutes.delete(routeId);

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_SAVED_ROUTES], 'readwrite');
        const store = transaction.objectStore(STORE_SAVED_ROUTES);
        const req = store.delete(routeId);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  },

  /**
   * Saves user home location locally
   */
  async saveHomeLocationLocally(userId: string, home: HomeLocation): Promise<void> {
    const key = userId || 'guest';
    memoryStore.homeLocations.set(key, home);

    try {
      localStorage.setItem(`daily_run_home_${key}`, JSON.stringify(home));
    } catch {
      // ignore
    }

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_HOME], 'readwrite');
        const store = transaction.objectStore(STORE_HOME);
        const req = store.put({ userId: key, ...home });
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  },

  /**
   * Retrieves saved home location
   */
  async getHomeLocationLocally(userId: string): Promise<HomeLocation | null> {
    const key = userId || 'guest';
    const inMem = memoryStore.homeLocations.get(key);
    if (inMem) return inMem;

    try {
      const local = localStorage.getItem(`daily_run_home_${key}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed.latitude === 'number') {
          memoryStore.homeLocations.set(key, parsed);
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    if (!isIndexedDBAvailable()) return null;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_HOME], 'readonly');
        const store = transaction.objectStore(STORE_HOME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) {
            const { latitude, longitude, name, address, updatedAt } = req.result;
            resolve({ latitude, longitude, name, address, updatedAt });
          } else {
            resolve(null);
          }
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  /**
   * Deletes saved home location
   */
  async deleteHomeLocationLocally(userId: string): Promise<void> {
    const key = userId || 'guest';
    memoryStore.homeLocations.delete(key);
    try {
      localStorage.removeItem(`daily_run_home_${key}`);
    } catch {
      // ignore
    }

    if (!isIndexedDBAvailable()) return;

    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_HOME], 'readwrite');
        const store = transaction.objectStore(STORE_HOME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  },
};
