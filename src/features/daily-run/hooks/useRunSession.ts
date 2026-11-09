import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  RunStatus,
  GPSStatus,
  GPSErrorCode,
  GPSCoordinate,
  RouteSegment,
  RunMetrics,
  RunSession,
  GPSFilterConfig,
  DEFAULT_GPS_FILTER_CONFIG,
  PersistedActiveSession,
  LocationPermissionState,
  KilometerSplit,
} from '../types';
import { gpsTrackerService, GPSErrorPayload } from '../services/gpsTrackerService';
import { runIndexedDB } from '../services/runIndexedDB';
import { validateGPSCoordinate } from '../utils/geoUtils';
import {
  calculateAveragePace,
  calculateAverageSpeed,
  calculateRollingSpeedAndPace,
  estimateRunCalories,
  calculateKilometerSplits,
} from '../utils/runStats';
import { getDefaultRunTitle } from '../utils/formatters';

interface UseRunSessionOptions {
  userId?: string;
  userWeightKg?: number | null;
  filterConfig?: GPSFilterConfig;
  autoStandbyGPS?: boolean;
}

export function useRunSession(options: UseRunSessionOptions = {}) {
  const {
    userId = 'guest',
    userWeightKg = null,
    filterConfig = DEFAULT_GPS_FILTER_CONFIG,
    autoStandbyGPS = true,
  } = options;

  // Running State Machine: idle -> acquiring_gps -> running -> paused -> finished
  const [status, setStatus] = useState<RunStatus>('idle');
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('acquiring');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('checking');

  // Position and Route State
  const [currentPosition, setCurrentPosition] = useState<GPSCoordinate | null>(null);
  const [startPosition, setStartPosition] = useState<GPSCoordinate | null>(null);
  const [segments, setSegments] = useState<RouteSegment[]>([]);

  // High-accuracy Duration Tracking
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const accumulatedActiveMsRef = useRef<number>(0);
  const activeSegmentStartTimeRef = useRef<number | null>(null);

  // Rolling GPS points buffer for current speed and pace estimation
  const rollingPointsRef = useRef<GPSCoordinate[]>([]);

  // Total cumulative distance in metres
  const [totalDistanceMeters, setTotalDistanceMeters] = useState<number>(0);
  const totalDistanceMetersRef = useRef<number>(0);
  totalDistanceMetersRef.current = totalDistanceMeters;

  // Real-time calculated metrics
  const [metrics, setMetrics] = useState<RunMetrics>({
    distanceKm: 0,
    durationSeconds: 0,
    currentSpeedKmh: null,
    averageSpeedKmh: null,
    currentPaceMinPerKm: null,
    averagePaceMinPerKm: null,
    caloriesBurned: null,
    caloriesExplanation: userWeightKg ? undefined : 'Set weight in Profile for calorie estimate',
    isStationary: false,
    elevationGainMeters: null,
  });

  // Run Metadata
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [title, setTitle] = useState<string>(() => getDefaultRunTitle());

  // Recoverable Session state (if unfinished run found in IndexedDB)
  const [recoverableSession, setRecoverableSession] = useState<PersistedActiveSession | null>(null);

  // Refs for current values inside GPS callbacks and timers to avoid stale closures
  const currentRunIdRef = useRef<string>('');
  const statusRef = useRef<RunStatus>('idle');
  statusRef.current = status;

  const gpsStatusRef = useRef<GPSStatus>('acquiring');
  gpsStatusRef.current = gpsStatus;

  const startTimeRef = useRef<string | null>(null);
  startTimeRef.current = startTime;

  const titleRef = useRef<string>(title);
  titleRef.current = title;

  const segmentsRef = useRef<RouteSegment[]>([]);
  segmentsRef.current = segments;

  const startPositionRef = useRef<GPSCoordinate | null>(null);
  startPositionRef.current = startPosition;

  const currentPositionRef = useRef<GPSCoordinate | null>(null);
  currentPositionRef.current = currentPosition;

  const metricsRef = useRef<RunMetrics>(metrics);
  metricsRef.current = metrics;

  const lastValidPointRef = useRef<GPSCoordinate | null>(null);
  const currentSegmentIdRef = useRef<string>('seg_0');
  const lastPersistTimeRef = useRef<number>(0);

  // Persists active session state to IndexedDB for seamless recovery across reloads
  const persistActiveSession = useCallback(
    (overrideStatus?: RunStatus) => {
      const activeStatus = overrideStatus || statusRef.current;
      if (activeStatus !== 'running' && activeStatus !== 'paused') {
        return;
      }

      const now = Date.now();
      const currentSegmentElapsed = activeSegmentStartTimeRef.current
        ? now - activeSegmentStartTimeRef.current
        : 0;
      const totalElapsedMs = accumulatedActiveMsRef.current + currentSegmentElapsed;
      const currentSecs = Math.floor(totalElapsedMs / 1000);

      const persisted: PersistedActiveSession = {
        runId: currentRunIdRef.current || `run_${now}`,
        userId,
        title: titleRef.current,
        status: activeStatus,
        startTime: startTimeRef.current,
        endTime: null,
        durationSeconds: currentSecs,
        accumulatedActiveMs: accumulatedActiveMsRef.current,
        activeSegmentStartTime: activeSegmentStartTimeRef.current,
        totalDistanceMeters: totalDistanceMetersRef.current,
        metrics: {
          ...metricsRef.current,
          distanceKm: totalDistanceMetersRef.current / 1000,
          durationSeconds: currentSecs,
        },
        segments: segmentsRef.current,
        startPosition: startPositionRef.current,
        currentPosition: currentPositionRef.current,
        lastSavedAt: now,
      };

      runIndexedDB.saveActiveSession(persisted).catch((err) => {
        console.warn('Failed to persist active session:', err);
      });
      lastPersistTimeRef.current = now;
    },
    [userId]
  );

  // Check for unfinished active session in IndexedDB on initial mount
  useEffect(() => {
    if (statusRef.current !== 'idle') return;

    let isMounted = true;
    runIndexedDB.getActiveSession(userId).then((saved) => {
      if (!isMounted || !saved) return;
      if (saved.status === 'running' || saved.status === 'paused') {
        if (
          saved.durationSeconds > 0 ||
          saved.totalDistanceMeters > 0 ||
          (saved.segments && saved.segments.length > 0)
        ) {
          setRecoverableSession(saved);
        } else {
          runIndexedDB.clearActiveSession(userId);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Handle incoming GPS Coordinate
  const handleGPSPosition = useCallback(
    (coord: GPSCoordinate) => {
      setCurrentPosition(coord);
      currentPositionRef.current = coord;

      if (coord.accuracy != null) {
        setAccuracyMeters(coord.accuracy);
      }

      // Evaluate signal quality based on accuracy radius
      let signalQuality: GPSStatus = 'ready';
      if (coord.accuracy != null) {
        if (coord.accuracy <= filterConfig.weakSignalAccuracyMeters) {
          signalQuality = 'ready';
        } else if (coord.accuracy <= filterConfig.maxAccuracyMeters) {
          signalQuality = 'weak';
        } else {
          signalQuality = 'weak';
        }
      }
      setGpsStatus(signalQuality);
      gpsStatusRef.current = signalQuality;
      setPermissionState('granted');
      setGpsError(null);

      // Case 1: Standby / Idle (User opened Run screen, not yet started)
      if (statusRef.current === 'idle') {
        // Only update current preview position on map, do not advance distance or segments
        return;
      }

      // Case 2: Was ACQUIRING_GPS -> First valid point starts active run!
      if (statusRef.current === 'acquiring_gps') {
        if (coord.accuracy != null && coord.accuracy > filterConfig.maxAccuracyMeters) {
          return; // Wait for higher accuracy fix
        }

        const now = Date.now();
        activeSegmentStartTimeRef.current = now;
        accumulatedActiveMsRef.current = 0;
        lastValidPointRef.current = coord;
        setStartPosition(coord);
        startPositionRef.current = coord;

        rollingPointsRef.current = [coord];

        const initialSeg: RouteSegment = {
          id: `seg_${now}`,
          points: [coord],
        };
        currentSegmentIdRef.current = initialSeg.id;
        setSegments([initialSeg]);
        segmentsRef.current = [initialSeg];

        setStatus('running');
        setGpsError(null);
        return;
      }

      // Case 3: WHILE RUNNING -> Validate and update rolling statistics and route
      if (statusRef.current === 'running') {
        const validation = validateGPSCoordinate(coord, lastValidPointRef.current, filterConfig);

        if (!validation.isValid) {
          // Inaccurate or impossible jump rejected
          return;
        }

        // Add to rolling window for real-time speed and pace calculation
        rollingPointsRef.current.push(coord);
        if (rollingPointsRef.current.length > 8) {
          rollingPointsRef.current.shift();
        }

        const rolling = calculateRollingSpeedAndPace(
          rollingPointsRef.current,
          signalQuality
        );

        if (validation.isStationaryJitter) {
          // Stationary jitter filtered: live marker updates, distance does not advance
          setMetrics((prev) => ({
            ...prev,
            currentSpeedKmh: 0,
            currentPaceMinPerKm: null,
            isStationary: true,
          }));
          return;
        }

        // Valid movement: accumulate distance
        const newDistanceMetres = totalDistanceMetersRef.current + validation.distanceDeltaMetres;
        totalDistanceMetersRef.current = newDistanceMetres;
        setTotalDistanceMeters(newDistanceMetres);

        lastValidPointRef.current = coord;

        const distanceKm = newDistanceMetres / 1000;
        const calorieResult = estimateRunCalories(distanceKm, userWeightKg);

        setMetrics((prev) => ({
          ...prev,
          distanceKm,
          currentSpeedKmh: rolling.currentSpeedKmh,
          currentPaceMinPerKm: rolling.currentPaceMinPerKm,
          isStationary: rolling.isStationary,
          averagePaceMinPerKm: calculateAveragePace(distanceKm, durationSeconds),
          averageSpeedKmh: calculateAverageSpeed(distanceKm, durationSeconds),
          caloriesBurned: calorieResult.calories,
          caloriesExplanation: calorieResult.explanation,
        }));

        // Append to active route segment
        setSegments((prevSegments) => {
          const updated = prevSegments.map((seg) => {
            if (seg.id === currentSegmentIdRef.current) {
              return {
                ...seg,
                points: [...seg.points, coord],
              };
            }
            return seg;
          });
          segmentsRef.current = updated;
          return updated;
        });
      }
    },
    [filterConfig, durationSeconds, userWeightKg]
  );

  // Handle GPS Tracker Error
  const handleGPSError = useCallback((error: GPSErrorPayload) => {
    if (error.code === 'permission_denied') {
      setPermissionState('denied');
      setGpsStatus('lost');
      gpsStatusRef.current = 'lost';
      setGpsError(error.message);
    } else {
      setGpsStatus('lost');
      gpsStatusRef.current = 'lost';
      setGpsError(error.message);
    }

    // Freeze current speed/pace when GPS signal is lost
    setMetrics((prev) => ({
      ...prev,
      currentSpeedKmh: null,
      currentPaceMinPerKm: null,
    }));

    // If permission was denied while starting, reset to idle
    if (statusRef.current === 'acquiring_gps' && error.code === 'permission_denied') {
      gpsTrackerService.stopTracking();
      setStatus('idle');
    }
  }, []);

  // AUTOMATIC GPS DETECTION ON MOUNT (Standby Mode)
  useEffect(() => {
    if (!autoStandbyGPS) return;

    let isMounted = true;

    // Check permission state first
    gpsTrackerService.checkPermissionState().then((perm) => {
      if (!isMounted) return;
      setPermissionState(perm);

      if (perm === 'denied') {
        setGpsStatus('lost');
        setGpsError(
          'Location access is denied. Please enable location permissions in your browser or device settings.'
        );
        return;
      }

      // If granted or promptable, start standby preview tracking
      if (statusRef.current === 'idle') {
        setGpsStatus('acquiring');
        gpsTrackerService.startStandbyTracking(handleGPSPosition, handleGPSError);
      }
    });

    return () => {
      isMounted = false;
      // Stop standby tracking on unmount to preserve battery
      gpsTrackerService.stopStandbyTracking();
    };
  }, [autoStandbyGPS, handleGPSPosition, handleGPSError]);

  // Request location permission explicitly (e.g. from UI button)
  const requestLocationPermission = useCallback(async () => {
    setGpsError(null);
    setGpsStatus('acquiring');
    setPermissionState('checking');

    try {
      const pos = await gpsTrackerService.getCurrentPosition(15000);
      handleGPSPosition(pos);
      setPermissionState('granted');
      if (statusRef.current === 'idle') {
        gpsTrackerService.startStandbyTracking(handleGPSPosition, handleGPSError);
      }
    } catch (err: any) {
      handleGPSError(err);
    }
  }, [handleGPSPosition, handleGPSError]);

  // Interval timer for UI duration updates, periodic stats calculation, and active session persistence
  useEffect(() => {
    let intervalId: number | null = null;

    if (status === 'running') {
      intervalId = window.setInterval(() => {
        const now = Date.now();
        const currentSegmentElapsed = activeSegmentStartTimeRef.current
          ? now - activeSegmentStartTimeRef.current
          : 0;
        const totalElapsedMs = accumulatedActiveMsRef.current + currentSegmentElapsed;
        const currentSecs = Math.floor(totalElapsedMs / 1000);
        setDurationSeconds(currentSecs);

        const distanceKm = totalDistanceMetersRef.current / 1000;
        const calorieResult = estimateRunCalories(distanceKm, userWeightKg);

        // Prune rolling points older than 12 seconds to prevent stale speed when stopped
        if (rollingPointsRef.current.length > 0) {
          const freshestPoint = rollingPointsRef.current[rollingPointsRef.current.length - 1];
          // If no point arrived in 5 seconds, runner is likely stationary or signal dropped
          if (now - freshestPoint.timestamp > 5000) {
            rollingPointsRef.current = [];
          } else {
            rollingPointsRef.current = rollingPointsRef.current.filter(
              (p) => now - p.timestamp <= 12000
            );
          }
        }

        const rolling = calculateRollingSpeedAndPace(
          rollingPointsRef.current,
          gpsStatusRef.current
        );

        setMetrics((prev) => ({
          ...prev,
          durationSeconds: currentSecs,
          averagePaceMinPerKm: calculateAveragePace(distanceKm, currentSecs),
          averageSpeedKmh: calculateAverageSpeed(distanceKm, currentSecs),
          currentSpeedKmh: rolling.currentSpeedKmh,
          currentPaceMinPerKm: rolling.currentPaceMinPerKm,
          isStationary: rolling.isStationary,
          caloriesBurned: calorieResult.calories,
          caloriesExplanation: calorieResult.explanation,
        }));

        // Periodically persist active session every 5 seconds
        if (now - lastPersistTimeRef.current >= 5000) {
          persistActiveSession('running');
        }
      }, 1000);
    }

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [status, userWeightKg, persistActiveSession]);

  // START RUN ACTION
  const startRun = useCallback(() => {
    if (!gpsTrackerService.isSupported()) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    const now = new Date();
    const newRunId = `run_${now.getTime()}`;
    currentRunIdRef.current = newRunId;
    setRecoverableSession(null);

    setStartTime(now.toISOString());
    setEndTime(null);
    setTitle(getDefaultRunTitle(now));
    setDurationSeconds(0);
    setTotalDistanceMeters(0);
    totalDistanceMetersRef.current = 0;
    accumulatedActiveMsRef.current = 0;
    activeSegmentStartTimeRef.current = null;
    lastValidPointRef.current = null;
    rollingPointsRef.current = [];
    setSegments([]);
    setGpsError(null);

    const calorieResult = estimateRunCalories(0, userWeightKg);
    setMetrics({
      distanceKm: 0,
      durationSeconds: 0,
      currentSpeedKmh: null,
      averageSpeedKmh: null,
      currentPaceMinPerKm: null,
      averagePaceMinPerKm: null,
      caloriesBurned: calorieResult.calories,
      caloriesExplanation: calorieResult.explanation,
      isStationary: false,
      elevationGainMeters: null,
    });

    // Check if we already have a solid standby GPS fix
    const existingFix = currentPositionRef.current;
    if (existingFix && existingFix.accuracy != null && existingFix.accuracy <= filterConfig.maxAccuracyMeters) {
      activeSegmentStartTimeRef.current = Date.now();
      lastValidPointRef.current = existingFix;
      setStartPosition(existingFix);
      startPositionRef.current = existingFix;
      rollingPointsRef.current = [existingFix];

      const initialSeg: RouteSegment = {
        id: `seg_${Date.now()}`,
        points: [existingFix],
      };
      currentSegmentIdRef.current = initialSeg.id;
      setSegments([initialSeg]);
      segmentsRef.current = [initialSeg];

      setStatus('running');
      setGpsStatus('ready');
      gpsStatusRef.current = 'ready';
      gpsTrackerService.startTracking(handleGPSPosition, handleGPSError);
    } else {
      // Enter acquiring_gps state until first accurate coordinate arrives
      setStatus('acquiring_gps');
      setGpsStatus('acquiring');
      gpsStatusRef.current = 'acquiring';
      gpsTrackerService.startTracking(handleGPSPosition, handleGPSError);
    }
  }, [handleGPSPosition, handleGPSError, userWeightKg, filterConfig]);

  // PAUSE RUN ACTION
  const pauseRun = useCallback(() => {
    if (status === 'running') {
      // Freeze active duration
      if (activeSegmentStartTimeRef.current) {
        accumulatedActiveMsRef.current += Date.now() - activeSegmentStartTimeRef.current;
        activeSegmentStartTimeRef.current = null;
      }

      // Reset rolling window & clear current speed and pace
      rollingPointsRef.current = [];
      lastValidPointRef.current = null;

      setMetrics((prev) => ({
        ...prev,
        currentSpeedKmh: null,
        currentPaceMinPerKm: null,
        isStationary: false,
      }));

      setStatus('paused');
      persistActiveSession('paused');
    }
  }, [status, persistActiveSession]);

  // RESUME RUN ACTION
  const resumeRun = useCallback(() => {
    if (status === 'paused') {
      const now = Date.now();
      activeSegmentStartTimeRef.current = now;

      // Reset rolling window & start a new RouteSegment
      rollingPointsRef.current = [];
      lastValidPointRef.current = null;

      const newSegId = `seg_${now}`;
      currentSegmentIdRef.current = newSegId;
      setSegments((prev) => [...prev, { id: newSegId, points: [] }]);

      setStatus('running');
      persistActiveSession('running');
    }
  }, [status, persistActiveSession]);

  // FINISH RUN ACTION
  const finishRun = useCallback(() => {
    // 1. Stop GPS watcher immediately
    gpsTrackerService.stopTracking();

    // 2. Finalize elapsed active duration
    if (activeSegmentStartTimeRef.current) {
      accumulatedActiveMsRef.current += Date.now() - activeSegmentStartTimeRef.current;
      activeSegmentStartTimeRef.current = null;
    }

    const finalDurationSecs = Math.floor(accumulatedActiveMsRef.current / 1000);
    const finalDistanceKm = totalDistanceMetersRef.current / 1000;
    const calorieResult = estimateRunCalories(finalDistanceKm, userWeightKg);

    setDurationSeconds(finalDurationSecs);
    setEndTime(new Date().toISOString());

    setMetrics((prev) => ({
      ...prev,
      distanceKm: finalDistanceKm,
      durationSeconds: finalDurationSecs,
      currentSpeedKmh: null,
      currentPaceMinPerKm: null,
      averagePaceMinPerKm: calculateAveragePace(finalDistanceKm, finalDurationSecs),
      averageSpeedKmh: calculateAverageSpeed(finalDistanceKm, finalDurationSecs),
      caloriesBurned: calorieResult.calories,
      caloriesExplanation: calorieResult.explanation,
      isStationary: false,
    }));

    // Clear active session from IndexedDB now that run has concluded
    runIndexedDB.clearActiveSession(userId);

    setStatus('finished');
  }, [userWeightKg, userId]);

  // RESET / DISCARD
  const resetRun = useCallback(() => {
    gpsTrackerService.stopTracking();
    runIndexedDB.clearActiveSession(userId);

    setStatus('idle');
    setGpsStatus('acquiring');
    gpsStatusRef.current = 'acquiring';
    setGpsError(null);
    setDurationSeconds(0);
    setTotalDistanceMeters(0);
    totalDistanceMetersRef.current = 0;
    accumulatedActiveMsRef.current = 0;
    activeSegmentStartTimeRef.current = null;
    lastValidPointRef.current = null;
    rollingPointsRef.current = [];
    setStartPosition(null);
    setSegments([]);
    setStartTime(null);
    setEndTime(null);
    setTitle(getDefaultRunTitle());
    currentRunIdRef.current = '';

    const calorieResult = estimateRunCalories(0, userWeightKg);
    setMetrics({
      distanceKm: 0,
      durationSeconds: 0,
      currentSpeedKmh: null,
      averageSpeedKmh: null,
      currentPaceMinPerKm: null,
      averagePaceMinPerKm: null,
      caloriesBurned: calorieResult.calories,
      caloriesExplanation: calorieResult.explanation,
      isStationary: false,
      elevationGainMeters: null,
    });

    // Resume standby tracking if enabled
    if (autoStandbyGPS) {
      gpsTrackerService.startStandbyTracking(handleGPSPosition, handleGPSError);
    }
  }, [userWeightKg, userId, autoStandbyGPS, handleGPSPosition, handleGPSError]);

  const discardRun = useCallback(() => {
    resetRun();
  }, [resetRun]);

  // RECOVER UNFINISHED SESSION (from IndexedDB)
  const recoverSession = useCallback(() => {
    if (!recoverableSession) return;

    currentRunIdRef.current = recoverableSession.runId;
    setStartTime(recoverableSession.startTime);
    setTitle(recoverableSession.title || getDefaultRunTitle());
    setDurationSeconds(recoverableSession.durationSeconds);
    setTotalDistanceMeters(recoverableSession.totalDistanceMeters);
    totalDistanceMetersRef.current = recoverableSession.totalDistanceMeters;
    accumulatedActiveMsRef.current =
      recoverableSession.accumulatedActiveMs || recoverableSession.durationSeconds * 1000;
    setSegments(recoverableSession.segments || []);
    setStartPosition(recoverableSession.startPosition);
    setCurrentPosition(recoverableSession.currentPosition);

    setMetrics(recoverableSession.metrics);

    // If recovering while running, resume active tracking
    if (recoverableSession.status === 'running') {
      activeSegmentStartTimeRef.current = Date.now();
      setStatus('running');
      gpsTrackerService.startTracking(handleGPSPosition, handleGPSError);
    } else {
      setStatus('paused');
    }

    setRecoverableSession(null);
  }, [recoverableSession, handleGPSPosition, handleGPSError]);

  const discardRecoverableSession = useCallback(() => {
    runIndexedDB.clearActiveSession(userId);
    setRecoverableSession(null);
  }, [userId]);

  // Prepare completed RunSession object for saving/export
  const completedSession: RunSession | null = useMemo(() => {
    if (status !== 'finished') return null;

    const allPoints = segments.flatMap((s) => s.points);
    return {
      id: currentRunIdRef.current || `run_${Date.now()}`,
      userId,
      title,
      status: 'finished',
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date().toISOString(),
      metrics: {
        ...metrics,
        distanceKm: totalDistanceMetersRef.current / 1000,
        durationSeconds,
      },
      routeCoordinates: allPoints,
      segments,
      createdAt: startTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [status, userId, title, startTime, endTime, metrics, durationSeconds, segments]);

  // Calculate 1.0 km splits from route coordinates
  const splits: KilometerSplit[] = useMemo(() => {
    const points = completedSession?.routeCoordinates || segments.flatMap((s) => s.points);
    return calculateKilometerSplits(points);
  }, [completedSession, segments]);

  return {
    status,
    gpsStatus,
    gpsError,
    setGpsError,
    accuracyMeters,
    permissionState,
    requestLocationPermission,
    durationSeconds,
    metrics,
    currentPosition,
    startPosition,
    segments,
    splits,
    title,
    setTitle,
    startTime,
    endTime,
    completedSession,
    // Session Recovery
    recoverableSession,
    recoverSession,
    discardRecoverableSession,
    // Actions
    startRun,
    pauseRun,
    resumeRun,
    finishRun,
    resetRun,
    discardRun,
  };
}
