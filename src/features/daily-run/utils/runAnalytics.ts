import { FirestoreRunDocument, LocalRunRecord } from '../types';

export type TimeFilterRange =
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'this_year'
  | 'all_time'
  | 'custom';

export interface RunningOverview {
  totalDistanceKm: number;
  totalRuns: number;
  totalDurationSeconds: number;
  averageDistanceKm: number;
  averagePaceMinPerKm: number | null;
  averageSpeedKmh: number | null;
  totalCalories: number;
  longestDistanceKm: number;
  longestDurationSeconds: number;
}

export interface PersonalRecord {
  type: 'longest_distance' | 'fastest_pace' | 'highest_speed' | 'longest_duration' | 'most_distance_day' | 'most_runs_day';
  title: string;
  valueFormatted: string;
  rawNumericValue: number;
  unit: string;
  date: string;
  runId?: string;
  notes?: string;
}

export interface StreakConsistency {
  currentStreakDays: number;
  longestStreakDays: number;
  activeDaysThisWeek: number;
  activeDaysThisMonth: number;
  totalRunningDays: number;
  weeklyConsistencyPercent: number;
}

export interface ProgressInsight {
  type: 'positive' | 'negative' | 'neutral' | 'info';
  title: string;
  detail: string;
}

export interface ChartDataPoint {
  label: string; // e.g., "Mon", "Oct 12", "Week 42"
  fullDate: string; // YYYY-MM-DD or identifier
  distanceKm: number;
  runsCount: number;
  durationMinutes: number;
  averagePaceMinPerKm: number | null;
}

/**
 * Returns a local date string in YYYY-MM-DD format for a timestamp/ISO string
 */
export function getLocalDateString(isoOrTimestamp: string | number | Date): string {
  const d = new Date(isoOrTimestamp);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Filters a list of completed runs by the selected time range using local date boundaries
 */
export function filterRunsByTimeRange(
  runs: (FirestoreRunDocument | LocalRunRecord)[],
  range: TimeFilterRange,
  customStart?: string,
  customEnd?: string
): (FirestoreRunDocument | LocalRunRecord)[] {
  if (!Array.isArray(runs) || runs.length === 0) return [];

  // Exclude invalid or uncompleted runs
  const validRuns = runs.filter(
    (r) => r && r.status === 'completed' && typeof r.distanceMeters === 'number'
  );

  if (range === 'all_time') {
    return validRuns;
  }

  const now = new Date();
  const todayLocal = getLocalDateString(now);

  if (range === 'custom') {
    if (!customStart && !customEnd) return validRuns;
    return validRuns.filter((r) => {
      const runDate = getLocalDateString(r.startedAt || r.createdAt);
      if (customStart && runDate < customStart) return false;
      if (customEnd && runDate > customEnd) return false;
      return true;
    });
  }

  if (range === 'this_week') {
    // Current week: from Monday to Sunday of the current week in local timezone
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0);
    const startStr = getLocalDateString(monday);

    return validRuns.filter((r) => {
      const runDate = getLocalDateString(r.startedAt || r.createdAt);
      return runDate >= startStr && runDate <= todayLocal;
    });
  }

  if (range === 'this_month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const startStr = getLocalDateString(monthStart);

    return validRuns.filter((r) => {
      const runDate = getLocalDateString(r.startedAt || r.createdAt);
      return runDate >= startStr && runDate <= todayLocal;
    });
  }

  if (range === 'last_30_days') {
    const past30 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
    const startStr = getLocalDateString(past30);

    return validRuns.filter((r) => {
      const runDate = getLocalDateString(r.startedAt || r.createdAt);
      return runDate >= startStr && runDate <= todayLocal;
    });
  }

  if (range === 'this_year') {
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const startStr = getLocalDateString(yearStart);

    return validRuns.filter((r) => {
      const runDate = getLocalDateString(r.startedAt || r.createdAt);
      return runDate >= startStr && runDate <= todayLocal;
    });
  }

  return validRuns;
}

/**
 * Calculates high-level summary overview metrics for a set of runs
 */
export function calculateRunningOverview(
  runs: (FirestoreRunDocument | LocalRunRecord)[]
): RunningOverview {
  if (!Array.isArray(runs) || runs.length === 0) {
    return {
      totalDistanceKm: 0,
      totalRuns: 0,
      totalDurationSeconds: 0,
      averageDistanceKm: 0,
      averagePaceMinPerKm: null,
      averageSpeedKmh: null,
      totalCalories: 0,
      longestDistanceKm: 0,
      longestDurationSeconds: 0,
    };
  }

  let totalMeters = 0;
  let totalDuration = 0;
  let totalCalories = 0;
  let longestMeters = 0;
  let longestDuration = 0;

  for (const r of runs) {
    const meters = Math.max(0, r.distanceMeters || 0);
    const duration = Math.max(0, r.durationSeconds || 0);
    const cals = Math.max(0, r.caloriesEstimate || 0);

    totalMeters += meters;
    totalDuration += duration;
    totalCalories += cals;

    if (meters > longestMeters) longestMeters = meters;
    if (duration > longestDuration) longestDuration = duration;
  }

  const totalRuns = runs.length;
  const totalDistanceKm = Number((totalMeters / 1000).toFixed(2));
  const averageDistanceKm = totalRuns > 0 ? Number((totalDistanceKm / totalRuns).toFixed(2)) : 0;

  let averagePaceMinPerKm: number | null = null;
  if (totalDistanceKm > 0 && totalDuration > 0) {
    const paceSeconds = totalDuration / totalDistanceKm;
    averagePaceMinPerKm = paceSeconds / 60;
  }

  let averageSpeedKmh: number | null = null;
  if (totalDistanceKm > 0 && totalDuration > 0) {
    const hours = totalDuration / 3600;
    averageSpeedKmh = Number((totalDistanceKm / hours).toFixed(2));
  }

  return {
    totalDistanceKm,
    totalRuns,
    totalDurationSeconds: totalDuration,
    averageDistanceKm,
    averagePaceMinPerKm,
    averageSpeedKmh,
    totalCalories,
    longestDistanceKm: Number((longestMeters / 1000).toFixed(2)),
    longestDurationSeconds: longestDuration,
  };
}

/**
 * Calculates personal records with strict validation to prevent misleading short GPS drift outliers
 * - Fastest Pace requires >= 1.0 km distance and pace between 2.5 min/km and 20.0 min/km
 * - Highest Speed requires >= 1.0 km distance and speed <= 25 km/h
 */
export function calculatePersonalRecords(
  runs: (FirestoreRunDocument | LocalRunRecord)[]
): PersonalRecord[] {
  if (!Array.isArray(runs) || runs.length === 0) return [];

  const records: PersonalRecord[] = [];

  // 1. Longest Distance
  let longestRun: (FirestoreRunDocument | LocalRunRecord) | null = null;
  // 2. Fastest Pace (min dist 1km)
  let fastestPaceRun: (FirestoreRunDocument | LocalRunRecord) | null = null;
  let minPaceSeconds = Infinity;
  // 3. Highest Speed (min dist 1km)
  let highestSpeedRun: (FirestoreRunDocument | LocalRunRecord) | null = null;
  let maxSpeed = 0;
  // 4. Longest Duration
  let longestDurationRun: (FirestoreRunDocument | LocalRunRecord) | null = null;

  // Day aggregations
  const dayDistanceMap = new Map<string, number>();
  const dayRunsCountMap = new Map<string, number>();

  for (const r of runs) {
    const distMeters = r.distanceMeters || 0;
    const duration = r.durationSeconds || 0;
    const dateStr = getLocalDateString(r.startedAt || r.createdAt);

    // Track daily totals
    dayDistanceMap.set(dateStr, (dayDistanceMap.get(dateStr) || 0) + distMeters);
    dayRunsCountMap.set(dateStr, (dayRunsCountMap.get(dateStr) || 0) + 1);

    // Longest Distance
    if (!longestRun || distMeters > (longestRun.distanceMeters || 0)) {
      if (distMeters > 0) {
        longestRun = r;
      }
    }

    // Longest Duration
    if (!longestDurationRun || duration > (longestDurationRun.durationSeconds || 0)) {
      if (duration > 0) {
        longestDurationRun = r;
      }
    }

    // Quality check for Pace and Speed records: Run must be at least 1,000 metres (1 km)
    // to filter out sub-minute GPS stationary drift anomalies
    if (distMeters >= 1000) {
      if (
        r.averagePaceSecondsPerKm != null &&
        r.averagePaceSecondsPerKm >= 150 && // faster than 2:30 min/km is unrealistic for human running
        r.averagePaceSecondsPerKm <= 1200 // slower than 20:00 min/km
      ) {
        if (r.averagePaceSecondsPerKm < minPaceSeconds) {
          minPaceSeconds = r.averagePaceSecondsPerKm;
          fastestPaceRun = r;
        }
      }

      if (
        r.averageSpeedKmh != null &&
        r.averageSpeedKmh > 0 &&
        r.averageSpeedKmh <= 25 // human running cap filter
      ) {
        if (r.averageSpeedKmh > maxSpeed) {
          maxSpeed = r.averageSpeedKmh;
          highestSpeedRun = r;
        }
      }
    }
  }

  if (longestRun && (longestRun.distanceMeters || 0) > 0) {
    const km = Number(((longestRun.distanceMeters || 0) / 1000).toFixed(2));
    records.push({
      type: 'longest_distance',
      title: 'Longest Distance',
      valueFormatted: `${km} km`,
      rawNumericValue: km,
      unit: 'km',
      date: getLocalDateString(longestRun.startedAt || longestRun.createdAt),
      runId: longestRun.runId,
    });
  }

  if (fastestPaceRun && minPaceSeconds < Infinity) {
    const mins = Math.floor(minPaceSeconds / 60);
    const secs = Math.round(minPaceSeconds % 60);
    const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    records.push({
      type: 'fastest_pace',
      title: 'Fastest Average Pace',
      valueFormatted: `${formatted} /km`,
      rawNumericValue: minPaceSeconds,
      unit: 'min/km',
      date: getLocalDateString(fastestPaceRun.startedAt || fastestPaceRun.createdAt),
      runId: fastestPaceRun.runId,
      notes: 'Min distance 1.0 km required',
    });
  }

  if (highestSpeedRun && maxSpeed > 0) {
    records.push({
      type: 'highest_speed',
      title: 'Highest Average Speed',
      valueFormatted: `${maxSpeed.toFixed(1)} km/h`,
      rawNumericValue: maxSpeed,
      unit: 'km/h',
      date: getLocalDateString(highestSpeedRun.startedAt || highestSpeedRun.createdAt),
      runId: highestSpeedRun.runId,
      notes: 'Min distance 1.0 km required',
    });
  }

  if (longestDurationRun && (longestDurationRun.durationSeconds || 0) > 0) {
    const totalSecs = longestDurationRun.durationSeconds || 0;
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const formatted =
      hours > 0
        ? `${hours}h ${mins}m ${secs}s`
        : `${mins}m ${secs}s`;

    records.push({
      type: 'longest_duration',
      title: 'Longest Duration',
      valueFormatted: formatted,
      rawNumericValue: totalSecs,
      unit: 'time',
      date: getLocalDateString(longestDurationRun.startedAt || longestDurationRun.createdAt),
      runId: longestDurationRun.runId,
    });
  }

  // Day records: Most distance in one day
  let bestDayDistance = 0;
  let bestDayDistanceDate = '';
  dayDistanceMap.forEach((dist, date) => {
    if (dist > bestDayDistance) {
      bestDayDistance = dist;
      bestDayDistanceDate = date;
    }
  });

  if (bestDayDistance > 0) {
    const km = Number((bestDayDistance / 1000).toFixed(2));
    records.push({
      type: 'most_distance_day',
      title: 'Most Distance in One Day',
      valueFormatted: `${km} km`,
      rawNumericValue: km,
      unit: 'km',
      date: bestDayDistanceDate,
    });
  }

  // Day records: Most runs in one day
  let maxRunsInDay = 0;
  let maxRunsDate = '';
  dayRunsCountMap.forEach((count, date) => {
    if (count > maxRunsInDay) {
      maxRunsInDay = count;
      maxRunsDate = date;
    }
  });

  if (maxRunsInDay > 1) {
    records.push({
      type: 'most_runs_day',
      title: 'Most Runs in One Day',
      valueFormatted: `${maxRunsInDay} runs`,
      rawNumericValue: maxRunsInDay,
      unit: 'runs',
      date: maxRunsDate,
    });
  }

  return records;
}

/**
 * Calculates streaks and weekly/monthly consistency from local calendar day sets
 */
export function calculateStreaksAndConsistency(
  runs: (FirestoreRunDocument | LocalRunRecord)[]
): StreakConsistency {
  if (!Array.isArray(runs) || runs.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      activeDaysThisWeek: 0,
      activeDaysThisMonth: 0,
      totalRunningDays: 0,
      weeklyConsistencyPercent: 0,
    };
  }

  // Set of unique YYYY-MM-DD local calendar dates
  const uniqueDates = new Set<string>();
  for (const r of runs) {
    if (r.status === 'completed') {
      const d = getLocalDateString(r.startedAt || r.createdAt);
      if (d) uniqueDates.add(d);
    }
  }

  const sortedDates = Array.from(uniqueDates).sort();
  const totalRunningDays = sortedDates.length;

  if (totalRunningDays === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
      activeDaysThisWeek: 0,
      activeDaysThisMonth: 0,
      totalRunningDays: 0,
      weeklyConsistencyPercent: 0,
    };
  }

  // Calculate Longest Streak
  let longestStreak = 1;
  let currentRunStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(`${sortedDates[i - 1]}T12:00:00`);
    const currDate = new Date(`${sortedDates[i]}T12:00:00`);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));

    if (diffDays === 1) {
      currentRunStreak++;
      if (currentRunStreak > longestStreak) {
        longestStreak = currentRunStreak;
      }
    } else {
      currentRunStreak = 1;
    }
  }

  // Calculate Current Streak
  // Current streak continues if the runner was active today OR yesterday
  const now = new Date();
  const todayStr = getLocalDateString(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);

  let activeStreak = 0;
  let checkDate = uniqueDates.has(todayStr) ? new Date(now) : uniqueDates.has(yesterdayStr) ? yesterdayDate : null;

  if (checkDate) {
    while (true) {
      const dateStr = getLocalDateString(checkDate);
      if (uniqueDates.has(dateStr)) {
        activeStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Active days this week (Monday to Sunday)
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
  const mondayStr = getLocalDateString(monday);

  let activeDaysThisWeek = 0;
  uniqueDates.forEach((d) => {
    if (d >= mondayStr && d <= todayStr) {
      activeDaysThisWeek++;
    }
  });

  // Active days this month
  const monthStartStr = `${todayStr.slice(0, 7)}-01`;
  let activeDaysThisMonth = 0;
  uniqueDates.forEach((d) => {
    if (d >= monthStartStr && d <= todayStr) {
      activeDaysThisMonth++;
    }
  });

  // Consistency: % of the last 4 weeks that had at least one completed run
  let weeksWithRun = 0;
  for (let w = 0; w < 4; w++) {
    const startWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w * 7 + 6));
    const endWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w * 7));
    const sStr = getLocalDateString(startWeek);
    const eStr = getLocalDateString(endWeek);

    const hasRunInWeek = sortedDates.some((d) => d >= sStr && d <= eStr);
    if (hasRunInWeek) weeksWithRun++;
  }

  const weeklyConsistencyPercent = Math.round((weeksWithRun / 4) * 100);

  return {
    currentStreakDays: activeStreak,
    longestStreakDays: Math.max(longestStreak, activeStreak),
    activeDaysThisWeek,
    activeDaysThisMonth,
    totalRunningDays,
    weeklyConsistencyPercent,
  };
}

/**
 * Generates insightful comparisons between current period and equivalent previous period
 */
export function calculateProgressInsights(
  allRuns: (FirestoreRunDocument | LocalRunRecord)[],
  currentRange: TimeFilterRange
): ProgressInsight[] {
  const insights: ProgressInsight[] = [];
  if (!allRuns || allRuns.length === 0) {
    insights.push({
      type: 'info',
      title: 'Ready for Your First Run',
      detail: 'Record your first run to unlock pacing trends, distance comparisons, and personal records.',
    });
    return insights;
  }

  const now = new Date();
  const validRuns = allRuns.filter((r) => r.status === 'completed');

  // Most active day of the week
  const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
  const dayDist = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const r of validRuns) {
    const d = new Date(r.startedAt || r.createdAt);
    if (!isNaN(d.getTime())) {
      const idx = d.getDay();
      dayCount[idx]++;
      dayDist[idx] += (r.distanceMeters || 0) / 1000;
    }
  }

  let maxDayIdx = 0;
  let maxDayRuns = 0;
  dayCount.forEach((cnt, idx) => {
    if (cnt > maxDayRuns) {
      maxDayRuns = cnt;
      maxDayIdx = idx;
    }
  });

  if (maxDayRuns > 0) {
    insights.push({
      type: 'positive',
      title: `Most Active on ${dayNames[maxDayIdx]}s`,
      detail: `You have completed ${maxDayRuns} run${maxDayRuns > 1 ? 's' : ''} covering ${dayDist[maxDayIdx].toFixed(1)} km on ${dayNames[maxDayIdx]}s.`,
    });
  }

  // Period comparison (e.g. Last 30 Days vs Prior 30 Days)
  if (currentRange === 'last_30_days' || currentRange === 'all_time' || currentRange === 'this_month') {
    const past30Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const prior30Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
    const prior30End = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

    const sPast30 = getLocalDateString(past30Start);
    const sPriorStart = getLocalDateString(prior30Start);
    const sPriorEnd = getLocalDateString(prior30End);

    const currentPeriodRuns = validRuns.filter((r) => {
      const d = getLocalDateString(r.startedAt || r.createdAt);
      return d >= sPast30;
    });

    const priorPeriodRuns = validRuns.filter((r) => {
      const d = getLocalDateString(r.startedAt || r.createdAt);
      return d >= sPriorStart && d <= sPriorEnd;
    });

    const currDistance = currentPeriodRuns.reduce((sum, r) => sum + (r.distanceMeters || 0) / 1000, 0);
    const priorDistance = priorPeriodRuns.reduce((sum, r) => sum + (r.distanceMeters || 0) / 1000, 0);

    if (priorDistance > 0) {
      const deltaKm = currDistance - priorDistance;
      const percent = Math.round((deltaKm / priorDistance) * 100);

      if (deltaKm >= 0) {
        insights.push({
          type: 'positive',
          title: `Volume Up +${percent}% vs Previous 30 Days`,
          detail: `You logged ${currDistance.toFixed(1)} km compared to ${priorDistance.toFixed(1)} km in the prior period (+${deltaKm.toFixed(1)} km).`,
        });
      } else {
        insights.push({
          type: 'neutral',
          title: `Volume ${percent}% vs Previous 30 Days`,
          detail: `Logged ${currDistance.toFixed(1)} km compared to ${priorDistance.toFixed(1)} km in the prior period.`,
        });
      }
    }
  }

  // Total Lifetime Milestone
  const totalKm = validRuns.reduce((s, r) => s + (r.distanceMeters || 0) / 1000, 0);
  if (totalKm >= 42.195) {
    insights.push({
      type: 'positive',
      title: 'Marathon Milestone Surpassed',
      detail: `Your cumulative distance of ${totalKm.toFixed(1)} km exceeds the distance of an official marathon (42.2 km)!`,
    });
  } else if (totalKm >= 10) {
    insights.push({
      type: 'info',
      title: 'Double-Digit Mileage',
      detail: `You have logged a total of ${totalKm.toFixed(1)} km across ${validRuns.length} runs. Keep the momentum going!`,
    });
  }

  return insights;
}

/**
 * Aggregates runs into chart data points across time
 */
export function groupRunsForChart(
  runs: (FirestoreRunDocument | LocalRunRecord)[],
  range: TimeFilterRange
): ChartDataPoint[] {
  if (!Array.isArray(runs) || runs.length === 0) return [];

  const validRuns = runs.filter((r) => r.status === 'completed');
  if (validRuns.length === 0) return [];

  const pointsMap = new Map<string, { label: string; distanceMeters: number; durationSeconds: number; count: number }>();
  const now = new Date();

  if (range === 'this_week') {
    // 7 Days: Mon to Sun
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dStr = getLocalDateString(d);
      pointsMap.set(dStr, {
        label: dayLabels[i],
        distanceMeters: 0,
        durationSeconds: 0,
        count: 0,
      });
    }

    validRuns.forEach((r) => {
      const dStr = getLocalDateString(r.startedAt || r.createdAt);
      if (pointsMap.has(dStr)) {
        const item = pointsMap.get(dStr)!;
        item.distanceMeters += r.distanceMeters || 0;
        item.durationSeconds += r.durationSeconds || 0;
        item.count += 1;
      }
    });
  } else if (range === 'this_month' || range === 'last_30_days') {
    // Group into 5-day intervals or weekly buckets
    const numDays = range === 'last_30_days' ? 30 : now.getDate();
    const start = range === 'last_30_days'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    // Group into 6 slices
    const bucketCount = 6;
    const daysPerBucket = Math.max(1, Math.ceil(numDays / bucketCount));

    for (let b = 0; b < bucketCount; b++) {
      const bStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + b * daysPerBucket);
      const bEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + Math.min(numDays - 1, (b + 1) * daysPerBucket - 1));
      if (bStart > now) break;

      const label = `${bStart.getDate()}/${bStart.getMonth() + 1}`;
      const key = `bucket_${b}`;
      pointsMap.set(key, {
        label,
        distanceMeters: 0,
        durationSeconds: 0,
        count: 0,
      });

      const sStr = getLocalDateString(bStart);
      const eStr = getLocalDateString(bEnd);

      validRuns.forEach((r) => {
        const dStr = getLocalDateString(r.startedAt || r.createdAt);
        if (dStr >= sStr && dStr <= eStr) {
          const item = pointsMap.get(key)!;
          item.distanceMeters += r.distanceMeters || 0;
          item.durationSeconds += r.durationSeconds || 0;
          item.count += 1;
        }
      });
    }
  } else {
    // Monthly aggregation for 'this_year' or 'all_time'
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Last 6 or 12 months
    const totalMonths = range === 'this_year' ? now.getMonth() + 1 : 12;
    const startMonth = range === 'this_year' ? 0 : (now.getMonth() + 1) % 12;
    const startYear = range === 'this_year' ? now.getFullYear() : (startMonth > now.getMonth() ? now.getFullYear() - 1 : now.getFullYear());

    for (let i = 0; i < totalMonths; i++) {
      const mDate = new Date(startYear, startMonth + i, 1);
      if (mDate > now) break;
      const key = `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}`;
      pointsMap.set(key, {
        label: monthNames[mDate.getMonth()],
        distanceMeters: 0,
        durationSeconds: 0,
        count: 0,
      });

      validRuns.forEach((r) => {
        const rDate = getLocalDateString(r.startedAt || r.createdAt);
        if (rDate.startsWith(key)) {
          const item = pointsMap.get(key)!;
          item.distanceMeters += r.distanceMeters || 0;
          item.durationSeconds += r.durationSeconds || 0;
          item.count += 1;
        }
      });
    }
  }

  const result: ChartDataPoint[] = [];
  pointsMap.forEach((val, key) => {
    const distKm = Number((val.distanceMeters / 1000).toFixed(2));
    const durMins = Math.round(val.durationSeconds / 60);
    const pace = distKm > 0 && val.durationSeconds > 0 ? (val.durationSeconds / distKm) / 60 : null;

    result.push({
      label: val.label,
      fullDate: key,
      distanceKm: distKm,
      runsCount: val.count,
      durationMinutes: durMins,
      averagePaceMinPerKm: pace,
    });
  });

  return result;
}
