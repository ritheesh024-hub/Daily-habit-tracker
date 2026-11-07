import React from 'react';
import { Navigation, Compass, Layers, Plus, Minus, ShieldCheck, MapPin } from 'lucide-react';
import { RunStatus } from '../types';

interface RunMapPlaceholderProps {
  status: RunStatus;
  className?: string;
  onCenterLocation?: () => void;
}

export const RunMapPlaceholder: React.FC<RunMapPlaceholderProps> = ({
  status,
  className = '',
  onCenterLocation,
}) => {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';

  return (
    <div
      id="run-map-container"
      className={`relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-white/10 shadow-md bg-zinc-100 dark:bg-zinc-950 select-none transition-all ${className}`}
    >
      {/* Target DOM hook container for Leaflet and OpenStreetMap in Phase 2 */}
      <div id="leaflet-map" className="w-full h-full relative overflow-hidden">
        {/* Cartographic Grid Background Simulation */}
        <div className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />

        {/* Decorative Map Vector Contours & Simulated Roads */}
        <svg
          className="absolute inset-0 w-full h-full opacity-40 dark:opacity-30 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 400 300"
        >
          <defs>
            <linearGradient id="map-road-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#fb923c" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="map-curve-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Simulated Park / Water polygon */}
          <path
            d="M -10 120 Q 80 90, 160 140 T 320 110 T 420 150 L 420 320 L -10 320 Z"
            className="fill-emerald-500/10 dark:fill-emerald-500/5 text-emerald-600"
          />

          {/* Secondary streets */}
          <path
            d="M 50 -10 L 120 310 M 280 -10 L 220 310 M -10 180 L 410 180 M -10 80 L 410 95"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-zinc-300 dark:text-zinc-800"
          />

          {/* Main street curve */}
          <path
            d="M -10 240 C 90 230, 160 170, 240 160 S 340 70, 420 50"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-zinc-300/80 dark:text-zinc-700/80"
          />

          {/* Potential running route preview line (dashed) */}
          <path
            d="M 140 220 C 180 200, 200 160, 200 150"
            stroke="url(#map-road-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 4"
          />
        </svg>

        {/* Ambient Map Gradients for High Contrast Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/20 via-transparent to-zinc-900/10 pointer-events-none" />

        {/* Center GPS / Runner Position Indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          {isRunning && (
            <span className="absolute w-14 h-14 rounded-full bg-orange-500/25 animate-ping" />
          )}
          {isPaused && (
            <span className="absolute w-12 h-12 rounded-full bg-amber-500/25" />
          )}
          <div className="relative w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border-2 border-orange-500 shadow-lg flex items-center justify-center text-orange-600 dark:text-orange-400">
            <Navigation className={`w-4 h-4 fill-orange-500 text-orange-500 transform transition-transform ${isRunning ? 'animate-pulse' : ''}`} />
          </div>
        </div>

        {/* Top Left: OpenStreetMap / Leaflet Engine Info Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass-surface border border-zinc-200/80 dark:border-white/10 text-[11px] text-zinc-600 dark:text-zinc-300 font-medium shadow-xs">
          <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span>OpenStreetMap • Leaflet Ready</span>
        </div>

        {/* Top Right: Compass & Map Layer Badges */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            title="Compass Bearing"
            aria-label="Compass"
            className="w-8 h-8 rounded-lg glass-surface border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-xs cursor-default"
          >
            <Compass className="w-4 h-4 text-orange-500" />
          </button>
          <button
            type="button"
            title="Map Layers (OpenStreetMap Standard / Satellite)"
            aria-label="Map Layers"
            className="w-8 h-8 rounded-lg glass-surface border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-xs cursor-default"
          >
            <Layers className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Bottom Left: GPS Status Callout */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="px-2.5 py-1 rounded-md bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800 text-[10px] sm:text-[11px] text-zinc-600 dark:text-zinc-400 font-mono flex items-center gap-1.5 shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning
                  ? 'bg-emerald-500 animate-pulse'
                  : isPaused
                  ? 'bg-amber-500'
                  : 'bg-zinc-400 dark:bg-zinc-600'
              }`}
            />
            <span>
              {isRunning
                ? 'Tracking Active'
                : isPaused
                ? 'Session Paused'
                : 'GPS Standby'}
            </span>
          </div>
        </div>

        {/* Bottom Right: Zoom Controls Placeholder (Leaflet style) */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
          <button
            type="button"
            onClick={onCenterLocation}
            title="Re-center Location"
            aria-label="Center Location"
            className="w-8 h-8 rounded-md glass-surface border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer active:scale-95"
          >
            <Navigation className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-200" />
          </button>
          <div className="flex flex-col rounded-md overflow-hidden border border-zinc-200/80 dark:border-white/10 glass-surface shadow-xs">
            <button
              type="button"
              title="Zoom In"
              aria-label="Zoom In"
              className="w-8 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-200/60 dark:border-zinc-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Zoom Out"
              aria-label="Zoom Out"
              className="w-8 h-7 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
