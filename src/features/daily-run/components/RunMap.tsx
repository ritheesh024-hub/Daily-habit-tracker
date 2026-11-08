import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Compass, Layers, Plus, Minus, MapPin, LocateFixed, Eye, WifiOff, Trees, Waves, Flag } from 'lucide-react';
import { GPSCoordinate, GPSStatus, RouteSegment, RunStatus, PlannedRoute } from '../types';
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const plannedPolylineRef = useRef<L.Polyline | null>(null);
  const landmarkMarkersRef = useRef<L.Marker[]>([]);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);

  const isOnline = useOnlineStatus();

  // Auto-follow state: true when active, temporarily false when user manually pans/zooms
  const [isAutoFollow, setIsAutoFollow] = useState<boolean>(true);
  const isAutoFollowRef = useRef<boolean>(true);
  isAutoFollowRef.current = isAutoFollow;

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Default center (either current position, start position, or global fallback)
    const initialLat = currentPosition?.latitude || startPosition?.latitude || 20.5937;
    const initialLng = currentPosition?.longitude || startPosition?.longitude || 78.9629;
    const initialZoom = currentPosition ? 16 : 4;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false, // Custom styled zoom controls
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

    // Cleanup on unmount to prevent duplicate maps and memory leaks
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
      currentMarkerRef.current = null;
      startMarkerRef.current = null;
    };
  }, []);

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
      color: '#6366f1', // Indigo
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
          <div class="relative flex items-center justify-center group">
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
              <span class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
                S
              </span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
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

    // Convert segments into array of LatLng arrays for multi-polyline rendering
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

  // Update Current Position Marker & Auto-Follow
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPosition) return;

    const latlng: L.LatLngExpression = [currentPosition.latitude, currentPosition.longitude];

    if (!currentMarkerRef.current) {
      const runnerIcon = L.divIcon({
        className: 'custom-runner-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-orange-500/30 animate-ping"></span>
            <span class="relative w-6 h-6 rounded-full bg-orange-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
              <svg class="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      currentMarkerRef.current = L.marker(latlng, { icon: runnerIcon, zIndexOffset: 100 }).addTo(map);
      map.setView(latlng, 17);
    } else {
      currentMarkerRef.current.setLatLng(latlng);
      if (isAutoFollowRef.current && status === 'running') {
        map.panTo(latlng, { animate: true, duration: 0.8 });
      }
    }
  }, [currentPosition, status]);

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

  // Status badge config
  const getGpsStatusDisplay = () => {
    switch (gpsStatus) {
      case 'acquiring':
        return { text: 'Acquiring GPS...', dotClass: 'bg-amber-400 animate-pulse' };
      case 'ready':
        return { text: 'GPS Ready', dotClass: 'bg-emerald-500' };
      case 'weak':
        return { text: 'GPS Signal Weak', dotClass: 'bg-amber-500' };
      case 'lost':
        return { text: 'GPS Lost', dotClass: 'bg-rose-500' };
      default:
        return { text: 'GPS Standby', dotClass: 'bg-zinc-400' };
    }
  };

  const gpsInfo = getGpsStatusDisplay();

  return (
    <div
      id="run-map-container"
      className={`relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-white/10 shadow-md bg-zinc-100 dark:bg-zinc-950 select-none transition-all ${className}`}
    >
      {/* Map DOM Element */}
      <div
        id="leaflet-map"
        ref={mapContainerRef}
        className="w-full h-full relative z-0"
      />

      {/* Top Left: OpenStreetMap & GPS Signal Status */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass-surface border border-zinc-200/80 dark:border-white/10 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span>OpenStreetMap Live</span>
        </div>

        {/* GPS Live Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 text-[10px] sm:text-[11px] font-mono text-zinc-700 dark:text-zinc-300 shadow-xs">
          <span className={`w-2 h-2 rounded-full shrink-0 ${gpsInfo.dotClass}`} />
          <span>{gpsInfo.text}</span>
          {currentPosition?.accuracy && (
            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 ml-0.5">
              (±{Math.round(currentPosition.accuracy)}m)
            </span>
          )}
        </div>

        {/* Offline Network Status Indicator (clearly separated from GPS hardware) */}
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-[10px] sm:text-[11px] font-semibold backdrop-blur-md shadow-xs animate-fadeIn">
            <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Offline (Route & GPS Active)</span>
          </div>
        )}
      </div>

      {/* Top Right: Auto-follow Indicator & Compass */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 pointer-events-auto">
        {status === 'running' && (
          <button
            type="button"
            onClick={() => setIsAutoFollow(!isAutoFollow)}
            title={isAutoFollow ? 'Auto-follow is ON' : 'Auto-follow paused. Tap to re-enable.'}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all shadow-xs ${
              isAutoFollow
                ? 'bg-orange-500 text-white shadow-orange-500/20'
                : 'glass-surface text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Follow</span>
          </button>
        )}
      </div>

      {/* Bottom Right: Recenter & Zoom Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          id="btn-recenter-map"
          type="button"
          onClick={handleRecenter}
          title="Recenter location"
          aria-label="Recenter location"
          className="w-8 h-8 rounded-lg glass-surface border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer active:scale-95"
        >
          <LocateFixed className="w-4 h-4 text-orange-500" />
        </button>

        <div className="flex flex-col rounded-lg overflow-hidden border border-zinc-200/80 dark:border-white/10 glass-surface shadow-xs">
          <button
            id="btn-zoom-in"
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
            className="w-8 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200/60 dark:border-zinc-800 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-out"
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
            className="w-8 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
