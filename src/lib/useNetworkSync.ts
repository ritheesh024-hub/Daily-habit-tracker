import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionStatus, PendingSyncItem } from '../types';
import {
  getPendingCount,
  subscribeToSyncQueue,
  processPendingSyncQueue,
} from './syncQueueService';

interface UseNetworkSyncOptions {
  userId: string | null;
  onSyncComplete?: () => void;
}

export function useNetworkSync({ userId, onSyncComplete }: UseNetworkSyncOptions) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(
    userId ? getPendingCount(userId) : 0
  );
  const [offlineActionToast, setOfflineActionToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Derive connection status
  const connectionStatus: ConnectionStatus = !isOnline
    ? 'offline'
    : isSyncing
    ? 'syncing'
    : 'online';

  const triggerSync = useCallback(async () => {
    if (!userId || !navigator.onLine || isSyncing) return;

    const count = getPendingCount(userId);
    if (count === 0) return;

    setIsSyncing(true);
    try {
      const result = await processPendingSyncQueue(userId);
      if (result.processedCount > 0 && onSyncComplete) {
        onSyncComplete();
      }
    } catch (err) {
      console.warn('Background sync notice:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [userId, isSyncing, onSyncComplete]);

  // Subscribe to pending queue changes for the active user
  useEffect(() => {
    if (!userId) {
      setPendingCount(0);
      return;
    }

    const unsubscribe = subscribeToSyncQueue(userId, (queue: PendingSyncItem[]) => {
      setPendingCount(queue.length);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // Listen to network status changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Wait a moment for network handshake to settle before synchronizing
      setTimeout(() => {
        triggerSync();
      }, 750);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  // Retry when page becomes visible or focused
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        triggerSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [triggerSync]);

  // Periodic retry for pending items (every 30 seconds if online)
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      if (navigator.onLine && getPendingCount(userId) > 0) {
        triggerSync();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, triggerSync]);

  // Show a momentary offline feedback message
  const showOfflineFeedback = useCallback((message = 'Offline — will sync when connected') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setOfflineActionToast(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setOfflineActionToast(null);
      toastTimeoutRef.current = null;
    }, 3500);
  }, []);

  return {
    isOnline,
    isSyncing,
    connectionStatus,
    pendingCount,
    offlineActionToast,
    showOfflineFeedback,
    syncNow: triggerSync,
  };
}
