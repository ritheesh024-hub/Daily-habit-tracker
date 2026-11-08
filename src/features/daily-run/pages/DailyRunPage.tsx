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
  Layers,
  Footprints,
  WifiOff,
  CloudOff,
  TrendingUp,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile } from '../../../types';
import { useRunSession } from '../hooks/useRunSession';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { runStorageService } from '../services/runStorageService';
import { runFirebaseService, sanitizeRouteCoordinates } from '../services/runFirebaseService';
import { runIndexedDB } from '../services/runIndexedDB';
import { runSyncService } from '../services/runSyncService';
import { RunSession, LocalRunRecord, PlannedRoute, RouteDeviationState } from '../types';
import { routeGenerationService } from '../services/routeGenerationService';
import { RunMap } from '../components/RunMap';
import { RunMetricCard } from '../components/RunMetricCard';
import { RunControls } from '../components/RunControls';
import { RunSummaryView } from '../components/RunSummaryView';
import { RunHistoryView } from '../components/RunHistoryView';
import { RunAnalyticsView } from '../components/RunAnalyticsView';
import { DailyRoutesView } from '../components/DailyRoutesView';
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

  const isOnline = useOnlineStatus();

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
    recoverableSession,
    recoverSession,
    discardRecoverableSession,
    startRun,
    pauseRun,
    resumeRun,
    finishRun,
    resetRun,
    discardRun,
  } = useRunSession({ userId, userWeightKg });

  // Sub-navigation: 'tracker' (Live Run) vs 'routes' (Daily Routes Loop Discovery) vs 'history' vs 'analytics'
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'routes' | 'history' | 'analytics'>('tracker');

  // Active planned route for live run guidance
  const [activePlannedRoute, setActivePlannedRoute] = useState<PlannedRoute | null>(null);
  const [routeDeviation, setRouteDeviation] = useState<RouteDeviationState | null>(null);

  // Shared completed runs list for History and Analytics
  const [allRuns, setAllRuns] = useState<LocalRunRecord[]>([]);

  // Calculate runner's personal average pace from completed history
  const userAvgPace = React.useMemo(() => {
    const valid = allRuns.filter(
      (r) => r.distanceMeters >= 500 && r.averagePaceSecondsPerKm && r.averagePaceSecondsPerKm > 150
    );
    if (valid.length === 0) return null;
    const avgSec = valid.reduce((sum, r) => sum + (r.averagePaceSecondsPerKm || 0), 0) / valid.length;
    return Number((avgSec / 60).toFixed(2));
  }, [allRuns]);

  // Track deviation from planned route when live tracking
  useEffect(() => {
    if (activePlannedRoute && currentPosition) {
      const dev = routeGenerationService.calculateRouteDeviation(currentPosition, activePlannedRoute);
      setRouteDeviation(dev);
    } else {
      setRouteDeviation(null);
    }
  }, [currentPosition, activePlannedRoute]);

  const refreshAllRuns = React.useCallback(async () => {
    try {
      const local = await runIndexedDB.getCompletedRuns(userId);
      setAllRuns(local);
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    refreshAllRuns();
  }, [refreshAllRuns]);

  // Cloud saving states
  const [isSavingToCloud, setIsSavingToCloud] = useState<boolean>(false);
  const [cloudSaveError, setCloudSaveError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Auto-sync pending runs when user is authenticated and internet is online
  useEffect(() => {
    if (user?.uid && isOnline) {
      runSyncService.syncPendingRuns(user.uid).then(() => {
        refreshAllRuns();
      }).catch(() => {
        // silent background sync
      });
    }
  }, [user?.uid, isOnline, refreshAllRuns]);

  // Listen to sync events to keep allRuns fresh
  useEffect(() => {
    const unsub = runSyncService.subscribe((event) => {
      if (event.type === 'sync_complete' || event.type === 'sync_item_success') {
        refreshAllRuns();
      }
    });
    return unsub;
  }, [refreshAllRuns]);

  const handleSaveAndClose = async (title: string, notes: string) => {
    if (!completedSession) return;

    const sessionToSave: RunSession = {
      ...completedSession,
      title: title.trim() || completedSession.title,
      notes: notes.trim() || undefined,
    };

    setIsSavingToCloud(true);
    setCloudSaveError(null);

    // Case 1: Device is OFFLINE -> Save directly to IndexedDB with status 'pending'
    if (!isOnline) {
      const sanitizedCoords = sanitizeRouteCoordinates(
        sessionToSave.routeCoordinates && sessionToSave.routeCoordinates.length > 0
          ? sessionToSave.routeCoordinates
          : sessionToSave.segments?.flatMap((s) => s.points) || []
      );
      const distanceMeters = Math.max(0, Math.round(sessionToSave.metrics.distanceKm * 1000));
      const durationSecs = Math.max(0, Math.round(sessionToSave.metrics.durationSeconds));
      const avgPace =
        sessionToSave.metrics.averagePaceMinPerKm && isFinite(sessionToSave.metrics.averagePaceMinPerKm)
          ? Math.round(sessionToSave.metrics.averagePaceMinPerKm * 60)
          : null;
      const avgSpeed =
        sessionToSave.metrics.averageSpeedKmh && isFinite(sessionToSave.metrics.averageSpeedKmh)
          ? Number(sessionToSave.metrics.averageSpeedKmh.toFixed(2))
          : null;
      const calories =
        sessionToSave.metrics.caloriesBurned && isFinite(sessionToSave.metrics.caloriesBurned)
          ? Math.round(sessionToSave.metrics.caloriesBurned)
          : null;

      await runIndexedDB.saveCompletedRun({
        runId: sessionToSave.id,
        userId,
        title: sessionToSave.title,
        distanceMeters,
        durationSeconds: durationSecs,
        averagePaceSecondsPerKm: avgPace,
        averageSpeedKmh: avgSpeed,
        caloriesEstimate: calories,
        caloriesExplanation: sessionToSave.metrics.caloriesExplanation || null,
        notes: sessionToSave.notes || null,
        routeCoordinates: sanitizedCoords,
        routePointCount: sanitizedCoords.length,
        startedAt: sessionToSave.startTime || new Date().toISOString(),
        endedAt: sessionToSave.endTime || new Date().toISOString(),
        createdAt: sessionToSave.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'completed',
        syncStatus: user?.uid ? 'pending' : 'synced',
      });

      await runStorageService.saveCompletedRun(sessionToSave);

      setIsSavingToCloud(false);
      showToast(user?.uid ? 'Saved locally! Will auto-sync when online.' : 'Run saved to local storage!');
      resetRun();
      return;
    }

    // Case 2: Device is ONLINE -> Save to Firestore & IndexedDB
    if (user?.uid) {
      const res = await runFirebaseService.saveRun(user.uid, sessionToSave);
      if (!res.success) {
        setIsSavingToCloud(false);
        // On error, run is safely saved as pending in IndexedDB via runFirebaseService catch block
        showToast('Saved locally. Cloud sync will automatically retry.');
        resetRun();
        return;
      }
    } else {
      // Local fallback for guest
      await runStorageService.saveCompletedRun(sessionToSave);
    }

    setIsSavingToCloud(false);
    refreshAllRuns();
    showToast(user?.uid ? 'Run saved and synced to cloud!' : 'Run saved to local storage!');
    resetRun();
  };

  const handleStartAnother = () => {
    resetRun();
    startRun();
  };

  const handleDiscard = () => {
    discardRun();
    setCloudSaveError(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            Real-time outdoor GPS tracking, route visualization, and cloud run history.
          </p>
        </div>

        {/* Top Actions: Sub-Tab Toggle & GPS Status */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Sub-navigation: Tracker vs History */}
          {!isFinished && (
            <div className="flex items-center p-1 rounded-xl glass-card">
              <button
                type="button"
                onClick={() => setActiveSubTab('tracker')}
                className={`px-3 sm:px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeSubTab === 'tracker'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Tracker
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('routes')}
                className={`px-3 sm:px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'routes'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Routes</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('history')}
                className={`px-3 sm:px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'history'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <History className="w-3 h-3" />
                <span>History</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('analytics')}
                className={`px-3 sm:px-3.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'analytics'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Analytics</span>
              </button>
            </div>
          )}

          {/* Network Offline Pill */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-[11px] font-semibold shadow-xs">
              <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Offline (GPS Active)</span>
            </div>
          )}

          {/* GPS Live Quality Badge (Tracker View Only) */}
          {activeSubTab === 'tracker' && !isFinished && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-surface text-[11px] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10 shadow-xs">
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
          )}
        </div>
      </div>

      {/* Unfinished Run Crash Recovery Banner */}
      {status === 'idle' && recoverableSession && activeSubTab === 'tracker' && (
        <div
          role="alert"
          className="p-3.5 sm:p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-950 dark:text-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
              <Activity className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold">Unfinished Run Recovered</p>
              <p className="text-[11px] text-orange-800/80 dark:text-orange-200/80 font-mono">
                {formatRunDistance(recoverableSession.totalDistanceMeters / 1000)} km • {formatRunDuration(recoverableSession.durationSeconds)} • Status: {recoverableSession.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={discardRecoverableSession}
              className="px-3 py-1.5 rounded-xl glass-surface text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={recoverSession}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Resume Run
            </button>
          </div>
        </div>
      )}

      {/* GPS Error Alert Banner */}
      {gpsError && activeSubTab === 'tracker' && !isFinished && (
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

      {/* VIEW 1: FINISHED RUN SUMMARY */}
      {isFinished ? (
        <RunSummaryView
          session={completedSession}
          durationSeconds={durationSeconds}
          segments={segments}
          startPosition={startPosition}
          currentPosition={currentPosition}
          isSaving={isSavingToCloud}
          saveError={cloudSaveError}
          onSaveAndClose={handleSaveAndClose}
          onStartAnother={handleStartAnother}
          onDiscard={handleDiscard}
          onReturnToTracker={resetRun}
          onClearSaveError={() => setCloudSaveError(null)}
        />
      ) : activeSubTab === 'routes' ? (
        /* VIEW 2: DAILY ROUTES LOOP DISCOVERY */
        <DailyRoutesView
          user={user}
          userAveragePaceMinPerKm={userAvgPace}
          onStartRouteRun={(route) => {
            setActivePlannedRoute(route);
            setActiveSubTab('tracker');
            if (status === 'idle') {
              startRun();
            }
            showToast(`Route loaded: ${route.name}`);
          }}
          onNavigateToTracker={() => setActiveSubTab('tracker')}
        />
      ) : activeSubTab === 'history' ? (
        /* VIEW 3: RUN HISTORY */
        <RunHistoryView
          user={user}
          onNavigateToTracker={() => setActiveSubTab('tracker')}
        />
      ) : activeSubTab === 'analytics' ? (
        /* VIEW 4: RUN ANALYTICS & PERFORMANCE INSIGHTS */
        <RunAnalyticsView
          runs={allRuns}
          user={user}
          onNavigateToTracker={() => setActiveSubTab('tracker')}
        />
      ) : (
        /* VIEW 5: LIVE TRACKER */
        <div className="space-y-4">
          {/* Active Planned Route Following & Deviation Guidance Banner */}
          {activePlannedRoute && (
            <div className="p-3.5 sm:p-4 rounded-2xl glass-card border border-indigo-500/40 dark:border-indigo-500/30 space-y-2.5 animate-fadeIn">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                      Following: {activePlannedRoute.name}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Planned {formatRunDistance(activePlannedRoute.actualDistanceMeters / 1000)} km loop · Visual guidance only
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePlannedRoute(null)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                >
                  Exit Route
                </button>
              </div>

              {/* Progress Bar along Planned Route */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {routeDeviation?.progressPercent || 0}% completed
                  </span>
                  <span className="text-zinc-500">
                    {formatRunDistance(
                      (routeDeviation?.distanceRemainingMeters ?? activePlannedRoute.actualDistanceMeters) / 1000
                    )}{' '}
                    km remaining
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${routeDeviation?.progressPercent || 0}%` }}
                  />
                </div>
              </div>

              {/* Deviation / Loop Status Badges */}
              {routeDeviation && (
                <div className="pt-1">
                  {routeDeviation.isLoopCompleted ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold">
                        🏁 Loop Complete! You have returned to the starting point.
                      </span>
                    </div>
                  ) : routeDeviation.status === 'off_route' ? (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Off Route:</strong> ~{routeDeviation.distanceOffRouteMeters}m from planned path. Rejoin the marked loop ahead.
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>On Planned Route · GPS recording authoritative distance</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Real Interactive Leaflet & OpenStreetMap Route Map */}
          <RunMap
            status={status}
            gpsStatus={gpsStatus}
            currentPosition={currentPosition}
            startPosition={startPosition}
            segments={segments}
            plannedRoute={activePlannedRoute}
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
    </div>
  );
};
