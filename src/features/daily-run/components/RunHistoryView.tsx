import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  RotateCw,
  Calendar,
  Clock,
  Navigation,
  Gauge,
  Activity,
  Flame,
  ChevronRight,
  AlertCircle,
  Footprints,
  Sparkles,
  Cloud,
  CloudOff,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowUpDown,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { LocalRunRecord, FirestoreRunDocument, UserProfile, SyncStatus } from '../types';
import { runFirebaseService } from '../services/runFirebaseService';
import { runIndexedDB } from '../services/runIndexedDB';
import { runSyncService } from '../services/runSyncService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { filterRunsByTimeRange, TimeFilterRange, getLocalDateString } from '../utils/runAnalytics';
import { RunDetailsModal } from './RunDetailsModal';
import {
  formatRunDistance,
  formatRunDuration,
  formatRunPace,
  formatRunSpeed,
  formatRunCalories,
} from '../utils/formatters';

interface RunHistoryViewProps {
  user: UserProfile | null;
  onNavigateToTracker?: () => void;
}

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({
  user,
  onNavigateToTracker,
}) => {
  const [runs, setRuns] = useState<LocalRunRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<FirestoreRunDocument | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Phase 7: Search, Sort, and Date Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_week' | 'this_month' | 'last_30_days'>('all');
  const [sortBy, setSortBy] = useState<
    'date_desc' | 'date_asc' | 'distance_desc' | 'distance_asc' | 'duration_desc' | 'duration_asc' | 'pace_asc' | 'pace_desc'
  >('date_desc');

  const isOnline = useOnlineStatus();
  const userId = user?.uid || 'guest';

  // Loads runs: first from IndexedDB (instant & offline safe), then merges with cloud if online
  const loadRuns = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Step 1: Immediate local fetch from IndexedDB (works offline!)
        const localRuns = await runIndexedDB.getCompletedRuns(userId);
        setRuns(localRuns);

        // Step 2: If user is authenticated and internet is available, fetch latest from Firestore
        if (user?.uid && isOnline) {
          try {
            const cloudResult = await runFirebaseService.fetchUserRuns(user.uid, 20);
            
            // Cache each cloud run locally as synced
            for (const cRun of cloudResult.runs) {
              await runIndexedDB.saveCompletedRun({
                ...cRun,
                syncStatus: 'synced',
                syncedAt: cRun.updatedAt || new Date().toISOString(),
              });
            }

            // Re-read merged records to keep local pending runs at the top
            const updatedLocalRuns = await runIndexedDB.getCompletedRuns(userId);
            setRuns(updatedLocalRuns);
            setHasMore(cloudResult.hasMore);
            setLastDoc(cloudResult.lastDoc);
          } catch (cloudErr: any) {
            console.warn('Could not refresh from cloud, using local cache:', cloudErr);
            // If offline or cloud fails, don't clear local runs
            if (localRuns.length === 0) {
              setError('Unable to load run history from cloud. Check your connection.');
            }
          }
        }
      } catch (err: any) {
        console.error('Failed to load runs:', err);
        setError('Error reading local run storage.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [userId, user?.uid, isOnline]
  );

  // Initial load
  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  // Subscribe to automatic sync events to update UI badges live
  useEffect(() => {
    const unsubscribe = runSyncService.subscribe((event) => {
      if (event.type === 'sync_start') {
        setIsSyncing(true);
      } else if (event.type === 'sync_complete') {
        setIsSyncing(false);
        // Refresh local list to show newly synced statuses
        runIndexedDB.getCompletedRuns(userId).then((updated) => setRuns(updated));
      } else if (event.type === 'sync_item_success' || event.type === 'sync_item_failed') {
        runIndexedDB.getCompletedRuns(userId).then((updated) => setRuns(updated));
      } else if (event.type === 'connectivity_change' && event.isOnline) {
        loadRuns(true);
      }
    });

    return unsubscribe;
  }, [userId, loadRuns]);

  // Manual Trigger: Sync all pending runs
  const handleSyncPending = async () => {
    if (!user?.uid || !isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await runSyncService.syncPendingRuns(user.uid);
      const updated = await runIndexedDB.getCompletedRuns(userId);
      setRuns(updated);
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual Trigger: Retry single failed run
  const handleRetrySingle = async (runId: string) => {
    if (!user?.uid || !isOnline) return;
    await runSyncService.retrySingleRun(user.uid, runId);
    const updated = await runIndexedDB.getCompletedRuns(userId);
    setRuns(updated);
  };

  const handleLoadMore = async () => {
    if (!user?.uid || !lastDoc || isLoadingMore || !isOnline) return;
    setIsLoadingMore(true);

    try {
      const result = await runFirebaseService.fetchUserRuns(user.uid, 15, lastDoc);
      for (const r of result.runs) {
        await runIndexedDB.saveCompletedRun({
          ...r,
          syncStatus: 'synced',
          syncedAt: r.updatedAt,
        });
      }
      const updated = await runIndexedDB.getCompletedRuns(userId);
      setRuns(updated);
      setHasMore(result.hasMore);
      setLastDoc(result.lastDoc);
    } catch (err) {
      console.error('Failed to load more runs:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    await runIndexedDB.deleteCompletedRun(runId);
    if (user?.uid && isOnline) {
      await runFirebaseService.deleteRun(user.uid, runId);
    }
    setRuns((prev) => prev.filter((r) => r.runId !== runId));
    setSelectedRun(null);
  };

  // Phase 7: Filtered and Sorted runs
  const displayedRuns = useMemo(() => {
    // 1. Time filter
    let list = dateFilter === 'all'
      ? runs
      : filterRunsByTimeRange(runs, dateFilter as TimeFilterRange);

    // 2. Search query (title or date)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const titleMatch = (r.title || 'Daily Run').toLowerCase().includes(q);
        const dateStr = getLocalDateString(r.startedAt || r.createdAt);
        return titleMatch || dateStr.includes(q);
      });
    }

    // 3. Sorting
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.startedAt || a.createdAt).getTime() - new Date(b.startedAt || b.createdAt).getTime();
      }
      if (sortBy === 'distance_desc') {
        return (b.distanceMeters || 0) - (a.distanceMeters || 0);
      }
      if (sortBy === 'distance_asc') {
        return (a.distanceMeters || 0) - (b.distanceMeters || 0);
      }
      if (sortBy === 'duration_desc') {
        return (b.durationSeconds || 0) - (a.durationSeconds || 0);
      }
      if (sortBy === 'duration_asc') {
        return (a.durationSeconds || 0) - (b.durationSeconds || 0);
      }
      if (sortBy === 'pace_asc') {
        const paceA = a.averagePaceSecondsPerKm || 999999;
        const paceB = b.averagePaceSecondsPerKm || 999999;
        return paceA - paceB;
      }
      if (sortBy === 'pace_desc') {
        const paceA = a.averagePaceSecondsPerKm || 0;
        const paceB = b.averagePaceSecondsPerKm || 0;
        return paceB - paceA;
      }
      return 0;
    });

    return sorted;
  }, [runs, dateFilter, searchQuery, sortBy]);

  const pendingCount = runs.filter((r) => r.syncStatus === 'pending' || r.syncStatus === 'failed').length;

  return (
    <div
      id="run-history-view"
      className="space-y-4 sm:space-y-5 animate-fadeIn"
    >
      {/* Run Details Modal */}
      <RunDetailsModal
        run={selectedRun}
        isOpen={!!selectedRun}
        onClose={() => setSelectedRun(null)}
        onDelete={handleDeleteRun}
      />

      {/* Top Bar with Refresh, Offline Status & Sync All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <History className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Run History
              </h2>
              {!isOnline && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5" /> Offline
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {displayedRuns.length} of {runs.length} recorded session{runs.length === 1 ? '' : 's'}
              {pendingCount > 0 ? ` (${pendingCount} pending cloud sync)` : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons: Sync Pending + Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {pendingCount > 0 && isOnline && user?.uid && (
            <button
              type="button"
              onClick={handleSyncPending}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : `Sync ${pendingCount} Run${pendingCount > 1 ? 's' : ''}`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadRuns(true)}
            disabled={isRefreshing || isLoading}
            aria-label="Refresh run history"
            className="px-3 py-1.5 rounded-xl glass-surface hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Phase 7: Search, Date Filter & Sorting Controls */}
      {runs.length > 0 && (
        <div className="glass-card rounded-2xl p-3 sm:p-3.5 border-zinc-200/80 dark:border-white/10 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title or date (e.g. 2026-11)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl glass-surface border border-zinc-200/80 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" /> Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl glass-surface border border-zinc-200/80 dark:border-white/10 text-xs text-zinc-800 dark:text-zinc-200 font-semibold focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="distance_desc">Distance (High to Low)</option>
                <option value="distance_asc">Distance (Low to High)</option>
                <option value="duration_desc">Duration (Longest)</option>
                <option value="duration_asc">Duration (Shortest)</option>
                <option value="pace_asc">Pace (Fastest)</option>
                <option value="pace_desc">Pace (Slowest)</option>
              </select>
            </div>
          </div>

          {/* Date Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-200/50 dark:border-white/5">
            <span className="text-[11px] text-zinc-400 font-semibold mr-1">Filter:</span>
            {[
              { id: 'all', label: 'All Runs' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_30_days', label: 'Last 30 Days' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setDateFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'glass-surface text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offline Notice Banner */}
      {!isOnline && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>You are offline. Showing locally saved runs. Runs will automatically sync once internet is restored.</span>
          </div>
        </div>
      )}

      {/* Error State with Retry Button */}
      {error && runs.length === 0 && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadRuns()}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && runs.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-4 animate-pulse space-y-3 border-zinc-200/60 dark:border-white/5"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
                <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && runs.length === 0 && !error && (
        <div className="glass-card rounded-3xl p-8 sm:p-10 text-center space-y-4 border-zinc-200/80 dark:border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-sm">
            <Footprints className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              No Runs Recorded Yet
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Lace up your shoes and record your first run! Live GPS coordinates, pacing, and route maps will be saved here offline and synced to the cloud.
            </p>
          </div>
          {onNavigateToTracker && (
            <button
              type="button"
              onClick={onNavigateToTracker}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-orange-600/25 transition-all cursor-pointer active:scale-95"
            >
              <span>Go to Run Tracker</span>
            </button>
          )}
        </div>
      )}

      {/* Empty Search / Filter Results */}
      {runs.length > 0 && displayedRuns.length === 0 && (
        <div className="glass-card rounded-2xl p-6 text-center space-y-2 border-zinc-200/80 dark:border-white/10">
          <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            No runs match your search query or selected date filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setDateFilter('all');
            }}
            className="text-xs text-orange-600 dark:text-orange-400 font-bold underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Runs List */}
      {displayedRuns.length > 0 && (
        <div className="space-y-3">
          {displayedRuns.map((run) => {
            const distanceKm = run.distanceMeters / 1000;
            const paceMinPerKm = run.averagePaceSecondsPerKm
              ? run.averagePaceSecondsPerKm / 60
              : null;
            const dateObj = new Date(run.startedAt);
            const dateStr = isNaN(dateObj.getTime())
              ? 'Recent Run'
              : dateObj.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
            const timeStr = isNaN(dateObj.getTime())
              ? ''
              : dateObj.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                });

            const syncStatus: SyncStatus = ('syncStatus' in run && run.syncStatus) ? run.syncStatus : 'synced';

            return (
              <div
                key={run.runId}
                onClick={() => setSelectedRun(run)}
                className="glass-card rounded-2xl p-3.5 sm:p-4 hover:border-orange-500/40 dark:hover:border-orange-500/30 transition-all cursor-pointer group shadow-xs active:scale-[0.99] border-zinc-200/80 dark:border-white/10"
              >
                {/* Header: Title, Date, Sync Badge, Chevron */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {run.title || 'Daily Run'}
                      </h3>

                      {/* Sync Status Badge */}
                      {syncStatus === 'synced' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Cloud className="w-2.5 h-2.5" />
                          <span>Synced</span>
                        </span>
                      )}

                      {syncStatus === 'syncing' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 animate-pulse">
                          <RotateCw className="w-2.5 h-2.5 animate-spin" />
                          <span>Syncing...</span>
                        </span>
                      )}

                      {syncStatus === 'pending' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 flex items-center gap-1">
                          <CloudOff className="w-2.5 h-2.5" />
                          <span>Saved locally</span>
                        </span>
                      )}

                      {syncStatus === 'failed' && (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Sync failed</span>
                          </span>
                          {isOnline && user?.uid && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetrySingle(run.runId);
                              }}
                              className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 underline hover:text-rose-700 cursor-pointer"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      {dateStr} {timeStr ? `• ${timeStr}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400 group-hover:text-orange-500 transition-colors shrink-0">
                    <span className="text-[11px] font-medium hidden sm:inline">Details</span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Metrics 4-Col Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-200/60 dark:border-white/5">
                  {/* Distance */}
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 block">
                      Distance
                    </span>
                    <span className="text-sm sm:text-base font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatRunDistance(distanceKm)}
                      <span className="text-[10px] font-normal text-zinc-400 ml-0.5">km</span>
                    </span>
                  </div>

                  {/* Duration */}
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 block">
                      Duration
                    </span>
                    <span className="text-sm sm:text-base font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatRunDuration(run.durationSeconds)}
                    </span>
                  </div>

                  {/* Avg Pace */}
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 block">
                      Avg Pace
                    </span>
                    <span className="text-sm sm:text-base font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatRunPace(paceMinPerKm)}
                    </span>
                  </div>

                  {/* Calories or Speed */}
                  <div>
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 block">
                      Calories
                    </span>
                    <span className="text-sm sm:text-base font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {run.caloriesEstimate != null ? (
                        <>
                          {run.caloriesEstimate}
                          <span className="text-[10px] font-normal text-zinc-400 ml-0.5">kcal</span>
                        </>
                      ) : (
                        '--'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More Button (Online Only) */}
          {hasMore && isOnline && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-5 py-2 rounded-xl glass-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading more runs...' : 'Load More Runs'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
