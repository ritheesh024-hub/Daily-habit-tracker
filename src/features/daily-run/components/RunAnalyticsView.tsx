import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Flame,
  Award,
  Calendar as CalendarIcon,
  Filter,
  Activity,
  Navigation,
  Clock,
  Gauge,
  Zap,
  RotateCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Trophy,
  BarChart2,
  Info,
} from 'lucide-react';
import { LocalRunRecord, FirestoreRunDocument, UserProfile } from '../types';
import {
  TimeFilterRange,
  filterRunsByTimeRange,
  calculateRunningOverview,
  calculatePersonalRecords,
  calculateStreaksAndConsistency,
  calculateProgressInsights,
  groupRunsForChart,
} from '../utils/runAnalytics';
import {
  formatRunDistance,
  formatRunDuration,
  formatRunPace,
  formatRunSpeed,
} from '../utils/formatters';
import { RunCalendar } from './RunCalendar';
import { RunDetailsModal } from './RunDetailsModal';

interface RunAnalyticsViewProps {
  runs: (FirestoreRunDocument | LocalRunRecord)[];
  user: UserProfile | null;
  onNavigateToTracker?: () => void;
}

export const RunAnalyticsView: React.FC<RunAnalyticsViewProps> = ({
  runs,
  user,
  onNavigateToTracker,
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeFilterRange>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false);
  const [chartMetric, setChartMetric] = useState<'distance' | 'runs' | 'duration' | 'pace'>('distance');
  const [selectedRun, setSelectedRun] = useState<FirestoreRunDocument | LocalRunRecord | null>(null);

  // Filtered runs for analytics based on selected time range
  const filteredRuns = useMemo(() => {
    return filterRunsByTimeRange(runs, selectedRange, customStart, customEnd);
  }, [runs, selectedRange, customStart, customEnd]);

  // Overall calculations for the filtered period
  const overview = useMemo(() => {
    return calculateRunningOverview(filteredRuns);
  }, [filteredRuns]);

  // Lifetime Personal Records (calculated across all completed runs)
  const personalRecords = useMemo(() => {
    return calculatePersonalRecords(runs);
  }, [runs]);

  // Streaks & Consistency (calculated across all completed runs)
  const streakStats = useMemo(() => {
    return calculateStreaksAndConsistency(runs);
  }, [runs]);

  // Progress Insights
  const insights = useMemo(() => {
    return calculateProgressInsights(runs, selectedRange);
  }, [runs, selectedRange]);

  // Chart data points
  const chartData = useMemo(() => {
    return groupRunsForChart(filteredRuns, selectedRange);
  }, [filteredRuns, selectedRange]);

  // Max value calculation for chart scaling
  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    if (chartMetric === 'distance') {
      return Math.max(1, ...chartData.map((d) => d.distanceKm));
    }
    if (chartMetric === 'runs') {
      return Math.max(1, ...chartData.map((d) => d.runsCount));
    }
    if (chartMetric === 'duration') {
      return Math.max(1, ...chartData.map((d) => d.durationMinutes));
    }
    if (chartMetric === 'pace') {
      return Math.max(1, ...chartData.map((d) => d.averagePaceMinPerKm || 0));
    }
    return 1;
  }, [chartData, chartMetric]);

  const handleSelectRecord = (recordRunId?: string) => {
    if (!recordRunId) return;
    const found = runs.find((r) => r.runId === recordRunId);
    if (found) {
      setSelectedRun(found);
    }
  };

  const completedCount = runs.filter((r) => r && r.status === 'completed').length;

  return (
    <div id="run-analytics-view" className="space-y-5 animate-fadeIn pb-6">
      {/* Run Details Modal */}
      <RunDetailsModal
        run={selectedRun}
        isOpen={!!selectedRun}
        onClose={() => setSelectedRun(null)}
      />

      {/* Top Bar: Title & Time Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Running Analytics & Insights
            </h2>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Performance metrics, volume trends, personal records, and consistency tracking.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl glass-card self-start sm:self-auto flex-wrap">
          {[
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_30_days', label: '30 Days' },
            { id: 'this_year', label: 'This Year' },
            { id: 'all_time', label: 'All Time' },
            { id: 'custom', label: 'Custom' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedRange(tab.id as TimeFilterRange);
                if (tab.id === 'custom') setShowCustomPicker(true);
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedRange === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Controls */}
      {selectedRange === 'custom' && showCustomPicker && (
        <div className="glass-card rounded-2xl p-3 sm:p-4 border border-orange-500/30 flex flex-wrap items-center gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded-lg glass-surface border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded-lg glass-surface border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200 font-mono text-xs"
            />
          </div>
          {(customStart || customEnd) && (
            <button
              type="button"
              onClick={() => {
                setCustomStart('');
                setCustomEnd('');
              }}
              className="text-xs text-orange-600 dark:text-orange-400 underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Empty State when zero runs exist */}
      {completedCount === 0 ? (
        <div className="glass-card rounded-3xl p-8 sm:p-12 text-center space-y-4 border-zinc-200/80 dark:border-white/10">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-sm">
            <Activity className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              No Running History Recorded Yet
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Complete your first GPS run in Daily Run to unlock comprehensive distance analytics, pace trends, running calendar, streaks, and personal records.
            </p>
          </div>
          {onNavigateToTracker && (
            <button
              type="button"
              onClick={onNavigateToTracker}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-orange-600/25 transition-all cursor-pointer active:scale-95"
            >
              <span>Record a Run Now</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 1. Progress Insights Banner */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Performance Insights</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {insights.map((ins, idx) => (
                  <div
                    key={idx}
                    className="glass-card rounded-2xl p-3 sm:p-3.5 border-zinc-200/80 dark:border-white/10 flex items-start gap-3 text-xs"
                  >
                    <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{ins.title}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {ins.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Key Statistics Dashboard Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orange-500" />
                <span>Summary ({filteredRuns.length} run{filteredRuns.length === 1 ? '' : 's'})</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-400 capitalize">
                {selectedRange.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* Total Distance (Hero) */}
              <div className="glass-card rounded-2xl p-3.5 border-orange-500/30 bg-gradient-to-br from-orange-500/[0.08] to-transparent">
                <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 block mb-0.5">
                  Total Distance
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-mono font-extrabold text-zinc-900 dark:text-zinc-50">
                    {formatRunDistance(overview.totalDistanceKm)}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">km</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Avg: {formatRunDistance(overview.averageDistanceKm)} km/run
                </span>
              </div>

              {/* Total Running Time */}
              <div className="glass-card rounded-2xl p-3.5 border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  Total Time
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                    {formatRunDuration(overview.totalDurationSeconds)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  {overview.totalRuns} total run{overview.totalRuns === 1 ? '' : 's'}
                </span>
              </div>

              {/* Average Pace */}
              <div className="glass-card rounded-2xl p-3.5 border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  Average Pace
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                    {formatRunPace(overview.averagePaceMinPerKm)}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">/km</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Speed: {formatRunSpeed(overview.averageSpeedKmh)} km/h
                </span>
              </div>

              {/* Estimated Calories */}
              <div className="glass-card rounded-2xl p-3.5 border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  Estimated Calories
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                    {overview.totalCalories > 0 ? overview.totalCalories.toLocaleString() : '--'}
                  </span>
                  {overview.totalCalories > 0 && (
                    <span className="text-xs font-semibold text-zinc-400">kcal</span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  {user?.weight ? 'Profile weight calculated' : 'Weight estimated'}
                </span>
              </div>

              {/* Longest Distance */}
              <div className="glass-card rounded-2xl p-3.5 border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  Longest Run
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                    {formatRunDistance(overview.longestDistanceKm)}
                  </span>
                  <span className="text-xs font-semibold text-zinc-400">km</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  In this period
                </span>
              </div>

              {/* Longest Duration */}
              <div className="glass-card rounded-2xl p-3.5 border-zinc-200/80 dark:border-white/10">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5">
                  Longest Duration
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-mono font-bold text-zinc-900 dark:text-zinc-50">
                    {formatRunDuration(overview.longestDurationSeconds)}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                  Continuous run time
                </span>
              </div>
            </div>
          </div>

          {/* 3. Streaks & Consistency Card */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-zinc-200/80 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Streaks & Consistency
                </h3>
              </div>
              <span className="text-xs font-mono font-semibold text-orange-600 dark:text-orange-400">
                {streakStats.totalRunningDays} Active Day{streakStats.totalRunningDays === 1 ? '' : 's'} Total
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* Current Streak */}
              <div className="glass-surface rounded-xl p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">
                  Current Streak
                </span>
                <div className="flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-2xl font-mono font-extrabold text-zinc-900 dark:text-zinc-50">
                    {streakStats.currentStreakDays}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">days</span>
                </div>
              </div>

              {/* Longest Streak */}
              <div className="glass-surface rounded-xl p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">
                  Longest Streak
                </span>
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-2xl font-mono font-extrabold text-zinc-900 dark:text-zinc-50">
                    {streakStats.longestStreakDays}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">days</span>
                </div>
              </div>

              {/* Active Days This Week */}
              <div className="glass-surface rounded-xl p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">
                  Active This Week
                </span>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-mono font-extrabold text-zinc-900 dark:text-zinc-50">
                    {streakStats.activeDaysThisWeek}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">/ 7 days</span>
                </div>
              </div>

              {/* Weekly Consistency */}
              <div className="glass-surface rounded-xl p-3 text-center space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">
                  Consistency Rate
                </span>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                    {streakStats.weeklyConsistencyPercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Weekly & Monthly Volume Trends Chart */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-zinc-200/80 dark:border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Volume & Performance Trends
                </h3>
              </div>

              {/* Chart Metric Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg glass-surface self-start sm:self-auto">
                {[
                  { id: 'distance', label: 'Distance' },
                  { id: 'runs', label: 'Runs' },
                  { id: 'duration', label: 'Duration' },
                  { id: 'pace', label: 'Pace' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChartMetric(m.id as any)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                      chartMetric === m.id
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Trend Chart */}
            {chartData.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-8 text-center">
                Insufficient data to render chart for this period.
              </p>
            ) : (
              <div className="pt-2">
                <div className="h-44 sm:h-52 w-full flex items-end justify-between gap-1.5 sm:gap-2 px-1">
                  {chartData.map((pt, i) => {
                    let val = 0;
                    let displayVal = '';
                    if (chartMetric === 'distance') {
                      val = pt.distanceKm;
                      displayVal = `${pt.distanceKm} km`;
                    } else if (chartMetric === 'runs') {
                      val = pt.runsCount;
                      displayVal = `${pt.runsCount} run${pt.runsCount === 1 ? '' : 's'}`;
                    } else if (chartMetric === 'duration') {
                      val = pt.durationMinutes;
                      displayVal = `${pt.durationMinutes} min`;
                    } else if (chartMetric === 'pace') {
                      val = pt.averagePaceMinPerKm || 0;
                      displayVal = pt.averagePaceMinPerKm ? `${formatRunPace(pt.averagePaceMinPerKm)} /km` : '--';
                    }

                    const heightPercent = maxChartValue > 0 ? Math.min(100, Math.max(8, (val / maxChartValue) * 100)) : 8;

                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                          {displayVal}
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${val > 0 ? heightPercent : 4}%` }}
                          className={`w-full max-w-[36px] rounded-t-lg transition-all ${
                            val > 0
                              ? 'bg-orange-500 hover:bg-orange-400 shadow-xs'
                              : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />

                        {/* X-axis Label */}
                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-1 truncate max-w-full">
                          {pt.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono pt-2 border-t border-zinc-200/50 dark:border-white/5">
                  <span>Unit: {chartMetric === 'distance' ? 'Kilometres (km)' : chartMetric === 'runs' ? 'Count (#)' : chartMetric === 'duration' ? 'Active Minutes' : 'Average Pace (min/km)'}</span>
                  <span>Max: {maxChartValue.toFixed(1)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Running Calendar View */}
          <div className="space-y-2">
            <RunCalendar runs={runs} onSelectRun={(r) => setSelectedRun(r)} />
          </div>

          {/* 6. Lifetime Personal Records Showcase */}
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border-zinc-200/80 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Personal Records
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Verified records across all completed running sessions
                  </p>
                </div>
              </div>
            </div>

            {personalRecords.length === 0 ? (
              <p className="text-xs text-zinc-400 italic py-4 text-center">
                Complete a run with GPS tracking to record your first personal records!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {personalRecords.map((rec, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectRecord(rec.runId)}
                    className={`glass-surface rounded-2xl p-3 border border-zinc-200/70 dark:border-white/5 transition-all ${
                      rec.runId
                        ? 'hover:border-orange-500/40 cursor-pointer active:scale-[0.99] group'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                          {rec.title}
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-lg font-mono font-extrabold text-zinc-900 dark:text-zinc-50 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {rec.valueFormatted}
                          </span>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-2 pt-1 border-t border-zinc-200/50 dark:border-white/5">
                      <span>Date: {rec.date}</span>
                      {rec.notes && <span className="text-zinc-400 italic">({rec.notes})</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
