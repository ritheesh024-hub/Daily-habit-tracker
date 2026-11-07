import React, { useState, useEffect } from 'react';
import {
  Activity,
  Flame,
  Gauge,
  Clock,
  Navigation,
  Compass,
  History,
  ChevronRight,
  Sparkles,
  Info,
  AlertTriangle,
  X,
  Smartphone,
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { useRunSession } from '../hooks/useRunSession';
import { runStorageService } from '../services/runStorageService';
import { RunSession } from '../types';
import { RunMap } from '../components/RunMap';
import { RunMetricCard } from '../components/RunMetricCard';
import { RunControls } from '../components/RunControls';
import { RunSummaryView } from '../components/RunSummaryView';
import {
  formatRunDistance,
  formatRunDuration,
  formatRunPace,
  formatRunSpeed,
} from '../utils/formatters';

interface DailyRunPageProps {
  user: UserProfile | null;
  onNavigateToHabits?: () => void;
}

export const DailyRunPage: React.FC<DailyRunPageProps> = ({
  user,
  onNavigateToHabits,
}) => {
  const userId = user?.uid || 'guest';
  const userWeightKg =
    user?.weight && user.weight > 25 && user.weight < 250
      ? user.weightUnit === 'lbs'
        ? user.weight * 0.453592
        : user.weight
      : null;

  const {
    status,
    gpsStatus,
    gpsError,
    setGpsError,
    durationSeconds,
    metrics,
    currentPosition,
    startPosition,
    segments,
    completedSession,
    startRun,
    pauseRun,
    resumeRun,
    finishRun,
    resetRun,
    discardRun,
  } = useRunSession({ userId, userWeightKg });

  const [savedRuns, setSavedRuns] = useState<RunSession[]>(() =>
    runStorageService.getRunHistory(userId)
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  // Refresh saved runs when user changes
  useEffect(() => {
    setSavedRuns(runStorageService.getRunHistory(userId));
  }, [userId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleSaveAndClose = async (title: string, notes: string) => {
    if (completedSession) {
      const sessionToSave: RunSession = {
        ...completedSession,
        title: title.trim() || completedSession.title,
        notes: notes.trim() || undefined,
      };
      await runStorageService.saveCompletedRun(sessionToSave);
      setSavedRuns(runStorageService.getRunHistory(userId));
      showToast('Run saved to session history!');
    }
    resetRun();
  };

  const handleStartAnother = () => {
    resetRun();
    startRun();
  };

  const handleDiscard = () => {
    discardRun();
    showToast('Run session discarded');
  };

  const isFinished = status === 'finished';

  return (
    <div
      id="daily-run-page"
      className="space-y-4 sm:space-y-5 animate-fadeIn pb-8"
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-zinc-900/90 dark:bg-zinc-100/95 text-white dark:text-zinc-900 text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 border border-white/10 dark:border-zinc-300 animate-slideUp"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <h1
              id="daily-run-heading"
              className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight"
            >
              Daily Run
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              Live GPS
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Real-time outdoor GPS tracking, route visualization, and distance metrics.
          </p>
        </div>

        {/* GPS Live Quality Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-surface text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsStatus === 'ready'
                  ? 'bg-emerald-500'
                  : gpsStatus === 'weak'
                  ? 'bg-amber-500'
                  : gpsStatus === 'lost'
                  ? 'bg-rose-500'
                  : 'bg-zinc-400 animate-pulse'
              }`}
            />
            <span className="font-mono capitalize font-medium">
              {gpsStatus === 'ready'
                ? 'GPS Ready'
                : gpsStatus === 'weak'
                ? 'Signal Weak'
                : gpsStatus === 'lost'
                ? 'GPS Lost'
                : 'Acquiring GPS'}
            </span>
          </div>
        </div>
      </div>

      {/* GPS Error Alert Banner */}
      {gpsError && (
        <div
          role="alert"
          className="p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-start justify-between gap-3 text-xs sm:text-sm animate-fadeIn"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">{gpsError}</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                Ensure device location is turned on and browser permission is granted.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setGpsError(null)}
            aria-label="Dismiss error"
            className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content: Finished View vs Active Tracking View */}
      {isFinished ? (
        <RunSummaryView
          session={completedSession}
          durationSeconds={durationSeconds}
          segments={segments}
          startPosition={startPosition}
          currentPosition={currentPosition}
          onSaveAndClose={handleSaveAndClose}
          onStartAnother={handleStartAnother}
          onDiscard={handleDiscard}
          onReturnToTracker={resetRun}
        />
      ) : (
        <div className="space-y-4">
          {/* Real Interactive Leaflet & OpenStreetMap Route Map */}
          <RunMap
            status={status}
            gpsStatus={gpsStatus}
            currentPosition={currentPosition}
            startPosition={startPosition}
            segments={segments}
          />

          {/* Running Metrics Dashboard Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* 1. Distance Metric (Hero Card) */}
            <RunMetricCard
              id="metric-distance"
              label="Distance"
              value={formatRunDistance(metrics.distanceKm)}
              unit="km"
              isHero={true}
              highlight={status === 'running'}
              subLabel={
                metrics.caloriesBurned != null
                  ? `~${metrics.caloriesBurned} kcal (est)`
                  : metrics.caloriesExplanation || 'Calorie est. available'
              }
              icon={<Navigation className="w-4 h-4" />}
            />

            {/* 2. Duration Metric */}
            <RunMetricCard
              id="metric-duration"
              label="Duration"
              value={formatRunDuration(durationSeconds)}
              highlight={status === 'running'}
              subLabel={
                status === 'running'
                  ? metrics.isStationary
                    ? 'Status: Stationary'
                    : 'Status: Moving'
                  : status === 'paused'
                  ? 'Status: Paused'
                  : undefined
              }
              icon={<Clock className="w-4 h-4" />}
            />

            {/* 3. Pace Metric (Current Pace with Average Pace sub-metric) */}
            <RunMetricCard
              id="metric-pace"
              label="Pace"
              value={formatRunPace(metrics.currentPaceMinPerKm)}
              unit="min/km"
              subLabel={
                metrics.averagePaceMinPerKm
                  ? `Avg: ${formatRunPace(metrics.averagePaceMinPerKm)} /km`
                  : 'Avg: -- min/km'
              }
              icon={<Gauge className="w-4 h-4" />}
            />

            {/* 4. Speed Metric (Current Speed with Average Speed sub-metric) */}
            <RunMetricCard
              id="metric-speed"
              label="Speed"
              value={formatRunSpeed(metrics.currentSpeedKmh)}
              unit="km/h"
              subLabel={
                metrics.averageSpeedKmh
                  ? `Avg: ${formatRunSpeed(metrics.averageSpeedKmh)} km/h`
                  : 'Avg: -- km/h'
              }
              icon={<Activity className="w-4 h-4" />}
            />
          </div>

          {/* Running Controls (Start / Pause / Resume / Finish) */}
          <RunControls
            status={status}
            onStart={startRun}
            onPause={pauseRun}
            onResume={resumeRun}
            onFinish={finishRun}
            onCancelAcquiring={resetRun}
          />

          {/* Helpful Information & PWA Guidance */}
          <div className="glass-card rounded-xl p-3 space-y-2 text-xs text-zinc-500 dark:text-zinc-400 border border-zinc-200/80 dark:border-white/10">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {status === 'idle' && (
                  <>Tap <strong>Start Run</strong> to request GPS permission. Live coordinates will be recorded, drawing your route in real-time with Haversine distance calculation.</>
                )}
                {status === 'acquiring_gps' && (
                  <>Acquiring your location from GPS satellites. Tracking will automatically start once high-accuracy coordinates are verified.</>
                )}
                {status === 'running' && (
                  <>Recording live GPS route! Tap <strong>Pause</strong> at red lights or breaks, or <strong>Finish Run</strong> when your workout is complete.</>
                )}
                {status === 'paused' && (
                  <>Run paused. Distance and timer are frozen. Tap <strong>Resume</strong> when ready to continue tracking.</>
                )}
              </p>
            </div>

            {/* PWA / Screen Lock Notice */}
            <div className="flex items-start gap-2 pt-1 border-t border-zinc-200/60 dark:border-white/5 text-[11px] text-zinc-400 dark:text-zinc-500">
              <Smartphone className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <p>
                <strong>Browser GPS Notice:</strong> Web browsers may suspend location tracking if the screen is locked or the browser is minimized. Keep this tab visible while running for uninterrupted tracking.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Run History Section (Local sessions) */}
      {savedRuns.length > 0 && !isFinished && (
        <section
          id="daily-run-history"
          className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-3"
        >
          <button
            type="button"
            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-zinc-500" />
              Past Runs ({savedRuns.length})
            </span>
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${
                isHistoryExpanded ? 'rotate-90' : ''
              }`}
            />
          </button>

          {isHistoryExpanded && (
            <div className="space-y-2 animate-fadeIn">
              {savedRuns.map((run) => (
                <div
                  key={run.id}
                  className="glass-card rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {run.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                      {new Date(run.startTime).toLocaleDateString()} • {formatRunDuration(run.metrics.durationSeconds)} • {formatRunDistance(run.metrics.distanceKm)} km
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-300 shrink-0">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
