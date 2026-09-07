import { HabitItem, DailyLogData } from '../types';
import {
  getLocalDateKey,
  getTodayDateString,
  getPreviousDateString,
  getLastNDays,
  formatWeekday,
} from './dateUtils';
import { countCompletedInMap } from './habitService';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface HabitStreakStats {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number;
}

export interface WeeklyIntelligenceComparison {
  thisWeekPercentage: number;
  lastWeekPercentage: number;
  difference: number;
  thisWeekCompletions: number;
  lastWeekCompletions: number;
  hasEnoughData: boolean;
  trajectory: 'improving' | 'decreasing' | 'stable';
}

export interface MonthlyIntelligenceComparison {
  currentMonthPercentage: number;
  previousMonthPercentage: number;
  difference: number;
  hasEnoughData: boolean;
  trajectory: 'improving' | 'decreasing' | 'stable';
}

export interface ConsistentHabitMetric {
  habitId: string;
  name: string;
  icon?: string;
  target?: string;
  percentage: number;
  completedDays: number;
  eligibleDays: number;
}

export interface DayOfWeekPerformance {
  name: string;
  percentage: number;
  completedSum: number;
  possibleSum: number;
  daysEvaluated: number;
}

export interface HabitIntelligenceSummary {
  currentStreak: number;
  bestStreak: number;
  perfectDays: number;
  activeDays: number;
  totalCompletions: number;
  overallPercentage: number;
  weeklyComparison: WeeklyIntelligenceComparison;
  monthlyComparison: MonthlyIntelligenceComparison;
  mostConsistentHabit: ConsistentHabitMetric | null;
  leastConsistentHabit: ConsistentHabitMetric | null;
  strongestDay: DayOfWeekPerformance | null;
  roomForImprovementDay: DayOfWeekPerformance | null;
  automaticInsights: string[];
  isNewUser: boolean;
  hasEnoughData: boolean;
}

/**
 * Checks if a given day log represents 100% completion of all scheduled active habits.
 */
export function isDayPerfect(
  log: DailyLogData | undefined,
  activeHabitsCount: number
): boolean {
  if (!log) return false;
  const tot = typeof log.totalActiveCount === 'number' && log.totalActiveCount > 0
    ? log.totalActiveCount
    : activeHabitsCount;
  const comp = typeof log.completedCount === 'number'
    ? log.completedCount
    : Object.values(log.completedHabits || {}).filter(Boolean).length;
  return tot > 0 && comp >= tot;
}

/**
 * Calculates current streak and all-time best streak across all historical logs.
 * Strictly respects date continuity and does not count future dates.
 */
export function calculateAccurateStreaks(
  rawLogsMap: Record<string, DailyLogData> = {},
  habits: HabitItem[] = [],
  todayDate: string = getTodayDateString()
): { currentStreak: number; bestStreak: number } {
  const safeToday = getLocalDateKey(todayDate);
  const activeCount = habits.length;

  // 1. Current Streak calculation
  let currentStreak = 0;
  const todayLog = rawLogsMap[safeToday];
  const todayDone = isDayPerfect(todayLog, activeCount);

  if (todayDone) {
    currentStreak = 1;
    let checkDate = getPreviousDateString(safeToday);
    while (isDayPerfect(rawLogsMap[checkDate], activeCount)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
    // Today is in progress; check if unbroken sequence ending yesterday
    let checkDate = getPreviousDateString(safeToday);
    while (isDayPerfect(rawLogsMap[checkDate], activeCount)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  }

  // 2. Best Streak calculation across all history (only dates <= todayDate)
  const perfectDates = Object.keys(rawLogsMap)
    .filter((d) => d <= safeToday && isDayPerfect(rawLogsMap[d], activeCount))
    .sort();

  let bestStreak = 0;
  if (perfectDates.length > 0) {
    let tempStreak = 1;
    bestStreak = 1;

    for (let i = 1; i < perfectDates.length; i++) {
      const prev = perfectDates[i - 1];
      const curr = perfectDates[i];
      if (prev === getPreviousDateString(curr)) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  return { currentStreak, bestStreak };
}

/**
 * Calculates habit-specific streak metrics (current streak and all-time best streak for this habit).
 */
export function calculateHabitSpecificStreaks(
  habitId: string,
  rawLogsMap: Record<string, DailyLogData> = {},
  todayDate: string = getTodayDateString(),
  daysWindow: number = 30
): HabitStreakStats {
  const safeToday = getLocalDateKey(todayDate);

  const isHabitDone = (dateKey: string): boolean => {
    const log = rawLogsMap[dateKey];
    return !!log?.completedHabits?.[habitId];
  };

  // 1. Current habit streak
  let currentStreak = 0;
  const doneToday = isHabitDone(safeToday);

  if (doneToday) {
    currentStreak = 1;
    let checkDate = getPreviousDateString(safeToday);
    while (isHabitDone(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
    let checkDate = getPreviousDateString(safeToday);
    while (isHabitDone(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  }

  // 2. Best habit streak across all recorded history
  const allCompletedDates = Object.keys(rawLogsMap)
    .filter((d) => d <= safeToday && isHabitDone(d))
    .sort();

  let bestStreak = 0;
  if (allCompletedDates.length > 0) {
    let tempStreak = 1;
    bestStreak = 1;

    for (let i = 1; i < allCompletedDates.length; i++) {
      const prev = allCompletedDates[i - 1];
      const curr = allCompletedDates[i];
      if (prev === getPreviousDateString(curr)) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    }
  }

  bestStreak = Math.max(bestStreak, currentStreak);

  // 3. Completion rate over window
  const windowDates = getLastNDays(daysWindow, safeToday);
  let doneCount = 0;
  windowDates.forEach((d) => {
    if (isHabitDone(d)) doneCount++;
  });
  const completionRate = windowDates.length > 0 ? Math.round((doneCount / windowDates.length) * 100) : 0;

  // Total all-time completions
  const totalCompletions = allCompletedDates.length;

  return {
    currentStreak,
    bestStreak,
    totalCompletions,
    completionRate,
  };
}

/**
 * Evaluates comprehensive habit intelligence from the user's authentic Firestore daily logs.
 */
export function analyzeHabitIntelligence(
  rawLogsMap: Record<string, DailyLogData> = {},
  habits: HabitItem[] = [],
  todayDate: string = getTodayDateString()
): HabitIntelligenceSummary {
  const safeToday = getLocalDateKey(todayDate);
  const safeHabits = Array.isArray(habits) ? habits : [];
  const activeIds = safeHabits.map((h) => h.id);
  const activeCount = safeHabits.length;

  // 1. Overall Streaks
  const { currentStreak, bestStreak } = calculateAccurateStreaks(rawLogsMap, safeHabits, safeToday);

  // 2. All-time completed habit instances & active/perfect days count
  let totalCompletions = 0;
  let activeDays = 0;
  let perfectDays = 0;
  let totalLogsEvaluated = 0;

  // Day of week accumulators (0 = Sunday ... 6 = Saturday)
  const weekdayStats: Record<number, { completed: number; total: number; daysCount: number }> = {
    0: { completed: 0, total: 0, daysCount: 0 },
    1: { completed: 0, total: 0, daysCount: 0 },
    2: { completed: 0, total: 0, daysCount: 0 },
    3: { completed: 0, total: 0, daysCount: 0 },
    4: { completed: 0, total: 0, daysCount: 0 },
    5: { completed: 0, total: 0, daysCount: 0 },
    6: { completed: 0, total: 0, daysCount: 0 },
  };

  const datesWithData = Object.keys(rawLogsMap)
    .filter((d) => d <= safeToday)
    .sort();

  datesWithData.forEach((dateKey) => {
    const log = rawLogsMap[dateKey];
    if (!log) return;

    totalLogsEvaluated++;

    const comp = typeof log.completedCount === 'number'
      ? log.completedCount
      : countCompletedInMap(log.completedHabits || {}, activeIds);

    const tot = typeof log.totalActiveCount === 'number' && log.totalActiveCount > 0
      ? log.totalActiveCount
      : activeCount;

    totalCompletions += comp;

    if (comp > 0) {
      activeDays++;
    }

    if (tot > 0 && comp >= tot) {
      perfectDays++;
    }

    // Weekday performance
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    if (tot > 0) {
      weekdayStats[dayOfWeek].completed += comp;
      weekdayStats[dayOfWeek].total += tot;
      weekdayStats[dayOfWeek].daysCount += 1;
    }
  });

  const isNewUser = totalCompletions === 0 && activeDays === 0;
  const hasEnoughData = activeDays >= 2 && totalCompletions > 0;

  // 3. Weekly Comparison (Days 0 to -6 vs Days -7 to -13)
  const past14Days = getLastNDays(14, safeToday);
  const thisWeekDays = past14Days.slice(7); // Last 7 days
  const prevWeekDays = past14Days.slice(0, 7); // Previous 7 days

  let thisWeekComp = 0;
  let thisWeekTot = 0;
  let thisWeekActiveDays = 0;

  thisWeekDays.forEach((d) => {
    const log = rawLogsMap[d];
    const comp = log ? (typeof log.completedCount === 'number' ? log.completedCount : countCompletedInMap(log.completedHabits || {}, activeIds)) : 0;
    const tot = log?.totalActiveCount && log.totalActiveCount > 0 ? log.totalActiveCount : activeCount;
    thisWeekComp += comp;
    thisWeekTot += tot;
    if (comp > 0) thisWeekActiveDays++;
  });

  let prevWeekComp = 0;
  let prevWeekTot = 0;
  let prevWeekActiveDays = 0;

  prevWeekDays.forEach((d) => {
    const log = rawLogsMap[d];
    const comp = log ? (typeof log.completedCount === 'number' ? log.completedCount : countCompletedInMap(log.completedHabits || {}, activeIds)) : 0;
    const tot = log?.totalActiveCount && log.totalActiveCount > 0 ? log.totalActiveCount : activeCount;
    prevWeekComp += comp;
    prevWeekTot += tot;
    if (comp > 0) prevWeekActiveDays++;
  });

  const thisWeekPercentage = thisWeekTot > 0 ? Math.round((thisWeekComp / thisWeekTot) * 100) : 0;
  const prevWeekPercentage = prevWeekTot > 0 ? Math.round((prevWeekComp / prevWeekTot) * 100) : 0;
  const weeklyDiff = thisWeekPercentage - prevWeekPercentage;

  const weeklyHasEnoughData = (thisWeekActiveDays + prevWeekActiveDays) >= 2 && (thisWeekComp + prevWeekComp) > 0;
  const weeklyTrajectory: WeeklyIntelligenceComparison['trajectory'] =
    weeklyDiff > 0 ? 'improving' : weeklyDiff < 0 ? 'decreasing' : 'stable';

  const weeklyComparison: WeeklyIntelligenceComparison = {
    thisWeekPercentage,
    lastWeekPercentage: prevWeekPercentage,
    difference: weeklyDiff,
    thisWeekCompletions: thisWeekComp,
    lastWeekCompletions: prevWeekComp,
    hasEnoughData: weeklyHasEnoughData,
    trajectory: weeklyTrajectory,
  };

  // 4. Monthly Comparison (Current month vs Previous month)
  const [currY, currM] = safeToday.split('-').map(Number);
  const prevM = currM === 1 ? 12 : currM - 1;
  const prevY = currM === 1 ? currY - 1 : currY;

  const currentMonthPrefix = `${currY}-${String(currM).padStart(2, '0')}`;
  const prevMonthPrefix = `${prevY}-${String(prevM).padStart(2, '0')}`;

  let currMonthComp = 0;
  let currMonthTot = 0;
  let prevMonthComp = 0;
  let prevMonthTot = 0;
  let currMonthActive = 0;
  let prevMonthActive = 0;

  datesWithData.forEach((d) => {
    const log = rawLogsMap[d];
    if (!log) return;
    const comp = typeof log.completedCount === 'number' ? log.completedCount : countCompletedInMap(log.completedHabits || {}, activeIds);
    const tot = log.totalActiveCount > 0 ? log.totalActiveCount : activeCount;

    if (d.startsWith(currentMonthPrefix)) {
      currMonthComp += comp;
      currMonthTot += tot;
      if (comp > 0) currMonthActive++;
    } else if (d.startsWith(prevMonthPrefix)) {
      prevMonthComp += comp;
      prevMonthTot += tot;
      if (comp > 0) prevMonthActive++;
    }
  });

  const currMonthPercentage = currMonthTot > 0 ? Math.round((currMonthComp / currMonthTot) * 100) : 0;
  const prevMonthPercentage = prevMonthTot > 0 ? Math.round((prevMonthComp / prevMonthTot) * 100) : 0;
  const monthlyDiff = currMonthPercentage - prevMonthPercentage;
  const monthlyHasEnoughData = currMonthActive >= 2 && currMonthComp > 0;
  const monthlyTrajectory: MonthlyIntelligenceComparison['trajectory'] =
    monthlyDiff > 0 ? 'improving' : monthlyDiff < 0 ? 'decreasing' : 'stable';

  const monthlyComparison: MonthlyIntelligenceComparison = {
    currentMonthPercentage: currMonthPercentage,
    previousMonthPercentage: prevMonthPercentage,
    difference: monthlyDiff,
    hasEnoughData: monthlyHasEnoughData,
    trajectory: monthlyTrajectory,
  };

  // Overall completion rate (over last 30 days)
  const last30Days = getLastNDays(30, safeToday);
  let comp30 = 0;
  let tot30 = 0;
  last30Days.forEach((d) => {
    const log = rawLogsMap[d];
    const comp = log ? (typeof log.completedCount === 'number' ? log.completedCount : countCompletedInMap(log.completedHabits || {}, activeIds)) : 0;
    const tot = log?.totalActiveCount && log.totalActiveCount > 0 ? log.totalActiveCount : activeCount;
    comp30 += comp;
    tot30 += tot;
  });
  const overallPercentage = tot30 > 0 ? Math.round((comp30 / tot30) * 100) : 0;

  // 5. Most & Least Consistent Habits
  const habitMetrics: ConsistentHabitMetric[] = safeHabits.map((h) => {
    let creationDateStr = '2000-01-01';
    if (h.createdAt) {
      try {
        creationDateStr = h.createdAt.substring(0, 10);
      } catch {
        creationDateStr = '2000-01-01';
      }
    }

    const eligibleDays = last30Days.filter((d) => d >= creationDateStr && d <= safeToday);
    const totalEligible = eligibleDays.length > 0 ? eligibleDays.length : 1;

    let completedDays = 0;
    eligibleDays.forEach((d) => {
      const log = rawLogsMap[d];
      if (log?.completedHabits?.[h.id]) {
        completedDays++;
      }
    });

    const pct = Math.round((completedDays / totalEligible) * 100);

    return {
      habitId: h.id,
      name: h.name,
      icon: h.icon,
      target: h.target,
      percentage: pct,
      completedDays,
      eligibleDays: totalEligible,
    };
  });

  habitMetrics.sort((a, b) => b.percentage - a.percentage);

  let mostConsistentHabit: ConsistentHabitMetric | null = null;
  let leastConsistentHabit: ConsistentHabitMetric | null = null;

  if (hasEnoughData && habitMetrics.length > 0) {
    mostConsistentHabit = habitMetrics[0];
    if (habitMetrics.length > 1) {
      const lowest = habitMetrics[habitMetrics.length - 1];
      // Only mark least consistent if it has room for improvement or differs
      if (lowest.percentage < mostConsistentHabit.percentage || lowest.percentage < 100) {
        leastConsistentHabit = lowest;
      }
    }
  }

  // 6. Strongest Day of the Week & Room for Improvement Day
  let strongestDay: DayOfWeekPerformance | null = null;
  let roomForImprovementDay: DayOfWeekPerformance | null = null;

  const validWeekdays: DayOfWeekPerformance[] = [];

  for (let dow = 0; dow < 7; dow++) {
    const stat = weekdayStats[dow];
    if (stat.daysCount > 0 && stat.total > 0) {
      const pct = Math.round((stat.completed / stat.total) * 100);
      validWeekdays.push({
        name: WEEKDAYS[dow],
        percentage: pct,
        completedSum: stat.completed,
        possibleSum: stat.total,
        daysEvaluated: stat.daysCount,
      });
    }
  }

  if (validWeekdays.length > 0) {
    validWeekdays.sort((a, b) => b.percentage - a.percentage);
    strongestDay = validWeekdays[0];
    if (validWeekdays.length > 1) {
      const lowest = validWeekdays[validWeekdays.length - 1];
      if (lowest.percentage < strongestDay.percentage) {
        roomForImprovementDay = lowest;
      }
    }
  }

  // 7. Automatic Truthful Insights
  const automaticInsights: string[] = [];

  if (isNewUser) {
    automaticInsights.push('Start completing your habits to unlock personalized intelligence and trends.');
  } else {
    // Trajectory insight
    if (weeklyHasEnoughData) {
      if (weeklyDiff > 0) {
        automaticInsights.push(`Your consistency improved this week (+${weeklyDiff}%).`);
      } else if (weeklyDiff < 0) {
        automaticInsights.push(`Your completion rate shifted by ${weeklyDiff}% this week. Keep building your routine.`);
      } else {
        automaticInsights.push(`Your completion rate has been steady at ${thisWeekPercentage}% this week.`);
      }
    }

    // Volume comparison
    if (weeklyHasEnoughData && thisWeekComp > prevWeekComp && prevWeekComp > 0) {
      automaticInsights.push(`You completed more habits this week (${thisWeekComp}) than last week (${prevWeekComp}).`);
    }

    // Consistency highlights
    if (mostConsistentHabit && mostConsistentHabit.completedDays > 0) {
      automaticInsights.push(`"${mostConsistentHabit.name}" was your most consistent habit (${mostConsistentHabit.percentage}%).`);
    }

    if (leastConsistentHabit && leastConsistentHabit.percentage < 80) {
      automaticInsights.push(`"${leastConsistentHabit.name}" could use a little more consistency (${leastConsistentHabit.percentage}%).`);
    }

    // Strongest day
    if (strongestDay && strongestDay.completedSum > 0) {
      automaticInsights.push(`Your strongest day is ${strongestDay.name} (${strongestDay.percentage}% average completion).`);
    }

    // Perfect days
    if (perfectDays > 0) {
      automaticInsights.push(`You have logged ${perfectDays} perfect ${perfectDays === 1 ? 'day' : 'days'} with 100% completion.`);
    }

    // Streaks
    if (currentStreak >= 3) {
      automaticInsights.push(`You are on a strong ${currentStreak}-day streak! Keep up the momentum.`);
    } else if (bestStreak > currentStreak && bestStreak >= 3) {
      automaticInsights.push(`Your all-time best streak is ${bestStreak} days.`);
    }
  }

  return {
    currentStreak,
    bestStreak,
    perfectDays,
    activeDays,
    totalCompletions,
    overallPercentage,
    weeklyComparison,
    monthlyComparison,
    mostConsistentHabit,
    leastConsistentHabit,
    strongestDay,
    roomForImprovementDay,
    automaticInsights,
    isNewUser,
    hasEnoughData,
  };
}
