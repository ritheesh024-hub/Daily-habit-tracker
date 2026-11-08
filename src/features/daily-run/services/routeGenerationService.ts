import {
  GPSCoordinate,
  PlannedRoute,
  RouteStartLocation,
  RouteWaypoint,
  RouteNavigationStep,
  HomeLocation,
  RouteDeviationState,
  LandmarkCategory,
} from '../types';
import { calculateHaversineDistance } from '../utils/runStats';
import { runIndexedDB } from './runIndexedDB';

/**
 * OpenStreetMap & OSRM Pedestrian Routing Service
 */
const OSRM_FOOT_BASE = 'https://router.project-osrm.org/route/v1/foot';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OPEN_METEO_ELEVATION_BASE = 'https://api.open-meteo.com/v1/elevation';

export interface RouteGenerationOptions {
  startLocation: RouteStartLocation;
  targetDistanceKm: number; // 2, 3, 5, 8, 10
  userAveragePaceMinPerKm?: number | null; // e.g. 5.25 for 5:15/km
  loopCount?: number; // default 3 options
}

interface DiscoveredLandmark {
  name: string;
  category: LandmarkCategory;
  latitude: number;
  longitude: number;
  distanceFromStart: number;
}

/**
 * Converts degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates a destination point given distance (km) and bearing (degrees)
 */
function computeOffsetCoordinate(
  startLat: number,
  startLng: number,
  distanceKm: number,
  bearingDeg: number
): { latitude: number; longitude: number } {
  const R = 6371; // Earth radius in km
  const δ = distanceKm / R;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(startLat);
  const λ1 = toRad(startLng);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    latitude: Number(((φ2 * 180) / Math.PI).toFixed(6)),
    longitude: Number(((((λ2 * 180) / Math.PI + 540) % 360) - 180).toFixed(6)),
  };
}

export const routeGenerationService = {
  /**
   * Manages user home location
   */
  async saveHomeLocation(userId: string, home: HomeLocation): Promise<void> {
    await runIndexedDB.saveHomeLocationLocally(userId, home);
  },

  async getHomeLocation(userId: string): Promise<HomeLocation | null> {
    return runIndexedDB.getHomeLocationLocally(userId);
  },

  async deleteHomeLocation(userId: string): Promise<void> {
    await runIndexedDB.deleteHomeLocationLocally(userId);
  },

  /**
   * Reverse-geocodes coordinates to a human-readable address or landmark
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(3500),
        headers: {
          'User-Agent': 'DailyHabitsRoutes/1.0',
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          // Return concise 2-part name (e.g. "Kensington Road, London")
          return parts.slice(0, 2).map((s: string) => s.trim()).join(', ');
        }
      }
    } catch {
      // ignore
    }
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  },

  /**
   * Discovers nearby public landmarks (parks, stadiums, lakes, tracks, recreational grounds)
   */
  async discoverNearbyLandmarks(
    startLat: number,
    startLng: number,
    radiusKm: number
  ): Promise<DiscoveredLandmark[]> {
    const landmarks: DiscoveredLandmark[] = [];
    const queries = ['park', 'garden', 'recreation', 'lake', 'track'];

    // Compute bounding box
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(toRad(startLat)));
    const viewbox = `${startLng - lngDelta},${startLat + latDelta},${startLng + lngDelta},${startLat - latDelta}`;

    // Query 1-2 prominent queries to avoid excessive network latency
    for (const q of queries.slice(0, 2)) {
      try {
        const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(
          q
        )}&bounded=1&viewbox=${viewbox}&limit=4`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(3000),
          headers: {
            'User-Agent': 'DailyHabitsRoutes/1.0',
            Accept: 'application/json',
          },
        });
        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            for (const item of items) {
              const lat = parseFloat(item.lat);
              const lon = parseFloat(item.lon);
              if (!isNaN(lat) && !isNaN(lon)) {
                const distM = calculateHaversineDistance(
                  { latitude: startLat, longitude: startLng },
                  { latitude: lat, longitude: lon }
                );

                let cat: LandmarkCategory = 'park';
                if (q === 'lake') cat = 'water';
                else if (q === 'track') cat = 'track';
                else if (q === 'recreation') cat = 'recreation';

                const name =
                  item.name ||
                  item.display_name?.split(',')[0]?.trim() ||
                  `Public ${q.charAt(0).toUpperCase() + q.slice(1)}`;

                landmarks.push({
                  name,
                  category: cat,
                  latitude: lat,
                  longitude: lon,
                  distanceFromStart: distM,
                });
              }
            }
          }
        }
      } catch {
        // Fallback gracefully if Nominatim search is slow
      }
    }

    return landmarks;
  },

  /**
   * Queries Open-Meteo elevation API for a list of coordinates
   * Returns cumulative elevation gain in meters
   */
  async calculateElevationGain(
    coordinates: { latitude: number; longitude: number }[]
  ): Promise<number | null> {
    if (!coordinates || coordinates.length < 2) return null;

    try {
      // Sample up to 25 evenly spaced points along the route
      const sampleCount = Math.min(25, coordinates.length);
      const step = Math.max(1, Math.floor(coordinates.length / sampleCount));
      const sampled: { latitude: number; longitude: number }[] = [];

      for (let i = 0; i < coordinates.length; i += step) {
        sampled.push(coordinates[i]);
      }
      if (sampled[sampled.length - 1] !== coordinates[coordinates.length - 1]) {
        sampled.push(coordinates[coordinates.length - 1]);
      }

      const lats = sampled.map((c) => c.latitude.toFixed(5)).join(',');
      const lons = sampled.map((c) => c.longitude.toFixed(5)).join(',');
      const url = `${OPEN_METEO_ELEVATION_BASE}?latitude=${lats}&longitude=${lons}`;

      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) return null;

      const data = await res.json();
      const elevations: number[] = data.elevation;

      if (!Array.isArray(elevations) || elevations.length < 2) return null;

      let gain = 0;
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1];
        if (diff > 1) {
          // Ignore micro-fluctuations (< 1m)
          gain += diff;
        }
      }

      return Math.round(gain);
    } catch {
      return null;
    }
  },

  /**
   * Generates multiple candidate loop routes for a target distance
   */
  async generateLoopRoutes(options: RouteGenerationOptions): Promise<PlannedRoute[]> {
    const { startLocation, targetDistanceKm, userAveragePaceMinPerKm } = options;
    const startLat = startLocation.latitude;
    const startLng = startLocation.longitude;

    // Radius scaling factor: loop perimeter P = 2*pi*R, road tortuosity factor ~ 1.25
    // R = targetDistanceKm / (2 * Math.PI * 1.25)
    const effectiveRadiusKm = Math.max(0.2, targetDistanceKm / (2 * Math.PI * 1.25));

    // 1. Discover nearby landmarks
    const landmarks = await this.discoverNearbyLandmarks(startLat, startLng, effectiveRadiusKm * 1.5);

    // 2. Prepare 3 distinct loop angular configurations
    // Configuration 1: Clockwise North/East Loop
    // Configuration 2: Counter-Clockwise South/West Loop
    // Configuration 3: Expanded Scenic/Riverfront Loop (East/South)
    const loopTemplates = [
      {
        idSuffix: 'loop-alpha',
        namePrefix: 'North Green',
        bearings: [30, 90, 160], // Tri-waypoint loop
        radiusFactor: 1.0,
      },
      {
        idSuffix: 'loop-bravo',
        namePrefix: 'Westside Circuit',
        bearings: [210, 270, 330],
        radiusFactor: 0.95,
      },
      {
        idSuffix: 'loop-charlie',
        namePrefix: 'Southway Boulevard',
        bearings: [120, 180, 240],
        radiusFactor: 1.05,
      },
    ];

    const generatedRoutes: PlannedRoute[] = [];

    for (const [idx, tpl] of loopTemplates.entries()) {
      try {
        const waypoints: RouteWaypoint[] = [];

        // Check if a discovered landmark falls near the bearings of this template
        const primaryLandmark = landmarks[idx % (landmarks.length || 1)];

        tpl.bearings.forEach((bearing, bIdx) => {
          let ptLat: number;
          let ptLng: number;
          let wpName = `Turn ${bIdx + 1}`;
          let wpCat: LandmarkCategory = 'turn';

          // If first waypoint and we have a discovered landmark nearby, use landmark
          if (bIdx === 0 && primaryLandmark && idx < landmarks.length) {
            ptLat = primaryLandmark.latitude;
            ptLng = primaryLandmark.longitude;
            wpName = primaryLandmark.name;
            wpCat = primaryLandmark.category;
          } else {
            const offset = computeOffsetCoordinate(
              startLat,
              startLng,
              effectiveRadiusKm * tpl.radiusFactor,
              bearing
            );
            ptLat = offset.latitude;
            ptLng = offset.longitude;
            if (bIdx === 0) wpCat = 'park';
            else if (bIdx === 1) wpCat = 'viewpoint';
          }

          waypoints.push({
            id: `wp-${idx}-${bIdx}`,
            latitude: ptLat,
            longitude: ptLng,
            name: wpName,
            category: wpCat,
          });
        });

        // Assemble coordinate sequence: start -> wp1 -> wp2 -> wp3 -> start
        const coordinateChain: [number, number][] = [
          [startLng, startLat],
          ...waypoints.map((w) => [w.longitude, w.latitude] as [number, number]),
          [startLng, startLat],
        ];

        const coordParam = coordinateChain.map((c) => `${c[0]},${c[1]}`).join(';');
        const osrmUrl = `${OSRM_FOOT_BASE}/${coordParam}?overview=full&geometries=geojson&steps=true`;

        const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) continue;

        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) continue;

        const routeData = data.routes[0];
        const actualDistanceMeters = Math.round(routeData.distance);
        const osrmCoords: [number, number][] = routeData.geometry.coordinates;

        // Convert GeoJSON [lon, lat] coordinates to GPSCoordinate [lat, lng]
        const routeCoordinates: GPSCoordinate[] = osrmCoords.map((coord, i) => ({
          latitude: coord[1],
          longitude: coord[0],
          timestamp: Date.now() + i * 1000,
        }));

        // Extract navigation maneuvers from legs
        const steps: RouteNavigationStep[] = [];
        if (Array.isArray(routeData.legs)) {
          for (const leg of routeData.legs) {
            if (Array.isArray(leg.steps)) {
              for (const step of leg.steps) {
                if (step.maneuver && step.distance > 5) {
                  const modifier = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
                  const streetName = step.name ? ` onto ${step.name}` : '';
                  const instruction = `${step.maneuver.type}${modifier}${streetName}`;
                  steps.push({
                    instruction:
                      instruction.charAt(0).toUpperCase() + instruction.slice(1),
                    distanceMeters: Math.round(step.distance),
                    durationSeconds: Math.round(step.duration),
                    maneuver: step.maneuver.type,
                    location: [step.maneuver.location[1], step.maneuver.location[0]],
                  });
                }
              }
            }
          }
        }

        // Calculate elevation gain
        const elevationGain = await this.calculateElevationGain(routeCoordinates);

        // Calculate estimated duration
        const actualDistanceKm = actualDistanceMeters / 1000;
        let estimatedSeconds: number;
        if (userAveragePaceMinPerKm && userAveragePaceMinPerKm > 2.5 && userAveragePaceMinPerKm < 20) {
          estimatedSeconds = Math.round(actualDistanceKm * userAveragePaceMinPerKm * 60);
        } else {
          // Standard runner pace ~ 5:30/km (330 s/km)
          estimatedSeconds = Math.round(actualDistanceKm * 330);
        }

        // Format clean route name
        const landmarkName = primaryLandmark ? primaryLandmark.name : tpl.namePrefix;
        const routeName = `${landmarkName} ${Math.round(actualDistanceKm)}K Loop`;

        const plannedRoute: PlannedRoute = {
          id: `route-${Date.now()}-${idx}`,
          name: routeName,
          targetDistanceKm,
          actualDistanceMeters,
          estimatedDurationSeconds: estimatedSeconds,
          elevationGainMeters: elevationGain,
          startLocation,
          waypoints,
          routeCoordinates,
          steps: steps.slice(0, 15), // Top 15 key navigation cues
          landmarks: waypoints.filter((w) => w.category !== 'turn'),
          summary: `Pedestrian-safe loop starting and finishing at ${
            startLocation.label || 'start location'
          }. Features ${waypoints.map((w) => w.name).join(', ')}.`,
          provider: 'OSRM (Foot Profile) & OpenStreetMap',
          generatedAt: new Date().toISOString(),
        };

        generatedRoutes.push(plannedRoute);
      } catch {
        // Continue trying other candidates
      }
    }

    if (generatedRoutes.length === 0) {
      throw new Error(
        `No pedestrian loop routes could be generated around this location for ${targetDistanceKm} km. Try adjusting the target distance or moving the start location to a road with connected pedestrian paths.`
      );
    }

    return generatedRoutes;
  },

  /**
   * Calculates real-time runner deviation from the planned route
   */
  calculateRouteDeviation(
    currentPos: GPSCoordinate | null,
    plannedRoute: PlannedRoute | null
  ): RouteDeviationState {
    if (!currentPos || !plannedRoute || !plannedRoute.routeCoordinates || plannedRoute.routeCoordinates.length < 2) {
      return {
        status: 'on_route',
        distanceOffRouteMeters: 0,
        nearestCoordinateIndex: 0,
        progressPercent: 0,
        distanceCoveredMeters: 0,
        distanceRemainingMeters: plannedRoute ? plannedRoute.actualDistanceMeters : 0,
        isLoopCompleted: false,
      };
    }

    const coords = plannedRoute.routeCoordinates;
    let minDistanceM = Infinity;
    let nearestIdx = 0;

    for (let i = 0; i < coords.length; i++) {
      const d = calculateHaversineDistance(currentPos, coords[i]);
      // Use <= so that when runner is completing a loop (where first and last coords are identical),
      // the finishing coordinate is favored as progress moves forward
      if (d <= minDistanceM) {
        minDistanceM = d;
        nearestIdx = i;
      }
    }

    const progressRatio = coords.length > 1 ? nearestIdx / (coords.length - 1) : 0;
    const progressPercent = Math.min(100, Math.round(progressRatio * 100));
    const distanceCovered = Math.round(plannedRoute.actualDistanceMeters * progressRatio);
    const distanceRemaining = Math.max(0, plannedRoute.actualDistanceMeters - distanceCovered);

    // Distance to the starting point
    const distanceToStartM = calculateHaversineDistance(currentPos, coords[0]);

    // Check if loop is completed: runner traversed at least 60% of route and returned within 35m of start
    const isLoopCompleted = progressRatio >= 0.6 && distanceToStartM <= 35;

    // Deviation status: > 50m off-route is off_route, otherwise on_route
    let status: RouteDeviationState['status'] = 'on_route';
    if (isLoopCompleted) {
      status = 'loop_complete';
    } else if (minDistanceM > 50) {
      status = 'off_route';
    }

    return {
      status,
      distanceOffRouteMeters: Math.round(minDistanceM),
      nearestCoordinateIndex: nearestIdx,
      progressPercent,
      distanceCoveredMeters: distanceCovered,
      distanceRemainingMeters: distanceRemaining,
      isLoopCompleted,
    };
  },
};
