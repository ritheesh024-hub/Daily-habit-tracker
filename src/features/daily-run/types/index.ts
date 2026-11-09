export type { UserProfile } from '../../../types';

export type RunStatus = 'idle' | 'acquiring_gps' | 'running' | 'paused' | 'finished';

export type GPSStatus = 'acquiring' | 'ready' | 'weak' | 'lost';

export type GPSErrorCode = 'permission_denied' | 'position_unavailable' | 'timeout' | 'unsupported' | null;

export type LocationPermissionState = 'checking' | 'granted' | 'prompt' | 'denied' | 'unsupported';

export interface KilometerSplit {
  splitNumber: number; // e.g. 1 for 1st km
  distanceKm: number; // e.g. 1.0 or partial final split
  durationSeconds: number;
  paceSecondsPerKm: number | null;
  averageSpeedKmh: number | null;
}

export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp: number;
}

export interface GPSFilterConfig {
  maxAccuracyMeters: number; // e.g. 30m
  minDistanceDeltaMeters: number; // e.g. 2.5m - filters stationary jitter
  maxSpeedMetersPerSec: number; // e.g. 12 m/s (~43.2 km/h) - rejects unrealistic GPS jumps
  weakSignalAccuracyMeters: number; // e.g. 20m - marks signal as weak if between 20m and 30m
}

export const DEFAULT_GPS_FILTER_CONFIG: GPSFilterConfig = {
  maxAccuracyMeters: 30,
  minDistanceDeltaMeters: 2.5,
  maxSpeedMetersPerSec: 12,
  weakSignalAccuracyMeters: 20,
};

export interface RouteSegment {
  id: string;
  points: GPSCoordinate[];
}

export interface RunMetrics {
  distanceKm: number;
  durationSeconds: number;
  currentSpeedKmh: number | null;
  averageSpeedKmh: number | null;
  currentPaceMinPerKm: number | null; // rolling window current pace
  averagePaceMinPerKm: number | null; // active duration / total distance
  caloriesBurned: number | null;
  caloriesExplanation?: string;
  isStationary?: boolean;
  elevationGainMeters?: number | null;
}

export interface RunSession {
  id: string;
  userId: string;
  title: string;
  status: RunStatus;
  startTime: string; // ISO 8601
  endTime?: string | null; // ISO 8601
  metrics: RunMetrics;
  routeCoordinates: GPSCoordinate[];
  segments?: RouteSegment[];
  notes?: string;
  isSynced?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FirestoreRunPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number | null;
}

export interface FirestoreRunDocument {
  runId: string;
  userId: string;
  title: string;
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSecondsPerKm: number | null;
  averageSpeedKmh: number | null;
  caloriesEstimate: number | null;
  caloriesExplanation?: string | null;
  notes?: string | null;
  routeCoordinates: FirestoreRunPoint[];
  routePointCount: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
  updatedAt: string;
  status: 'completed';
}

/**
 * Phase 5: Cloud Synchronization Statuses
 */
export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed';

/**
 * Local IndexedDB Completed Run Record
 */
export interface LocalRunRecord extends FirestoreRunDocument {
  syncStatus: SyncStatus;
  syncError?: string | null;
  lastSyncAttempt?: string | null;
  syncedAt?: string | null;
  retryCount?: number;
}

/**
 * Persisted Active Run Session in IndexedDB (for recovery after reload/crash)
 */
export interface PersistedActiveSession {
  runId: string;
  userId: string;
  title: string;
  status: RunStatus;
  startTime: string | null;
  endTime: string | null;
  durationSeconds: number;
  accumulatedActiveMs: number;
  activeSegmentStartTime: number | null;
  totalDistanceMeters: number;
  metrics: RunMetrics;
  segments: RouteSegment[];
  startPosition: GPSCoordinate | null;
  currentPosition: GPSCoordinate | null;
  lastSavedAt: number;
}

/**
 * Interface contract for Live GPS Location Tracker
 */
export interface IGPSTracker {
  isSupported: () => boolean;
  startTracking: (
    onPosition: (pos: GPSCoordinate) => void,
    onError: (error: { code: GPSErrorCode; message: string }) => void
  ) => void;
  stopTracking: () => void;
  getCurrentPosition: () => Promise<GPSCoordinate>;
}

/**
 * Interface contract for Local Storage & Persistence
 */
export interface IRunStorageService {
  getActiveRunSession: (userId: string) => Promise<PersistedActiveSession | null> | RunSession | null;
  saveActiveRunSession: (session: RunSession) => void;
  clearActiveRunSession: (userId: string) => void;
  getRunHistory: (userId: string) => RunSession[];
  saveCompletedRun: (session: RunSession) => Promise<void>;
  deleteRun: (userId: string, runId: string) => Promise<void>;
}

/**
 * Interface contract for Firebase Cloud Sync (Phase 4 & 5)
 */
export interface IRunFirebaseSyncService {
  syncRunToCloud: (session: RunSession) => Promise<{ success: boolean; cloudId?: string; error?: string }>;
  fetchUserRunsFromCloud: (userId: string) => Promise<RunSession[]>;
}

export * from './routes';


