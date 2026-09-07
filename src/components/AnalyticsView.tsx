import React, { useState, useMemo } from 'react';
import {
  Flame,
  Award,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Check,
  Circle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Dumbbell,
  Scale,
  Plus,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  AnalyticsStats,
  HabitItem,
  DailyLogData,
  UserProfile,
  WeightHistoryEntry,
} from '../types';
import { HabitIcon } from './HabitIcon';
import {
  getMonthCalendarDays,
  formatMonthYear,
  formatHeaderDate,
  getLocalDateKey,
  getTodayDateString,
} from '../lib/dateUtils';
import {
  calculateMonthlyRecap,
  canNavigateToNextMonth,
  getCompletionBand,
} from '../lib/monthlyRecapUtils';

interface AnalyticsViewProps {
  analytics: AnalyticsStats;
  rawLogsMap: Record<string, DailyLogData>;
  habits: HabitItem[];
  todayDate: string;
  userProfile?: UserProfile | null;
  weightHistory?: WeightHistoryEntry[];
  onOpenWeightModal?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  rawLogsMap = {},
  habits = [],
  todayDate,
  userProfile,
  weightHistory = [],
  onOpenWeightModal,
}) => {
  const safeToday = todayDate ? getLocalDateKey(todayDate) : getTodayDateString();
  const [todayYear, todayMonth] = safeToday.split('-').map(Number);

  // Month navigation state (default to current month)
  const [currentYearMonth, setCurrentYearMonth] = useState<{ year: number; monthIndex: number }>({
    year: todayYear || new Date().getFullYear(),
    monthIndex: (todayMonth || 1) - 1,
  });

  // Selected date for day inspector
  const [inspectedDate, setInspectedDate] = useState<string>(safeToday);

  // Check if current viewed month is today's month
  const isCurrentMonthViewed =
    currentYearMonth.year === todayYear && currentYearMonth.monthIndex === todayMonth - 1;

  // Check if user can navigate to next month
  const canGoNext = canNavigateToNextMonth(
    currentYearMonth.year,
    currentYearMonth.monthIndex,
    safeToday,
    rawLogsMap
  );

  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.monthIndex === 0) {
        return { year: prev.year - 1, monthIndex: 11 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex - 1 };
    });
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    setCurrentYearMonth((prev) => {
      if (prev.monthIndex === 11) {
        return { year: prev.year + 1, monthIndex: 0 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex + 1 };
    });
  };

  const handleResetToCurrentMonth = () => {
    setCurrentYearMonth({
      year: todayYear,
      monthIndex: todayMonth - 1,
    });
    setInspectedDate(safeToday);
  };

  // Calculate Monthly Recap for the selected month
  const monthlyRecap = useMemo(() => {
    return calculateMonthlyRecap(
      currentYearMonth.year,
      currentYearMonth.monthIndex,
      rawLogsMap,
      habits,
      safeToday
    );
  }, [currentYearMonth.year, currentYearMonth.monthIndex, rawLogsMap, habits, safeToday]);

  // Calendar days grid
  const calendarDays = useMemo(() => {
    return getMonthCalendarDays(currentYearMonth.year, currentYearMonth.monthIndex, safeToday);
  }, [currentYearMonth.year, currentYearMonth.monthIndex, safeToday]);

  // Selected date inspect data
  const safeHabits = Array.isArray(habits) ? habits : [];
  const activeHabitIds = useMemo(() => safeHabits.map((h) => h.id), [safeHabits]);
  const inspectedLog = (rawLogsMap && inspectedDate) ? rawLogsMap[inspectedDate] : undefined;
  const inspectedCompletedHabits = inspectedLog?.completedHabits || {};

  const inspectedCompletedCount = inspectedLog
    ? typeof inspectedLog.completedCount === 'number'
      ? inspectedLog.completedCount
      : Object.values(inspectedCompletedHabits).filter(Boolean).length
    : 0;

  const inspectedTotalCount = inspectedLog?.totalActiveCount && inspectedLog.totalActiveCount > 0
    ? inspectedLog.totalActiveCount
    : safeHabits.length || 1;

  const inspectedPercentage = inspectedTotalCount > 0
    ? Math.round((inspectedCompletedCount / inspectedTotalCount) * 100)
    : 0;

  const completedHabitsList = useMemo(
    () => safeHabits.filter((h) => inspectedCompletedHabits[h.id]),
    [safeHabits, inspectedCompletedHabits]
  );
  const missedHabitsList = useMemo(
    () => safeHabits.filter((h) => !inspectedCompletedHabits[h.id]),
    [safeHabits, inspectedCompletedHabits]
  );

  // Fitness habits filtering (gym, steps, workout, running, walking, water)
  const fitnessHabits = useMemo(() => {
    const fitnessKeywords = ['gym', 'run', 'walk', 'step', 'workout', 'fitness', 'exercise', 'water', 'cardio'];
    return safeHabits.filter((h) => {
      const lowerName = (h.name || '').toLowerCase();
      const lowerIcon = (h.icon || '').toLowerCase();
      return (
        fitnessKeywords.some((kw) => lowerName.includes(kw)) ||
        ['dumbbell', 'footprints', 'activity', 'droplet'].includes(lowerIcon)
      );
    });
  }, [safeHabits]);

  const latestWeightEntry = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;

  return (
    <div id="analytics-dashboard-view" className="space-y-6 animate-fadeIn pb-12">
      {/* ========================================================= */}
      {/* 1. OVERVIEW SECTION                                       */}
      {/* ========================================================= */}
      <section id="analytics-overview-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Overview
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              High-level completion metrics and streaks
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 block">
              Total Completions
            </span>
            <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {analytics.totalCompletedHabits}
            </span>
          </div>
        </div>

        {/* 5 Quick Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* Current Streak */}
          <div className="p-3 glass-card rounded-xl space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Current Streak
            </span>
            <div className="flex items-baseline gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics.currentStreak}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {analytics.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Best Streak */}
          <div className="p-3 glass-card rounded-xl space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Best Streak
            </span>
            <div className="flex items-baseline gap-1.5">
              <Award className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics.bestStreak}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {analytics.bestStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Today % */}
          <div className="p-3 glass-card rounded-xl space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Today
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics.todayPercentage}%
              </span>
            </div>
          </div>

          {/* Last 7 Days % */}
          <div className="p-3 glass-card rounded-xl space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Last 7 Days
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics.last7DaysPercentage}%
              </span>
            </div>
          </div>

          {/* Last 30 Days % */}
          <div className="p-3 glass-card rounded-xl space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Last 30 Days
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics.last30DaysPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Weekly Progress breakdown */}
        <div className="p-4 glass-card rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Weekly Progress
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Past 7 days completion breakdown
              </p>
            </div>

            {/* Weekly Comparison vs Prev Week */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-white/5 text-xs">
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">vs prev week:</span>
              <span
                className={`font-mono font-semibold inline-flex items-center gap-0.5 ${
                  analytics.weeklyComparison.improvement > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : analytics.weeklyComparison.improvement < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {analytics.weeklyComparison.improvement > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : analytics.weeklyComparison.improvement < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" />
                ) : null}
                {analytics.weeklyComparison.improvement > 0 ? '+' : ''}
                {analytics.weeklyComparison.improvement}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {(analytics.sevenDayBreakdown || []).map((day) => {
              const isToday = day.date === safeToday;
              return (
                <div
                  key={day.date}
                  className={`p-2 rounded-xl border text-center flex flex-col justify-between min-h-[64px] transition-all ${
                    isToday
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm'
                      : 'bg-zinc-100/60 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200/60 dark:border-white/5'
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold ${
                      isToday ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {day.weekday}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {day.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. FITNESS SECTION                                        */}
      {/* ========================================================= */}
      <section id="analytics-fitness-section" className="p-4 sm:p-5 glass-card rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Fitness & Activity
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Gym, exercise, steps, and weight tracking
              </p>
            </div>
          </div>

          {onOpenWeightModal && (
            <button
              id="analytics-log-weight-btn"
              type="button"
              onClick={onOpenWeightModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg border border-zinc-200/80 dark:border-white/10 transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Log Weight</span>
            </button>
          )}
        </div>

        {/* Body Metrics Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 rounded-xl">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Current Weight
            </span>
            <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {latestWeightEntry ? `${latestWeightEntry.weight} kg` : userProfile?.weight ? `${userProfile.weight} kg` : 'Not logged'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Height
            </span>
            <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {userProfile?.height ? `${userProfile.height} cm` : 'Not set'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Weekly Check-in
            </span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mt-0.5">
              {userProfile?.lastWeightCheckInDate ? `Logged on ${userProfile.lastWeightCheckInDate}` : 'No check-in yet'}
            </span>
          </div>
        </div>

        {/* Fitness Habits List */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Activity Habits ({fitnessHabits.length})
          </span>

          {fitnessHabits.length === 0 ? (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-center text-xs text-zinc-500 dark:text-zinc-400">
              No specific fitness habits created yet (e.g. Gym, Running, Water, Walking).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {fitnessHabits.map((habit) => {
                const habitStat = analytics.habitBreakdown.find((h) => h.habitId === habit.id);
                const pct = habitStat ? habitStat.percentage : 0;
                return (
                  <div
                    key={habit.id}
                    className="p-3 bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <HabitIcon name={habit.icon} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                          {habit.name}
                        </span>
                        {habit.target && (
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {habit.target}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {pct}%
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">
                        30-day rate
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. DEDICATED MONTHLY RECAP                                 */}
      {/* ========================================================= */}
      <section id="monthly-recap-section" className="p-5 sm:p-6 glass-card rounded-2xl space-y-5">
        {/* Header with Month Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/70 dark:border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Monthly Recap</span>
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {monthlyRecap.monthName}
            </h3>
          </div>

          {/* Month Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              id="recap-prev-month-btn"
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {!isCurrentMonthViewed && (
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                Current Month
              </button>
            )}

            <button
              id="recap-next-month-btn"
              type="button"
              disabled={!canGoNext}
              onClick={handleNextMonth}
              className={`p-2 rounded-xl transition-colors ${
                canGoNext
                  ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer'
                  : 'bg-zinc-100/40 dark:bg-zinc-800/30 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50'
              }`}
              title={canGoNext ? 'Next Month' : 'No data for future months'}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 Core Monthly Recap Metric Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Overall Completion */}
          <div className="p-4 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
              {monthlyRecap.completionPercentage}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Overall completion
            </span>
          </div>

          {/* Active Days */}
          <div className="p-4 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
              {monthlyRecap.daysActive}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Active days
            </span>
          </div>

          {/* Perfect Days */}
          <div className="p-4 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
              {monthlyRecap.perfectDays}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Perfect days
            </span>
          </div>

          {/* Best Streak */}
          <div className="p-4 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {monthlyRecap.bestStreakDuringMonth}
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Best streak
            </span>
          </div>

          {/* Total Habits Completed */}
          <div className="p-4 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1 col-span-2 sm:col-span-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
              {monthlyRecap.totalCompletedHabits}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Habits completed
            </span>
          </div>
        </div>

        {/* Most Completed, Least Completed & Previous Month Comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Most Completed Habit */}
          <div className="p-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Most Completed Habit
            </span>
            {monthlyRecap.mostCompletedHabit ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <HabitIcon name={monthlyRecap.mostCompletedHabit.icon} className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {monthlyRecap.mostCompletedHabit.name}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {monthlyRecap.mostCompletedHabit.completedCount} days ({monthlyRecap.mostCompletedHabit.percentage}%)
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic block pt-1">
                No completions yet
              </span>
            )}
          </div>

          {/* Least Completed Habit */}
          <div className="p-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Least Completed Habit
            </span>
            {monthlyRecap.leastCompletedHabit ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 min-w-0">
                  <HabitIcon name={monthlyRecap.leastCompletedHabit.icon} className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {monthlyRecap.leastCompletedHabit.name}
                  </span>
                </div>
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                  {monthlyRecap.leastCompletedHabit.completedCount} days ({monthlyRecap.leastCompletedHabit.percentage}%)
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic block pt-1">
                No completions yet
              </span>
            )}
          </div>

          {/* Previous Month Comparison */}
          <div className="p-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Previous Month Comparison
            </span>
            {monthlyRecap.previousMonthComparison ? (
              <div className="pt-1 flex items-center justify-between gap-2">
                <div className="text-xs text-zinc-700 dark:text-zinc-300">
                  <span>{monthlyRecap.previousMonthComparison.prevMonthName.split(' ')[0]}</span>
                  <span className="font-mono ml-1">({monthlyRecap.previousMonthComparison.prevPercentage}%)</span>
                  <span className="mx-1 text-zinc-400">→</span>
                  <span className="font-bold">{monthlyRecap.monthName.split(' ')[0]}</span>
                  <span className="font-mono ml-1">({monthlyRecap.completionPercentage}%)</span>
                </div>
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                    monthlyRecap.previousMonthComparison.difference >= 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {monthlyRecap.previousMonthComparison.difference >= 0 ? '+' : ''}
                  {monthlyRecap.previousMonthComparison.difference}% improvement
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block pt-1">
                First month of tracking.
              </span>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. MONTHLY CALENDAR / HEATMAP                             */}
        {/* ========================================================= */}
        <div id="monthly-calendar-heatmap-container" className="pt-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Monthly Calendar Heatmap
              </h4>
            </div>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Click any day to inspect habits
            </span>
          </div>

          <div className="p-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2.5">
            {/* Weekday column headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                const dateLog = rawLogsMap[cell.date];
                const comp = dateLog
                  ? typeof dateLog.completedCount === 'number'
                    ? dateLog.completedCount
                    : Object.values(dateLog.completedHabits || {}).filter(Boolean).length
                  : 0;
                const tot = dateLog?.totalActiveCount && dateLog.totalActiveCount > 0
                  ? dateLog.totalActiveCount
                  : habits.length || 1;
                const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
                const band = getCompletionBand(pct);
                const isSelected = inspectedDate === cell.date;

                let colorClasses = 'bg-zinc-100/80 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border-zinc-200/60 dark:border-white/5';

                if (!cell.isCurrentMonth) {
                  colorClasses = 'text-zinc-300 dark:text-zinc-700 opacity-30 border-transparent';
                } else if (cell.isFuture) {
                  colorClasses = 'text-zinc-300 dark:text-zinc-700 opacity-40 cursor-not-allowed border-transparent';
                } else if (comp > 0) {
                  if (band === 'full') {
                    // 100%
                    colorClasses = 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-950 dark:text-emerald-100 border-emerald-500/40 font-bold';
                  } else if (band === 'mostly') {
                    // ~75%
                    colorClasses = 'bg-teal-500/20 dark:bg-teal-500/25 text-teal-950 dark:text-teal-100 border-teal-500/40 font-semibold';
                  } else if (band === 'partial') {
                    // ~50%
                    colorClasses = 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-950 dark:text-amber-100 border-amber-500/40 font-medium';
                  }
                }

                if (cell.isToday) {
                  colorClasses += ' ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-1 dark:ring-offset-zinc-900';
                }

                if (isSelected) {
                  colorClasses += ' outline-2 outline-zinc-900 dark:outline-zinc-100 scale-105 shadow-sm';
                }

                return (
                  <button
                    key={`${cell.date}-${idx}`}
                    type="button"
                    disabled={cell.isFuture}
                    onClick={() => setInspectedDate(cell.date)}
                    className={`h-9 sm:h-10 rounded-xl border flex flex-col items-center justify-center text-xs font-mono transition-all cursor-pointer ${colorClasses}`}
                    title={`${cell.date}: ${comp}/${tot} (${pct}%)`}
                  >
                    <span>{cell.dayNumber}</span>
                    {cell.isCurrentMonth && !cell.isFuture && comp > 0 && (
                      <span className="text-[9px] font-mono leading-none scale-90 opacity-80">
                        {pct}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Subtle Legend matching prompt example */}
            <div className="pt-2 border-t border-zinc-200/50 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/25 border border-emerald-500/50 inline-block" />
                <span>100% Fully completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-teal-500/25 border border-teal-500/50 inline-block" />
                <span>75% Mostly completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500/25 border border-amber-500/50 inline-block" />
                <span>50% Partially completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 inline-block" />
                <span>0% No completion</span>
              </div>
            </div>
          </div>

          {/* Selected Day Inspector Card */}
          <div
            id="heatmap-day-inspector-card"
            className="p-4 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/10 pb-2.5">
              <div>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                  Day Inspector
                </span>
                <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {formatHeaderDate(inspectedDate)}
                </h5>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {inspectedPercentage}%
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                  {inspectedCompletedCount} of {inspectedTotalCount} habits
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Completed Habits */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Completed ({completedHabitsList.length})</span>
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {completedHabitsList.length > 0 ? (
                    completedHabitsList.map((h) => (
                      <div
                        key={h.id}
                        className="p-2 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-zinc-900 dark:text-zinc-100"
                      >
                        <HabitIcon name={h.icon} className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate font-medium">{h.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-1">
                      No habits completed on this date.
                    </p>
                  )}
                </div>
              </div>

              {/* Missed Habits */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Circle className="w-3.5 h-3.5" />
                  <span>Missed ({missedHabitsList.length})</span>
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {missedHabitsList.length > 0 ? (
                    missedHabitsList.map((h) => (
                      <div
                        key={h.id}
                        className="p-2 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 rounded-lg flex items-center gap-2 text-zinc-600 dark:text-zinc-400"
                      >
                        <HabitIcon name={h.icon} className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        <span className="truncate font-medium">{h.name}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1">
                      Perfect day! All habits were completed.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. MONTHLY INSIGHTS                                       */}
        {/* ========================================================= */}
        <div id="monthly-insights-container" className="pt-2 space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Monthly Insights
            </h4>
          </div>

          <div className="p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-2">
            {monthlyRecap.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0 mt-1.5" />
                <span className="leading-relaxed">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. HABIT BREAKDOWN PERFORMANCE LIST                       */}
      {/* ========================================================= */}
      <section id="habit-breakdown-section" className="p-4 sm:p-5 glass-card rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Habit Consistency Breakdown
        </h3>

        <div className="space-y-2">
          {analytics.habitBreakdown.map((item) => (
            <div
              key={item.habitId}
              className="p-3 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <HabitIcon name={item.icon} className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {item.name}
                  </span>
                  {item.target && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      • {item.target}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {item.percentage}%
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    ({item.completedDays} / {item.totalLoggedDays} days)
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-zinc-200/80 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
