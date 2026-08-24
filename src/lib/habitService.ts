import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebase';
import {
  DEFAULT_HABITS,
  HabitItem,
  DailyLogData,
  DayHistorySummary,
  StreakStats,
  UserProfile,
  AnalyticsStats,
  HabitConsistency,
} from '../types';
import {
  getLast7Days,
  getLastNDays,
  getPreviousDateString,
  getTodayDateString,
  formatWeekday,
} from './dateUtils';

export function countCompletedInMap(
  completedMap: Record<string, boolean>,
  activeHabitIds?: string[]
): number {
  if (activeHabitIds && activeHabitIds.length > 0) {
    return activeHabitIds.reduce((acc, id) => acc + (completedMap[id] ? 1 : 0), 0);
  }
  return Object.values(completedMap).filter(Boolean).length;
}

export function createDefaultDailyLog(
  date: string = getTodayDateString(),
  activeHabitsCount: number = DEFAULT_HABITS.length
): DailyLogData {
  return {
    date,
    completedHabits: {},
    completedCount: 0,
    totalActiveCount: activeHabitsCount,
  };
}

export async function syncUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  let displayName = user.displayName;

  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.displayName) {
        displayName = data.displayName;
      }
    }
  } catch (e) {
    console.error('Error reading existing profile:', e);
  }

  const profile: UserProfile = {
    uid: user.uid,
    displayName: displayName || user.displayName,
    email: user.email,
    photoURL: user.photoURL,
    lastLoginAt: new Date().toISOString(),
  };

  try {
    await setDoc(userRef, profile, { merge: true });
  } catch (error) {
    console.error('Error syncing user profile to Firestore:', error);
  }

  return profile;
}

export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { displayName, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Loads user habit settings from users/{userId}/habitSettings.
 * If none exist (new user), seeds the default 8 habits and returns them.
 */
export async function fetchUserHabitSettings(userId: string): Promise<HabitItem[]> {
  try {
    const habitSettingsCol = collection(db, 'users', userId, 'habitSettings');
    const q = query(habitSettingsCol, orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const habits: HabitItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Partial<HabitItem>;
        habits.push({
          id: docSnap.id,
          name: data.name || 'Untitled Habit',
          target: data.target || '',
          icon: data.icon || '',
          order: typeof data.order === 'number' ? data.order : habits.length,
          reminderEnabled: typeof data.reminderEnabled === 'boolean' ? data.reminderEnabled : false,
          reminderTime: data.reminderTime || '08:00',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      return habits.sort((a, b) => a.order - b.order);
    }

    // Seed default habits if no habits found
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const seededHabits: HabitItem[] = DEFAULT_HABITS.map((item, idx) => ({
      ...item,
      order: idx,
      createdAt: now,
      updatedAt: now,
    }));

    for (const item of seededHabits) {
      const itemRef = doc(db, 'users', userId, 'habitSettings', item.id);
      batch.set(itemRef, item);
    }

    await batch.commit();
    return seededHabits;
  } catch (error) {
    console.error('Error fetching habit settings:', error);
    return DEFAULT_HABITS;
  }
}

/**
 * Saves or updates a single habit setting.
 */
export async function saveHabitSetting(userId: string, habit: HabitItem): Promise<void> {
  const habitRef = doc(db, 'users', userId, 'habitSettings', habit.id);
  const payload: HabitItem = {
    ...habit,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(habitRef, payload, { merge: true });
}

/**
 * Deletes a habit from users/{userId}/habitSettings.
 * Does not remove historical completion logs so historical dates stay intact.
 */
export async function deleteHabitSetting(userId: string, habitId: string): Promise<void> {
  const habitRef = doc(db, 'users', userId, 'habitSettings', habitId);
  await deleteDoc(habitRef);
}

/**
 * Fetches daily habit completion logs for a specific date.
 * Checks users/{userId}/dailyLogs/{date} with fallback to users/{userId}/habits/{date}.
 */
export async function fetchDailyLog(
  userId: string,
  date: string,
  activeHabits: HabitItem[]
): Promise<DailyLogData> {
  const activeIds = activeHabits.map((h) => h.id);

  try {
    // 1. Try dailyLogs/{date}
    const logDocRef = doc(db, 'users', userId, 'dailyLogs', date);
    const logSnap = await getDoc(logDocRef);

    if (logSnap.exists()) {
      const data = logSnap.data();
      const completedHabits: Record<string, boolean> = data.completedHabits || {};
      const completedCount = countCompletedInMap(completedHabits, activeIds);
      return {
        date,
        completedHabits,
        completedCount,
        totalActiveCount: activeHabits.length,
        updatedAt: data.updatedAt,
      };
    }

    // 2. Fallback to legacy habits/{date} if existed
    const legacyDocRef = doc(db, 'users', userId, 'habits', date);
    const legacySnap = await getDoc(legacyDocRef);
    if (legacySnap.exists()) {
      const legacyData = legacySnap.data() as Record<string, any>;
      const completedHabits: Record<string, boolean> = {};

      ['wakeUp', 'water', 'gym', 'breakfast', 'lunch', 'dinner', 'reading', 'sleep'].forEach(
        (k) => {
          if (legacyData[k]) {
            completedHabits[k] = true;
          }
        }
      );

      const completedCount = countCompletedInMap(completedHabits, activeIds);
      return {
        date,
        completedHabits,
        completedCount,
        totalActiveCount: activeHabits.length,
        updatedAt: legacyData.updatedAt,
      };
    }
  } catch (error) {
    console.error(`Error fetching daily log for ${date}:`, error);
  }

  return createDefaultDailyLog(date, activeHabits.length);
}

/**
 * Saves the daily completion log to Firestore.
 */
export async function saveDailyLog(userId: string, log: DailyLogData): Promise<void> {
  const payload = {
    date: log.date,
    completedHabits: log.completedHabits,
    completedCount: log.completedCount,
    totalActiveCount: log.totalActiveCount,
    updatedAt: new Date().toISOString(),
  };

  const logDocRef = doc(db, 'users', userId, 'dailyLogs', log.date);
  await setDoc(logDocRef, payload, { merge: true });
}

/**
 * Calculates current streak and best streak from daily completion records.
 */
export function calculateStreaks(
  historyMap: Record<string, { completed: number; total: number }>,
  todayDate: string
): StreakStats {
  const isCompleted = (dateStr: string): boolean => {
    const record = historyMap[dateStr];
    return !!record && record.total > 0 && record.completed >= record.total;
  };

  // 1. Calculate Current Streak
  let currentStreak = 0;
  const todayDone = isCompleted(todayDate);

  if (todayDone) {
    currentStreak = 1;
    let checkDate = getPreviousDateString(todayDate);
    while (isCompleted(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
    // Today is in progress; check if streak is unbroken ending yesterday
    let checkDate = getPreviousDateString(todayDate);
    while (isCompleted(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  }

  // 2. Calculate Best Streak across all completed dates in history
  const allDates = Object.keys(historyMap)
    .filter((d) => isCompleted(d))
    .sort(); // Ascending 'YYYY-MM-DD'

  let bestStreak = 0;

  if (allDates.length > 0) {
    let tempStreak = 1;
    bestStreak = 1;

    for (let i = 1; i < allDates.length; i++) {
      const prevDate = allDates[i - 1];
      const currDate = allDates[i];
      const expectedPrev = getPreviousDateString(currDate);

      if (prevDate === expectedPrev) {
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
 * Calculates comprehensive analytics from full history and habits.
 */
export function calculateAnalytics(
  allRawLogs: Array<{ date: string; completedHabits: Record<string, boolean>; completedCount: number; totalActiveCount: number }>,
  habits: HabitItem[],
  todayDate: string,
  streaks: StreakStats
): AnalyticsStats {
  const activeIds = habits.map((h) => h.id);
  const totalActive = habits.length;

  // Map of date -> log
  const logByDate: Record<string, { completedHabits: Record<string, boolean>; completedCount: number; totalActiveCount: number }> = {};
  allRawLogs.forEach((log) => {
    logByDate[log.date] = log;
  });

  // 1. Today %
  const todayLog = logByDate[todayDate];
  const todayCompleted = todayLog ? countCompletedInMap(todayLog.completedHabits, activeIds) : 0;
  const todayPercentage = totalActive > 0 ? Math.round((todayCompleted / totalActive) * 100) : 0;

  // 2. 7-Day Completion % and 7-day breakdown (Day 0 to -6)
  const last7Days = getLast7Days(todayDate);
  let sumCompleted7 = 0;
  let sumTotal7 = 0;
  const sevenDayBreakdown = last7Days.map((date) => {
    const log = logByDate[date];
    const comp = log ? countCompletedInMap(log.completedHabits, activeIds) : 0;
    const tot = log && log.totalActiveCount > 0 ? log.totalActiveCount : totalActive;
    sumCompleted7 += comp;
    sumTotal7 += tot;
    const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
    return {
      date,
      weekday: formatWeekday(date),
      percentage: pct,
      completedCount: comp,
      totalCount: tot,
    };
  });
  const last7DaysPercentage = sumTotal7 > 0 ? Math.round((sumCompleted7 / sumTotal7) * 100) : 0;

  // 3. Previous 7-Day Comparison (Day -7 to -13)
  const prev7Days = getLastNDays(14, todayDate).slice(0, 7); // Days -13 to -7
  let sumCompletedPrev7 = 0;
  let sumTotalPrev7 = 0;
  prev7Days.forEach((date) => {
    const log = logByDate[date];
    const comp = log ? countCompletedInMap(log.completedHabits, activeIds) : 0;
    const tot = log && log.totalActiveCount > 0 ? log.totalActiveCount : totalActive;
    sumCompletedPrev7 += comp;
    sumTotalPrev7 += tot;
  });
  const prev7DaysPercentage = sumTotalPrev7 > 0 ? Math.round((sumCompletedPrev7 / sumTotalPrev7) * 100) : 0;
  const weeklyImprovement = last7DaysPercentage - prev7DaysPercentage;

  const weeklyComparison = {
    thisWeekPercentage: last7DaysPercentage,
    lastWeekPercentage: prev7DaysPercentage,
    improvement: weeklyImprovement,
  };

  // 4. 30-Day Completion % & Detailed 30-Day Summary
  const last30Days = getLastNDays(30, todayDate);
  let sumCompleted30 = 0;
  let sumTotal30 = 0;
  let completedDaysCount = 0;
  let partialDaysCount = 0;
  let noActivityDaysCount = 0;

  last30Days.forEach((date) => {
    const log = logByDate[date];
    const comp = log ? countCompletedInMap(log.completedHabits, activeIds) : 0;
    const tot = log && log.totalActiveCount > 0 ? log.totalActiveCount : totalActive;
    sumCompleted30 += comp;
    sumTotal30 += tot;

    if (tot > 0 && comp >= tot) {
      completedDaysCount++;
    } else if (comp > 0) {
      partialDaysCount++;
    } else {
      noActivityDaysCount++;
    }
  });

  const last30DaysPercentage = sumTotal30 > 0 ? Math.round((sumCompleted30 / sumTotal30) * 100) : 0;
  const totalIncompleteHabits30 = Math.max(0, sumTotal30 - sumCompleted30);

  const thirtyDaySummary = {
    averagePercentage: last30DaysPercentage,
    completedDays: completedDaysCount,
    partialDays: partialDaysCount,
    noActivityDays: noActivityDaysCount,
    totalCompletedHabits: sumCompleted30,
    totalIncompleteHabits: totalIncompleteHabits30,
  };

  // 5. Total Completed Habits across all historical records
  let totalCompletedHabits = 0;
  allRawLogs.forEach((log) => {
    Object.entries(log.completedHabits).forEach(([_, val]) => {
      if (val) totalCompletedHabits++;
    });
  });

  // 6. Habit Performance - calculate percentage respecting each habit's creation date
  const habitBreakdown: HabitConsistency[] = habits.map((h) => {
    // Determine creation date if available (e.g. "2026-08-20")
    let creationDateStr = '2000-01-01';
    if (h.createdAt) {
      try {
        creationDateStr = h.createdAt.substring(0, 10);
      } catch {
        creationDateStr = '2000-01-01';
      }
    }

    // Evaluate days since creation within the 30-day window (or logged dates)
    const eligibleDates = last30Days.filter((d) => d >= creationDateStr && d <= todayDate);
    const totalEligible = eligibleDates.length > 0 ? eligibleDates.length : 1;

    let completedDays = 0;
    eligibleDates.forEach((d) => {
      const log = logByDate[d];
      if (log && log.completedHabits && log.completedHabits[h.id]) {
        completedDays++;
      }
    });

    const pct = Math.round((completedDays / totalEligible) * 100);

    return {
      habitId: h.id,
      name: h.name,
      target: h.target,
      icon: h.icon,
      completedDays,
      totalLoggedDays: totalEligible,
      percentage: pct,
    };
  });

  // Sort habit breakdown by percentage descending
  const sortedByConsistency = [...habitBreakdown].sort((a, b) => b.percentage - a.percentage);

  // Check if user has sufficient history (e.g. at least 3 distinct days with logged progress or 3 total logs)
  const distinctLoggedDaysWithActivity = allRawLogs.filter((l) => l.completedCount > 0).length;
  const hasEnoughData = allRawLogs.length >= 3 || distinctLoggedDaysWithActivity >= 2;

  const mostConsistentHabit = hasEnoughData && sortedByConsistency.length > 0 ? sortedByConsistency[0] : null;
  const leastCompletedHabit = hasEnoughData && sortedByConsistency.length > 0 ? sortedByConsistency[sortedByConsistency.length - 1] : null;

  return {
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
    todayPercentage,
    last7DaysPercentage,
    last30DaysPercentage,
    sevenDayBreakdown,
    thirtyDaySummary,
    weeklyComparison,
    totalCompletedHabits,
    mostConsistentHabit,
    leastCompletedHabit,
    habitBreakdown: sortedByConsistency,
    totalLoggedDays: allRawLogs.length,
    hasEnoughData,
  };
}

/**
 * Fetches history summaries, streaks and analytics from Firestore.
 */
export async function fetchHabitHistoryAndStreaks(
  userId: string,
  todayDate: string,
  habits: HabitItem[]
): Promise<{
  history7Days: DayHistorySummary[];
  historyMap: Record<string, { completed: number; total: number }>;
  rawLogsMap: Record<string, DailyLogData>;
  streaks: StreakStats;
  analytics: AnalyticsStats;
}> {
  const historyMap: Record<string, { completed: number; total: number }> = {};
  const rawLogsMap: Record<string, DailyLogData> = {};
  const activeIds = habits.map((h) => h.id);
  const totalHabitsCount = habits.length;

  const rawLogs: Array<{
    date: string;
    completedHabits: Record<string, boolean>;
    completedCount: number;
    totalActiveCount: number;
  }> = [];

  // 1. Fetch from dailyLogs
  try {
    const logsCol = collection(db, 'users', userId, 'dailyLogs');
    const q = query(logsCol, orderBy('date', 'desc'), limit(150));
    const snapshot = await getDocs(q);

    snapshot.forEach((d) => {
      const dData = d.data();
      const dDate = d.id;
      const completedHabits = dData.completedHabits || {};
      const completed = typeof dData.completedCount === 'number'
        ? dData.completedCount
        : countCompletedInMap(completedHabits, activeIds);
      const total = typeof dData.totalActiveCount === 'number' && dData.totalActiveCount > 0
        ? dData.totalActiveCount
        : totalHabitsCount;

      historyMap[dDate] = { completed, total };
      rawLogsMap[dDate] = {
        date: dDate,
        completedHabits,
        completedCount: completed,
        totalActiveCount: total,
      };
      rawLogs.push({
        date: dDate,
        completedHabits,
        completedCount: completed,
        totalActiveCount: total,
      });
    });
  } catch (error) {
    console.error('Error fetching dailyLogs history:', error);
  }

  // 2. Fetch from legacy habits if any
  try {
    const legacyCol = collection(db, 'users', userId, 'habits');
    const qLegacy = query(legacyCol, orderBy('date', 'desc'), limit(150));
    const legacySnapshot = await getDocs(qLegacy);

    legacySnapshot.forEach((d) => {
      const dDate = d.id;
      if (!historyMap[dDate]) {
        const dData = d.data();
        const completedHabits: Record<string, boolean> = {};
        ['wakeUp', 'water', 'gym', 'breakfast', 'lunch', 'dinner', 'reading', 'sleep'].forEach(
          (k) => {
            if (dData[k]) completedHabits[k] = true;
          }
        );
        const completed = countCompletedInMap(completedHabits, activeIds);
        const total = totalHabitsCount || 8;
        historyMap[dDate] = { completed, total };
        rawLogsMap[dDate] = {
          date: dDate,
          completedHabits,
          completedCount: completed,
          totalActiveCount: total,
        };
        rawLogs.push({
          date: dDate,
          completedHabits,
          completedCount: completed,
          totalActiveCount: total,
        });
      }
    });
  } catch (error) {
    console.error('Error fetching legacy habits history:', error);
  }

  // 3. Compute Streaks
  const streaks = calculateStreaks(historyMap, todayDate);

  // 4. Generate 7-Day History
  const last7Dates = getLast7Days(todayDate);
  const history7Days: DayHistorySummary[] = last7Dates.map((date) => {
    const record = historyMap[date];
    const completedCount = record ? record.completed : 0;
    const totalCount = record ? record.total : totalHabitsCount;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isCompleted = totalCount > 0 && completedCount >= totalCount;

    return {
      date,
      weekday: formatWeekday(date),
      completedCount,
      totalCount,
      percentage,
      isCompleted,
    };
  });

  // 5. Compute Full Analytics
  const analytics = calculateAnalytics(rawLogs, habits, todayDate, streaks);

  return {
    history7Days,
    historyMap,
    rawLogsMap,
    streaks,
    analytics,
  };
}
