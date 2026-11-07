import {
  calculateHaversineDistance,
  calculateAveragePace,
  calculateAverageSpeed,
  calculateRollingSpeedAndPace,
  estimateRunCalories,
} from '../utils/runStats';
import { validateGPSCoordinate } from '../utils/geoUtils';
import { GPSCoordinate, DEFAULT_GPS_FILTER_CONFIG } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`, detail || '');
    failed++;
  }
}

console.log('--- RUNNING PHASE 3 RUNNING STATISTICS TESTS ---\n');

// 1. Haversine Distance Tests
const coordA = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
const coordB = { latitude: 37.7758, longitude: -122.4194 }; // ~100m North
const distAB = calculateHaversineDistance(coordA, coordB);
assert(distAB > 95 && distAB < 105, 'Haversine distance ~100m for ~0.0009 lat delta', distAB);

const zeroDist = calculateHaversineDistance(coordA, coordA);
assert(zeroDist === 0, 'Haversine distance for identical coordinates is 0', zeroDist);

const nanDist = calculateHaversineDistance({ latitude: NaN, longitude: 0 }, coordA);
assert(nanDist === 0, 'Haversine handles NaN gracefully returning 0', nanDist);

// 2. Average Pace Tests
const normalPace = calculateAveragePace(5.0, 1500); // 5km in 25 min -> 5.0 min/km
assert(normalPace !== null && Math.abs(normalPace - 5.0) < 0.01, '5km in 1500s produces 5.0 min/km', normalPace);

assert(calculateAveragePace(0, 500) === null, 'Zero distance returns null pace');
assert(calculateAveragePace(5, 0) === null, 'Zero duration returns null pace');
assert(calculateAveragePace(0.005, 100) === null, 'Under 10m run returns null pace without NaN');
assert(calculateAveragePace(1, 3600) === null, 'Extremely slow walk (>40 min/km) returns null pace');

// 3. Average Speed Tests
const normalSpeed = calculateAverageSpeed(10.0, 3600); // 10km in 1 hour -> 10 km/h
assert(normalSpeed !== null && Math.abs(normalSpeed - 10.0) < 0.01, '10km in 1h produces 10.0 km/h', normalSpeed);

assert(calculateAverageSpeed(0, 1000) === null, 'Zero distance returns null average speed');
assert(calculateAverageSpeed(10, 0) === null, 'Zero duration returns null average speed');
assert(calculateAverageSpeed(0.002, 50) === null, 'Negligible distance returns null average speed');

// 4. Rolling Window Speed & Pace Tests
const now = Date.now();
const rollingMovingPoints: GPSCoordinate[] = [
  { latitude: 37.7749, longitude: -122.4194, timestamp: now - 8000, accuracy: 5 },
  { latitude: 37.7751, longitude: -122.4194, timestamp: now - 4000, accuracy: 5 },
  { latitude: 37.7753, longitude: -122.4194, timestamp: now, accuracy: 5 },
];
const movingStats = calculateRollingSpeedAndPace(rollingMovingPoints, 'ready');
assert(movingStats.isStationary === false, 'Moving points detected as non-stationary');
assert(movingStats.currentSpeedKmh !== null && movingStats.currentSpeedKmh > 10 && movingStats.currentSpeedKmh < 25, 'Current speed ~18 km/h', movingStats.currentSpeedKmh);
assert(movingStats.currentPaceMinPerKm !== null && movingStats.currentPaceMinPerKm > 2 && movingStats.currentPaceMinPerKm < 6, 'Current pace ~3.3 min/km', movingStats.currentPaceMinPerKm);

// Stationary points (less than 2.5m across window)
const stationaryPoints: GPSCoordinate[] = [
  { latitude: 37.7749000, longitude: -122.4194000, timestamp: now - 8000, accuracy: 5 },
  { latitude: 37.7749005, longitude: -122.4194005, timestamp: now - 4000, accuracy: 5 },
  { latitude: 37.7749002, longitude: -122.4194003, timestamp: now, accuracy: 5 },
];
const stationaryStats = calculateRollingSpeedAndPace(stationaryPoints, 'ready');
assert(stationaryStats.isStationary === true, 'Stationary points detected correctly', stationaryStats);
assert(stationaryStats.currentSpeedKmh === 0, 'Stationary runner shows 0 km/h', stationaryStats.currentSpeedKmh);
assert(stationaryStats.currentPaceMinPerKm === null, 'Stationary runner shows null pace (--)', stationaryStats.currentPaceMinPerKm);

// GPS Signal Lost
const signalLostStats = calculateRollingSpeedAndPace(rollingMovingPoints, 'lost');
assert(signalLostStats.currentSpeedKmh === null, 'Signal lost freezes current speed to null');
assert(signalLostStats.currentPaceMinPerKm === null, 'Signal lost freezes current pace to null');

// 5. Calorie Estimation Tests
const caloriesWithWeight = estimateRunCalories(5.0, 70); // 5km, 70kg -> ~363 kcal
assert(caloriesWithWeight.isAvailable === true, 'Calories available with profile weight');
assert(caloriesWithWeight.calories === 363, '5km at 70kg yields ~363 kcal', caloriesWithWeight.calories);

const caloriesWithoutWeight = estimateRunCalories(5.0, null);
assert(caloriesWithoutWeight.isAvailable === false, 'Calories unavailable when weight is null');
assert(caloriesWithoutWeight.calories === null, 'Calories is null when weight is missing');
assert(caloriesWithoutWeight.explanation.includes('Profile'), 'Explanation mentions setting weight in profile');

const zeroDistanceCalories = estimateRunCalories(0, 70);
assert(zeroDistanceCalories.calories === 0, 'Zero distance yields 0 calories');

// 6. GPS Coordinate Validation & Pause/Resume Jitter Tests
const filterConfig = DEFAULT_GPS_FILTER_CONFIG;
const validPt1: GPSCoordinate = { latitude: 37.7749, longitude: -122.4194, timestamp: now, accuracy: 8 };
const validPt2: GPSCoordinate = { latitude: 37.7751, longitude: -122.4194, timestamp: now + 5000, accuracy: 8 };
const valResult = validateGPSCoordinate(validPt2, validPt1, filterConfig);
assert(valResult.isValid === true && !valResult.isStationaryJitter, 'Valid movement passes validation');

// Inaccurate coordinate (> 30m)
const inaccuratePt: GPSCoordinate = { latitude: 37.7755, longitude: -122.4194, timestamp: now + 8000, accuracy: 45 };
const inaccResult = validateGPSCoordinate(inaccuratePt, validPt2, filterConfig);
assert(inaccResult.isValid === false, 'GPS accuracy 45m (> 30m) rejected');

// Impossible teleport jump (500m in 1 sec = 500 m/s > 12 m/s)
const teleportPt: GPSCoordinate = { latitude: 37.7800, longitude: -122.4194, timestamp: now + 6000, accuracy: 5 };
const teleportResult = validateGPSCoordinate(teleportPt, validPt2, filterConfig);
assert(teleportResult.isValid === false, 'Impossible speed jump rejected');

console.log(`\n========================================`);
console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
