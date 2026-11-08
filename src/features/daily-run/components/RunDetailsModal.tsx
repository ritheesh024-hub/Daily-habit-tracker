import React from 'react';
import {
  X,
  Calendar,
  Clock,
  Navigation,
  Gauge,
  Activity,
  Flame,
  MapPin,
  Trash2,
  Compass,
  Cloud,
  CloudOff,
  AlertCircle,
} from 'lucide-react';
import { FirestoreRunDocument, LocalRunRecord } from '../types';
import { RunMap } from './RunMap';
import {
  formatRunDistance,
  formatRunDuration,
  formatRunPace,
  formatRunSpeed,
  formatRunCalories,
} from '../utils/formatters';

interface RunDetailsModalProps {
  run: FirestoreRunDocument | LocalRunRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (runId: string) => Promise<void>;
}

export const RunDetailsModal: React.FC<RunDetailsModalProps> = ({
  run,
  isOpen,
  onClose,
  onDelete,
}) => {
  if (!isOpen || !run) return null;

  const distanceKm = run.distanceMeters / 1000;
  const paceMinPerKm = run.averagePaceSecondsPerKm ? run.averagePaceSecondsPerKm / 60 : null;
  const localRecord = run as LocalRunRecord;
  const syncStatus = localRecord.syncStatus || 'synced';

  const dateObj = new Date(run.startedAt);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const hasRouteCoordinates = Array.isArray(run.routeCoordinates) && run.routeCoordinates.length > 0;
  const startCoord = hasRouteCoordinates ? run.routeCoordinates[0] : null;
  const finishCoord = hasRouteCoordinates ? run.routeCoordinates[run.routeCoordinates.length - 1] : null;

  // Wrap in a synthetic RouteSegment for read-only RunMap rendering
  const segments = hasRouteCoordinates
    ? [
        {
          id: `seg_${run.runId}`,
          points: run.routeCoordinates.map((c) => ({
            latitude: c.latitude,
            longitude: c.longitude,
            timestamp: c.timestamp,
            accuracy: c.accuracy || null,
          })),
        },
      ]
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="glass-modal rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl relative border border-zinc-200/80 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title, Timestamp, Close Button */}
        <div className="flex items-start justify-between gap-3 pb-2 border-b border-zinc-200/70 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">
                Run Details • Read-Only
              </span>
              {syncStatus === 'synced' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Cloud className="w-2.5 h-2.5" /> Synced
                </span>
              )}
              {syncStatus === 'pending' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                  <CloudOff className="w-2.5 h-2.5" /> Saved locally
                </span>
              )}
              {syncStatus === 'failed' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                  <AlertCircle className="w-2.5 h-2.5" /> Sync failed
                </span>
              )}
            </div>
            <h2
              id="run-details-title"
              className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 truncate"
            >
              {run.title || 'Daily Run'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formattedTime}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="w-8 h-8 rounded-full glass-surface flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Route Map (Read-Only) */}
        {hasRouteCoordinates ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                Route Track ({run.routePointCount || run.routeCoordinates.length} points)
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                GPS Verified
              </span>
            </div>

            <RunMap
              status="finished"
              gpsStatus="ready"
              currentPosition={finishCoord}
              startPosition={startCoord}
              segments={segments}
              isSummaryMode={true}
              className="h-48 sm:h-56"
            />
          </div>
        ) : (
          <div className="p-4 rounded-xl glass-card text-center space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Compass className="w-6 h-6 text-zinc-400 mx-auto mb-1" />
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">
              No GPS Route Track Recorded
            </p>
            <p className="text-[11px]">
              This session was saved with running statistics only.
            </p>
          </div>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {/* Distance */}
          <div className="glass-card rounded-2xl p-3 border-zinc-200/80 dark:border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-0.5">
              Distance
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                {formatRunDistance(distanceKm)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">km</span>
            </div>
          </div>

          {/* Duration */}
          <div className="glass-card rounded-2xl p-3 border-zinc-200/80 dark:border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-0.5">
              Duration
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                {formatRunDuration(run.durationSeconds)}
              </span>
            </div>
          </div>

          {/* Average Pace */}
          <div className="glass-card rounded-2xl p-3 border-zinc-200/80 dark:border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-0.5">
              Avg Pace
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                {formatRunPace(paceMinPerKm)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">/km</span>
            </div>
          </div>

          {/* Average Speed */}
          <div className="glass-card rounded-2xl p-3 border-zinc-200/80 dark:border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-0.5">
              Avg Speed
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                {formatRunSpeed(run.averageSpeedKmh)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">km/h</span>
            </div>
          </div>

          {/* Estimated Calories */}
          <div className="glass-card rounded-2xl p-3 col-span-2 border-zinc-200/80 dark:border-white/10 space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Estimated Calories
            </span>
            <div className="flex items-baseline gap-1.5">
              <Flame className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                {formatRunCalories(run.caloriesEstimate)}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">kcal</span>
            </div>
            {run.caloriesExplanation && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {run.caloriesExplanation}
              </p>
            )}
          </div>
        </div>

        {/* User Notes (if any) */}
        {run.notes && (
          <div className="glass-card rounded-2xl p-3 text-xs text-zinc-700 dark:text-zinc-300 space-y-1 border-zinc-200/80 dark:border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Notes
            </span>
            <p className="italic leading-relaxed">{run.notes}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this run from your cloud history?')) {
                  onDelete(run.runId);
                  onClose();
                }
              }}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 transition-colors inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-rose-500/10 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Run</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-semibold text-xs sm:text-sm cursor-pointer transition-colors shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
