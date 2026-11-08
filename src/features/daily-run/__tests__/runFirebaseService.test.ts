import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeRouteCoordinates } from '../services/runFirebaseService';
import { GPSCoordinate } from '../types';

describe('Phase 4: runFirebaseService Coordinate Sanitization & Validation', () => {
  it('returns empty array for empty or null inputs', () => {
    assert.deepStrictEqual(sanitizeRouteCoordinates([]), []);
    assert.deepStrictEqual(sanitizeRouteCoordinates(null as any), []);
    assert.deepStrictEqual(sanitizeRouteCoordinates(undefined as any), []);
  });

  it('filters out invalid, NaN, Infinity, and out-of-range coordinates', () => {
    const raw: GPSCoordinate[] = [
      { latitude: 37.7749, longitude: -122.4194, timestamp: 1000, accuracy: 5 },
      { latitude: NaN, longitude: -122.4194, timestamp: 2000, accuracy: 5 },
      { latitude: 37.7750, longitude: Infinity, timestamp: 3000, accuracy: 5 },
      { latitude: 95.0, longitude: -122.4194, timestamp: 4000, accuracy: 5 }, // invalid latitude > 90
      { latitude: 37.7751, longitude: -200.0, timestamp: 5000, accuracy: 5 }, // invalid longitude < -180
      { latitude: 37.7752, longitude: -122.4190, timestamp: 6000, accuracy: 8 },
    ];

    const result = sanitizeRouteCoordinates(raw);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].latitude, 37.7749);
    assert.strictEqual(result[0].longitude, -122.4194);
    assert.strictEqual(result[1].latitude, 37.7752);
    assert.strictEqual(result[1].longitude, -122.419);
  });

  it('filters redundant stationary jitter (< 1.5m apart)', () => {
    const raw: GPSCoordinate[] = [
      { latitude: 37.774900, longitude: -122.419400, timestamp: 1000 },
      // Micro-jitter: 0.000002 deg is approx 0.2 meters
      { latitude: 37.774902, longitude: -122.419401, timestamp: 2000 },
      // Substantial movement: ~15 meters away
      { latitude: 37.775050, longitude: -122.419400, timestamp: 3000 },
    ];

    const result = sanitizeRouteCoordinates(raw);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].latitude, 37.7749);
    assert.strictEqual(result[1].latitude, 37.77505);
  });

  it('handles accuracy formatting correctly (rounds to integer or null)', () => {
    const raw: GPSCoordinate[] = [
      { latitude: 37.7749, longitude: -122.4194, timestamp: 1000, accuracy: 4.8 },
      { latitude: 37.7752, longitude: -122.4194, timestamp: 2000, accuracy: NaN },
      { latitude: 37.7755, longitude: -122.4194, timestamp: 3000, accuracy: undefined },
    ];

    const result = sanitizeRouteCoordinates(raw);
    assert.strictEqual(result[0].accuracy, 5);
    assert.strictEqual(result[1].accuracy, null);
    assert.strictEqual(result[2].accuracy, null);
  });

  it('downsamples routes exceeding 1500 points and keeps the final coordinate', () => {
    // Generate 3200 distinct moving coordinates
    const raw: GPSCoordinate[] = [];
    let lat = 37.7749;
    for (let i = 0; i < 3200; i++) {
      lat += 0.00005; // ~5.5m per step
      raw.push({
        latitude: lat,
        longitude: -122.4194,
        timestamp: 1000 + i * 1000,
        accuracy: 5,
      });
    }

    const result = sanitizeRouteCoordinates(raw);
    assert(result.length <= 1501, `Expected <= 1501 points, got ${result.length}`);
    // Check that the last point matches the last valid coordinate
    const lastRaw = raw[raw.length - 1];
    const lastResult = result[result.length - 1];
    assert.strictEqual(lastResult.latitude, Number(lastRaw.latitude.toFixed(6)));
  });
});
