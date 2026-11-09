import { GPSCoordinate } from './index';

export interface HomeLocation {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
  updatedAt: string;
}

export type StartLocationSource = 'gps' | 'home' | 'custom_map';

export interface RouteStartLocation {
  latitude: number;
  longitude: number;
  source: StartLocationSource;
  label?: string;
  address?: string;
}

export type LandmarkCategory = 'park' | 'water' | 'stadium' | 'track' | 'recreation' | 'viewpoint' | 'turn';

export interface RouteWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  category: LandmarkCategory;
  distanceFromStartMeters?: number;
}

export interface RouteNavigationStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver?: string;
  location: [number, number]; // [lat, lng]
}

export interface PlannedRoute {
  id: string;
  name: string;
  targetDistanceKm: number; // 2, 3, 5, 8, 10
  actualDistanceMeters: number;
  differenceMeters?: number;
  differencePercent?: number;
  estimatedDurationSeconds: number;
  elevationGainMeters: number | null;
  startLocation: RouteStartLocation;
  waypoints: RouteWaypoint[];
  routeCoordinates: GPSCoordinate[];
  steps: RouteNavigationStep[];
  landmarks: RouteWaypoint[];
  summary: string;
  provider: string; // e.g., "OSRM (Foot Profile) & OpenStreetMap"
  generatedAt: string;
}

export interface SavedRouteDocument {
  routeId: string;
  userId: string;
  routeName: string;
  startLocation: {
    latitude: number;
    longitude: number;
    label?: string;
  };
  waypoints: RouteWaypoint[];
  routeCoordinates: {
    latitude: number;
    longitude: number;
  }[];
  distanceMeters: number;
  elevationGainMeters: number | null;
  createdAt: string;
  updatedAt: string;
  targetDistanceKm?: number;
}

export type RouteDeviationStatus = 'on_route' | 'off_route' | 'loop_complete';

export interface RouteDeviationState {
  status: RouteDeviationStatus;
  distanceOffRouteMeters: number;
  nearestCoordinateIndex: number;
  progressPercent: number;
  distanceCoveredMeters: number;
  distanceRemainingMeters: number;
  isLoopCompleted: boolean;
}
