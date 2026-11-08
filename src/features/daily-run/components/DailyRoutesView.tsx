import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Compass,
  Navigation,
  MapPin,
  Home,
  Bookmark,
  BookmarkCheck,
  Play,
  RotateCw,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Mountain,
  Clock,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  Map as MapIcon,
  Search,
  ExternalLink,
  Plus,
  LocateFixed,
  Eye,
  Crosshair,
} from 'lucide-react';
import {
  UserProfile,
  RouteStartLocation,
  HomeLocation,
  PlannedRoute,
  SavedRouteDocument,
  RouteWaypoint,
} from '../types';
import { routeGenerationService } from '../services/routeGenerationService';
import { routeFirebaseService } from '../services/routeFirebaseService';
import { formatRunDistance, formatRunDuration, formatRunPace } from '../utils/formatters';

interface DailyRoutesViewProps {
  user: UserProfile | null;
  userAveragePaceMinPerKm?: number | null;
  onStartRouteRun: (route: PlannedRoute) => void;
  onNavigateToTracker?: () => void;
}

const TARGET_DISTANCES = [2, 3, 5, 8, 10];

export const DailyRoutesView: React.FC<DailyRoutesViewProps> = ({
  user,
  userAveragePaceMinPerKm,
  onStartRouteRun,
  onNavigateToTracker,
}) => {
  const userId = user?.uid || 'guest';

  // Subtab: 'discover' vs 'saved'
  const [activeTab, setActiveTab] = useState<'discover' | 'saved'>('discover');

  // Start Location state
  const [startSource, setStartSource] = useState<'gps' | 'home' | 'custom_map'>('gps');
  const [startLocation, setStartLocation] = useState<RouteStartLocation>({
    latitude: 51.505,
    longitude: -0.165,
    source: 'gps',
    label: 'Detecting Location...',
  });
  const [isLocatingGPS, setIsLocatingGPS] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Saved Home location state
  const [savedHome, setSavedHome] = useState<HomeLocation | null>(null);
  const [isHomeModalOpen, setIsHomeModalOpen] = useState<boolean>(false);
  const [homeInputName, setHomeInputName] = useState<string>('Home');
  const [homeInputAddress, setHomeInputAddress] = useState<string>('');

  // Target distance state
  const [targetDistanceKm, setTargetDistanceKm] = useState<number>(5);

  // Route generation state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [suggestedRoutes, setSuggestedRoutes] = useState<PlannedRoute[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);

  // Saved routes state
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteDocument[]>([]);
  const [isLoadingSavedRoutes, setIsLoadingSavedRoutes] = useState<boolean>(false);
  const [savingRouteId, setSavingRouteId] = useState<string | null>(null);

  // Map interactive state
  const [isMapPickMode, setIsMapPickMode] = useState<boolean>(false);
  const [showStepsDrawer, setShowStepsDrawer] = useState<boolean>(false);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const landmarkMarkersRef = useRef<L.Marker[]>([]);

  // 1. Load saved home location & saved routes on mount
  useEffect(() => {
    routeGenerationService.getHomeLocation(userId).then((home) => {
      if (home) {
        setSavedHome(home);
      }
    });

    loadSavedRoutes();
  }, [userId]);

  const loadSavedRoutes = async () => {
    setIsLoadingSavedRoutes(true);
    try {
      const routes = await routeFirebaseService.getSavedRoutes(userId);
      setSavedRoutes(routes);
    } catch {
      // ignore
    } finally {
      setIsLoadingSavedRoutes(false);
    }
  };

  // 2. Fetch current GPS location on mount if startSource is 'gps'
  const acquireCurrentGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocatingGPS(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const label = await routeGenerationService.reverseGeocode(lat, lng);

        const newLoc: RouteStartLocation = {
          latitude: lat,
          longitude: lng,
          source: 'gps',
          label: `GPS: ${label}`,
          address: label,
        };

        setStartLocation(newLoc);
        setStartSource('gps');
        setIsLocatingGPS(false);

        // Pan map if open
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 15);
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        setGpsError(
          err.code === 1
            ? 'GPS permission denied. Select your home or click on the map.'
            : 'Unable to acquire accurate GPS position.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    acquireCurrentGPS();
  }, [acquireCurrentGPS]);

  // 3. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = startLocation.latitude || 51.505;
    const initialLng = startLocation.longitude || -0.165;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    // OpenStreetMap standard tile layer
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, OSRM',
    }).addTo(map);

    // Click handler for "Pick on Map" mode
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      const label = await routeGenerationService.reverseGeocode(lat, lng);

      setStartLocation({
        latitude: lat,
        longitude: lng,
        source: 'custom_map',
        label: `Selected: ${label}`,
        address: label,
      });
      setStartSource('custom_map');
      setIsMapPickMode(false);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      startMarkerRef.current = null;
      routePolylineRef.current = null;
      landmarkMarkersRef.current.forEach((m) => m.remove());
      landmarkMarkersRef.current = [];
    };
  }, []);

  // 4. Update Start Marker on Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const latlng: L.LatLngExpression = [startLocation.latitude, startLocation.longitude];

    if (!startMarkerRef.current) {
      const startIcon = L.divIcon({
        className: 'custom-start-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="w-8 h-8 rounded-full bg-orange-600 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
              S/F
            </span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      startMarkerRef.current = L.marker(latlng, { icon: startIcon, zIndexOffset: 100 })
        .bindPopup(`<strong>Start / Finish</strong><br/>${startLocation.label || ''}`)
        .addTo(map);
    } else {
      startMarkerRef.current.setLatLng(latlng);
      startMarkerRef.current.setPopupContent(`<strong>Start / Finish</strong><br/>${startLocation.label || ''}`);
    }
  }, [startLocation]);

  // 5. Update Rendered Route on Map when selectedRoute changes
  const activeRoute = suggestedRoutes[selectedRouteIndex] || null;

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    // Clear old landmarks
    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    if (!activeRoute || !activeRoute.routeCoordinates || activeRoute.routeCoordinates.length === 0) {
      return;
    }

    const latlngs: L.LatLngExpression[] = activeRoute.routeCoordinates.map((c) => [c.latitude, c.longitude]);

    // Draw primary route polyline in vibrant athletic orange
    routePolylineRef.current = L.polyline(latlngs, {
      color: '#ea580c',
      weight: 5,
      opacity: 0.95,
      lineJoin: 'round',
      lineCap: 'round',
    }).addTo(map);

    // Draw landmark markers along the route
    if (Array.isArray(activeRoute.landmarks)) {
      activeRoute.landmarks.forEach((lm) => {
        const iconSymbol =
          lm.category === 'park'
            ? '🌳'
            : lm.category === 'water'
            ? '💧'
            : lm.category === 'track'
            ? '🏃'
            : lm.category === 'stadium'
            ? '🏟️'
            : '📍';

        const lmIcon = L.divIcon({
          className: 'custom-landmark-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <span class="w-7 h-7 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-2 border-orange-500 shadow-md flex items-center justify-center text-xs">
                ${iconSymbol}
              </span>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const m = L.marker([lm.latitude, lm.longitude], { icon: lmIcon, zIndexOffset: 50 })
          .bindPopup(`<strong>${lm.name}</strong><br/><span class="text-xs text-zinc-500 capitalize">${lm.category}</span>`)
          .addTo(map);

        landmarkMarkersRef.current.push(m);
      });
    }

    // Fit map bounds to show complete loop
    const bounds = routePolylineRef.current.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [35, 35] });
    }
  }, [activeRoute]);

  // 6. Handle Generate Routes
  const handleGenerateRoutes = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setSuggestedRoutes([]);

    try {
      const routes = await routeGenerationService.generateLoopRoutes({
        startLocation,
        targetDistanceKm,
        userAveragePaceMinPerKm: userAveragePaceMinPerKm || null,
      });

      setSuggestedRoutes(routes);
      setSelectedRouteIndex(0);
    } catch (err) {
      setGenerationError(
        err instanceof Error
          ? err.message
          : 'Unable to generate loop routes at this location. Please choose a different distance or start point.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 7. Handle Save Favourite Route
  const handleSaveRoute = async (route: PlannedRoute) => {
    setSavingRouteId(route.id);
    try {
      await routeFirebaseService.saveRoute(userId, route);
      await loadSavedRoutes();
    } catch (err) {
      console.warn('Failed to save route:', err);
    } finally {
      setSavingRouteId(null);
    }
  };

  // 8. Handle Delete Saved Route
  const handleDeleteSavedRoute = async (routeId: string) => {
    try {
      await routeFirebaseService.deleteRoute(userId, routeId);
      setSavedRoutes((prev) => prev.filter((r) => r.routeId !== routeId));
    } catch (err) {
      console.warn('Failed to delete route:', err);
    }
  };

  // 9. Handle Set Home Location
  const handleSaveHome = async () => {
    const lat = startLocation.latitude;
    const lng = startLocation.longitude;
    const label = homeInputAddress.trim() || startLocation.address || 'Home';

    const newHome: HomeLocation = {
      latitude: lat,
      longitude: lng,
      name: homeInputName.trim() || 'Home',
      address: label,
      updatedAt: new Date().toISOString(),
    };

    await routeGenerationService.saveHomeLocation(userId, newHome);
    setSavedHome(newHome);
    setIsHomeModalOpen(false);
  };

  const handleRemoveHome = async () => {
    await routeGenerationService.deleteHomeLocation(userId);
    setSavedHome(null);
    if (startSource === 'home') {
      acquireCurrentGPS();
    }
  };

  // 10. Start Live Tracking with Selected Planned Route
  const handleStartRun = (route: PlannedRoute) => {
    onStartRouteRun(route);
  };

  // Check if a route is already saved
  const isRouteSaved = (routeId: string) => savedRoutes.some((r) => r.routeId === routeId);

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn">
      {/* Top Controls: Discover New Routes vs My Saved Routes Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              Daily Routes
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              Loop Discovery
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Discover pedestrian-safe loop routes with real road geometry, public parks, and elevation gain.
          </p>
        </div>

        {/* Tab switcher: Discover vs Saved */}
        <div className="flex items-center p-1 rounded-xl glass-card self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('discover')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'discover'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Discover Loops</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'saved'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Routes ({savedRoutes.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'discover' ? (
        <div className="space-y-4">
          {/* Starting Location Configuration Card */}
          <div className="glass-card rounded-2xl p-3.5 sm:p-4 border-zinc-200/80 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                1. Starting Point
              </span>

              {/* Source Selector Buttons */}
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <button
                  type="button"
                  onClick={acquireCurrentGPS}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    startSource === 'gps'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <LocateFixed className="w-3 h-3 text-orange-500" />
                  <span>My GPS</span>
                </button>

                {savedHome ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStartLocation({
                        latitude: savedHome.latitude,
                        longitude: savedHome.longitude,
                        source: 'home',
                        label: `Home: ${savedHome.address || savedHome.name}`,
                        address: savedHome.address,
                      });
                      setStartSource('home');
                      mapInstanceRef.current?.setView([savedHome.latitude, savedHome.longitude], 15);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                      startSource === 'home'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Home className="w-3 h-3 text-blue-500" />
                    <span>Saved Home</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsHomeModalOpen(true)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Home</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsMapPickMode(!isMapPickMode)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                    isMapPickMode || startSource === 'custom_map'
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  <Crosshair className="w-3 h-3" />
                  <span>{isMapPickMode ? 'Click Map...' : 'Pick on Map'}</span>
                </button>
              </div>
            </div>

            {/* Current Selected Start Address Bar */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <div className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {isLocatingGPS ? (
                    <span className="text-zinc-400 italic">Acquiring high-accuracy GPS...</span>
                  ) : (
                    <span>{startLocation.label || `${startLocation.latitude}, ${startLocation.longitude}`}</span>
                  )}
                </div>
              </div>

              {savedHome && startSource === 'home' ? (
                <button
                  type="button"
                  onClick={handleRemoveHome}
                  className="text-[11px] font-semibold text-rose-500 hover:underline shrink-0"
                >
                  Remove Home
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsHomeModalOpen(true)}
                  className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline shrink-0"
                >
                  Set as Home
                </button>
              )}
            </div>

            {/* Map Pick Guidance */}
            {isMapPickMode && (
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-950 dark:text-orange-200 text-xs flex items-center gap-2 animate-fadeIn">
                <Info className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Click anywhere on the map below to set your loop start point.</span>
              </div>
            )}

            {/* GPS Error Alert */}
            {gpsError && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}
          </div>

          {/* Distance Filter & Generation Bar */}
          <div className="glass-card rounded-2xl p-3.5 sm:p-4 border-zinc-200/80 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                2. Target Loop Distance
              </span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                {targetDistanceKm} km
              </span>
            </div>

            {/* Segmented Distance Selector */}
            <div className="grid grid-cols-5 gap-1.5">
              {TARGET_DISTANCES.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setTargetDistanceKm(d)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    targetDistanceKm === d
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20 active:scale-95'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {d} km
                </button>
              ))}
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              disabled={isGenerating || isLocatingGPS}
              onClick={handleGenerateRoutes}
              className="w-full h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isGenerating ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-orange-500" />
                  <span>Discovering Real Loops & Landmarks...</span>
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4 text-orange-500" />
                  <span>Generate {targetDistanceKm} km Loop Routes</span>
                </>
              )}
            </button>

            {/* Generation Error Banner */}
            {generationError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Route Generation Note</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-800/90 dark:text-rose-300/90">
                  {generationError}
                </p>
              </div>
            )}
          </div>

          {/* Interactive Map Container */}
          <div className="relative rounded-2xl overflow-hidden glass-card border border-zinc-200/80 dark:border-white/10 h-72 sm:h-96 shadow-sm">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Map Mode Badge Overlay */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/85 backdrop-blur-md text-white text-[11px] font-medium border border-white/10 shadow-sm pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              <span>
                {activeRoute
                  ? `${activeRoute.name} (${formatRunDistance(activeRoute.actualDistanceMeters / 1000)} km)`
                  : 'OpenStreetMap · OSRM Pedestrian Routing'}
              </span>
            </div>

            {/* Recenter Start Button */}
            <button
              type="button"
              onClick={() => {
                mapInstanceRef.current?.setView([startLocation.latitude, startLocation.longitude], 15);
              }}
              aria-label="Recenter on start"
              className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md text-zinc-700 dark:text-zinc-200 shadow-md hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <LocateFixed className="w-4 h-4 text-orange-500" />
            </button>
          </div>

          {/* Suggested Routes Options Carousel */}
          {suggestedRoutes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span>{suggestedRoutes.length} Loop Route Suggestions</span>
                </h3>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Tap to preview on map
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {suggestedRoutes.map((route, idx) => {
                  const isSelected = idx === selectedRouteIndex;
                  const isSaved = isRouteSaved(route.id);

                  return (
                    <div
                      key={route.id}
                      onClick={() => setSelectedRouteIndex(idx)}
                      className={`p-4 rounded-2xl transition-all cursor-pointer border flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'glass-card border-orange-500 shadow-md ring-1 ring-orange-500/30'
                          : 'glass-card border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                      }`}
                    >
                      <div>
                        {/* Header: Title & Distance */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                            {route.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
                            {formatRunDistance(route.actualDistanceMeters / 1000)} km
                          </span>
                        </div>

                        {/* Metrics Bar: Est Time, Elevation */}
                        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{formatRunDuration(route.estimatedDurationSeconds)}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1">
                            <Mountain className="w-3.5 h-3.5 text-zinc-400" />
                            <span>
                              {route.elevationGainMeters != null ? `+${route.elevationGainMeters}m` : 'Flat'}
                            </span>
                          </span>
                        </div>

                        {/* Landmarks / Waypoint List */}
                        {route.landmarks && route.landmarks.length > 0 && (
                          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-0.5">
                            <span className="font-semibold text-zinc-500">Highlights: </span>
                            <span>{route.landmarks.map((l) => l.name).join(' · ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions: Save & Start */}
                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-white/5">
                        <button
                          type="button"
                          disabled={savingRouteId === route.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveRoute(route);
                          }}
                          className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                            isSaved
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                          title={isSaved ? 'Saved to Favourites' : 'Save to Favourites'}
                        >
                          {isSaved ? (
                            <BookmarkCheck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Bookmark className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartRun(route);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Start Run</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRouteIndex(idx);
                            setShowStepsDrawer(!showStepsDrawer);
                          }}
                          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-xs font-semibold flex items-center justify-center cursor-pointer"
                          title="View Navigation Steps"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Steps Preview Drawer */}
              {showStepsDrawer && activeRoute && (
                <div className="p-4 rounded-2xl glass-card border border-zinc-200/80 dark:border-white/10 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Step-by-Step Road Geometry ({activeRoute.name})
                    </h4>
                    <span className="text-[11px] text-zinc-400">
                      Visual guidance only · Voice guidance unsupported
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 divide-y divide-zinc-200/40 dark:divide-white/5">
                    {activeRoute.steps && activeRoute.steps.length > 0 ? (
                      activeRoute.steps.map((st, i) => (
                        <div key={i} className="pt-1.5 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-zinc-400 text-[11px] mt-0.5">
                              {(i + 1).toString().padStart(2, '0')}.
                            </span>
                            <span>{st.instruction}</span>
                          </div>
                          <span className="font-mono text-zinc-400 shrink-0 text-[11px]">
                            {st.distanceMeters}m
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-400 italic py-2">
                        Continuous loop path following pedestrian road network.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* SAVED ROUTES TAB */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-orange-500" />
              <span>Your Favourite Saved Routes</span>
            </h3>
            <button
              type="button"
              onClick={loadSavedRoutes}
              className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingSavedRoutes ? (
            <div className="p-8 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4 animate-spin text-orange-500" />
              <span>Loading saved routes...</span>
            </div>
          ) : savedRoutes.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center space-y-3 border-zinc-200/80 dark:border-white/10">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  No Saved Routes Yet
                </h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Generate loop routes in the Discover tab and bookmark your favourites for instant access and offline run tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Discover Loops
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedRoutes.map((saved) => (
                <div
                  key={saved.routeId}
                  className="glass-card rounded-2xl p-4 border border-zinc-200/80 dark:border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        {saved.routeName}
                      </h4>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Start: {saved.startLocation?.label || 'Custom Point'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
                      {formatRunDistance(saved.distanceMeters / 1000)} km
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>
                      {saved.elevationGainMeters != null ? `+${saved.elevationGainMeters}m gain` : 'Flat route'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Saved {new Date(saved.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-200/60 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        // Construct planned route from saved doc
                        const reconstructed: PlannedRoute = {
                          id: saved.routeId,
                          name: saved.routeName,
                          targetDistanceKm: saved.targetDistanceKm || Math.round(saved.distanceMeters / 1000),
                          actualDistanceMeters: saved.distanceMeters,
                          estimatedDurationSeconds: Math.round((saved.distanceMeters / 1000) * 330),
                          elevationGainMeters: saved.elevationGainMeters,
                          startLocation: {
                            latitude: saved.startLocation.latitude,
                            longitude: saved.startLocation.longitude,
                            source: 'custom_map',
                            label: saved.startLocation.label,
                          },
                          waypoints: saved.waypoints || [],
                          routeCoordinates: (saved.routeCoordinates || []).map((c, i) => ({
                            latitude: c.latitude,
                            longitude: c.longitude,
                            timestamp: Date.now() + i * 1000,
                          })),
                          steps: [],
                          landmarks: (saved.waypoints || []).filter((w) => w.category !== 'turn'),
                          summary: `Saved route ${saved.routeName}`,
                          provider: 'OSRM & OpenStreetMap',
                          generatedAt: saved.createdAt,
                        };
                        handleStartRun(reconstructed);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Start Run with Route</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSavedRoute(saved.routeId)}
                      className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Saved Route"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Set Home Location Modal */}
      {isHomeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
        >
          <div className="glass-card w-full max-w-sm rounded-3xl p-5 border border-zinc-200/80 dark:border-white/10 space-y-4 shadow-2xl bg-white dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Save Home Location
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHomeModalOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-zinc-500">
              Save your residence or primary starting spot. You will be able to plan loops directly from home anytime.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={homeInputName}
                  onChange={(e) => setHomeInputName(e.target.value)}
                  placeholder="e.g. My Apartment, Home Base"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Address / Description
                </label>
                <input
                  type="text"
                  value={homeInputAddress || startLocation.address || ''}
                  onChange={(e) => setHomeInputAddress(e.target.value)}
                  placeholder="Street or neighborhood"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-[11px] font-mono text-zinc-500 space-y-0.5">
                <div>Latitude: {startLocation.latitude}</div>
                <div>Longitude: {startLocation.longitude}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsHomeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl glass-surface text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHome}
                className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-xs"
              >
                Save as Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
