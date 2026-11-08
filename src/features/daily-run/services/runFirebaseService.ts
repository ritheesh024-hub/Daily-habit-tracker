import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { RunSession, FirestoreRunDocument, FirestoreRunPoint, GPSCoordinate } from '../types';
import { runStorageService } from './runStorageService';
import { runIndexedDB } from './runIndexedDB';
import { calculateHaversineDistance } from '../utils/runStats';

/**
 * Sanitizes and downsamples raw GPS coordinates to:
 * 1. Filter out invalid, NaN, or non-finite values.
 * 2. Prune redundant stationary jitter coordinates (< 2.5m apart).
 * 3. Enforce a safe maximum point cap (e.g. 1500 points) to keep Firestore documents lightweight (< 50KB).
 */
export function sanitizeRouteCoordinates(rawCoords: GPSCoordinate[]): FirestoreRunPoint[] {
  if (!Array.isArray(rawCoords) || rawCoords.length === 0) {
    return [];
  }

  const validPoints: FirestoreRunPoint[] = [];

  for (const pt of rawCoords) {
    if (
      pt &&
      typeof pt.latitude === 'number' &&
      isFinite(pt.latitude) &&
      pt.latitude >= -90 &&
      pt.latitude <= 90 &&
      typeof pt.longitude === 'number' &&
      isFinite(pt.longitude) &&
      pt.longitude >= -180 &&
      pt.longitude <= 180 &&
      typeof pt.timestamp === 'number' &&
      isFinite(pt.timestamp)
    ) {
      // Discard duplicates if distance to previous is negligible (< 1.5m)
      if (validPoints.length > 0) {
        const prev = validPoints[validPoints.length - 1];
        const dist = calculateHaversineDistance(prev, pt);
        if (dist < 1.5) {
          continue;
        }
      }

      validPoints.push({
        latitude: Number(pt.latitude.toFixed(6)),
        longitude: Number(pt.longitude.toFixed(6)),
        timestamp: pt.timestamp,
        accuracy:
          typeof pt.accuracy === 'number' && isFinite(pt.accuracy)
            ? Math.round(pt.accuracy)
            : null,
      });
    }
  }

  // If point count exceeds 1500, downsample evenly
  if (validPoints.length > 1500) {
    const step = Math.ceil(validPoints.length / 1500);
    const downsampled: FirestoreRunPoint[] = [];
    for (let i = 0; i < validPoints.length; i += step) {
      downsampled.push(validPoints[i]);
    }
    // Always keep the very last point
    const last = validPoints[validPoints.length - 1];
    if (downsampled[downsampled.length - 1] !== last) {
      downsampled.push(last);
    }
    return downsampled;
  }

  return validPoints;
}

export interface SaveRunResult {
  success: boolean;
  runId: string;
  error?: string;
}

export interface FetchRunsResult {
  runs: FirestoreRunDocument[];
  hasMore: boolean;
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export const runFirebaseService = {
  /**
   * Saves a completed run session to Firestore under /users/{userId}/runs/{runId}
   */
  async saveRun(userId: string, session: RunSession): Promise<SaveRunResult> {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return {
        success: false,
        runId: session.id,
        error: 'Please sign in with your Google account to save runs to the cloud.',
      };
    }

    if (!session || (session.status !== 'finished' && session.status !== ('completed' as any))) {
      return {
        success: false,
        runId: session.id,
        error: 'Only finished runs can be saved as completed.',
      };
    }

    const runId = session.id || `run_${Date.now()}`;
    const sanitizedCoords = sanitizeRouteCoordinates(
      session.routeCoordinates && session.routeCoordinates.length > 0
        ? session.routeCoordinates
        : session.segments?.flatMap((s) => s.points) || []
    );

    const distanceMeters = Math.max(0, Math.round(session.metrics.distanceKm * 1000));
    const durationSeconds = Math.max(0, Math.round(session.metrics.durationSeconds));

    let averagePaceSecondsPerKm: number | null = null;
    if (
      session.metrics.averagePaceMinPerKm != null &&
      isFinite(session.metrics.averagePaceMinPerKm) &&
      session.metrics.averagePaceMinPerKm > 0
    ) {
      averagePaceSecondsPerKm = Math.round(session.metrics.averagePaceMinPerKm * 60);
    }

    let averageSpeedKmh: number | null = null;
    if (
      session.metrics.averageSpeedKmh != null &&
      isFinite(session.metrics.averageSpeedKmh) &&
      session.metrics.averageSpeedKmh > 0
    ) {
      averageSpeedKmh = Number(session.metrics.averageSpeedKmh.toFixed(2));
    }

    const caloriesEstimate =
      session.metrics.caloriesBurned != null &&
      isFinite(session.metrics.caloriesBurned) &&
      session.metrics.caloriesBurned > 0
        ? Math.round(session.metrics.caloriesBurned)
        : null;

    const runDocData: FirestoreRunDocument = {
      runId,
      userId,
      title: session.title?.trim() || 'Daily Run',
      distanceMeters,
      durationSeconds,
      averagePaceSecondsPerKm,
      averageSpeedKmh,
      caloriesEstimate,
      caloriesExplanation: session.metrics.caloriesExplanation || null,
      notes: session.notes?.trim() || null,
      routeCoordinates: sanitizedCoords,
      routePointCount: sanitizedCoords.length,
      startedAt: session.startTime || new Date().toISOString(),
      endedAt: session.endTime || new Date().toISOString(),
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'completed',
    };

    try {
      const runDocRef = doc(db, 'users', userId, 'runId' in session && session.id ? session.id : runId);
      await setDoc(runDocRef, runDocData);

      // Persist to IndexedDB as synced
      await runIndexedDB.saveCompletedRun({
        ...runDocData,
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
      });

      // Also persist to legacy local storage for backward compatibility
      await runStorageService.saveCompletedRun({
        ...session,
        id: runId,
        userId,
        isSynced: true,
      });

      return {
        success: true,
        runId,
      };
    } catch (error: any) {
      console.error('Failed to save run to Firestore:', error);
      const isPermission =
        error?.code === 'permission-denied' ||
        String(error?.message).includes('insufficient permissions');

      // On failure, save locally as pending sync
      await runIndexedDB.saveCompletedRun({
        ...runDocData,
        syncStatus: 'pending',
        syncError: isPermission
          ? 'Permission denied. Ensure you are signed in.'
          : 'Network unavailable. Saved locally, will auto-sync.',
      });

      return {
        success: false,
        runId,
        error: isPermission
          ? 'Permission denied. Make sure you are signed into your account.'
          : 'Unable to connect to the cloud. Saved locally to your device and will auto-sync when online.',
      };
    }
  },

  /**
   * Directly uploads an existing validated run document (used by offline sync worker)
   */
  async saveRunDocument(userId: string, runDoc: FirestoreRunDocument): Promise<SaveRunResult> {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return {
        success: false,
        runId: runDoc.runId,
        error: 'Please sign in with your Google account to sync runs.',
      };
    }

    if (runDoc.userId !== userId) {
      return {
        success: false,
        runId: runDoc.runId,
        error: 'Run record belongs to a different user account.',
      };
    }

    try {
      const runDocRef = doc(db, 'users', userId, 'runs', runDoc.runId);
      await setDoc(runDocRef, {
        ...runDoc,
        updatedAt: new Date().toISOString(),
      });

      await runIndexedDB.updateRunSyncStatus(runDoc.runId, 'synced');

      return {
        success: true,
        runId: runDoc.runId,
      };
    } catch (error: any) {
      console.error('Failed to sync run document to Firestore:', error);
      const isPermission =
        error?.code === 'permission-denied' ||
        String(error?.message).includes('insufficient permissions');

      await runIndexedDB.updateRunSyncStatus(
        runDoc.runId,
        'failed',
        isPermission ? 'Permission denied.' : error?.message || 'Sync failed.'
      );

      return {
        success: false,
        runId: runDoc.runId,
        error: isPermission ? 'Permission denied.' : 'Network error during cloud sync.',
      };
    }
  },

  /**
   * Fetches the user's completed run history, sorted by newest first with pagination.
   */
  async fetchUserRuns(
    userId: string,
    pageSize = 15,
    afterDoc?: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<FetchRunsResult> {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return { runs: [], hasMore: false, lastDoc: null };
    }

    try {
      const runsCol = collection(db, 'users', userId, 'runs');
      let q = query(runsCol, orderBy('startedAt', 'desc'), limit(pageSize));

      if (afterDoc) {
        q = query(runsCol, orderBy('startedAt', 'desc'), startAfter(afterDoc), limit(pageSize));
      }

      const snapshot = await getDocs(q);
      const runs: FirestoreRunDocument[] = [];

      snapshot.forEach((d) => {
        const data = d.data() as FirestoreRunDocument;
        runs.push(data);
      });

      const hasMore = snapshot.docs.length === pageSize;
      const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

      return {
        runs,
        hasMore,
        lastDoc,
      };
    } catch (error: any) {
      console.warn('Error fetching runs with orderBy(startedAt), falling back:', error);

      // Fallback query if composite index is pending: fetch without explicit order then sort client-side
      try {
        const runsCol = collection(db, 'users', userId, 'runs');
        const fallbackQuery = query(runsCol, limit(pageSize));
        const snapshot = await getDocs(fallbackQuery);
        const runs: FirestoreRunDocument[] = [];

        snapshot.forEach((d) => {
          runs.push(d.data() as FirestoreRunDocument);
        });

        runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

        return {
          runs,
          hasMore: false,
          lastDoc: null,
        };
      } catch (e2) {
        console.error('Failed to fetch runs fallback:', e2);
        throw e2;
      }
    }
  },

  /**
   * Fetches single run details including full route coordinates.
   */
  async fetchRunDetails(userId: string, runId: string): Promise<FirestoreRunDocument | null> {
    try {
      const runDocRef = doc(db, 'users', userId, 'runs', runId);
      const snapshot = await getDoc(runDocRef);
      if (!snapshot.exists()) {
        return null;
      }
      return snapshot.data() as FirestoreRunDocument;
    } catch (e) {
      console.error('Failed to fetch run details:', e);
      return null;
    }
  },

  /**
   * Deletes a run document from Firestore.
   */
  async deleteRun(userId: string, runId: string): Promise<boolean> {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== userId) {
      return false;
    }

    try {
      const runDocRef = doc(db, 'users', userId, 'runs', runId);
      await deleteDoc(runDocRef);
      await runStorageService.deleteRun(userId, runId);
      await runIndexedDB.deleteCompletedRun(runId);
      return true;
    } catch (e) {
      console.error('Failed to delete run:', e);
      return false;
    }
  },
};
