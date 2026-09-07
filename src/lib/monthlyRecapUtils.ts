import { HabitItem, DailyLogData, MonthlyRecapData, MonthlyHabitPerformance } from '../types';
import { getLocalDateKey, formatMonthYear } from './dateUtils';
import { countCompletedInMap } from './habitService';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculates accurate Monthly Recap statistics strictly from user's actual Firestore daily logs.
 */
export function calculateMonthlyRecap(
  year: number,
  monthIndex: number, // 0-indexed (0 = Jan, 8 = Sep, 11 = Dec)
  rawLogsMap: Record<string, DailyLogData> = {},
  habits: HabitItem[] = [],
  todayDate: string = getLocalDateKey()
): MonthlyRecapData {
  const safeHabits = Array.isArray(habits) ? habits : [];
  const activeHabitIds = safeHabits.map((h) => h.id);
  const totalHabitsCount = safeHabits.length;

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const monthName = formatMonthYear(year, monthIndex);

  let totalCompletedHabits = 0;
  let totalPossibleHabits = 0;
  let daysActive = 0;
  let perfectDays = 0;
  let bestStreakDuringMonth = 0;
  let currentConsecutivePerfect = 0;

  // Track habit completions across the month
  const habitCompletionCounts: Record<string, number> = {};
  safeHabits.forEach((h) => {
    habitCompletionCounts[h.id] = 0;
  });

  // Track weekday performance for "strongest day"
  const weekdayTotals: Record<number, { completedSum: number; possibleSum: number; daysCount: number }> = {
    0: { completedSum: 0, possibleSum: 0, daysCount: 0 },
    1: { completedSum: 0, possibleSum: 0, daysCount: 0 },
    2: { completedSum: 0, possibleSum: 0, daysCount: 0 },
    3: { completedSum: 0, possibleSum: 0, daysCount: 0 },
    4: { completedSum: 0, possibleSum: 0, daysCount: 0 },
    5: { completedSum: 0, possibleSum: 0, daysCount: 0 },
    6: { completedSum: 0, possibleSum: 0, daysCount: 0 },
  };

  let eligibleDaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    // Do not count future calendar days towards completion rate
    if (dateKey > todayDate) {
      continue;
    }

    eligibleDaysCount++;
    const log = rawLogsMap[dateKey];
    const compCount = log
      ? typeof log.completedCount === 'number'
        ? log.completedCount
        : countCompletedInMap(log.completedHabits || {}, activeHabitIds)
      : 0;

    const totCount = log && typeof log.totalActiveCount === 'number' && log.totalActiveCount > 0
      ? log.totalActiveCount
      : totalHabitsCount;

    totalCompletedHabits += compCount;
    totalPossibleHabits += totCount;

    if (compCount > 0) {
      daysActive++;
    }

    const isPerfect = totCount > 0 && compCount >= totCount;
    if (isPerfect) {
      perfectDays++;
      currentConsecutivePerfect++;
      if (currentConsecutivePerfect > bestStreakDuringMonth) {
        bestStreakDuringMonth = currentConsecutivePerfect;
      }
    } else {
      currentConsecutivePerfect = 0;
    }

    // Accumulate habit counts
    if (log && log.completedHabits) {
      safeHabits.forEach((h) => {
        if (log.completedHabits[h.id]) {
          habitCompletionCounts[h.id] = (habitCompletionCounts[h.id] || 0) + 1;
        }
      });
    }

    // Accumulate weekday stats
    const dateObj = new Date(year, monthIndex, day);
    const dayOfWeek = dateObj.getDay();
    if (totCount > 0) {
      weekdayTotals[dayOfWeek].completedSum += compCount;
      weekdayTotals[dayOfWeek].possibleSum += totCount;
      weekdayTotals[dayOfWeek].daysCount += 1;
    }
  }

  const completionPercentage = totalPossibleHabits > 0
    ? Math.round((totalCompletedHabits / totalPossibleHabits) * 100)
    : 0;

  // Build habit performance list
  const habitPerformanceList: MonthlyHabitPerformance[] = safeHabits.map((h) => {
    const comp = habitCompletionCounts[h.id] || 0;
    const pct = eligibleDaysCount > 0 ? Math.round((comp / eligibleDaysCount) * 100) : 0;
    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      target: h.target,
      completedCount: comp,
      eligibleDays: eligibleDaysCount,
      percentage: pct,
    };
  });

  // Sort by completedCount descending
  habitPerformanceList.sort((a, b) => b.completedCount - a.completedCount);

  const hasCompletions = totalCompletedHabits > 0;
  const mostCompletedHabit = hasCompletions && habitPerformanceList.length > 0 ? habitPerformanceList[0] : null;
  const leastCompletedHabit = hasCompletions && habitPerformanceList.length > 1
    ? habitPerformanceList[habitPerformanceList.length - 1]
    : null;

  // Previous Month calculation for comparison
  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevMonthName = formatMonthYear(prevYear, prevMonthIndex);
  const prevDaysInMonth = new Date(prevYear, prevMonthIndex + 1, 0).getDate();

  let prevCompletedHabits = 0;
  let prevPossibleHabits = 0;
  let prevHasData = false;

  for (let day = 1; day <= prevDaysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(prevMonthIndex + 1).padStart(2, '0');
    const prevDateKey = `${prevYear}-${monthStr}-${dayStr}`;

    if (prevDateKey > todayDate) continue;

    const log = rawLogsMap[prevDateKey];
    if (log) {
      prevHasData = true;
      const comp = typeof log.completedCount === 'number'
        ? log.completedCount
        : countCompletedInMap(log.completedHabits || {}, activeHabitIds);
      const tot = log.totalActiveCount && log.totalActiveCount > 0 ? log.totalActiveCount : totalHabitsCount;
      prevCompletedHabits += comp;
      prevPossibleHabits += tot;
    } else {
      prevPossibleHabits += totalHabitsCount;
    }
  }

  let previousMonthComparison: MonthlyRecapData['previousMonthComparison'] | undefined;
  if (prevHasData && prevPossibleHabits > 0) {
    const prevPercentage = Math.round((prevCompletedHabits / prevPossibleHabits) * 100);
    const difference = completionPercentage - prevPercentage;
    previousMonthComparison = {
      prevMonthName,
      prevPercentage,
      difference,
    };
  }

  // Find strongest weekday
  let strongestWeekdayIndex: number | null = null;
  let highestWeekdayPct = -1;

  for (let i = 0; i < 7; i++) {
    const stat = weekdayTotals[i];
    if (stat.daysCount > 0 && stat.possibleSum > 0 && stat.completedSum > 0) {
      const pct = stat.completedSum / stat.possibleSum;
      if (pct > highestWeekdayPct) {
        highestWeekdayPct = pct;
        strongestWeekdayIndex = i;
      }
    }
  }

  // Generate truthful Monthly Insights
  const hasEnoughData = daysActive >= 2 && totalCompletedHabits > 0;
  const insights: string[] = [];

  if (!hasEnoughData) {
    insights.push('Complete more habits to unlock insights.');
  } else {
    // 1. Consistency insight
    if (mostCompletedHabit && mostCompletedHabit.completedCount > 0) {
      insights.push(`Your most consistent habit this month was ${mostCompletedHabit.name}.`);
    }

    // 2. Improvement vs previous month insight
    if (previousMonthComparison) {
      if (previousMonthComparison.difference > 0) {
        insights.push(`You improved your completion rate by ${previousMonthComparison.difference}% compared with last month.`);
      } else if (previousMonthComparison.difference < 0) {
        insights.push(`Your completion rate shifted by ${previousMonthComparison.difference}% compared with last month.`);
      } else {
        insights.push(`Your completion rate matched last month at ${completionPercentage}%.`);
      }
    }

    // 3. Strongest day insight
    if (strongestWeekdayIndex !== null) {
      const dayName = WEEKDAYS[strongestWeekdayIndex];
      insights.push(`Your strongest day was ${dayName}.`);
    }

    // 4. Least consistent habit supportive insight
    if (leastCompletedHabit && leastCompletedHabit.percentage < 75 && leastCompletedHabit.percentage < (mostCompletedHabit?.percentage || 100)) {
      insights.push(`"${leastCompletedHabit.name}" could use a little more consistency this month.`);
    }

    // 5. Perfect days highlight
    if (perfectDays > 0) {
      insights.push(`You logged ${perfectDays} perfect ${perfectDays === 1 ? 'day' : 'days'} with 100% completion.`);
    }
  }

  return {
    year,
    monthIndex,
    monthName,
    completionPercentage,
    totalCompletedHabits,
    totalPossibleHabits,
    daysActive,
    perfectDays,
    bestStreakDuringMonth,
    mostCompletedHabit,
    leastCompletedHabit,
    habitPerformanceList,
    previousMonthComparison,
    insights,
    hasEnoughData,
  };
}

/**
 * Returns whether navigating to next month is allowed (prevent future month navigation if no data).
 */
export function canNavigateToNextMonth(
  currentYear: number,
  currentMonthIndex: number,
  todayDate: string,
  rawLogsMap: Record<string, DailyLogData> = {}
): boolean {
  const [todayYear, todayMonth] = todayDate.split('-').map(Number);
  const nextMonthIndex = currentMonthIndex === 11 ? 0 : currentMonthIndex + 1;
  const nextYear = currentMonthIndex === 11 ? currentYear + 1 : currentYear;

  // If next month is strictly in the future relative to today's year & month:
  if (nextYear > todayYear || (nextYear === todayYear && nextMonthIndex > (todayMonth - 1))) {
    // Check if there are any logged entries in next month
    const nextMonthPrefix = `${nextYear}-${String(nextMonthIndex + 1).padStart(2, '0')}`;
    const hasData = Object.keys(rawLogsMap).some((k) => k.startsWith(nextMonthPrefix));
    return hasData;
  }

  return true;
}

/**
 * Categorizes a day's completion percentage into standard heatmap bands:
 * 100% -> Fully completed
 * 75%  -> Mostly completed (>= 70%)
 * 50%  -> Partially completed (>= 35%)
 * 0%   -> No completion
 */
export function getCompletionBand(percentage: number): 'full' | 'mostly' | 'partial' | 'none' {
  if (percentage >= 100) return 'full';
  if (percentage >= 70) return 'mostly';
  if (percentage >= 30) return 'partial';
  return 'none';
}
