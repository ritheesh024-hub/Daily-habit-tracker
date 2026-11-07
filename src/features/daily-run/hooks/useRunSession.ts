import { useState, useEffect, useRef, useCallback } from 'react';
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
} from '../types';
import { gpsTrackerService } from '../services/gpsTrackerService';
import { validateGPSCoordinate } from '../utils/geoUtils';
import {
  calculateAveragePace,
  calculateAverageSpeed,
  calculateRollingSpeedAndPace,
  estimateRunCalories,
} from '../utils/runStats';
import { getDefaultRunTitle } from '../utils/formatters';

interface UseRunSessionOptions {
  userId?: string;
  userWeightKg?: number | null;
  filterConfig?: GPSFilterConfig;
}

export function useRunSession(options: UseRunSessionOptions = {}) {
  const {
    userId = 'guest',
    userWeightKg = null,
    filterConfig = DEFAULT_GPS_FILTER_CONFIG,
  } = options;

  // Running State Machine: idle -> acquiring_gps -> running -> paused -> finished
  const [status, setStatus] = useState<RunStatus>('idle');
  const [gpsStatus, setGpsStatus] = useState<GPSStatus>('acquiring');
  const [gpsError, setGpsError] = useState<string | null>(null);

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

  // Refs for current values inside GPS callbacks to avoid stale closures
  const statusRef = useRef<RunStatus>('idle');
  statusRef.current = status;

  const gpsStatusRef = useRef<GPSStatus>('acquiring');
  gpsStatusRef.current = gpsStatus;

  const lastValidPointRef = useRef<GPSCoordinate | null>(null);
  const currentSegmentIdRef = useRef<string>('seg_0');

  // Interval timer for UI duration updates and periodic statistical recalculations
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
      }, 1000);
    }

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [status, userWeightKg]);

  // Handle incoming GPS Coordinate
  const handleGPSPosition = useCallback(
    (coord: GPSCoordinate) => {
      setCurrentPosition(coord);

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

      // Case 1: Was ACQUIRING_GPS -> First valid point starts active run!
      if (statusRef.current === 'acquiring_gps') {
        if (coord.accuracy != null && coord.accuracy > filterConfig.maxAccuracyMeters) {
          return; // Wait for higher accuracy fix
        }

        const now = Date.now();
        activeSegmentStartTimeRef.current = now;
        accumulatedActiveMsRef.current = 0;
        lastValidPointRef.current = coord;
        setStartPosition(coord);

        rollingPointsRef.current = [coord];

        const initialSeg: RouteSegment = {
          id: `seg_${now}`,
          points: [coord],
        };
        currentSegmentIdRef.current = initialSeg.id;
        setSegments([initialSeg]);

        setStatus('running');
        setGpsError(null);
        return;
      }

      // Case 2: WHILE RUNNING -> Validate and update rolling statistics and route
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
          return prevSegments.map((seg) => {
            if (seg.id === currentSegmentIdRef.current) {
              return {
                ...seg,
                points: [...seg.points, coord],
              };
            }
            return seg;
          });
        });
      }
    },
    [filterConfig, durationSeconds, userWeightKg]
  );

  // Handle GPS Tracker Error
  const handleGPSError = useCallback((error: { code: GPSErrorCode; message: string }) => {
    setGpsStatus('lost');
    gpsStatusRef.current = 'lost';
    setGpsError(error.message);

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

  // START RUN ACTION
  const startRun = useCallback(() => {
    if (!gpsTrackerService.isSupported()) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    const now = new Date();
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
    setGpsStatus('acquiring');
    gpsStatusRef.current = 'acquiring';

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

    // Enter acquiring_gps state
    setStatus('acquiring_gps');

    // Request GPS permission and start live tracking
    gpsTrackerService.startTracking(handleGPSPosition, handleGPSError);
  }, [handleGPSPosition, handleGPSError, userWeightKg]);

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
    }
  }, [status]);

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
    }
  }, [status]);

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

    setStatus('finished');
  }, [userWeightKg]);

  // RESET / DISCARD
  const resetRun = useCallback(() => {
    gpsTrackerService.stopTracking();
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
    setCurrentPosition(null);
    setStartPosition(null);
    setSegments([]);
    setStartTime(null);
    setEndTime(null);
    setTitle(getDefaultRunTitle());

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
  }, [userWeightKg]);

  const discardRun = useCallback(() => {
    resetRun();
  }, [resetRun]);

  // Clean up GPS watcher on unmount to prevent leaks and duplicate subscriptions
  useEffect(() => {
    return () => {
      gpsTrackerService.stopTracking();
    };
  }, []);

  // Prepare completed RunSession object for saving/export
  const completedSession: RunSession | null =
    status === 'finished'
      ? {
          id: `run_${Date.now()}`,
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
          routeCoordinates: segments.flatMap((s) => s.points),
          segments,
          createdAt: startTime || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null;

  return {
    status,
    gpsStatus,
    gpsError,
    setGpsError,
    durationSeconds,
    metrics,
    currentPosition,
    startPosition,
    segments,
    title,
    setTitle,
    startTime,
    endTime,
    completedSession,
    // Actions
    startRun,
    pauseRun,
    resumeRun,
    finishRun,
    resetRun,
    discardRun,
  };
}
