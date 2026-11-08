import { auth } from '../../../lib/firebase';
import { runIndexedDB } from './runIndexedDB';
import { runFirebaseService } from './runFirebaseService';
import { LocalRunRecord } from '../types';

export type SyncEvent =
  | { type: 'sync_start'; pendingCount: number }
  | { type: 'sync_item_success'; runId: string }
  | { type: 'sync_item_failed'; runId: string; error: string }
  | { type: 'sync_complete'; syncedCount: number; failedCount: number }
  | { type: 'connectivity_change'; isOnline: boolean };

type SyncListener = (event: SyncEvent) => void;

class RunSyncManager {
  private isSyncing = false;
  private listeners = new Set<SyncListener>();
  private maxRetries = 3;
  private initialized = false;

  constructor() {
    this.initNetworkListeners();
  }

  private initNetworkListeners() {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    window.addEventListener('online', () => {
      this.emit({ type: 'connectivity_change', isOnline: true });
      // When back online, auto-sync pending runs for the active user
      const currentUser = auth.currentUser;
      if (currentUser?.uid) {
        this.syncPendingRuns(currentUser.uid).catch((err) => {
          console.warn('Auto-sync on connectivity restored encountered error:', err);
        });
      }
    });

    window.addEventListener('offline', () => {
      this.emit({ type: 'connectivity_change', isOnline: false });
    });
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: SyncEvent) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in sync event listener:', e);
      }
    });
  }

  /**
   * Synchronizes all pending or failed completed runs for the authenticated user
   */
  public async syncPendingRuns(targetUserId: string): Promise<{
    syncedCount: number;
    failedCount: number;
  }> {
    if (this.isSyncing) {
      return { syncedCount: 0, failedCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { syncedCount: 0, failedCount: 0 };
    }

    const currentUser = auth.currentUser;
    // Strict account isolation: Never sync if user is not logged in or ID does not match
    if (!currentUser || currentUser.uid !== targetUserId || targetUserId === 'guest') {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const pendingRuns = await runIndexedDB.getPendingSyncRuns(targetUserId);

      if (pendingRuns.length === 0) {
        this.isSyncing = false;
        return { syncedCount: 0, failedCount: 0 };
      }

      this.emit({ type: 'sync_start', pendingCount: pendingRuns.length });

      for (const run of pendingRuns) {
        // Enforce max retry boundary to prevent infinite sync loops
        if ((run.retryCount || 0) >= this.maxRetries) {
          failedCount++;
          continue;
        }

        // Account mismatch safety check
        if (run.userId !== currentUser.uid) {
          console.warn(`Skipping run ${run.runId}: UID ${run.userId} does not match active UID ${currentUser.uid}`);
          continue;
        }

        // Mark as actively syncing in local storage
        await runIndexedDB.updateRunSyncStatus(run.runId, 'syncing');

        try {
          const result = await runFirebaseService.saveRunDocument(currentUser.uid, run);

          if (result.success) {
            syncedCount++;
            this.emit({ type: 'sync_item_success', runId: run.runId });
          } else {
            failedCount++;
            this.emit({
              type: 'sync_item_failed',
              runId: run.runId,
              error: result.error || 'Failed to upload run to Firestore',
            });
          }
        } catch (itemErr: any) {
          failedCount++;
          await runIndexedDB.updateRunSyncStatus(
            run.runId,
            'failed',
            itemErr?.message || 'Network exception during sync'
          );
          this.emit({
            type: 'sync_item_failed',
            runId: run.runId,
            error: itemErr?.message || 'Network exception during sync',
          });
        }
      }

      this.emit({ type: 'sync_complete', syncedCount, failedCount });
      return { syncedCount, failedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Manual force-retry for a specific run ID
   */
  public async retrySingleRun(targetUserId: string, runId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== targetUserId) {
      return false;
    }

    const run = await runIndexedDB.getRunById(runId);
    if (!run || run.userId !== currentUser.uid) {
      return false;
    }

    await runIndexedDB.updateRunSyncStatus(runId, 'syncing');

    try {
      const result = await runFirebaseService.saveRunDocument(currentUser.uid, run);
      if (result.success) {
        this.emit({ type: 'sync_item_success', runId });
        return true;
      } else {
        this.emit({ type: 'sync_item_failed', runId, error: result.error || 'Retry failed' });
        return false;
      }
    } catch (e: any) {
      await runIndexedDB.updateRunSyncStatus(runId, 'failed', e?.message || 'Retry error');
      return false;
    }
  }

  public isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }
}

export const runSyncService = new RunSyncManager();
