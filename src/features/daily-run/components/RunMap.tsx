import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Compass,
  Layers,
  Plus,
  Minus,
  MapPin,
  LocateFixed,
  Eye,
  WifiOff,
  AlertTriangle,
  Radio,
  Lock,
} from 'lucide-react';
import {
  GPSCoordinate,
  GPSStatus,
  RouteSegment,
  RunStatus,
  PlannedRoute,
  LocationPermissionState,
} from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface RunMapProps {
  status: RunStatus;
  gpsStatus: GPSStatus;
  currentPosition: GPSCoordinate | null;
  startPosition: GPSCoordinate | null;
  segments: RouteSegment[];
  className?: string;
  isSummaryMode?: boolean;
  plannedRoute?: PlannedRoute | null;
  accuracyMeters?: number | null;
  permissionState?: LocationPermissionState;
  onRequestPermission?: () => void;
}

export const RunMap: React.FC<RunMapProps> = ({
  status,
  gpsStatus,
  currentPosition,
  startPosition,
  segments,
  className = '',
  isSummaryMode = false,
  plannedRoute = null,
  accuracyMeters = null,
  permissionState = 'granted',
  onRequestPermission,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const plannedPolylineRef = useRef<L.Polyline | null>(null);
  const landmarkMarkersRef = useRef<L.Marker[]>([]);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);

  const isOnline = useOnlineStatus();
  const hasInitializedCenterRef = useRef<boolean>(false);

  // Auto-follow state: true when active, temporarily false when user manually pans/zooms
  const [isAutoFollow, setIsAutoFollow] = useState<boolean>(true);
  const isAutoFollowRef = useRef<boolean>(true);
  isAutoFollowRef.current = isAutoFollow;

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on user's real coordinate if available; fallback to neutral center
    const initialLat = currentPosition?.latitude || startPosition?.latitude || 51.505;
    const initialLng = currentPosition?.longitude || startPosition?.longitude || -0.165;
    const initialZoom = currentPosition ? 16 : 14;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: true,
    });

    // OpenStreetMap standard tile layer with required attribution
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Track user drag / interaction to pause auto-follow
    map.on('dragstart', () => {
      setIsAutoFollow(false);
    });

    mapInstanceRef.current = map;

    // Cleanup on unmount
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      polylineRef.current = null;
      if (plannedPolylineRef.current) {
        plannedPolylineRef.current.remove();
        plannedPolylineRef.current = null;
      }
      landmarkMarkersRef.current.forEach((m) => m.remove());
      landmarkMarkersRef.current = [];
      if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove();
        accuracyCircleRef.current = null;
      }
      currentMarkerRef.current = null;
      startMarkerRef.current = null;
    };
  }, []);

  // Center map once real position becomes available
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPosition || hasInitializedCenterRef.current) return;

    map.setView([currentPosition.latitude, currentPosition.longitude], 16, {
      animate: true,
    });
    hasInitializedCenterRef.current = true;
  }, [currentPosition]);

  // Render Planned Reference Route (Daily Routes Integration)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old planned polyline and landmarks
    if (plannedPolylineRef.current) {
      plannedPolylineRef.current.remove();
      plannedPolylineRef.current = null;
    }
    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    if (!plannedRoute || !plannedRoute.routeCoordinates || plannedRoute.routeCoordinates.length === 0) {
      return;
    }

    const latlngs: L.LatLngExpression[] = plannedRoute.routeCoordinates.map((pt) => [
      pt.latitude,
      pt.longitude,
    ]);

    // Planned reference polyline (distinct indigo line with dash styling)
    plannedPolylineRef.current = L.polyline(latlngs, {
      color: '#6366f1',
      weight: 4,
      dashArray: '6, 8',
      opacity: 0.85,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map);

    // Add intermediate landmark pins
    if (Array.isArray(plannedRoute.landmarks)) {
      plannedRoute.landmarks.forEach((lm) => {
        const iconHtml = `
          <div class="relative flex items-center justify-center">
            <span class="w-6 h-6 rounded-full bg-indigo-600 border border-white shadow-md flex items-center justify-center text-white text-[11px] font-bold">
              ${lm.category === 'park' ? '🌳' : lm.category === 'water' ? '💧' : lm.category === 'track' ? '🏃' : '📍'}
            </span>
          </div>
        `;
        const lmIcon = L.divIcon({
          className: 'custom-landmark-marker',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([lm.latitude, lm.longitude], { icon: lmIcon, zIndexOffset: 40 })
          .bindPopup(`<div class="text-xs font-semibold p-1"><strong>${lm.name}</strong><br/><span class="text-zinc-500 capitalize">${lm.category}</span></div>`)
          .addTo(map);

        landmarkMarkersRef.current.push(marker);
      });
    }

    // If starting tracking and idle or acquiring, fit bounds to the planned route
    if (status === 'idle' || status === 'acquiring_gps') {
      const bounds = plannedPolylineRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [25, 25] });
      }
    }
  }, [plannedRoute, status]);

  // Update Starting Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (startPosition) {
      const latlng: L.LatLngExpression = [startPosition.latitude, startPosition.longitude];
      if (!startMarkerRef.current) {
        const startIcon = L.divIcon({
          className: 'custom-start-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-black tracking-tighter">
                START
              </span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        startMarkerRef.current = L.marker(latlng, { icon: startIcon, zIndexOffset: 50 }).addTo(map);
      } else {
        startMarkerRef.current.setLatLng(latlng);
      }
    }
  }, [startPosition]);

  // Update Route Polyline across all segments (handles pauses without drawing connecting gaps)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const multiLatLngs: L.LatLngExpression[][] = segments
      .map((seg) => seg.points.map((pt) => [pt.latitude, pt.longitude] as L.LatLngExpression))
      .filter((pts) => pts.length > 0);

    if (!polylineRef.current) {
      polylineRef.current = L.polyline(multiLatLngs, {
        color: '#ea580c', // Athletic orange
        weight: 5,
        opacity: 0.95,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(multiLatLngs);
    }

    // In summary mode, fit all route points into view
    if (isSummaryMode && multiLatLngs.length > 0) {
      const bounds = polylineRef.current.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    }
  }, [segments, isSummaryMode]);

  // Update Current Position Marker, Heading, and Accuracy Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPosition) return;

    const latlng: L.LatLngExpression = [currentPosition.latitude, currentPosition.longitude];
    const heading = currentPosition.heading;
    const hasHeading = heading != null && !isNaN(heading) && isFinite(heading);

    // Accuracy Circle
    const accuracy = currentPosition.accuracy || accuracyMeters || 10;
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(latlng, {
        radius: accuracy,
        color: '#ea580c',
        weight: 1,
        opacity: 0.5,
        fillColor: '#ea580c',
        fillOpacity: 0.12,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(latlng);
      accuracyCircleRef.current.setRadius(accuracy);
    }

    // Custom athletic runner marker with heading cone
    const runnerIconHtml = `
      <div class="relative flex items-center justify-center">
        <!-- Live Satellite Ping Ring -->
        <span class="absolute w-8 h-8 rounded-full bg-orange-500/30 animate-ping"></span>
        <!-- Directional Heading Pointer or Core Dot -->
        <span class="relative w-6 h-6 rounded-full bg-orange-600 border-2 border-white shadow-lg flex items-center justify-center text-white" style="${
          hasHeading ? `transform: rotate(${heading}deg); transition: transform 0.3s ease;` : ''
        }">
          ${
            hasHeading
              ? `<svg class="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>`
              : `<span class="w-2 h-2 rounded-full bg-white"></span>`
          }
        </span>
      </div>
    `;

    const runnerIcon = L.divIcon({
      className: 'custom-runner-marker',
      html: runnerIconHtml,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!currentMarkerRef.current) {
      currentMarkerRef.current = L.marker(latlng, { icon: runnerIcon, zIndexOffset: 100 }).addTo(map);
    } else {
      currentMarkerRef.current.setLatLng(latlng);
      currentMarkerRef.current.setIcon(runnerIcon);

      if (isAutoFollowRef.current && status === 'running') {
        map.panTo(latlng, { animate: true, duration: 0.6 });
      }
    }
  }, [currentPosition, accuracyMeters, status]);

  // Recenter button action
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentPosition) {
      map.setView([currentPosition.latitude, currentPosition.longitude], 17, {
        animate: true,
      });
      setIsAutoFollow(true);
    } else if (startPosition) {
      map.setView([startPosition.latitude, startPosition.longitude], 17, {
        animate: true,
      });
    }
  }, [currentPosition, startPosition]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Professional GPS status badge logic
  const getGpsStatusDisplay = () => {
    if (permissionState === 'denied') {
      return {
        text: 'Permission Denied',
        detail: 'Allow location in settings',
        dotClass: 'bg-rose-500',
        isWarning: true,
      };
    }

    if (permissionState === 'prompt') {
      return {
        text: 'Location Permission Required',
        detail: 'Tap to grant location',
        dotClass: 'bg-amber-400',
        isWarning: true,
      };
    }

    const accuracyVal = currentPosition?.accuracy || accuracyMeters;

    switch (gpsStatus) {
      case 'ready':
        return {
          text: 'GPS Ready',
          detail: accuracyVal ? `±${Math.round(accuracyVal)} m accuracy` : 'High accuracy',
          dotClass: 'bg-emerald-500 shadow-xs shadow-emerald-500/50',
          isWarning: false,
        };
      case 'weak':
        return {
          text: 'Weak GPS Signal',
          detail: accuracyVal ? `±${Math.round(accuracyVal)} m · Move outdoors` : 'Move to open sky',
          dotClass: 'bg-amber-500',
          isWarning: true,
        };
      case 'lost':
        return {
          text: 'GPS Unavailable',
          detail: 'Searching for satellites',
          dotClass: 'bg-rose-500',
          isWarning: true,
        };
      case 'acquiring':
      default:
        return {
          text: 'Locating Satellites...',
          detail: 'Acquiring GPS fix',
          dotClass: 'bg-amber-400 animate-pulse',
          isWarning: false,
        };
    }
  };

  const gpsInfo = getGpsStatusDisplay();

  return (
    <div
      id="run-map-container"
      className={`relative w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-white/10 shadow-sm bg-zinc-100 dark:bg-zinc-950 select-none transition-all ${className}`}
    >
      {/* Map DOM Element */}
      <div
        id="leaflet-map"
        ref={mapContainerRef}
        className="w-full h-full z-0"
        aria-label="Outdoor Running GPS Map"
      />

      {/* Real-Time GPS Status Badge Overlay (Athletic styling) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/85 backdrop-blur-md text-white text-xs font-medium border border-white/10 shadow-sm pointer-events-auto">
          <span className={`w-2 h-2 rounded-full ${gpsInfo.dotClass}`} />
          <div className="flex flex-col">
            <span className="font-bold text-[11px] sm:text-xs tracking-tight text-white leading-none">
              {gpsInfo.text}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono leading-none mt-0.5">
              {gpsInfo.detail}
            </span>
          </div>
        </div>

        {/* Offline Map Layer Warning if device has lost connectivity */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 backdrop-blur-md text-amber-400 text-[10px] font-semibold border border-amber-500/30">
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span>Offline · Tracking cached locally</span>
          </div>
        )}
      </div>

      {/* Floating Map Actions: Recenter & Zoom Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="Recenter on current location"
          className={`p-2 sm:p-2.5 rounded-xl backdrop-blur-md shadow-md transition-all cursor-pointer flex items-center justify-center ${
            isAutoFollow
              ? 'bg-zinc-950/85 text-orange-500 border border-orange-500/30'
              : 'bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-white/10 hover:border-orange-500 active:scale-95'
          }`}
          title={isAutoFollow ? 'Centered on you' : 'Recenter map'}
        >
          <LocateFixed className="w-4 h-4 text-orange-500" />
        </button>

        <div className="hidden sm:flex flex-col rounded-xl overflow-hidden glass-card shadow-md border border-zinc-200/90 dark:border-white/10">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border-b border-zinc-200/60 dark:border-white/5"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Permission Request Prompt Banner when location is not yet granted */}
      {permissionState === 'denied' && (
        <div className="absolute inset-0 z-20 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 text-center">
          <div className="max-w-xs p-4 rounded-2xl glass-card border border-rose-500/30 space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Location Access Denied</h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Daily Run requires browser GPS permissions to record your path, calculate pace, and track distance.
            </p>
            {onRequestPermission && (
              <button
                type="button"
                onClick={onRequestPermission}
                className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Request Permission
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
