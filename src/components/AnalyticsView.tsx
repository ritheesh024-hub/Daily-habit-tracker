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
  Info,
} from 'lucide-react';
import { AnalyticsStats, HabitItem, DailyLogData } from '../types';
import { HabitIcon } from './HabitIcon';
import {
  getMonthCalendarDays,
  formatMonthYear,
  formatHeaderDate,
} from '../lib/dateUtils';

interface AnalyticsViewProps {
  analytics: AnalyticsStats;
  rawLogsMap: Record<string, DailyLogData>;
  habits: HabitItem[];
  todayDate: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  rawLogsMap,
  habits,
  todayDate,
}) => {
  // Calendar month state
  const [currentYearMonth, setCurrentYearMonth] = useState<{ year: number; monthIndex: number }>(() => {
    const [y, m] = todayDate.split('-').map(Number);
    return { year: y, monthIndex: m - 1 };
  });

  // Selected date in calendar for read-only inspection
  const [inspectedDate, setInspectedDate] = useState<string>(todayDate);

  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.monthIndex === 0) {
        return { year: prev.year - 1, monthIndex: 11 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.monthIndex === 11) {
        return { year: prev.year + 1, monthIndex: 0 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex + 1 };
    });
  };

  // Inspect details for selected date
  const inspectedLog = rawLogsMap[inspectedDate];
  const inspectedCompletedHabits = inspectedLog?.completedHabits || {};
  const activeHabitIds = useMemo(() => habits.map((h) => h.id), [habits]);
  const inspectedCompletedCount = inspectedLog
    ? typeof inspectedLog.completedCount === 'number'
      ? inspectedLog.completedCount
      : Object.values(inspectedCompletedHabits).filter(Boolean).length
    : 0;
  const inspectedTotalCount = inspectedLog?.totalActiveCount && inspectedLog.totalActiveCount > 0
    ? inspectedLog.totalActiveCount
    : habits.length || 8;
  const inspectedPercentage = inspectedTotalCount > 0
    ? Math.round((inspectedCompletedCount / inspectedTotalCount) * 100)
    : 0;

  const completedHabitsList = useMemo(
    () => habits.filter((h) => inspectedCompletedHabits[h.id]),
    [habits, inspectedCompletedHabits]
  );
  const incompleteHabitsList = useMemo(
    () => habits.filter((h) => !inspectedCompletedHabits[h.id]),
    [habits, inspectedCompletedHabits]
  );

  // Calendar days grid
  const calendarDays = useMemo(
    () => getMonthCalendarDays(currentYearMonth.year, currentYearMonth.monthIndex, todayDate),
    [currentYearMonth.year, currentYearMonth.monthIndex, todayDate]
  );

  // Check if completely empty state
  const isEmptyUser =
    !analytics.hasEnoughData &&
    analytics.totalCompletedHabits === 0 &&
    analytics.totalLoggedDays <= 1;

  return (
    <div id="advanced-analytics-view" className="space-y-5">
      {/* 1. TOP ANALYTICS OVERVIEW */}
      <section id="analytics-overview-section" className="space-y-2">
        <h3 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
          Analytics Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {/* Current Streak */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
              Current Streak
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <Flame className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
              <span className="text-base font-bold text-zinc-900 font-mono">
                {analytics.currentStreak}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {analytics.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Best Streak */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
              Best Streak
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <Award className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
              <span className="text-base font-bold text-zinc-900 font-mono">
                {analytics.bestStreak}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {analytics.bestStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          {/* Today */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
              Today
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold text-zinc-900 font-mono">
                {analytics.todayPercentage}%
              </span>
            </div>
          </div>

          {/* Last 7 Days */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
              Last 7 Days
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold text-zinc-900 font-mono">
                {analytics.last7DaysPercentage}%
              </span>
            </div>
          </div>

          {/* Last 30 Days */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg col-span-2 sm:col-span-1">
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
              Last 30 Days
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-base font-bold text-zinc-900 font-mono">
                {analytics.last30DaysPercentage}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Empty State Banner when user has no logged history */}
      {isEmptyUser && (
        <div
          id="analytics-empty-state"
          className="p-4 bg-zinc-50 border border-dashed border-zinc-200 rounded-lg text-center space-y-1"
        >
          <p className="text-xs font-semibold text-zinc-800">
            Keep tracking your habits.
          </p>
          <p className="text-[11px] text-zinc-500">
            Your analytics will appear here as you build your history.
          </p>
        </div>
      )}

      {/* 2. 7-DAY ANALYTICS & WEEKLY COMPARISON */}
      <section id="analytics-7day-section" className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              7-Day Analytics
            </h4>
            <span className="text-[11px] text-zinc-500">Daily completion percentages</span>
          </div>

          {/* Weekly Comparison Badge */}
          <div className="flex items-center gap-1.5 bg-white border border-zinc-200/80 px-2.5 py-1 rounded-md text-xs">
            <span className="text-[11px] text-zinc-500">vs prev week:</span>
            <span
              className={`font-mono font-semibold flex items-center gap-0.5 ${
                analytics.weeklyComparison.improvement > 0
                  ? 'text-emerald-700'
                  : analytics.weeklyComparison.improvement < 0
                  ? 'text-rose-600'
                  : 'text-zinc-600'
              }`}
            >
              {analytics.weeklyComparison.improvement > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : analytics.weeklyComparison.improvement < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              {analytics.weeklyComparison.improvement > 0 ? '+' : ''}
              {analytics.weeklyComparison.improvement}%
            </span>
          </div>
        </div>

        {/* 7-Day Visual Bars */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {analytics.sevenDayBreakdown.map((day) => {
            const isDayToday = day.date === todayDate;
            return (
              <div
                key={day.date}
                className={`p-2 rounded border text-center flex flex-col justify-between min-h-[72px] transition-colors ${
                  isDayToday
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                    : 'bg-white text-zinc-800 border-zinc-200/80'
                }`}
              >
                <span className={`text-[10px] font-semibold ${isDayToday ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {day.weekday}
                </span>

                <div className="my-1">
                  <span className="text-xs font-bold font-mono block">
                    {day.percentage}%
                  </span>
                </div>

                <div className="w-full bg-zinc-200/60 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isDayToday ? 'bg-white' : 'bg-zinc-900'}`}
                    style={{ width: `${day.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Weekly Comparison summary text */}
        <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-between text-[11px] text-zinc-600">
          <div>
            <span className="font-medium text-zinc-700">This week:</span>{' '}
            <span className="font-mono font-semibold">{analytics.weeklyComparison.thisWeekPercentage}%</span>
            <span className="mx-2 text-zinc-300">|</span>
            <span className="font-medium text-zinc-700">Last week:</span>{' '}
            <span className="font-mono font-semibold">{analytics.weeklyComparison.lastWeekPercentage}%</span>
          </div>
          <div>
            <span className="font-medium text-zinc-700">Improvement:</span>{' '}
            <span className="font-mono font-semibold">
              {analytics.weeklyComparison.improvement > 0 ? `+${analytics.weeklyComparison.improvement}%` : `${analytics.weeklyComparison.improvement}%`}
            </span>
          </div>
        </div>
      </section>

      {/* 3. 30-DAY ANALYTICS SUMMARY */}
      <section id="analytics-30day-section" className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2.5">
        <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
          30-Day Summary
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2.5 bg-white border border-zinc-200/80 rounded">
            <span className="text-[10px] text-zinc-500 font-medium block">Average Completion</span>
            <span className="text-base font-bold text-zinc-900 font-mono mt-0.5 block">
              {analytics.thirtyDaySummary.averagePercentage}%
            </span>
          </div>

          <div className="p-2.5 bg-white border border-zinc-200/80 rounded">
            <span className="text-[10px] text-zinc-500 font-medium block">Completed Days</span>
            <span className="text-base font-bold text-emerald-700 font-mono mt-0.5 block">
              {analytics.thirtyDaySummary.completedDays}
            </span>
          </div>

          <div className="p-2.5 bg-white border border-zinc-200/80 rounded">
            <span className="text-[10px] text-zinc-500 font-medium block">Partial Days</span>
            <span className="text-base font-bold text-amber-700 font-mono mt-0.5 block">
              {analytics.thirtyDaySummary.partialDays}
            </span>
          </div>

          <div className="p-2.5 bg-white border border-zinc-200/80 rounded">
            <span className="text-[10px] text-zinc-500 font-medium block">Total Completions</span>
            <span className="text-base font-bold text-zinc-900 font-mono mt-0.5 block">
              {analytics.thirtyDaySummary.totalCompletedHabits}
            </span>
          </div>
        </div>
      </section>

      {/* 4. MONTHLY CALENDAR (READ-ONLY WITH DAY INSPECTION) */}
      <section id="analytics-calendar-section" className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-zinc-700" />
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Monthly Calendar
            </h4>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900 font-mono">
              {formatMonthYear(currentYearMonth.year, currentYearMonth.monthIndex)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                id="analytics-calendar-prev-btn"
                onClick={handlePrevMonth}
                className="p-1 rounded bg-white hover:bg-zinc-200/70 border border-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="analytics-calendar-next-btn"
                onClick={handleNextMonth}
                className="p-1 rounded bg-white hover:bg-zinc-200/70 border border-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white border border-zinc-200/80 rounded-lg p-2.5">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-semibold text-zinc-400">
            <span>S</span>
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              const dateLog = rawLogsMap[cell.date];
              const compCount = dateLog
                ? typeof dateLog.completedCount === 'number'
                  ? dateLog.completedCount
                  : Object.values(dateLog.completedHabits || {}).filter(Boolean).length
                : 0;
              const totCount = dateLog?.totalActiveCount && dateLog.totalActiveCount > 0
                ? dateLog.totalActiveCount
                : habits.length || 8;
              const isFull = totCount > 0 && compCount >= totCount;
              const isPartial = compCount > 0 && compCount < totCount;
              const isSelected = inspectedDate === cell.date;

              let statusClasses = 'text-zinc-600 hover:bg-zinc-100';

              if (!cell.isCurrentMonth) {
                statusClasses = 'text-zinc-300 opacity-40';
              } else if (cell.isFuture) {
                statusClasses = 'text-zinc-300 cursor-not-allowed';
              } else if (isFull) {
                statusClasses = 'bg-emerald-100/80 text-emerald-900 border border-emerald-300 font-semibold';
              } else if (isPartial) {
                statusClasses = 'bg-amber-50 text-amber-900 border border-amber-200 font-medium';
              } else {
                statusClasses = 'bg-zinc-50 text-zinc-600 border border-zinc-200/60';
              }

              if (cell.isToday) {
                statusClasses += ' ring-2 ring-zinc-900 ring-offset-1';
              }

              if (isSelected) {
                statusClasses += ' outline-2 outline-zinc-900 font-bold';
              }

              return (
                <button
                  key={`${cell.date}-${idx}`}
                  type="button"
                  disabled={cell.isFuture}
                  onClick={() => setInspectedDate(cell.date)}
                  className={`h-8 rounded flex flex-col items-center justify-center text-xs font-mono transition-all cursor-pointer ${statusClasses}`}
                  title={`${cell.date}: ${compCount}/${totCount} completed`}
                >
                  <span>{cell.dayNumber}</span>
                  {cell.isCurrentMonth && !cell.isFuture && compCount > 0 && (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        isFull ? 'bg-emerald-600' : 'bg-amber-600'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between text-[10px] text-zinc-500 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-50 border border-amber-200 inline-block" />
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-zinc-50 border border-zinc-200 inline-block" />
              <span>No Activity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded ring-1 ring-zinc-900 inline-block" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Selected Date Read-Only Inspector Panel */}
        <div
          id="calendar-day-inspect-card"
          className="p-3 bg-white border border-zinc-200 rounded-lg space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <div>
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block">
                Selected Day (View Only)
              </span>
              <span className="text-xs font-bold text-zinc-900">
                {formatHeaderDate(inspectedDate)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-zinc-900 font-mono">
                {inspectedCompletedCount} / {inspectedTotalCount}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono block">
                {inspectedPercentage}% completed
              </span>
            </div>
          </div>

          {/* Completed vs Incomplete Habits lists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Completed */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Completed ({completedHabitsList.length})
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {completedHabitsList.length > 0 ? (
                  completedHabitsList.map((h) => (
                    <div
                      key={h.id}
                      className="p-1.5 bg-emerald-50/60 border border-emerald-100 rounded flex items-center gap-1.5 text-zinc-800 truncate"
                    >
                      <HabitIcon name={h.icon} className="w-3 h-3 text-emerald-700 shrink-0" />
                      <span className="truncate">{h.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-zinc-400 italic block py-1">
                    No habits completed on this date.
                  </span>
                )}
              </div>
            </div>

            {/* Incomplete */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-zinc-600 flex items-center gap-1">
                <Circle className="w-3 h-3 text-zinc-400" /> Incomplete ({incompleteHabitsList.length})
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {incompleteHabitsList.length > 0 ? (
                  incompleteHabitsList.map((h) => (
                    <div
                      key={h.id}
                      className="p-1.5 bg-zinc-50 border border-zinc-200/60 rounded flex items-center gap-1.5 text-zinc-500 truncate"
                    >
                      <HabitIcon name={h.icon} className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate">{h.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-emerald-700 font-medium italic block py-1">
                    All habits completed! 🎉
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MOST & LEAST CONSISTENT */}
      <section id="analytics-consistency-section" className="space-y-2">
        <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
          Consistency Highlights
        </h4>
        {analytics.hasEnoughData && analytics.mostConsistentHabit && analytics.leastCompletedHabit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Most Consistent */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-medium mb-1">
                <Award className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
                <span>Most Consistent</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {analytics.mostConsistentHabit.name} —{' '}
                <span className="font-mono font-bold">{analytics.mostConsistentHabit.percentage}%</span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Completed on {analytics.mostConsistentHabit.completedDays} of {analytics.mostConsistentHabit.totalLoggedDays} tracked days
              </p>
            </div>

            {/* Least Consistent */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-medium mb-1">
                <TrendingDown className="w-3.5 h-3.5 text-zinc-800 shrink-0" />
                <span>Least Consistent</span>
              </div>
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {analytics.leastCompletedHabit.name} —{' '}
                <span className="font-mono font-bold">{analytics.leastCompletedHabit.percentage}%</span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Completed on {analytics.leastCompletedHabit.completedDays} of {analytics.leastCompletedHabit.totalLoggedDays} tracked days
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-500">
            Keep tracking to see your habit consistency.
          </div>
        )}
      </section>

      {/* 6. HABIT PERFORMANCE BREAKDOWN */}
      <section id="analytics-habit-performance-section" className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            Habit Performance
          </h4>
          <span className="text-[11px] text-zinc-500 font-mono">Completion Rate</span>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {analytics.habitBreakdown.map((item) => (
            <div
              key={item.habitId}
              className="p-2.5 bg-zinc-50 border border-zinc-200/80 rounded-lg flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-6 h-6 rounded bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
                  <HabitIcon name={item.icon} className="w-3 h-3" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-zinc-900 truncate block">
                    {item.name}
                  </span>
                  {item.target && (
                    <span className="text-[10px] text-zinc-500 font-mono truncate block">
                      {item.target}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-24 sm:w-32 bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-zinc-900 h-full rounded-full transition-all duration-300"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-zinc-900 w-10 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}

          {analytics.habitBreakdown.length === 0 && (
            <div className="text-center py-6 text-zinc-400 text-xs">
              No habits configured yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
