import React, { useState, useMemo } from 'react';
import {
  Flame,
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar as CalendarIcon,
  Check,
  Circle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Dumbbell,
  Scale,
  Target,
  CheckCircle2,
  ChevronDown,
  Trophy,
  Zap,
  CalendarDays,
  Star,
} from 'lucide-react';
import {
  AnalyticsStats,
  HabitItem,
  DailyLogData,
  UserProfile,
  WeightHistoryEntry,
  GoalWithProgress,
} from '../types';
import { HabitIcon } from './HabitIcon';
import { GoalCard } from './GoalCard';
import {
  getMonthCalendarDays,
  formatMonthYear,
  formatHeaderDate,
  getLocalDateKey,
  getTodayDateString,
  getLastNDays,
  formatWeekday,
} from '../lib/dateUtils';
import {
  calculateMonthlyRecap,
  canNavigateToNextMonth,
} from '../lib/monthlyRecapUtils';
import {
  analyzeHabitIntelligence,
  calculateHabitSpecificStreaks,
} from '../lib/habitIntelligence';

interface AnalyticsViewProps {
  analytics: AnalyticsStats;
  rawLogsMap: Record<string, DailyLogData>;
  habits: HabitItem[];
  todayDate: string;
  userProfile?: UserProfile | null;
  weightHistory?: WeightHistoryEntry[];
  onOpenWeightModal?: () => void;
  goals?: GoalWithProgress[];
  onOpenNewGoal?: () => void;
  onNavigateToFuture?: () => void;
}

/**
 * Calculates a smooth cubic bezier SVG path string for a list of (x, y) points.
 * Clamps control points to [minY, maxY] to prevent curve bulging out of bounds.
 */
function getSmoothCurvePath(
  points: Array<{ x: number; y: number }>,
  minY: number = 0,
  maxY: number = 1000
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

    let cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;

    let cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    // Clamp Y values to avoid overshooting chart top/bottom
    cp1y = Math.max(minY, Math.min(maxY, cp1y));
    cp2y = Math.max(minY, Math.min(maxY, cp2y));

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Creates a closed polygon path for subtle area gradient fill beneath the curve down to baseY.
 */
function getAreaPath(
  points: Array<{ x: number; y: number }>,
  baseY: number,
  minY: number = 0,
  maxY: number = 1000
): string {
  if (points.length < 2) return '';
  const curve = getSmoothCurvePath(points, minY, maxY);
  const firstX = points[0].x.toFixed(1);
  const lastX = points[points.length - 1].x.toFixed(1);
  return `${curve} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  rawLogsMap = {},
  habits = [],
  todayDate,
  userProfile,
  weightHistory = [],
  onOpenWeightModal,
  goals = [],
  onOpenNewGoal,
  onNavigateToFuture,
}) => {
  const safeToday = todayDate ? getLocalDateKey(todayDate) : getTodayDateString();
  const [todayYear, todayMonth] = safeToday.split('-').map(Number);

  // Month navigation state (default to current month)
  const [currentYearMonth, setCurrentYearMonth] = useState<{ year: number; monthIndex: number }>({
    year: todayYear || new Date().getFullYear(),
    monthIndex: (todayMonth || 1) - 1,
  });

  // Safe habits array
  const safeHabits = useMemo(() => (Array.isArray(habits) ? habits : []), [habits]);

  // Selected habit for Section 3 Habit Trend
  const [selectedHabitId, setSelectedHabitId] = useState<string>(
    safeHabits[0]?.id || ''
  );

  // If selectedHabitId is empty or not in habits, pick the first available
  React.useEffect(() => {
    if (!selectedHabitId && safeHabits.length > 0) {
      setSelectedHabitId(safeHabits[0].id);
    }
  }, [safeHabits, selectedHabitId]);

  // Selected date for day inspector (shared by Heatmap and Monthly chart)
  const [inspectedDate, setInspectedDate] = useState<string>(safeToday);

  // Active weekly point index for tooltip & day breakdown (defaults to today / index 6)
  const [activeWeeklyIndex, setActiveWeeklyIndex] = useState<number>(6);

  // Active monthly point index for tooltip
  const [activeMonthlyIndex, setActiveMonthlyIndex] = useState<number | null>(null);

  // Active habit trend point index for tooltip
  const [activeHabitPointIndex, setActiveHabitPointIndex] = useState<number | null>(null);

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
    setActiveMonthlyIndex(null);
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    setCurrentYearMonth((prev) => {
      if (prev.monthIndex === 11) {
        return { year: prev.year + 1, monthIndex: 0 };
      }
      return { year: prev.year, monthIndex: prev.monthIndex + 1 };
    });
    setActiveMonthlyIndex(null);
  };

  const handleResetToCurrentMonth = () => {
    setCurrentYearMonth({
      year: todayYear,
      monthIndex: todayMonth - 1,
    });
    setInspectedDate(safeToday);
    setActiveMonthlyIndex(null);
  };

  // Calculate Monthly Recap for the selected month (uses real Firestore user data)
  const monthlyRecap = useMemo(() => {
    return calculateMonthlyRecap(
      currentYearMonth.year,
      currentYearMonth.monthIndex,
      rawLogsMap,
      safeHabits,
      safeToday
    );
  }, [currentYearMonth.year, currentYearMonth.monthIndex, rawLogsMap, safeHabits, safeToday]);

  // Comprehensive Habit Intelligence evaluated from user's authentic Firestore logs
  const intelligence = useMemo(() => {
    return analyzeHabitIntelligence(rawLogsMap, safeHabits, safeToday);
  }, [rawLogsMap, safeHabits, safeToday]);

  // Merge intelligence insights with monthly recap insights
  const combinedInsights = useMemo(() => {
    const list: string[] = [];
    if (intelligence.automaticInsights && intelligence.automaticInsights.length > 0) {
      for (const ins of intelligence.automaticInsights) {
        if (!list.includes(ins)) list.push(ins);
      }
    }
    if (monthlyRecap.insights && monthlyRecap.insights.length > 0) {
      for (const ins of monthlyRecap.insights) {
        if (!list.includes(ins)) list.push(ins);
      }
    }
    return list;
  }, [intelligence.automaticInsights, monthlyRecap.insights]);

  // Calendar days grid for Monthly Heatmap
  const calendarDays = useMemo(() => {
    return getMonthCalendarDays(currentYearMonth.year, currentYearMonth.monthIndex, safeToday);
  }, [currentYearMonth.year, currentYearMonth.monthIndex, safeToday]);

  // -------------------------------------------------------------
  // OVERALL PROGRESS RING CHART
  // -------------------------------------------------------------
  const overallPercentage = useMemo(() => {
    if (intelligence.overallPercentage > 0) return intelligence.overallPercentage;
    if (analytics.last30DaysPercentage > 0) return analytics.last30DaysPercentage;
    if (analytics.todayPercentage > 0) return analytics.todayPercentage;
    return monthlyRecap.completionPercentage || 0;
  }, [intelligence.overallPercentage, analytics.last30DaysPercentage, analytics.todayPercentage, monthlyRecap.completionPercentage]);

  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (overallPercentage / 100) * ringCircumference;

  // -------------------------------------------------------------
  // 1. WEEKLY HABIT TREND DATA (Smooth Connected Line Graph)
  // -------------------------------------------------------------
  const weeklyTrendData = useMemo(() => {
    const past7Dates = getLastNDays(7, safeToday);
    const points = past7Dates.map((dateStr, idx) => {
      const log = rawLogsMap[dateStr];
      const comp = log
        ? typeof log.completedCount === 'number'
          ? log.completedCount
          : Object.values(log.completedHabits || {}).filter(Boolean).length
        : 0;
      const tot = log?.totalActiveCount && log.totalActiveCount > 0 ? log.totalActiveCount : safeHabits.length || 1;
      const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
      return {
        index: idx,
        date: dateStr,
        weekday: formatWeekday(dateStr),
        percentage: pct,
        completedCount: comp,
        totalCount: tot,
        isToday: dateStr === safeToday,
      };
    });

    // Calculate UP/DOWN trend: compare early week (first 3 days) vs late week (last 3 days)
    const earlyAvg = (points[0].percentage + points[1].percentage + points[2].percentage) / 3;
    const lateAvg = (points[4].percentage + points[5].percentage + points[6].percentage) / 3;
    const diff = Math.round(lateAvg - earlyAvg);

    return {
      points,
      trendDiff: diff,
      isImproving: diff > 2,
      isDecreasing: diff < -2,
    };
  }, [safeToday, rawLogsMap, safeHabits]);

  // Coordinates for the 7-day weekly smooth line graph (viewBox 0 0 360 140)
  const weeklyCoords = useMemo(() => {
    const left = 38;
    const right = 338;
    const width = right - left;
    const top = 18;
    const bottom = 112;
    const height = bottom - top;

    return weeklyTrendData.points.map((pt, i) => {
      const x = left + (i / 6) * width;
      const y = bottom - (pt.percentage / 100) * height;
      return { x, y, ...pt };
    });
  }, [weeklyTrendData.points]);

  const weeklySmoothPath = useMemo(() => {
    return getSmoothCurvePath(weeklyCoords, 18, 112);
  }, [weeklyCoords]);

  const weeklyAreaPath = useMemo(() => {
    return getAreaPath(weeklyCoords, 112, 18, 112);
  }, [weeklyCoords]);

  // Active weekly day inspection details
  const activeWeeklyPoint = weeklyTrendData.points[activeWeeklyIndex] || weeklyTrendData.points[6];
  const activeWeeklyLog = (rawLogsMap && activeWeeklyPoint?.date) ? rawLogsMap[activeWeeklyPoint.date] : undefined;
  const activeWeeklyCompletedMap = activeWeeklyLog?.completedHabits || {};
  const activeWeeklyCompletedList = useMemo(
    () => safeHabits.filter((h) => activeWeeklyCompletedMap[h.id]),
    [safeHabits, activeWeeklyCompletedMap]
  );
  const activeWeeklyMissedList = useMemo(
    () => safeHabits.filter((h) => !activeWeeklyCompletedMap[h.id]),
    [safeHabits, activeWeeklyCompletedMap]
  );

  // -------------------------------------------------------------
  // 2. MONTHLY TREND DATA (Larger Smooth Line/Area Chart)
  // -------------------------------------------------------------
  const monthlyTrendData = useMemo(() => {
    const daysInMonth = new Date(currentYearMonth.year, currentYearMonth.monthIndex + 1, 0).getDate();
    const points: Array<{
      day: number;
      date: string;
      percentage: number;
      completed: number;
      total: number;
      isFuture: boolean;
    }> = [];

    let totalComp = 0;
    let sumPct = 0;
    let eligibleCount = 0;
    let bestDayObj: { day: number; date: string; percentage: number } | null = null;
    let lowestDayObj: { day: number; date: string; percentage: number } | null = null;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(currentYearMonth.monthIndex + 1).padStart(2, '0');
      const dateKey = `${currentYearMonth.year}-${monthStr}-${dayStr}`;

      const isFuture = dateKey > safeToday;
      if (isFuture) {
        continue;
      }

      const log = rawLogsMap[dateKey];
      const comp = log
        ? typeof log.completedCount === 'number'
          ? log.completedCount
          : Object.values(log.completedHabits || {}).filter(Boolean).length
        : 0;
      const tot = log?.totalActiveCount && log.totalActiveCount > 0 ? log.totalActiveCount : safeHabits.length || 1;
      const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;

      points.push({
        day,
        date: dateKey,
        percentage: pct,
        completed: comp,
        total: tot,
        isFuture: false,
      });

      totalComp += comp;
      sumPct += pct;
      eligibleCount++;

      if (!bestDayObj || pct > bestDayObj.percentage) {
        bestDayObj = { day, date: dateKey, percentage: pct };
      }
      if (!lowestDayObj || pct < lowestDayObj.percentage) {
        lowestDayObj = { day, date: dateKey, percentage: pct };
      }
    }

    const avgCompletion = eligibleCount > 0 ? Math.round(sumPct / eligibleCount) : 0;

    // Determine monthly UP/DOWN trend: compare first half of recorded days vs second half
    let trendDiff = 0;
    if (points.length >= 4) {
      const mid = Math.floor(points.length / 2);
      const firstHalf = points.slice(0, mid);
      const secondHalf = points.slice(mid);
      const firstAvg = firstHalf.reduce((a, b) => a + b.percentage, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b.percentage, 0) / secondHalf.length;
      trendDiff = Math.round(secondAvg - firstAvg);
    }

    return {
      points,
      avgCompletion,
      bestDay: bestDayObj,
      lowestDay: lowestDayObj,
      totalCompleted: totalComp,
      daysInMonth,
      trendDiff,
      isImproving: trendDiff > 2,
      isDecreasing: trendDiff < -2,
    };
  }, [currentYearMonth, safeToday, rawLogsMap, safeHabits]);

  // Coordinates for monthly line chart (viewBox 0 0 360 150)
  const monthlyCoords = useMemo(() => {
    const left = 36;
    const right = 345;
    const width = right - left;
    const top = 18;
    const bottom = 120;
    const height = bottom - top;
    const totalDays = monthlyTrendData.daysInMonth;

    return monthlyTrendData.points.map((pt) => {
      const x = left + ((pt.day - 1) / Math.max(1, totalDays - 1)) * width;
      const y = bottom - (pt.percentage / 100) * height;
      return { x, y, ...pt };
    });
  }, [monthlyTrendData.points, monthlyTrendData.daysInMonth]);

  const monthlySmoothPath = useMemo(() => {
    return getSmoothCurvePath(monthlyCoords, 18, 120);
  }, [monthlyCoords]);

  const monthlyAreaPath = useMemo(() => {
    return getAreaPath(monthlyCoords, 120, 18, 120);
  }, [monthlyCoords]);

  // -------------------------------------------------------------
  // 3. HABIT TREND DATA (Interactive Habit Selection + Trend Line)
  // -------------------------------------------------------------
  const currentHabit = useMemo(() => {
    return safeHabits.find((h) => h.id === selectedHabitId) || safeHabits[0];
  }, [safeHabits, selectedHabitId]);

  // Detailed streak and consistency metrics for the selected habit
  const habitSpecificStreaks = useMemo(() => {
    if (!currentHabit) return { currentStreak: 0, bestStreak: 0, totalCompletions: 0, completionRate: 0 };
    return calculateHabitSpecificStreaks(currentHabit.id, rawLogsMap, safeToday, 14);
  }, [currentHabit, rawLogsMap, safeToday]);

  const habitTrendData = useMemo(() => {
    if (!currentHabit) return null;
    const habitId = currentHabit.id;
    const past14Dates = getLastNDays(14, safeToday);

    // Calculate 5-day rolling consistency % for each of the last 14 days
    // to produce a smooth, continuous UP/DOWN trend curve
    const points = past14Dates.map((dateStr, idx) => {
      const log = rawLogsMap[dateStr];
      const isDone = !!log?.completedHabits?.[habitId];

      // Window of up to 5 days ending at dateStr
      const windowDates = past14Dates.slice(Math.max(0, idx - 4), idx + 1);
      const completedInWindow = windowDates.filter(
        (d) => !!rawLogsMap[d]?.completedHabits?.[habitId]
      ).length;
      const rollingPct = Math.round((completedInWindow / windowDates.length) * 100);

      const [y, m, d] = dateStr.split('-').map(Number);
      const dayInitial = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'narrow' });

      return {
        index: idx,
        date: dateStr,
        dayInitial,
        isCompleted: isDone,
        percentage: rollingPct,
      };
    });

    // 14-day completion count
    const totalDone14 = points.filter((p) => p.isCompleted).length;
    const overall14Pct = Math.round((totalDone14 / 14) * 100);

    // Trend direction: compare first 5 days vs last 5 days
    const early = (points[0].percentage + points[1].percentage + points[2].percentage) / 3;
    const late = (points[11].percentage + points[12].percentage + points[13].percentage) / 3;
    const diff = Math.round(late - early);

    return {
      points,
      streak: habitSpecificStreaks.currentStreak,
      bestStreak: habitSpecificStreaks.bestStreak,
      totalCompletions: habitSpecificStreaks.totalCompletions,
      totalDone14,
      overall14Pct,
      trendDiff: diff,
      isImproving: diff > 5,
      isDecreasing: diff < -5,
    };
  }, [currentHabit, safeToday, rawLogsMap, habitSpecificStreaks]);

  // Coordinates for the 14-day habit trend line graph (viewBox 0 0 360 130)
  const habitCoords = useMemo(() => {
    if (!habitTrendData) return [];
    const left = 36;
    const right = 338;
    const width = right - left;
    const top = 18;
    const bottom = 105;
    const height = bottom - top;

    return habitTrendData.points.map((pt, i) => {
      const x = left + (i / 13) * width;
      const y = bottom - (pt.percentage / 100) * height;
      return { x, y, ...pt };
    });
  }, [habitTrendData]);

  const habitSmoothPath = useMemo(() => {
    return getSmoothCurvePath(habitCoords, 18, 105);
  }, [habitCoords]);

  const habitAreaPath = useMemo(() => {
    return getAreaPath(habitCoords, 105, 18, 105);
  }, [habitCoords]);

  // -------------------------------------------------------------
  // 6. MONTHLY HEATMAP INSPECTION DATA
  // -------------------------------------------------------------
  const heatmapLog = (rawLogsMap && inspectedDate) ? rawLogsMap[inspectedDate] : undefined;
  const heatmapCompletedHabits = heatmapLog?.completedHabits || {};
  const heatmapCompletedCount = heatmapLog
    ? typeof heatmapLog.completedCount === 'number'
      ? heatmapLog.completedCount
      : Object.values(heatmapCompletedHabits).filter(Boolean).length
    : 0;
  const heatmapTotalCount = heatmapLog?.totalActiveCount && heatmapLog.totalActiveCount > 0
    ? heatmapLog.totalActiveCount
    : safeHabits.length || 1;
  const heatmapPercentage = heatmapTotalCount > 0
    ? Math.round((heatmapCompletedCount / heatmapTotalCount) * 100)
    : 0;

  const heatmapCompletedList = useMemo(
    () => safeHabits.filter((h) => heatmapCompletedHabits[h.id]),
    [safeHabits, heatmapCompletedHabits]
  );
  const heatmapMissedList = useMemo(
    () => safeHabits.filter((h) => !heatmapCompletedHabits[h.id]),
    [safeHabits, heatmapCompletedHabits]
  );

  // -------------------------------------------------------------
  // 8. FITNESS & ACTIVITY (Separate Section, Smooth Line Only)
  // -------------------------------------------------------------
  const latestWeightEntry = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;

  return (
    <div id="analytics-dashboard-view" className="space-y-6 animate-fadeIn pb-16">
      {/* Empty State For New User with no habit history yet */}
      {intelligence.isNewUser && (
        <div className="p-5 sm:p-6 glass-card rounded-2xl border-dashed border-2 border-zinc-300 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/40 text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
            Start completing your habits to see your progress
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            As you check off habits in the Task tab, your real daily completion trends, streaks, strongest days, and intelligent habit recaps will appear here.
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* OVERALL PROGRESS (Large Ring Gauge + Core Streaks)         */}
      {/* ========================================================= */}
      <section
        id="section-overall-progress"
        className="p-5 sm:p-6 glass-card rounded-2xl relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Ring Chart */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg
              className="w-36 h-36 sm:w-40 sm:h-40 transform -rotate-90"
              viewBox="0 0 160 160"
            >
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={ringRadius}
                fill="none"
                strokeWidth="11"
                className="text-zinc-200/80 dark:text-zinc-800/80"
                stroke="currentColor"
              />
              {/* Foreground animated arc */}
              <circle
                cx="80"
                cy="80"
                r={ringRadius}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                stroke="currentColor"
                className="text-zinc-900 dark:text-zinc-100 transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Ring Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                {overallPercentage}%
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mt-0.5">
                Overall Progress
              </span>
            </div>
          </div>

          {/* Core Stat Cards (6 Key Metrics) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full sm:w-auto sm:flex-1">
            {/* Completed Habits */}
            <div className="p-3 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Completed
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {intelligence.totalCompletions}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">habits</span>
              </div>
            </div>

            {/* Total Habits */}
            <div className="p-3 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Target className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Total Habits
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {safeHabits.length}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">active</span>
              </div>
            </div>

            {/* Current Streak */}
            <div className="p-3 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Flame className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Current Streak
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {intelligence.currentStreak}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {intelligence.currentStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* Best Streak */}
            <div className="p-3 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Award className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Best Streak
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {intelligence.bestStreak}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {intelligence.bestStreak === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* Perfect Days */}
            <div className="p-3 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Perfect Days
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {intelligence.perfectDays}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {intelligence.perfectDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>

            {/* Active Days */}
            <div className="p-3 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  Active Days
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {intelligence.activeDays}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  {intelligence.activeDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ACTIVE HABIT GOALS OVERVIEW                               */}
      {/* ========================================================= */}
      {goals.length > 0 ? (
        <section id="analytics-active-goals" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Habit Goals
              </h3>
            </div>
            {onNavigateToFuture && (
              <button
                type="button"
                onClick={onNavigateToFuture}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View All & Manage</span>
                <span>→</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {goals.slice(0, 4).map((goal) => (
              <GoalCard key={goal.id} goal={goal} compact />
            ))}
          </div>
        </section>
      ) : onOpenNewGoal ? (
        <div className="p-4 glass-card rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-dashed border-indigo-300/60 dark:border-indigo-800/40 bg-indigo-50/20 dark:bg-indigo-950/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Set a Personal Habit Target
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Aim for completion milestones this week or month to stay motivated.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenNewGoal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors shrink-0"
          >
            + Set Goal
          </button>
        </div>
      ) : null}

      {/* ========================================================= */}
      {/* 1. WEEKLY HABIT TREND (Smooth Connected Line Graph)      */}
      {/* ========================================================= */}
      <section
        id="section-weekly-trend"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200/70 dark:border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              7-Day Trajectory
            </span>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Weekly Habit Trend
            </h3>
          </div>

          {/* Visual UP/DOWN Trend Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                weeklyTrendData.isImproving
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : weeklyTrendData.isDecreasing
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/5'
              }`}
            >
              {weeklyTrendData.isImproving ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Improving {weeklyTrendData.trendDiff > 0 ? `(+${weeklyTrendData.trendDiff}%)` : ''}</span>
                </>
              ) : weeklyTrendData.isDecreasing ? (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Decreasing ({weeklyTrendData.trendDiff}%)</span>
                </>
              ) : (
                <>
                  <Minus className="w-3.5 h-3.5" />
                  <span>Stable Trajectory</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Weekly Comparison Card (This week vs Previous week) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl">
          <div>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              This Week
            </span>
            <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {intelligence.weeklyComparison.hasEnoughData
                ? `${intelligence.weeklyComparison.thisWeekPercentage}%`
                : `${weeklyTrendData.points[weeklyTrendData.points.length - 1]?.percentage || 0}%`}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Previous Week
            </span>
            <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {intelligence.weeklyComparison.hasEnoughData
                ? `${intelligence.weeklyComparison.lastWeekPercentage}%`
                : '—'}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Weekly Change
            </span>
            <span className="text-sm font-bold font-mono">
              {intelligence.weeklyComparison.hasEnoughData ? (
                intelligence.weeklyComparison.trajectory === 'improving' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> ↑ {intelligence.weeklyComparison.difference}%
                  </span>
                ) : intelligence.weeklyComparison.trajectory === 'decreasing' ? (
                  <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> ↓ {Math.abs(intelligence.weeklyComparison.difference)}%
                  </span>
                ) : (
                  <span className="text-zinc-600 dark:text-zinc-400 inline-flex items-center gap-1">
                    <Minus className="w-3.5 h-3.5" /> → Stable
                  </span>
                )
              ) : (
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-sans font-normal">
                  Building weekly history
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Smooth SVG Line / Area Graph */}
        <div className="relative pt-2">
          {/* Floating Tooltip for Active Point */}
          {activeWeeklyPoint && weeklyCoords[activeWeeklyIndex] && (
            <div
              className="absolute z-20 pointer-events-none px-2.5 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[11px] font-mono rounded-lg shadow-md transform -translate-x-1/2 -translate-y-full transition-all duration-200"
              style={{
                left: `${(weeklyCoords[activeWeeklyIndex].x / 360) * 100}%`,
                top: `${Math.max(10, (weeklyCoords[activeWeeklyIndex].y / 140) * 100 - 8)}%`,
              }}
            >
              {activeWeeklyPoint.weekday}: {activeWeeklyPoint.percentage}% ({activeWeeklyPoint.completedCount}/{activeWeeklyPoint.totalCount})
            </div>
          )}

          <svg
            viewBox="0 0 360 140"
            className="w-full h-44 overflow-visible select-none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="weeklyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" className="text-zinc-900 dark:text-zinc-100" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-zinc-900 dark:text-zinc-100" />
              </linearGradient>
            </defs>

            {/* Y-Axis Guidelines & Labels */}
            <line x1="32" y1="18" x2="345" y2="18" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
            <text x="28" y="22" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">100%</text>

            <line x1="32" y1="65" x2="345" y2="65" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
            <text x="28" y="69" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">50%</text>

            <line x1="32" y1="112" x2="345" y2="112" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
            <text x="28" y="116" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">0%</text>

            {/* Subtle Area Fill under curve */}
            <path d={weeklyAreaPath} fill="url(#weeklyAreaGradient)" />

            {/* Smooth Connected Line */}
            <path
              d={weeklySmoothPath}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-zinc-900 dark:text-zinc-100 transition-all duration-500"
            />

            {/* Data Points on each day */}
            {weeklyCoords.map((c, i) => {
              const isSelected = activeWeeklyIndex === i;
              return (
                <g key={c.date}>
                  {/* Tap target hit area */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r="14"
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => setActiveWeeklyIndex(i)}
                  />

                  {/* Outer ring on selection */}
                  {isSelected && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-zinc-900 dark:text-zinc-100 animate-ping opacity-75"
                    />
                  )}

                  {/* Visible Data Point Node */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isSelected ? 5.5 : 4}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'fill-zinc-900 dark:fill-zinc-100 stroke-zinc-900 dark:stroke-zinc-100'
                        : 'fill-white dark:fill-zinc-900 stroke-zinc-900 dark:stroke-zinc-100 hover:scale-125'
                    }`}
                    onClick={() => setActiveWeeklyIndex(i)}
                  />
                </g>
              );
            })}

            {/* X-axis Weekday Labels */}
            <g className="text-[10px] fill-zinc-500 dark:fill-zinc-400 font-mono">
              {weeklyCoords.map((c, i) => {
                const isSelected = activeWeeklyIndex === i;
                return (
                  <text
                    key={c.date}
                    x={c.x}
                    y="130"
                    textAnchor="middle"
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'fill-zinc-950 dark:fill-zinc-50 font-bold text-[11px]'
                        : 'fill-zinc-500 dark:fill-zinc-400'
                    }`}
                    onClick={() => setActiveWeeklyIndex(i)}
                  >
                    {c.weekday}
                  </text>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Selected Day Drilldown Card */}
        {activeWeeklyPoint && (
          <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-white/10 rounded-xl space-y-2.5 mt-2">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {formatHeaderDate(activeWeeklyPoint.date)}
                </span>
                {activeWeeklyPoint.isToday && (
                  <span className="text-[9px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-1.5 py-0.5 rounded font-bold">
                    Today
                  </span>
                )}
              </div>
              <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {activeWeeklyPoint.percentage}% ({activeWeeklyPoint.completedCount} of {activeWeeklyPoint.totalCount})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>Completed ({activeWeeklyCompletedList.length})</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeWeeklyCompletedList.length > 0 ? (
                    activeWeeklyCompletedList.map((h) => (
                      <span
                        key={h.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 rounded-md text-[11px] text-zinc-900 dark:text-zinc-100"
                      >
                        <HabitIcon name={h.icon} className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{h.name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">
                      No habits completed on this day.
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                  <Circle className="w-3 h-3" />
                  <span>Missed ({activeWeeklyMissedList.length})</span>
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeWeeklyMissedList.length > 0 ? (
                    activeWeeklyMissedList.map((h) => (
                      <span
                        key={h.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 rounded-md text-[11px] text-zinc-600 dark:text-zinc-400"
                      >
                        <HabitIcon name={h.icon} className="w-3 h-3 text-zinc-400" />
                        <span>{h.name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      All habits completed!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* HABIT INTELLIGENCE (Consistency & Day-of-Week Patterns)   */}
      {/* ========================================================= */}
      <section
        id="section-habit-intelligence"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Pattern Analysis
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Habit Intelligence
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Most Consistent Habit */}
          <div className="p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                Most Consistent Habit
              </span>
              {intelligence.mostConsistentHabit && (
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {intelligence.mostConsistentHabit.percentage}%
                </span>
              )}
            </div>
            {intelligence.mostConsistentHabit ? (
              <div className="flex items-center gap-2.5">
                <HabitIcon
                  name={intelligence.mostConsistentHabit.icon}
                  className="w-7 h-7 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {intelligence.mostConsistentHabit.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {intelligence.mostConsistentHabit.completedDays} completions
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                Log more habits to discover your strongest routine.
              </p>
            )}
          </div>

          {/* Needs Attention (Supportive Tone) */}
          <div className="p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Focus Opportunity
              </span>
              {intelligence.leastConsistentHabit && (
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {intelligence.leastConsistentHabit.percentage}%
                </span>
              )}
            </div>
            {intelligence.leastConsistentHabit ? (
              <div className="flex items-center gap-2.5">
                <HabitIcon
                  name={intelligence.leastConsistentHabit.icon}
                  className="w-7 h-7 p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {intelligence.leastConsistentHabit.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {intelligence.leastConsistentHabit.name} could use a little more consistency.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                All scheduled habits are maintaining balanced consistency.
              </p>
            )}
          </div>

          {/* Strongest Day */}
          <div className="p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Strongest Day
            </span>
            {intelligence.strongestDay ? (
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {intelligence.strongestDay.name}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {intelligence.strongestDay.percentage}% avg
                </span>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                Gathering day-of-week data
              </p>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {intelligence.strongestDay
                ? `You perform best on ${intelligence.strongestDay.name}s.`
                : 'Keep logging to see your peak day.'}
            </p>
          </div>

          {/* Room for Improvement Day */}
          <div className="p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Room for Growth Day
            </span>
            {intelligence.roomForImprovementDay ? (
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {intelligence.roomForImprovementDay.name}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300">
                  {intelligence.roomForImprovementDay.percentage}% avg
                </span>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                Gathering day-of-week data
              </p>
            )}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {intelligence.roomForImprovementDay
                ? `Plan ahead to boost your habits on ${intelligence.roomForImprovementDay.name}s.`
                : 'Keep logging to discover optimization areas.'}
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. MONTHLY TREND (Larger Line / Area Chart)              */}
      {/* ========================================================= */}
      <section
        id="section-monthly-trend"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-4"
      >
        {/* Month Navigation & Trend Direction */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/70 dark:border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Monthly Trend
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  monthlyTrendData.isImproving
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : monthlyTrendData.isDecreasing
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {monthlyTrendData.isImproving ? '↑ Improving' : monthlyTrendData.isDecreasing ? '↓ Decreased' : '→ Stable'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {formatMonthYear(currentYearMonth.year, currentYearMonth.monthIndex)}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="monthly-chart-prev-btn"
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous Month</span>
            </button>

            {!isCurrentMonthViewed && (
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-colors cursor-pointer"
              >
                Current Month
              </button>
            )}

            <button
              id="monthly-chart-next-btn"
              type="button"
              disabled={!canGoNext}
              onClick={handleNextMonth}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                canGoNext
                  ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer'
                  : 'bg-zinc-100/40 dark:bg-zinc-800/30 text-zinc-400 dark:text-zinc-600 cursor-not-allowed opacity-50'
              }`}
            >
              <span>Next Month</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Key Monthly Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Average Completion
            </span>
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {monthlyTrendData.avgCompletion}%
            </span>
          </div>

          <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Best Day
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 truncate block">
              {monthlyTrendData.bestDay
                ? `Day ${monthlyTrendData.bestDay.day} (${monthlyTrendData.bestDay.percentage}%)`
                : '—'}
            </span>
          </div>

          <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Lowest Day
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-zinc-600 dark:text-zinc-400 truncate block">
              {monthlyTrendData.lowestDay
                ? `Day ${monthlyTrendData.lowestDay.day} (${monthlyTrendData.lowestDay.percentage}%)`
                : '—'}
            </span>
          </div>

          <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 rounded-xl">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
              Total Habits Done
            </span>
            <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {monthlyTrendData.totalCompleted}
            </span>
          </div>
        </div>

        {/* Larger Smooth SVG Line Chart */}
        <div className="relative pt-2">
          {monthlyTrendData.points.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 italic bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl">
              No daily habits recorded for this month yet.
            </div>
          ) : (
            <div className="relative w-full overflow-hidden">
              {/* Tooltip Overlay */}
              {activeMonthlyIndex !== null && monthlyCoords[activeMonthlyIndex] && (
                <div
                  className="absolute z-20 pointer-events-none px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-mono rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(monthlyCoords[activeMonthlyIndex].x / 360) * 100}%`,
                    top: `${Math.max(10, (monthlyCoords[activeMonthlyIndex].y / 150) * 100 - 8)}%`,
                  }}
                >
                  Day {monthlyCoords[activeMonthlyIndex].day}: {monthlyCoords[activeMonthlyIndex].percentage}% ({monthlyCoords[activeMonthlyIndex].completed}/{monthlyCoords[activeMonthlyIndex].total})
                </div>
              )}

              <svg
                viewBox="0 0 360 150"
                className="w-full h-48 overflow-visible select-none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="monthlyTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" className="text-zinc-900 dark:text-zinc-100" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-zinc-900 dark:text-zinc-100" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guidelines */}
                <line x1="32" y1="18" x2="350" y2="18" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
                <text x="28" y="22" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">100%</text>

                <line x1="32" y1="69" x2="350" y2="69" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
                <text x="28" y="73" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">50%</text>

                <line x1="32" y1="120" x2="350" y2="120" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
                <text x="28" y="124" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">0%</text>

                {/* Smooth Area Fill */}
                <path d={monthlyAreaPath} fill="url(#monthlyTrendGradient)" />

                {/* Smooth Curve Line */}
                <path
                  d={monthlySmoothPath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-900 dark:text-zinc-100"
                />

                {/* Interactive Points */}
                {monthlyCoords.map((c, idx) => {
                  const isHovered = activeMonthlyIndex === idx;
                  return (
                    <circle
                      key={c.day}
                      cx={c.x}
                      cy={c.y}
                      r={isHovered ? 4.5 : 2.5}
                      className={`cursor-pointer transition-all ${
                        isHovered
                          ? 'fill-zinc-900 dark:fill-zinc-100 stroke-zinc-900 dark:stroke-zinc-100 stroke-2'
                          : 'fill-white dark:fill-zinc-900 stroke-zinc-900 dark:stroke-zinc-100 stroke-2'
                      }`}
                      onMouseEnter={() => setActiveMonthlyIndex(idx)}
                      onMouseLeave={() => setActiveMonthlyIndex(null)}
                      onClick={() => setInspectedDate(c.date)}
                    />
                  );
                })}

                {/* X-axis Day Numbers */}
                <g className="text-[8px] fill-zinc-400 font-mono">
                  <text x="36" y="138" textAnchor="middle">1</text>
                  <text x="98" y="138" textAnchor="middle">5</text>
                  <text x="175" y="138" textAnchor="middle">15</text>
                  <text x="253" y="138" textAnchor="middle">25</text>
                  <text x="345" y="138" textAnchor="middle">{monthlyTrendData.daysInMonth}</text>
                </g>
              </svg>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. HABIT TREND (Habit Selector + Smooth Line Graph)       */}
      {/* ========================================================= */}
      <section
        id="section-habit-trend"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/70 dark:border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Individual Habit Analysis
            </span>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Habit Trend
            </h3>
          </div>

          {/* Habit Selector Dropdown [ Habit Name ▼ ] */}
          <div className="relative min-w-[180px]">
            <select
              id="habit-trend-selector"
              value={selectedHabitId}
              onChange={(e) => {
                setSelectedHabitId(e.target.value);
                setActiveHabitPointIndex(null);
              }}
              className="w-full appearance-none px-3.5 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer pr-8"
            >
              {safeHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Selected Habit Overview Card */}
        {currentHabit && habitTrendData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-white/5 rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <HabitIcon name={currentHabit.icon} className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate">
                    {currentHabit.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    {currentHabit.target || 'Daily routine'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {habitTrendData.streak}d streak
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {habitTrendData.bestStreak}d best
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400">
                    {habitTrendData.overall14Pct}% (14d)
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    habitTrendData.isImproving
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : habitTrendData.isDecreasing
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {habitTrendData.isImproving ? '↑ Up' : habitTrendData.isDecreasing ? '↓ Down' : '→ Steady'}
                </span>
              </div>
            </div>

            {/* Smooth 14-Day Trajectory Graph */}
            <div className="relative pt-1">
              {activeHabitPointIndex !== null && habitCoords[activeHabitPointIndex] && (
                <div
                  className="absolute z-20 pointer-events-none px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-mono rounded shadow-lg transform -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${(habitCoords[activeHabitPointIndex].x / 360) * 100}%`,
                    top: `${Math.max(10, (habitCoords[activeHabitPointIndex].y / 130) * 100 - 8)}%`,
                  }}
                >
                  {habitCoords[activeHabitPointIndex].date}: {habitCoords[activeHabitPointIndex].isCompleted ? 'Completed ✓' : 'Missed ○'} ({habitCoords[activeHabitPointIndex].percentage}% consistency)
                </div>
              )}

              <svg
                viewBox="0 0 360 130"
                className="w-full h-36 overflow-visible select-none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="habitTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" className="text-zinc-900 dark:text-zinc-100" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" className="text-zinc-900 dark:text-zinc-100" />
                  </linearGradient>
                </defs>

                {/* Y-axis guidelines */}
                <line x1="32" y1="18" x2="345" y2="18" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
                <text x="28" y="22" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">100%</text>

                <line x1="32" y1="61" x2="345" y2="61" stroke="currentColor" strokeDasharray="3 3" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
                <text x="28" y="65" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">50%</text>

                <line x1="32" y1="105" x2="345" y2="105" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth="1" />
                <text x="28" y="109" textAnchor="end" className="text-[9px] fill-zinc-400 font-mono">0%</text>

                {/* Smooth Area */}
                <path d={habitAreaPath} fill="url(#habitTrendGradient)" />

                {/* Smooth Curve */}
                <path
                  d={habitSmoothPath}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-900 dark:text-zinc-100"
                />

                {/* Data Points */}
                {habitCoords.map((c, idx) => (
                  <circle
                    key={c.date}
                    cx={c.x}
                    cy={c.y}
                    r={activeHabitPointIndex === idx ? 4.5 : 3}
                    className={`cursor-pointer transition-all ${
                      c.isCompleted
                        ? 'fill-emerald-500 stroke-white dark:stroke-zinc-900 stroke-2'
                        : 'fill-zinc-300 dark:fill-zinc-700 stroke-white dark:stroke-zinc-900 stroke-2'
                    }`}
                    onClick={() => setActiveHabitPointIndex(idx)}
                    onMouseEnter={() => setActiveHabitPointIndex(idx)}
                    onMouseLeave={() => setActiveHabitPointIndex(null)}
                  />
                ))}

                {/* X-axis Day Initials */}
                <g className="text-[8px] fill-zinc-400 font-mono">
                  {habitCoords.map((c) => (
                    <text key={c.date} x={c.x} y="122" textAnchor="middle">
                      {c.dayInitial}
                    </text>
                  ))}
                </g>
              </svg>
            </div>

            {/* 14-Day Status Dots Track */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Last 14 Days Record ({habitTrendData.totalDone14} of 14 days completed)
              </span>
              <div className="grid grid-cols-14 gap-1">
                {habitTrendData.points.map((dot) => (
                  <div
                    key={dot.date}
                    className="flex flex-col items-center gap-1"
                    title={`${dot.date}: ${dot.isCompleted ? 'Completed' : 'Missed'}`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] transition-all ${
                        dot.isCompleted
                          ? 'bg-emerald-500 text-white font-bold'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {dot.isCompleted ? '✓' : ''}
                    </div>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {dot.dayInitial}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 4. MONTHLY RECAP (Structured Summary & Visual Trend)      */}
      {/* ========================================================= */}
      <section
        id="section-monthly-recap"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-200/70 dark:border-white/10 pb-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Monthly Recap</span>
            </div>
            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {monthlyRecap.monthName}
            </h3>
          </div>

          {/* Visual Trend Indicator (Improving, Decreased, Stable) */}
          {monthlyRecap.previousMonthComparison && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
                  monthlyRecap.previousMonthComparison.difference > 0
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : monthlyRecap.previousMonthComparison.difference < 0
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/5'
                }`}
              >
                {monthlyRecap.previousMonthComparison.difference > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>↑ Improving (+{monthlyRecap.previousMonthComparison.difference}%)</span>
                  </>
                ) : monthlyRecap.previousMonthComparison.difference < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4" />
                    <span>↓ Decreased ({monthlyRecap.previousMonthComparison.difference}%)</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4" />
                    <span>→ Stable (0%)</span>
                  </>
                )}
              </span>
            </div>
          )}
        </div>

        {/* 7 Required Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Monthly Completion % */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
              {monthlyRecap.completionPercentage}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Monthly Completion
            </span>
          </div>

          {/* Previous Month % */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
              {monthlyRecap.previousMonthComparison
                ? `${monthlyRecap.previousMonthComparison.prevPercentage}%`
                : '—'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Previous Month
            </span>
          </div>

          {/* Best Day */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block truncate">
              {monthlyTrendData.bestDay
                ? `Day ${monthlyTrendData.bestDay.day} (${monthlyTrendData.bestDay.percentage}%)`
                : '—'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Best Day
            </span>
          </div>

          {/* Lowest Day */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-600 dark:text-zinc-400 block truncate">
              {monthlyTrendData.lowestDay
                ? `Day ${monthlyTrendData.lowestDay.day} (${monthlyTrendData.lowestDay.percentage}%)`
                : '—'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Lowest Day
            </span>
          </div>

          {/* Current Streak */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics.currentStreak}
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Current Streak
            </span>
          </div>

          {/* Best Streak */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5">
              <Award className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {analytics.bestStreak}
              </span>
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Best Streak
            </span>
          </div>

          {/* Active Days */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
              {monthlyRecap.daysActive}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Active Days
            </span>
          </div>

          {/* Habits Completed */}
          <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-1">
            <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 block">
              {monthlyRecap.totalCompletedHabits}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Habits Completed
            </span>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. MONTHLY HEATMAP (Calendar Grid for Quick Day Review)   */}
      {/* ========================================================= */}
      <section
        id="section-monthly-heatmap"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Monthly Calendar Heatmap
            </h3>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Tap a day to inspect
          </span>
        </div>

        <div className="p-3.5 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2">
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

          {/* Days Grid */}
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
                : safeHabits.length || 1;
              const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
              const isSelected = inspectedDate === cell.date;

              let colorClasses = 'bg-zinc-100/80 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border-zinc-200/60 dark:border-white/5';

              if (!cell.isCurrentMonth) {
                colorClasses = 'text-zinc-300 dark:text-zinc-700 opacity-20 border-transparent cursor-not-allowed';
              } else if (cell.isFuture) {
                colorClasses = 'text-zinc-300 dark:text-zinc-700 opacity-30 cursor-not-allowed border-transparent';
              } else if (comp > 0) {
                if (pct >= 100) {
                  colorClasses = 'bg-emerald-500/25 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-100 border-emerald-500/50 font-bold';
                } else if (pct >= 70) {
                  colorClasses = 'bg-teal-500/25 dark:bg-teal-500/30 text-teal-950 dark:text-teal-100 border-teal-500/50 font-semibold';
                } else if (pct >= 35) {
                  colorClasses = 'bg-amber-500/25 dark:bg-amber-500/30 text-amber-950 dark:text-amber-100 border-amber-500/50 font-medium';
                } else {
                  colorClasses = 'bg-zinc-300/60 dark:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 border-zinc-400/40';
                }
              }

              if (cell.isToday) {
                colorClasses += ' ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-1 dark:ring-offset-zinc-900';
              }

              if (isSelected) {
                colorClasses += ' scale-105 shadow-xs outline-2 outline-zinc-900 dark:outline-zinc-100';
              }

              return (
                <button
                  key={`${cell.date}-${idx}`}
                  type="button"
                  disabled={cell.isFuture || !cell.isCurrentMonth}
                  onClick={() => setInspectedDate(cell.date)}
                  className={`h-9 sm:h-10 rounded-xl border flex flex-col items-center justify-center text-xs font-mono transition-all cursor-pointer ${colorClasses}`}
                  title={`${cell.date}: ${pct}%`}
                >
                  <span>{cell.dayNumber}</span>
                  {cell.isCurrentMonth && !cell.isFuture && comp > 0 && (
                    <span className="text-[8px] font-mono leading-none scale-90 opacity-80">
                      {pct}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="pt-2 border-t border-zinc-200/50 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/60 inline-block" />
              <span>100% Full</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-teal-500/30 border border-teal-500/60 inline-block" />
              <span>75% High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/30 border border-amber-500/60 inline-block" />
              <span>50% Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-zinc-300 dark:bg-zinc-700 inline-block" />
              <span>1–49% Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 inline-block" />
              <span>0% None</span>
            </div>
          </div>
        </div>

        {/* Heatmap Day Inspector */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-white/10 pb-2.5">
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block">
                Inspected Day
              </span>
              <h5 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {formatHeaderDate(inspectedDate)}
              </h5>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {heatmapPercentage}%
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono block">
                {heatmapCompletedCount} of {heatmapTotalCount} habits
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Completed */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Completed ({heatmapCompletedList.length})</span>
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {heatmapCompletedList.length > 0 ? (
                  heatmapCompletedList.map((h) => (
                    <div
                      key={h.id}
                      className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-zinc-900 dark:text-zinc-100"
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

            {/* Missed */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <Circle className="w-3.5 h-3.5" />
                <span>Missed ({heatmapMissedList.length})</span>
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {heatmapMissedList.length > 0 ? (
                  heatmapMissedList.map((h) => (
                    <div
                      key={h.id}
                      className="p-1.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-white/5 rounded-lg flex items-center gap-2 text-zinc-600 dark:text-zinc-400"
                    >
                      <HabitIcon name={h.icon} className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                      <span className="truncate font-medium">{h.name}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1">
                    Perfect day! All habits completed.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. INSIGHTS (Derived Directly from Actual Logs)           */}
      {/* ========================================================= */}
      <section
        id="section-insights"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Insights
          </h3>
        </div>

        <div className="p-4 bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-white/5 rounded-xl space-y-2.5">
          {combinedInsights.length > 0 ? (
            combinedInsights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 shrink-0 mt-1.5" />
                <span className="leading-relaxed font-medium">{insight}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
              Complete more habits to unlock insights.
            </p>
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. FITNESS & ACTIVITY (Separate Section, Smooth Curves)   */}
      {/* ========================================================= */}
      <section
        id="section-fitness-activity"
        className="p-5 sm:p-6 glass-card rounded-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Fitness & Activity
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Weight trajectory and activity check-ins
              </p>
            </div>
          </div>

          {onOpenWeightModal && (
            <button
              id="analytics-log-weight-btn"
              type="button"
              onClick={onOpenWeightModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl border border-zinc-200/80 dark:border-white/10 transition-colors cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Log Weight</span>
            </button>
          )}
        </div>

        {/* Body Metrics Summary */}
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
              Last Check-in
            </span>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mt-0.5">
              {userProfile?.lastWeightCheckInDate ? `Logged on ${userProfile.lastWeightCheckInDate}` : 'No check-in yet'}
            </span>
          </div>
        </div>

        {/* Weight Progression Smooth Line Chart */}
        {weightHistory.length > 1 && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-white/10 rounded-xl space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Weight Progression Trend
            </span>
            <div className="h-28 w-full">
              <svg viewBox="0 0 320 80" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                {(() => {
                  const weights = weightHistory.map((w) => w.weight);
                  const minW = Math.min(...weights) - 1;
                  const maxW = Math.max(...weights) + 1;
                  const range = maxW - minW || 1;

                  const points = weightHistory.map((entry, idx) => {
                    const x = 20 + (idx / (weightHistory.length - 1)) * 280;
                    const y = 65 - ((entry.weight - minW) / range) * 50;
                    return { x, y, ...entry };
                  });

                  const smoothPath = getSmoothCurvePath(points, 10, 70);

                  return (
                    <g>
                      <path
                        d={smoothPath}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                      {points.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={p.x}
                          cy={p.y}
                          r="3.5"
                          className="fill-white dark:fill-zinc-900 stroke-emerald-600 dark:stroke-emerald-400 stroke-2"
                        />
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
