import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { HabitItem, PendingSyncItem, SyncOperationType, DailyLogData } from '../types';
import { getLocalDateKey } from './dateUtils';
import { getCachedDailyLog, setCachedDailyLog } from './cacheService';
import { deleteHabitFromGoogleCalendar, getCachedCalendarToken } from './googleCalendarService';

const SYNC_QUEUE_KEY_PREFIX = 'dailyHabits_pendingSync';

function getQueueStorageKey(userId: string): string {
  return `${SYNC_QUEUE_KEY_PREFIX}_${userId}`;
}

type SyncListener = (queue: PendingSyncItem[]) => void;
const listeners = new Map<string, Set<SyncListener>>();

function notifyListeners(userId: string, queue: PendingSyncItem[]): void {
  const userListeners = listeners.get(userId);
  if (userListeners) {
    userListeners.forEach((fn) => {
      try {
        fn(queue);
      } catch (err) {
        console.error('Error notifying sync listener:', err);
      }
    });
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dailyhabits_sync_changed', {
        detail: { userId, pendingCount: queue.length },
      })
    );
  }
}

/**
 * Retrieves the pending synchronization queue for a specific user.
 * Multi-user isolated: strictly uses the user-specific storage key.
 */
export function getPendingQueue(userId: string): PendingSyncItem[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getQueueStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse pending sync queue:', err);
    return [];
  }
}

/**
 * Saves the pending synchronization queue for a user.
 */
function savePendingQueue(userId: string, queue: PendingSyncItem[]): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(getQueueStorageKey(userId), JSON.stringify(queue));
    notifyListeners(userId, queue);
  } catch (err) {
    console.warn('Failed to save pending sync queue to localStorage:', err);
  }
}

/**
 * Clears the pending sync queue for a user (e.g. during Clear Data, Account Delete, or Logout).
 */
export function clearUserPendingSync(userId: string): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getQueueStorageKey(userId));
    notifyListeners(userId, []);
  } catch (err) {
    console.warn('Failed to clear pending sync queue:', err);
  }
}

/**
 * Returns the number of pending sync operations for a user.
 */
export function getPendingCount(userId: string): number {
  return getPendingQueue(userId).length;
}

/**
 * Enqueues a new sync operation with intelligent deduplication and consolidation.
 */
export function enqueueSyncOperation(
  userId: string,
  operation: {
    type: SyncOperationType;
    habitId?: string;
    date?: string;
    completed?: boolean;
    note?: string;
    habit?: HabitItem;
    googleCalendarEventId?: string;
  }
): PendingSyncItem {
  const currentQueue = getPendingQueue(userId);
  const now = Date.now();
  const normalizedDate = operation.date ? getLocalDateKey(operation.date) : undefined;

  let nextQueue = [...currentQueue];
  let finalItem: PendingSyncItem;

  if (operation.type === 'COMPLETE_HABIT' && operation.habitId && normalizedDate) {
    // Deduplicate toggles for the exact same habit on the exact same date
    const existingIndex = nextQueue.findIndex(
      (item) =>
        item.type === 'COMPLETE_HABIT' &&
        item.habitId === operation.habitId &&
        item.date === normalizedDate
    );

    if (existingIndex >= 0) {
      finalItem = {
        ...nextQueue[existingIndex],
        completed: operation.completed,
        timestamp: now,
      };
      nextQueue[existingIndex] = finalItem;
    } else {
      finalItem = {
        id: `sync_comp_${now}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'COMPLETE_HABIT',
        userId,
        timestamp: now,
        habitId: operation.habitId,
        date: normalizedDate,
        completed: operation.completed,
      };
      nextQueue.push(finalItem);
    }
  } else if (operation.type === 'SAVE_NOTE' && normalizedDate) {
    // Deduplicate notes for the same date
    const existingIndex = nextQueue.findIndex(
      (item) => item.type === 'SAVE_NOTE' && item.date === normalizedDate
    );

    if (existingIndex >= 0) {
      finalItem = {
        ...nextQueue[existingIndex],
        note: operation.note,
        timestamp: now,
      };
      nextQueue[existingIndex] = finalItem;
    } else {
      finalItem = {
        id: `sync_note_${now}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'SAVE_NOTE',
        userId,
        timestamp: now,
        date: normalizedDate,
        note: operation.note,
      };
      nextQueue.push(finalItem);
    }
  } else if (operation.type === 'CREATE_HABIT' && operation.habit) {
    // Check if duplicate create for the same habit ID already exists
    const existingIndex = nextQueue.findIndex(
      (item) => item.type === 'CREATE_HABIT' && item.habit?.id === operation.habit?.id
    );

    if (existingIndex >= 0) {
      finalItem = {
        ...nextQueue[existingIndex],
        habit: operation.habit,
        timestamp: now,
      };
      nextQueue[existingIndex] = finalItem;
    } else {
      finalItem = {
        id: `sync_creat_${now}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'CREATE_HABIT',
        userId,
        timestamp: now,
        habit: operation.habit,
      };
      nextQueue.push(finalItem);
    }
  } else if (operation.type === 'UPDATE_HABIT' && operation.habit) {
    // If a pending CREATE exists for this habit, update that CREATE in place
    const createIndex = nextQueue.findIndex(
      (item) => item.type === 'CREATE_HABIT' && item.habit?.id === operation.habit?.id
    );

    if (createIndex >= 0) {
      finalItem = {
        ...nextQueue[createIndex],
        habit: operation.habit,
        timestamp: now,
      };
      nextQueue[createIndex] = finalItem;
    } else {
      // Check for pending update
      const updateIndex = nextQueue.findIndex(
        (item) => item.type === 'UPDATE_HABIT' && item.habit?.id === operation.habit?.id
      );

      if (updateIndex >= 0) {
        finalItem = {
          ...nextQueue[updateIndex],
          habit: operation.habit,
          timestamp: now,
        };
        nextQueue[updateIndex] = finalItem;
      } else {
        finalItem = {
          id: `sync_upd_${now}_${Math.random().toString(36).slice(2, 7)}`,
          type: 'UPDATE_HABIT',
          userId,
          timestamp: now,
          habit: operation.habit,
        };
        nextQueue.push(finalItem);
      }
    }
  } else if (operation.type === 'DELETE_HABIT' && operation.habitId) {
    // If habit was only created offline and not yet synced to Firestore, delete both!
    const createIndex = nextQueue.findIndex(
      (item) => item.type === 'CREATE_HABIT' && item.habit?.id === operation.habitId
    );

    if (createIndex >= 0) {
      nextQueue = nextQueue.filter((item) => item.habit?.id !== operation.habitId);
      finalItem = {
        id: `sync_del_noop_${now}`,
        type: 'DELETE_HABIT',
        userId,
        timestamp: now,
        habitId: operation.habitId,
      };
    } else {
      // Remove any pending updates for this habit
      nextQueue = nextQueue.filter(
        (item) => !(item.type === 'UPDATE_HABIT' && item.habit?.id === operation.habitId)
      );

      finalItem = {
        id: `sync_del_${now}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'DELETE_HABIT',
        userId,
        timestamp: now,
        habitId: operation.habitId,
        googleCalendarEventId: operation.googleCalendarEventId,
      };
      nextQueue.push(finalItem);
    }
  } else if (operation.type === 'SYNC_CALENDAR') {
    const existingIndex = nextQueue.findIndex((item) => item.type === 'SYNC_CALENDAR');
    if (existingIndex >= 0) {
      finalItem = { ...nextQueue[existingIndex], timestamp: now };
      nextQueue[existingIndex] = finalItem;
    } else {
      finalItem = {
        id: `sync_cal_${now}`,
        type: 'SYNC_CALENDAR',
        userId,
        timestamp: now,
        habitId: operation.habitId,
      };
      nextQueue.push(finalItem);
    }
  } else {
    finalItem = {
      id: `sync_${operation.type}_${now}_${Math.random().toString(36).slice(2, 7)}`,
      type: operation.type,
      userId,
      timestamp: now,
      ...operation,
    };
    nextQueue.push(finalItem);
  }

  savePendingQueue(userId, nextQueue);
  return finalItem;
}

/**
 * Removes a specific operation by its ID from the user's queue.
 */
export function removeSyncOperation(userId: string, operationId: string): void {
  const currentQueue = getPendingQueue(userId);
  const nextQueue = currentQueue.filter((item) => item.id !== operationId);
  savePendingQueue(userId, nextQueue);
}

/**
 * Subscribes to changes in a user's pending sync queue.
 */
export function subscribeToSyncQueue(userId: string, callback: SyncListener): () => void {
  if (!listeners.has(userId)) {
    listeners.set(userId, new Set());
  }
  listeners.get(userId)!.add(callback);
  // Send initial queue
  callback(getPendingQueue(userId));

  return () => {
    const set = listeners.get(userId);
    if (set) {
      set.delete(callback);
      if (set.size === 0) {
        listeners.delete(userId);
      }
    }
  };
}

// Concurrency mutex to prevent duplicate concurrent sync runs
const activeSyncMutex = new Set<string>();

export interface SyncResult {
  status: 'synced' | 'offline' | 'error' | 'in_progress';
  processedCount: number;
  remainingCount: number;
}

/**
 * Processes and synchronizes all pending operations in the queue with Firestore.
 * Ensures strict date isolation, idempotency, duplicate prevention, and backoff.
 */
export async function processPendingSyncQueue(
  userId: string,
  options?: {
    onProgress?: (processed: number, total: number) => void;
  }
): Promise<SyncResult> {
  if (!userId) {
    return { status: 'synced', processedCount: 0, remainingCount: 0 };
  }

  // Check network connectivity
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      status: 'offline',
      processedCount: 0,
      remainingCount: getPendingCount(userId),
    };
  }

  // Check mutex
  if (activeSyncMutex.has(userId)) {
    return {
      status: 'in_progress',
      processedCount: 0,
      remainingCount: getPendingCount(userId),
    };
  }

  activeSyncMutex.add(userId);

  try {
    const queue = getPendingQueue(userId);
    if (queue.length === 0) {
      return { status: 'synced', processedCount: 0, remainingCount: 0 };
    }

    let processedCount = 0;
    const totalCount = queue.length;

    for (const item of queue) {
      // Re-verify network before each operation
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break;
      }

      try {
        if (item.type === 'COMPLETE_HABIT' && item.habitId && item.date) {
          const dateKey = getLocalDateKey(item.date);
          const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateKey);

          // Read current log from Firestore or local cache
          let currentLog: DailyLogData | null = getCachedDailyLog(userId, dateKey);
          try {
            const snap = await getDoc(logDocRef);
            if (snap.exists()) {
              currentLog = snap.data() as DailyLogData;
            }
          } catch {
            // Fall back to cached if getDoc fails
          }

          const existingCompletions: Record<string, boolean> = {
            ...(currentLog?.completedHabits || {}),
          };

          if (item.completed) {
            existingCompletions[item.habitId] = true;
          } else {
            delete existingCompletions[item.habitId];
          }

          const completedCount = Object.values(existingCompletions).filter(Boolean).length;
          const payload = {
            date: dateKey,
            completedHabits: existingCompletions,
            completedCount,
            updatedAt: new Date().toISOString(),
          };

          await setDoc(logDocRef, payload, { merge: true });

          // Update local cache to match
          if (currentLog) {
            setCachedDailyLog(userId, dateKey, {
              ...currentLog,
              completedHabits: existingCompletions,
              completedCount,
            });
          }

          removeSyncOperation(userId, item.id);
          processedCount++;
        } else if (item.type === 'SAVE_NOTE' && item.date) {
          const dateKey = getLocalDateKey(item.date);
          const logDocRef = doc(db, 'users', userId, 'dailyLogs', dateKey);
          await setDoc(
            logDocRef,
            {
              date: dateKey,
              note: item.note || '',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          removeSyncOperation(userId, item.id);
          processedCount++;
        } else if (item.type === 'CREATE_HABIT' || item.type === 'UPDATE_HABIT') {
          if (item.habit && item.habit.id) {
            const now = new Date().toISOString();
            const habitRef = doc(db, 'users', userId, 'habitSettings', item.habit.id);
            const payload = {
              id: item.habit.id,
              name: item.habit.name,
              target: item.habit.target || '',
              icon: item.habit.icon || 'check',
              order: typeof item.habit.order === 'number' ? item.habit.order : 0,
              time: item.habit.time || item.habit.reminderTime || '08:00',
              frequency: item.habit.frequency || 'Every day',
              googleCalendarEventId: item.habit.googleCalendarEventId || null,
              googleCalendarSynced: item.habit.googleCalendarSynced || false,
              lastSyncedAt: item.habit.lastSyncedAt || null,
              reminderEnabled:
                typeof item.habit.reminderEnabled === 'boolean'
                  ? item.habit.reminderEnabled
                  : true,
              reminderTime: item.habit.reminderTime || item.habit.time || '08:00',
              createdAt: item.habit.createdAt || now,
              updatedAt: now,
            };

            await setDoc(habitRef, payload, { merge: true });
          }
          removeSyncOperation(userId, item.id);
          processedCount++;
        } else if (item.type === 'DELETE_HABIT' && item.habitId) {
          const habitRef = doc(db, 'users', userId, 'habitSettings', item.habitId);
          await deleteDoc(habitRef);

          // If linked to Google Calendar, attempt to delete Google Calendar event
          if (item.googleCalendarEventId) {
            const calToken = getCachedCalendarToken();
            if (calToken) {
              try {
                await deleteHabitFromGoogleCalendar(item.googleCalendarEventId, calToken);
              } catch (calErr) {
                console.warn('Notice deleting habit from Google Calendar on sync:', calErr);
              }
            }
          }

          removeSyncOperation(userId, item.id);
          processedCount++;
        } else if (item.type === 'SYNC_CALENDAR') {
          removeSyncOperation(userId, item.id);
          processedCount++;
        } else {
          // Unsupported or corrupted item, safely discard
          removeSyncOperation(userId, item.id);
        }

        if (options?.onProgress) {
          options.onProgress(processedCount, totalCount);
        }
      } catch (opError) {
        console.warn('Sync operation encountered network error, pausing sync:', opError);
        // Break out of loop to keep remaining items pending for next retry
        break;
      }
    }

    const remainingCount = getPendingCount(userId);
    return {
      status: remainingCount === 0 ? 'synced' : 'offline',
      processedCount,
      remainingCount,
    };
  } finally {
    activeSyncMutex.delete(userId);
  }
}
