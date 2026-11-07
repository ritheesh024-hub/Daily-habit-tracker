import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  RotateCcw,
  Trash2,
  MapPin,
  Compass,
  Flame,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import { RunSession, RouteSegment, GPSCoordinate } from '../types';
import { RunMap } from './RunMap';
import {
  formatRunDistance,
  formatRunDuration,
  formatRunPace,
  formatRunSpeed,
  formatRunCalories,
} from '../utils/formatters';

interface RunSummaryViewProps {
  session: RunSession | null;
  durationSeconds: number;
  segments?: RouteSegment[];
  startPosition?: GPSCoordinate | null;
  currentPosition?: GPSCoordinate | null;
  onSaveAndClose: (title: string, notes: string) => void;
  onStartAnother: () => void;
  onDiscard: () => void;
  onReturnToTracker?: () => void;
}

export const RunSummaryView: React.FC<RunSummaryViewProps> = ({
  session,
  durationSeconds,
  segments = [],
  startPosition = null,
  currentPosition = null,
  onSaveAndClose,
  onStartAnother,
  onDiscard,
  onReturnToTracker,
}) => {
  const [title, setTitle] = useState(session?.title || 'Morning Run');
  const [notes, setNotes] = useState(session?.notes || '');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const distance = session?.metrics?.distanceKm ?? 0;
  const duration = durationSeconds || (session?.metrics?.durationSeconds ?? 0);
  const pace = session?.metrics?.averagePaceMinPerKm ?? null;
  const speed = session?.metrics?.averageSpeedKmh ?? null;
  const calories = session?.metrics?.caloriesBurned ?? null;
  const caloriesExplanation =
    session?.metrics?.caloriesExplanation ||
    (calories != null
      ? 'Calculated from GPS distance and profile weight'
      : 'Set your weight in Profile to enable calorie estimation');

  const totalPoints = segments.reduce((sum, seg) => sum + seg.points.length, 0);
  const routeStatusText =
    totalPoints > 0
      ? `Recorded • ${totalPoints} GPS track points`
      : 'No GPS route points recorded';

  const runDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      id="run-summary-view"
      className="space-y-4 sm:space-y-5 animate-fadeIn"
    >
      {/* Top Celebration Banner */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border-emerald-500/30 dark:border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-orange-500/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Run Completed
              </span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500">•</span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {runDateStr}
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full mt-0.5 text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-orange-500 focus:outline-none transition-colors"
              placeholder="Give your run a name..."
            />
          </div>
        </div>
      </div>

      {/* Route Map Preview Card & GPS Route Status */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 overflow-hidden space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-zinc-500 dark:text-zinc-400">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            Route Map
          </span>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                totalPoints > 0 ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span>{routeStatusText}</span>
          </div>
        </div>

        {segments.some((s) => s.points.length > 0) ? (
          <RunMap
            status="finished"
            gpsStatus="ready"
            currentPosition={currentPosition}
            startPosition={startPosition}
            segments={segments}
            isSummaryMode={true}
            className="h-52 sm:h-64"
          />
        ) : (
          <div
            id="summary-map-container"
            className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/10 flex items-center justify-center text-center p-4"
          >
            <div className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
            <div className="relative z-10 space-y-1">
              <div className="inline-flex p-2 rounded-xl glass-surface mb-1">
                <Compass className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                No GPS coordinates were recorded for this session.
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Check that GPS was active and device location was enabled.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Run Summary Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
        {/* Total Distance */}
        <div className="glass-card rounded-2xl p-3.5 sm:p-4 border-zinc-200/80 dark:border-white/10">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
            Total Distance
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
              {formatRunDistance(distance)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">km</span>
          </div>
        </div>

        {/* Total Duration */}
        <div className="glass-card rounded-2xl p-3.5 sm:p-4 border-zinc-200/80 dark:border-white/10">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
            Total Duration
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
              {formatRunDuration(duration)}
            </span>
          </div>
        </div>

        {/* Average Pace */}
        <div className="glass-card rounded-2xl p-3.5 sm:p-4 border-zinc-200/80 dark:border-white/10">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
            Avg Pace
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
              {formatRunPace(pace)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">/km</span>
          </div>
        </div>

        {/* Average Speed */}
        <div className="glass-card rounded-2xl p-3.5 sm:p-4 border-zinc-200/80 dark:border-white/10">
          <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
            Avg Speed
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
              {formatRunSpeed(speed)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">km/h</span>
          </div>
        </div>

        {/* Estimated Calories */}
        <div className="glass-card rounded-2xl p-3.5 sm:p-4 border-zinc-200/80 dark:border-white/10 col-span-2 sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Estimated Calories
            </span>
            <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400">
              (Estimate)
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-2xl sm:text-3xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
              {formatRunCalories(calories)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">kcal</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {caloriesExplanation}
          </p>
        </div>
      </div>

      {/* Run Notes */}
      <div className="glass-card rounded-2xl p-3.5 sm:p-4 space-y-2 border-zinc-200/80 dark:border-white/10">
        <label
          htmlFor="run-notes"
          className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block"
        >
          Notes & Reflections
        </label>
        <textarea
          id="run-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did the run feel? Terrain, energy, weather..."
          rows={2}
          className="w-full text-xs sm:text-sm p-3 rounded-xl glass-input text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none focus:outline-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <button
          id="btn-save-summary"
          type="button"
          onClick={() => onSaveAndClose(title, notes)}
          className="w-full min-h-[52px] sm:min-h-[56px] px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm sm:text-base tracking-wide shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Save Run & Complete</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          {/* Return to tracker button without starting another run */}
          <button
            id="btn-return-tracker"
            type="button"
            onClick={onReturnToTracker || onDiscard}
            className="min-h-[46px] px-4 py-2.5 rounded-xl glass-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-500" />
            <span>Back to Tracker</span>
          </button>

          <button
            id="btn-another-run"
            type="button"
            onClick={onStartAnother}
            className="min-h-[46px] px-4 py-2.5 rounded-xl glass-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4 text-zinc-500" />
            <span>Start Another</span>
          </button>
        </div>

        {/* Discard Run Action with safety confirmation */}
        <div className="pt-1 flex justify-center">
          {!showDiscardConfirm ? (
            <button
              id="btn-discard-run"
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="text-xs text-zinc-400 hover:text-rose-500 transition-colors inline-flex items-center gap-1.5 py-1 px-3 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard this session</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
              <span className="text-rose-600 dark:text-rose-400 font-medium">Discard session?</span>
              <button
                type="button"
                onClick={onDiscard}
                className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Yes, discard
              </button>
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-2.5 py-1 rounded-lg glass-card text-zinc-600 dark:text-zinc-400 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
