import { GPSCoordinate, GPSFilterConfig, DEFAULT_GPS_FILTER_CONFIG } from '../types';

/**
 * Earth's mean radius in metres as specified in the requirements (~6,371,000m)
 */
export const EARTH_RADIUS_METRES = 6371000;

/**
 * Calculate great-circle distance between two GPS coordinates using the Haversine formula.
 * Formula:
 * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 * c = 2 * atan2(√a, √(1−a))
 * distance = Earth's radius * c
 *
 * @returns distance in metres
 */
export function calculateHaversineDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METRES * c;
}

export interface GPSValidationResult {
  isValid: boolean;
  isStationaryJitter: boolean;
  distanceDeltaMetres: number;
  reason?: string;
}

/**
 * Evaluates a new GPS point against configurable safety and accuracy criteria:
 * 1. Accuracy threshold (reject points with accuracy > maxAccuracyMeters)
 * 2. Unrealistic jump / speed filter (reject points moving faster than maxSpeedMetersPerSec)
 * 3. Stationary jitter suppression (does not increment distance if within stationary radius)
 */
export function validateGPSCoordinate(
  newPoint: GPSCoordinate,
  lastValidPoint: GPSCoordinate | null,
  config: GPSFilterConfig = DEFAULT_GPS_FILTER_CONFIG
): GPSValidationResult {
  // 1. Accuracy check
  if (newPoint.accuracy != null && newPoint.accuracy > config.maxAccuracyMeters) {
    return {
      isValid: false,
      isStationaryJitter: false,
      distanceDeltaMetres: 0,
      reason: `Accuracy ${Math.round(newPoint.accuracy)}m exceeds threshold of ${config.maxAccuracyMeters}m`,
    };
  }

  // First point in a segment is always valid
  if (!lastValidPoint) {
    return {
      isValid: true,
      isStationaryJitter: false,
      distanceDeltaMetres: 0,
    };
  }

  const distanceDelta = calculateHaversineDistance(lastValidPoint, newPoint);
  const timeDeltaSec = (newPoint.timestamp - lastValidPoint.timestamp) / 1000;

  // 2. Reject impossible speed jumps (e.g. GPS teleporting)
  if (timeDeltaSec > 0) {
    const speedMps = distanceDelta / timeDeltaSec;
    if (speedMps > config.maxSpeedMetersPerSec) {
      return {
        isValid: false,
        isStationaryJitter: false,
        distanceDeltaMetres: 0,
        reason: `Unrealistic speed of ${speedMps.toFixed(1)} m/s (${(speedMps * 3.6).toFixed(1)} km/h) detected`,
      };
    }
  }

  // 3. Stationary jitter filter (avoid accumulating drift while standing still)
  if (distanceDelta < config.minDistanceDeltaMeters) {
    return {
      isValid: true,
      isStationaryJitter: true,
      distanceDeltaMetres: 0,
      reason: 'Stationary GPS noise filtered',
    };
  }

  return {
    isValid: true,
    isStationaryJitter: false,
    distanceDeltaMetres: distanceDelta,
  };
}

/**
 * Computes average running pace in minutes per kilometre
 */
export function calculateAveragePace(distanceKm: number, durationSeconds: number): number | null {
  if (!distanceKm || distanceKm <= 0.01 || !durationSeconds || durationSeconds <= 0) {
    return null;
  }
  const paceMinutes = (durationSeconds / 60) / distanceKm;
  if (!isFinite(paceMinutes) || paceMinutes > 30) {
    return null;
  }
  return paceMinutes;
}

/**
 * Computes average speed in kilometres per hour
 */
export function calculateAverageSpeed(distanceKm: number, durationSeconds: number): number | null {
  if (!distanceKm || distanceKm <= 0.01 || !durationSeconds || durationSeconds <= 0) {
    return null;
  }
  const hours = durationSeconds / 3600;
  const speed = distanceKm / hours;
  if (!isFinite(speed) || speed > 50) {
    return null;
  }
  return speed;
}

/**
 * Estimates running calories burned based on distance and runner weight
 * Formula: Calories ≈ Distance (km) × Weight (kg) × 1.036
 */
export function estimateCaloriesBurned(distanceKm: number, weightKg = 70): number | null {
  if (!distanceKm || distanceKm <= 0.01) {
    return null;
  }
  const safeWeight = weightKg > 30 && weightKg < 250 ? weightKg : 70;
  return Math.round(distanceKm * safeWeight * 1.036);
}
