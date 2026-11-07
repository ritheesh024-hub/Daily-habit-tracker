export type RunStatus = 'idle' | 'acquiring_gps' | 'running' | 'paused' | 'finished';

export type GPSStatus = 'acquiring' | 'ready' | 'weak' | 'lost';

export type GPSErrorCode = 'permission_denied' | 'position_unavailable' | 'timeout' | 'unsupported' | null;

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
  getActiveRunSession: (userId: string) => RunSession | null;
  saveActiveRunSession: (session: RunSession) => void;
  clearActiveRunSession: (userId: string) => void;
  getRunHistory: (userId: string) => RunSession[];
  saveCompletedRun: (session: RunSession) => Promise<void>;
  deleteRun: (userId: string, runId: string) => Promise<void>;
}

/**
 * Interface contract for Firebase Cloud Sync (Phase 3)
 */
export interface IRunFirebaseSyncService {
  syncRunToCloud: (session: RunSession) => Promise<{ success: boolean; cloudId?: string; error?: string }>;
  fetchUserRunsFromCloud: (userId: string) => Promise<RunSession[]>;
}
