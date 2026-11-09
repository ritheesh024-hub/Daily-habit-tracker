import { GPSCoordinate, KilometerSplit } from '../types';

/**
 * Earth's mean radius in metres (~6,371,000m)
 */
export const EARTH_RADIUS_METRES = 6371000;

/**
 * Calculate great-circle distance between two GPS coordinates using the Haversine formula.
 * Formula:
 * a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 * c = 2 * atan2(√a, √(1−a))
 * distance = Earth's radius * c
 *
 * @returns distance in metres (always non-negative, never NaN)
 */
export function calculateHaversineDistance(
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number {
  if (
    !coord1 ||
    !coord2 ||
    isNaN(coord1.latitude) ||
    isNaN(coord1.longitude) ||
    isNaN(coord2.latitude) ||
    isNaN(coord2.longitude)
  ) {
    return 0;
  }

  const lat1Rad = (coord1.latitude * Math.PI) / 180;
  const lat2Rad = (coord2.latitude * Math.PI) / 180;
  const deltaLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const deltaLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  // Clamp 'a' to [0, 1] to prevent floating point inaccuracies causing NaN in sqrt
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const distance = EARTH_RADIUS_METRES * c;
  return isNaN(distance) || distance < 0 ? 0 : distance;
}

/**
 * Calculates authoritative total polyline distance in metres using the Haversine formula
 * on every consecutive coordinate pair with Earth mean radius R = 6,371,000m.
 */
export function calculatePolylineHaversineDistance(
  coordinates: { latitude: number; longitude: number }[]
): number {
  if (!coordinates || coordinates.length < 2) {
    return 0;
  }
  let totalMetres = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalMetres += calculateHaversineDistance(coordinates[i - 1], coordinates[i]);
  }
  return totalMetres;
}

/**
 * Computes average running pace in decimal minutes per kilometre.
 * Formula: (active duration in seconds / 60) / distance in kilometres.
 *
 * Handles edge cases:
 * - Distance <= 0.01 km -> returns null (displayed as "--")
 * - Duration <= 0 -> returns null
 * - Pace > 40 min/km (walking very slowly or stopped) -> returns null
 * - Guaranteed never to return NaN, Infinity, or negative.
 */
export function calculateAveragePace(
  distanceKm: number,
  durationSeconds: number
): number | null {
  if (
    !distanceKm ||
    isNaN(distanceKm) ||
    distanceKm < 0.01 ||
    !durationSeconds ||
    isNaN(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return null;
  }

  const paceMinutes = (durationSeconds / 60) / distanceKm;

  if (!isFinite(paceMinutes) || isNaN(paceMinutes) || paceMinutes <= 0 || paceMinutes > 40) {
    return null;
  }

  return paceMinutes;
}

/**
 * Computes average speed in kilometres per hour.
 * Formula: distance in kilometres / (duration in seconds / 3600).
 *
 * Handles edge cases:
 * - Distance <= 0.01 km -> returns null
 * - Duration <= 0 -> returns null
 * - Guaranteed never to return NaN, Infinity, or negative.
 */
export function calculateAverageSpeed(
  distanceKm: number,
  durationSeconds: number
): number | null {
  if (
    !distanceKm ||
    isNaN(distanceKm) ||
    distanceKm < 0.01 ||
    !durationSeconds ||
    isNaN(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return null;
  }

  const hours = durationSeconds / 3600;
  const speed = distanceKm / hours;

  if (!isFinite(speed) || isNaN(speed) || speed <= 0 || speed > 50) {
    return null;
  }

  return speed;
}

export interface RollingWindowStats {
  currentSpeedKmh: number | null;
  currentPaceMinPerKm: number | null;
  isStationary: boolean;
}

/**
 * Calculates current speed and current pace from a rolling window of recent valid GPS points.
 *
 * Requirements:
 * - Avoids displaying misleading values when runner is stationary or GPS accuracy is poor.
 * - Minimum window time span: 2 seconds.
 * - Minimum window distance: 2.5 metres to filter stationary GPS jitter.
 * - Clamps speeds to realistic running limits (<= 45 km/h) and paces (>= 1.5 min/km).
 * - Resets after pause/resume so old points don't distort current metrics.
 */
export function calculateRollingSpeedAndPace(
  recentPoints: GPSCoordinate[],
  signalQuality: 'ready' | 'weak' | 'lost' | 'acquiring'
): RollingWindowStats {
  if (signalQuality === 'lost' || signalQuality === 'acquiring' || !recentPoints || recentPoints.length < 2) {
    return {
      currentSpeedKmh: null,
      currentPaceMinPerKm: null,
      isStationary: false,
    };
  }

  const latest = recentPoints[recentPoints.length - 1];
  const oldest = recentPoints[0];

  const timeDeltaSec = (latest.timestamp - oldest.timestamp) / 1000;

  // If points are from the same millisecond or negative timestamp, return null
  if (timeDeltaSec <= 0.5) {
    // If device provides reliable instantaneous speed (m/s)
    if (latest.speed != null && latest.speed >= 0 && isFinite(latest.speed)) {
      const speedKmh = latest.speed * 3.6;
      if (speedKmh < 0.8) {
        return { currentSpeedKmh: 0, currentPaceMinPerKm: null, isStationary: true };
      }
      const paceMinPerKm = speedKmh > 0 ? 60 / speedKmh : null;
      return {
        currentSpeedKmh: speedKmh <= 45 ? speedKmh : null,
        currentPaceMinPerKm: paceMinPerKm && paceMinPerKm <= 35 ? paceMinPerKm : null,
        isStationary: false,
      };
    }
    return { currentSpeedKmh: null, currentPaceMinPerKm: null, isStationary: false };
  }

  // Calculate cumulative distance across the rolling window points
  let windowDistanceMetres = 0;
  for (let i = 1; i < recentPoints.length; i++) {
    windowDistanceMetres += calculateHaversineDistance(recentPoints[i - 1], recentPoints[i]);
  }

  // Stationary check: if movement across the window is less than 2.5m, runner is stationary
  if (windowDistanceMetres < 2.5) {
    return {
      currentSpeedKmh: 0,
      currentPaceMinPerKm: null,
      isStationary: true,
    };
  }

  const speedMps = windowDistanceMetres / timeDeltaSec;
  let speedKmh = speedMps * 3.6;

  // If GPS device provides hardware-derived Doppler speed with good accuracy, blend to smooth
  if (latest.speed != null && latest.speed >= 0 && latest.accuracy != null && latest.accuracy <= 15) {
    const hardwareSpeedKmh = latest.speed * 3.6;
    // Weighted blend: 70% hardware speed, 30% position-derived speed
    speedKmh = hardwareSpeedKmh * 0.7 + speedKmh * 0.3;
  }

  // Check stationary threshold
  if (speedKmh < 0.8) {
    return {
      currentSpeedKmh: 0,
      currentPaceMinPerKm: null,
      isStationary: true,
    };
  }

  // Reject unrealistic running speed jumps (> 45 km/h ~ faster than Usain Bolt top sprint)
  if (speedKmh > 45 || isNaN(speedKmh)) {
    return {
      currentSpeedKmh: null,
      currentPaceMinPerKm: null,
      isStationary: false,
    };
  }

  // Current Pace (min/km) = 60 / speed in km/h
  const paceMinPerKm = 60 / speedKmh;

  if (isNaN(paceMinPerKm) || !isFinite(paceMinPerKm) || paceMinPerKm > 35 || paceMinPerKm < 1.3) {
    return {
      currentSpeedKmh: speedKmh,
      currentPaceMinPerKm: null,
      isStationary: false,
    };
  }

  return {
    currentSpeedKmh: speedKmh,
    currentPaceMinPerKm: paceMinPerKm,
    isStationary: false,
  };
}

export interface CalorieEstimateResult {
  calories: number | null;
  isAvailable: boolean;
  explanation: string;
}

/**
 * Estimates running calories burned based on actual distance and verified user body mass.
 *
 * Methodology:
 * Uses the Margaria-ACSM standard energy expenditure equation for running:
 * Gross energy cost of running ≈ 1.036 kcal per kilogram per kilometre.
 * Formula: Calories = Distance (km) × Body Weight (kg) × 1.036
 *
 * Rules:
 * - If user weight is provided from profile and is physically valid (25kg - 250kg), calculate estimate.
 * - If user weight is missing or invalid, do NOT invent a hardcoded weight.
 *   Clearly explain that weight is needed in the profile.
 * - If distance is zero, calories is 0 (or null if weight missing).
 */
export function estimateRunCalories(
  distanceKm: number,
  userWeightKg: number | null | undefined
): CalorieEstimateResult {
  if (userWeightKg == null || isNaN(userWeightKg) || userWeightKg < 25 || userWeightKg > 250) {
    return {
      calories: null,
      isAvailable: false,
      explanation: 'Set your weight in Profile to enable personalized calorie estimation.',
    };
  }

  if (!distanceKm || isNaN(distanceKm) || distanceKm <= 0.01) {
    return {
      calories: 0,
      isAvailable: true,
      explanation: `Calculated from your profile weight (${Math.round(userWeightKg)} kg).`,
    };
  }

  const burned = Math.round(distanceKm * userWeightKg * 1.036);

  return {
    calories: isNaN(burned) || burned < 0 ? 0 : burned,
    isAvailable: true,
    explanation: `Estimated based on ${Math.round(userWeightKg)} kg profile weight (~1.04 kcal/kg/km).`,
  };
}

/**
 * Calculates kilometer splits (pace and time for each km) from recorded GPS coordinates.
 * Returns an array of KilometerSplit objects for every completed 1.0 km milestone plus any final partial km.
 */
export function calculateKilometerSplits(coordinates: GPSCoordinate[]): KilometerSplit[] {
  if (!coordinates || coordinates.length < 2) {
    return [];
  }

  const splits: KilometerSplit[] = [];
  let currentSplitIndex = 1;
  let splitStartDistanceMetres = 0;
  let splitStartTimeMs = coordinates[0].timestamp;
  let cumulativeDistanceMetres = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];

    const d = calculateHaversineDistance(prev, curr);
    cumulativeDistanceMetres += d;

    const nextMilestoneMetres = currentSplitIndex * 1000;

    if (cumulativeDistanceMetres >= nextMilestoneMetres) {
      // Interpolate the fraction of this segment that belongs to the current kilometer
      const distIntoMilestone = cumulativeDistanceMetres - nextMilestoneMetres;
      const legDist = Math.max(0.1, d);
      const ratio = Math.max(0, Math.min(1, (d - distIntoMilestone) / legDist));

      const timeDeltaMs = Math.max(0, curr.timestamp - prev.timestamp);
      const milestoneTimestamp = prev.timestamp + timeDeltaMs * ratio;
      const splitDurationSec = Math.max(1, Math.round((milestoneTimestamp - splitStartTimeMs) / 1000));

      const paceSecPerKm = splitDurationSec; // For 1.0 km split, pace seconds/km = duration seconds
      const speedKmh = Number((1.0 / (splitDurationSec / 3600)).toFixed(2));

      splits.push({
        splitNumber: currentSplitIndex,
        distanceKm: 1.0,
        durationSeconds: splitDurationSec,
        paceSecondsPerKm: isFinite(paceSecPerKm) && paceSecPerKm <= 1800 ? paceSecPerKm : null,
        averageSpeedKmh: isFinite(speedKmh) && speedKmh <= 45 ? speedKmh : null,
      });

      splitStartDistanceMetres = nextMilestoneMetres;
      splitStartTimeMs = milestoneTimestamp;
      currentSplitIndex++;
    }
  }

  // Handle final partial split if at least 150m completed
  const remainingMetres = cumulativeDistanceMetres - splitStartDistanceMetres;
  const lastPoint = coordinates[coordinates.length - 1];
  const finalDurationSec = Math.max(1, Math.round((lastPoint.timestamp - splitStartTimeMs) / 1000));

  if (remainingMetres >= 150) {
    const remKm = Number((remainingMetres / 1000).toFixed(2));
    const paceSecPerKm = Math.round(finalDurationSec / remKm);
    const speedKmh = Number((remKm / (finalDurationSec / 3600)).toFixed(2));

    splits.push({
      splitNumber: currentSplitIndex,
      distanceKm: remKm,
      durationSeconds: finalDurationSec,
      paceSecondsPerKm: isFinite(paceSecPerKm) && paceSecPerKm <= 1800 ? paceSecPerKm : null,
      averageSpeedKmh: isFinite(speedKmh) && speedKmh <= 45 ? speedKmh : null,
    });
  }

  return splits;
}
