import test from 'node:test';
import assert from 'node:assert/strict';
import { routeGenerationService } from '../services/routeGenerationService';
import { runIndexedDB } from '../services/runIndexedDB';
import { routeFirebaseService } from '../services/routeFirebaseService';
import { calculateHaversineDistance, calculatePolylineHaversineDistance } from '../utils/runStats';
import { PlannedRoute, SavedRouteDocument, GPSCoordinate } from '../types';

test('Daily Routes & Loop Route Planner Test Suite', async (t) => {
  await t.test('1. Saves, retrieves, and deletes Home Location with user scoping', async () => {
    const userA = 'user-runner-alice';
    const userB = 'user-runner-bob';

    const homeA = {
      latitude: 51.5074,
      longitude: -0.1278,
      name: 'London Base',
      address: 'Trafalgar Square, London',
      updatedAt: new Date().toISOString(),
    };

    const homeB = {
      latitude: 40.7128,
      longitude: -74.006,
      name: 'NYC Base',
      address: 'City Hall Park, New York',
      updatedAt: new Date().toISOString(),
    };

    await routeGenerationService.saveHomeLocation(userA, homeA);
    await routeGenerationService.saveHomeLocation(userB, homeB);

    const retrievedA = await routeGenerationService.getHomeLocation(userA);
    const retrievedB = await routeGenerationService.getHomeLocation(userB);

    assert.ok(retrievedA, 'User A home should exist');
    assert.equal(retrievedA?.name, 'London Base');
    assert.equal(retrievedA?.latitude, 51.5074);

    assert.ok(retrievedB, 'User B home should exist');
    assert.equal(retrievedB?.name, 'NYC Base');
    assert.equal(retrievedB?.latitude, 40.7128);

    // Delete Alice's home
    await routeGenerationService.deleteHomeLocation(userA);
    const deletedA = await routeGenerationService.getHomeLocation(userA);
    assert.equal(deletedA, null, 'Alice home should be deleted');

    // Bob's home should remain unaffected
    const bobStillExists = await routeGenerationService.getHomeLocation(userB);
    assert.equal(bobStillExists?.name, 'NYC Base');
  });

  await t.test('2. Generates closed loop route with real road geometry returning to start point within strict ±10% tolerance', async () => {
    // Generate 5 km loop in central London (dense pedestrian paths)
    const startLoc = {
      latitude: 51.505,
      longitude: -0.165,
      source: 'gps' as const,
      label: 'Hyde Park Corner, London',
    };

    const routes = await routeGenerationService.generateLoopRoutes({
      startLocation: startLoc,
      targetDistanceKm: 5,
      userAveragePaceMinPerKm: 5.5, // 5:30/km
    });

    assert.ok(routes.length >= 1, 'Should generate at least 1 viable loop candidate');
    const firstRoute = routes[0];

    assert.equal(firstRoute.targetDistanceKm, 5);
    
    // Strict distance tolerance check: target 5000m, must be within ±10% (4500m - 5500m)
    const errorPct = (Math.abs(firstRoute.actualDistanceMeters - 5000) / 5000) * 100;
    assert.ok(
      errorPct <= 10.0,
      `Actual distance ${firstRoute.actualDistanceMeters}m must be within ±10% of target 5km (got ${errorPct.toFixed(2)}%)`
    );

    // Cross-validate authoritative polyline Haversine distance
    const polylineDistMeters = Math.round(calculatePolylineHaversineDistance(firstRoute.routeCoordinates));
    assert.equal(
      firstRoute.actualDistanceMeters,
      polylineDistMeters,
      'Actual distance must strictly match polyline Haversine accumulation across every consecutive point'
    );

    // Loop closure verification: first coordinate and last coordinate must return within 35m of start
    const firstCoord = firstRoute.routeCoordinates[0];
    const lastCoord = firstRoute.routeCoordinates[firstRoute.routeCoordinates.length - 1];
    const closureMeters = calculateHaversineDistance(firstCoord, lastCoord);
    assert.ok(
      closureMeters <= 35,
      `Loop closure must return within 35m of start (got ${closureMeters.toFixed(1)}m)`
    );

    // Verified provider and non-straight-line geometry
    assert.ok(firstRoute.routeCoordinates.length > 20, 'Should have dense coordinate points along real streets');
    assert.ok(firstRoute.provider.includes('OSRM'), 'Should identify OSRM pedestrian provider');
    assert.ok(firstRoute.estimatedDurationSeconds > 0, 'Should calculate estimated duration');
  });

  await t.test('3. Generates accurate loops across all supported target distances (2k, 3k, 5k, 8k, 10k) within ±10% tolerance', async () => {
    const startLoc = {
      latitude: 51.505,
      longitude: -0.165,
      source: 'home' as const,
      label: 'Home Start',
    };

    for (const targetDist of [2, 3, 5, 8, 10]) {
      const routes = await routeGenerationService.generateLoopRoutes({
        startLocation: startLoc,
        targetDistanceKm: targetDist,
      });

      assert.ok(routes.length >= 1, `Should generate routes for ${targetDist} km`);
      const route = routes[0];
      assert.equal(route.targetDistanceKm, targetDist);

      const targetMeters = targetDist * 1000;
      const errorPct = (Math.abs(route.actualDistanceMeters - targetMeters) / targetMeters) * 100;
      assert.ok(
        errorPct <= 10.0,
        `Route for ${targetDist}km must be within ±10% tolerance (got ${route.actualDistanceMeters}m, ${errorPct.toFixed(1)}% error)`
      );

      // Verify Haversine precision matches polyline
      const polyDist = Math.round(calculatePolylineHaversineDistance(route.routeCoordinates));
      assert.equal(route.actualDistanceMeters, polyDist, 'Route distance must match authoritative Haversine polyline sum');

      // Verify loop closure
      const closureDist = calculateHaversineDistance(
        route.routeCoordinates[0],
        route.routeCoordinates[route.routeCoordinates.length - 1]
      );
      assert.ok(closureDist <= 35, `Loop for ${targetDist}km must close within 35m (got ${closureDist.toFixed(1)}m)`);
    }
  });

  await t.test('4. Correctly computes runner off-route deviation (> 50m) and on-route detection', () => {
    const plannedCoords: GPSCoordinate[] = [
      { latitude: 51.5000, longitude: -0.1200, timestamp: 1000 },
      { latitude: 51.5010, longitude: -0.1200, timestamp: 2000 },
      { latitude: 51.5020, longitude: -0.1200, timestamp: 3000 },
      { latitude: 51.5020, longitude: -0.1220, timestamp: 4000 },
      { latitude: 51.5000, longitude: -0.1200, timestamp: 5000 }, // returns to start
    ];

    const plannedRoute: PlannedRoute = {
      id: 'test-loop',
      name: 'Test 5K Loop',
      targetDistanceKm: 5,
      actualDistanceMeters: 5000,
      estimatedDurationSeconds: 1650,
      elevationGainMeters: 15,
      startLocation: { latitude: 51.5000, longitude: -0.1200, source: 'gps' },
      waypoints: [],
      routeCoordinates: plannedCoords,
      steps: [],
      landmarks: [],
      summary: 'Test route',
      provider: 'OSRM Test',
      generatedAt: new Date().toISOString(),
    };

    // Runner point 1: exactly on route (lat 51.5010, lon -0.1200)
    const onRoutePos: GPSCoordinate = {
      latitude: 51.5010,
      longitude: -0.1200,
      timestamp: 2500,
    };
    const dev1 = routeGenerationService.calculateRouteDeviation(onRoutePos, plannedRoute);
    assert.equal(dev1.status, 'on_route');
    assert.ok(dev1.distanceOffRouteMeters < 10, 'Distance off route should be minimal');

    // Runner point 2: drifted 120m away to the east
    const offRoutePos: GPSCoordinate = {
      latitude: 51.5010,
      longitude: -0.1180, // ~138m offset
      timestamp: 3000,
    };
    const dev2 = routeGenerationService.calculateRouteDeviation(offRoutePos, plannedRoute);
    assert.equal(dev2.status, 'off_route');
    assert.ok(dev2.distanceOffRouteMeters > 50, 'Deviation should be > 50m');

    // Runner point 3: reached end of loop (> 60% progress and within 30m of start)
    const nearFinishPos: GPSCoordinate = {
      latitude: 51.5001,
      longitude: -0.1201,
      timestamp: 5500,
    };
    const dev3 = routeGenerationService.calculateRouteDeviation(nearFinishPos, plannedRoute);
    assert.ok(dev3.isLoopCompleted, 'Should detect loop completion when returning near start');
    assert.equal(dev3.status, 'loop_complete');
  });

  await t.test('5. Saves and deletes favourite routes locally and isolates across user UIDs', async () => {
    const userA = 'uid-alice';
    const userB = 'uid-bob';

    const routeAlice: SavedRouteDocument = {
      routeId: 'route-alice-101',
      userId: userA,
      routeName: 'Alice Regent Park 5K',
      startLocation: { latitude: 51.53, longitude: -0.15, label: 'Park Gate' },
      waypoints: [],
      routeCoordinates: [
        { latitude: 51.53, longitude: -0.15 },
        { latitude: 51.54, longitude: -0.15 },
        { latitude: 51.53, longitude: -0.15 },
      ],
      distanceMeters: 5120,
      elevationGainMeters: 18,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const routeBob: SavedRouteDocument = {
      routeId: 'route-bob-202',
      userId: userB,
      routeName: 'Bob Brooklyn Promenade 3K',
      startLocation: { latitude: 40.70, longitude: -73.99, label: 'Pier 1' },
      waypoints: [],
      routeCoordinates: [
        { latitude: 40.70, longitude: -73.99 },
        { latitude: 40.71, longitude: -73.99 },
        { latitude: 40.70, longitude: -73.99 },
      ],
      distanceMeters: 3100,
      elevationGainMeters: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await routeFirebaseService.saveRoute(userA, routeAlice);
    await routeFirebaseService.saveRoute(userB, routeBob);

    // Retrieve Alice's routes
    const aliceRoutes = await routeFirebaseService.getSavedRoutes(userA);
    assert.equal(aliceRoutes.length, 1);
    assert.equal(aliceRoutes[0].routeName, 'Alice Regent Park 5K');

    // Retrieve Bob's routes
    const bobRoutes = await routeFirebaseService.getSavedRoutes(userB);
    assert.equal(bobRoutes.length, 1);
    assert.equal(bobRoutes[0].routeName, 'Bob Brooklyn Promenade 3K');

    // Verify User A cannot see Bob's route
    assert.ok(!aliceRoutes.some((r) => r.routeId === 'route-bob-202'));

    // Delete Alice's route
    await routeFirebaseService.deleteRoute(userA, 'route-alice-101');
    const remainingAlice = await routeFirebaseService.getSavedRoutes(userA);
    assert.equal(remainingAlice.length, 0);

    // Bob's route remains intact
    const remainingBob = await routeFirebaseService.getSavedRoutes(userB);
    assert.equal(remainingBob.length, 1);
  });
});
