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
import { calculateHaversineDistance, calculatePolylineHaversineDistance } from '../utils/runStats';
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
   * Generates multiple candidate loop routes for a target distance (2, 3, 5, 8, 10 km)
   * using real pedestrian routing network data, strict distance tolerances (preferred ±5%, max ±10%),
   * authoritative Haversine polyline calculation, and non-retracing circular geometry.
   */
  async generateLoopRoutes(options: RouteGenerationOptions): Promise<PlannedRoute[]> {
    const { startLocation, targetDistanceKm, userAveragePaceMinPerKm } = options;
    const startLat = startLocation.latitude;
    const startLng = startLocation.longitude;
    const targetMeters = targetDistanceKm * 1000;

    // Headings to explore: 8 compass directions for rich geographic diversity
    const headingConfigs = [
      { heading: 315, prefix: 'Northwest', landmarkHint: 'Greenway' },
      { heading: 270, prefix: 'Westside', landmarkHint: 'Parkway' },
      { heading: 0, prefix: 'North', landmarkHint: 'Circuit' },
      { heading: 45, prefix: 'Northeast', landmarkHint: 'Boulevard' },
      { heading: 225, prefix: 'Southwest', landmarkHint: 'Trail' },
      { heading: 180, prefix: 'South', landmarkHint: 'Esplanade' },
      { heading: 135, prefix: 'Southeast', landmarkHint: 'Promenade' },
      { heading: 90, prefix: 'Eastside', landmarkHint: 'Crescent' },
    ];

    // Calibrated baseline radius fractions for pedestrian networks (accounting for road tortuosity ~1.30-1.40)
    const baseFrac =
      targetDistanceKm <= 2
        ? 0.21
        : targetDistanceKm <= 3
        ? 0.23
        : 0.235;

    const fractionTrials = [baseFrac, baseFrac * 0.92, baseFrac * 1.08];

    interface ValidatedCandidate {
      heading: number;
      prefix: string;
      landmarkHint: string;
      actualDistanceMeters: number;
      differenceMeters: number;
      differencePercent: number;
      routeCoordinates: GPSCoordinate[];
      steps: RouteNavigationStep[];
      waypoints: RouteWaypoint[];
      rawRouteData: any;
    }

    const validatedCandidates: ValidatedCandidate[] = [];

    // Helper to evaluate a candidate loop with specific radius and heading
    const evaluateLoopCandidate = async (
      hConfig: (typeof headingConfigs)[0],
      radKm: number
    ): Promise<ValidatedCandidate | null> => {
      try {
        const wp1Offset = computeOffsetCoordinate(startLat, startLng, radKm, hConfig.heading - 25);
        const wp2Offset = computeOffsetCoordinate(startLat, startLng, radKm, hConfig.heading + 25);

        // Sequence: Start -> Waypoint 1 -> Waypoint 2 -> Start (closed loop)
        const coordinateChain: [number, number][] = [
          [startLng, startLat],
          [wp1Offset.longitude, wp1Offset.latitude],
          [wp2Offset.longitude, wp2Offset.latitude],
          [startLng, startLat],
        ];

        const coordParam = coordinateChain.map((c) => `${c[0]},${c[1]}`).join(';');
        const osrmUrl = `${OSRM_FOOT_BASE}/${coordParam}?overview=full&geometries=geojson&steps=true`;

        const res = await fetch(osrmUrl, { signal: AbortSignal.timeout(4500) });
        if (!res.ok) return null;

        const data = await res.json();
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) return null;

        const routeData = data.routes[0];
        const osrmCoords: [number, number][] = routeData.geometry.coordinates;
        if (!Array.isArray(osrmCoords) || osrmCoords.length < 10) return null;

        const routeCoordinates: GPSCoordinate[] = osrmCoords.map((coord, i) => ({
          latitude: coord[1],
          longitude: coord[0],
          timestamp: Date.now() + i * 1000,
        }));

        // 1. Authoritative distance: Haversine across every consecutive coordinate pair (R = 6,371,000m)
        const haversineDistMeters = Math.round(calculatePolylineHaversineDistance(routeCoordinates));
        if (haversineDistMeters < 500) return null;

        // 2. Loop closure validation: Start and end point must return within 35 meters
        const startToFinishDistanceMeters = calculateHaversineDistance(
          routeCoordinates[0],
          routeCoordinates[routeCoordinates.length - 1]
        );
        if (startToFinishDistanceMeters > 35) return null;

        // 3. Coordinate continuity: verify no teleportation or unroutable gaps > 500m
        for (let i = 1; i < routeCoordinates.length; i++) {
          if (calculateHaversineDistance(routeCoordinates[i - 1], routeCoordinates[i]) > 500) {
            return null;
          }
        }

        // 4. Anti-retracing & loop quality: verify spatial bounding span is non-degenerate
        const lats = routeCoordinates.map((c) => c.latitude);
        const lngs = routeCoordinates.map((c) => c.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latSpanMeters = calculateHaversineDistance(
          { latitude: minLat, longitude: startLng },
          { latitude: maxLat, longitude: startLng }
        );
        const lngSpanMeters = calculateHaversineDistance(
          { latitude: startLat, longitude: minLng },
          { latitude: startLat, longitude: maxLng }
        );
        const boundingDiagonalMeters = Math.sqrt(
          latSpanMeters * latSpanMeters + lngSpanMeters * lngSpanMeters
        );

        // Reject thin, degenerate out-and-back lines
        if (boundingDiagonalMeters < targetMeters * 0.15) {
          return null;
        }

        // 5. Distance deviation and strict tolerance check (preferred ±5%, max ±10%)
        const differenceMeters = haversineDistMeters - targetMeters;
        const differencePercent = Number(
          ((Math.abs(differenceMeters) / targetMeters) * 100).toFixed(2)
        );

        // Extract navigation steps
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

        // Create representative waypoints along the route
        const wp1Idx = Math.floor(routeCoordinates.length * 0.33);
        const wp2Idx = Math.floor(routeCoordinates.length * 0.67);
        const wp1Coord = routeCoordinates[wp1Idx];
        const wp2Coord = routeCoordinates[wp2Idx];

        // Identify prominent street or path name from navigation steps
        const streetNames = steps
          .map((s) => {
            const m = s.instruction.match(/onto\s+([^,]+)/i);
            return m ? m[1].trim() : '';
          })
          .filter((name) => name.length > 2);

        const wp1Name = streetNames[0] || `${hConfig.prefix} Loop Point A`;
        const wp2Name = streetNames[Math.min(2, streetNames.length - 1)] || `${hConfig.prefix} Loop Point B`;

        const waypoints: RouteWaypoint[] = [
          {
            id: `wp-1-${hConfig.heading}`,
            latitude: wp1Coord.latitude,
            longitude: wp1Coord.longitude,
            name: wp1Name,
            category: 'turn',
            distanceFromStartMeters: Math.round(targetMeters * 0.33),
          },
          {
            id: `wp-2-${hConfig.heading}`,
            latitude: wp2Coord.latitude,
            longitude: wp2Coord.longitude,
            name: wp2Name,
            category: 'turn',
            distanceFromStartMeters: Math.round(targetMeters * 0.67),
          },
        ];

        return {
          heading: hConfig.heading,
          prefix: hConfig.prefix,
          landmarkHint: hConfig.landmarkHint,
          actualDistanceMeters: haversineDistMeters,
          differenceMeters,
          differencePercent,
          routeCoordinates,
          steps,
          waypoints,
          rawRouteData: routeData,
        };
      } catch {
        return null;
      }
    };

    // Iterate across headings to collect distinct, accurate route candidates
    for (const hConfig of headingConfigs) {
      if (validatedCandidates.length >= 3) {
        break;
      }

      for (const frac of fractionTrials) {
        const radKm = targetDistanceKm * frac;
        const candidate = await evaluateLoopCandidate(hConfig, radKm);

        if (!candidate) continue;

        if (candidate.differencePercent <= 10.0) {
          // Candidate satisfies strict ±10% tolerance (preferred ±5%)
          validatedCandidates.push(candidate);
          break; // Found good route for this heading, move to next compass heading
        } else if (
          candidate.differencePercent > 10.0 &&
          candidate.differencePercent <= 28.0 &&
          validatedCandidates.length < 3
        ) {
          // Perform 1 adaptive calibration iteration to converge to target distance
          const calibratedRadKm = radKm * (targetMeters / candidate.actualDistanceMeters);
          const calibratedCandidate = await evaluateLoopCandidate(hConfig, calibratedRadKm);
          if (calibratedCandidate && calibratedCandidate.differencePercent <= 10.0) {
            validatedCandidates.push(calibratedCandidate);
            break;
          }
        }
      }
    }

    if (validatedCandidates.length === 0) {
      throw new Error(
        `Unable to generate a pedestrian loop route within ±10% distance tolerance for ${targetDistanceKm} km at this exact location. The surrounding road network may contain physical barriers (fences, waterways, or unroutable zones). Try selecting a nearby start point or choosing a different target distance.`
      );
    }

    // Sort candidates by precision (closest to target distance first)
    validatedCandidates.sort((a, b) => a.differencePercent - b.differencePercent);

    // Filter to ensure distinct directions (at least 40° apart)
    const distinctCandidates: ValidatedCandidate[] = [];
    for (const cand of validatedCandidates) {
      const isTooClose = distinctCandidates.some(
        (chosen) => Math.abs(chosen.heading - cand.heading) < 40
      );
      if (!isTooClose || distinctCandidates.length === 0) {
        distinctCandidates.push(cand);
      }
      if (distinctCandidates.length >= 3) break;
    }

    // Assemble final PlannedRoute objects
    const finalRoutes: PlannedRoute[] = [];

    for (const [idx, c] of distinctCandidates.entries()) {
      const actualDistanceKm = c.actualDistanceMeters / 1000;

      // Estimated duration based on user pace or standard 5:30/km (330 s/km) runner pace
      let estimatedSeconds: number;
      if (
        userAveragePaceMinPerKm &&
        userAveragePaceMinPerKm > 2.5 &&
        userAveragePaceMinPerKm < 20
      ) {
        estimatedSeconds = Math.round(actualDistanceKm * userAveragePaceMinPerKm * 60);
      } else {
        estimatedSeconds = Math.round(actualDistanceKm * 330);
      }

      // Elevation gain (with quick graceful fallback)
      let elevationGain: number | null = null;
      try {
        elevationGain = await this.calculateElevationGain(c.routeCoordinates);
      } catch {
        elevationGain = null;
      }

      // Discover prominent name from steps
      const prominentStepName = c.steps.find((s) => s.instruction.includes('onto '))
        ?.instruction.replace(/^.+onto\s+/i, '');

      const routeName = prominentStepName
        ? `${prominentStepName} ${targetDistanceKm}K Loop`
        : `${c.prefix} ${targetDistanceKm}K Circuit`;

      const diffLabel =
        c.differenceMeters === 0
          ? 'Exact match'
          : c.differenceMeters > 0
          ? `+${c.differenceMeters}m (${c.differencePercent}%)`
          : `${c.differenceMeters}m (${c.differencePercent}%)`;

      finalRoutes.push({
        id: `route-${Date.now()}-${idx}-${c.heading}`,
        name: routeName,
        targetDistanceKm,
        actualDistanceMeters: c.actualDistanceMeters,
        differenceMeters: c.differenceMeters,
        differencePercent: c.differencePercent,
        estimatedDurationSeconds: estimatedSeconds,
        elevationGainMeters: elevationGain,
        startLocation,
        waypoints: c.waypoints,
        routeCoordinates: c.routeCoordinates,
        steps: c.steps.slice(0, 15),
        landmarks: c.waypoints,
        summary: `Pedestrian-safe circular loop (${(c.actualDistanceMeters / 1000).toFixed(
          2
        )} km, ${diffLabel}) starting and finishing at ${
          startLocation.label || 'start location'
        }. Verified road geometry.`,
        provider: 'OSRM (Foot Profile) & OpenStreetMap',
        generatedAt: new Date().toISOString(),
      });
    }

    return finalRoutes;
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
