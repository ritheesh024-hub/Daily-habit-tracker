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
  getLocalDateKey,
  formatWeekday,
} from './dateUtils';
import {
  getCachedHabits,
  setCachedHabits,
  getCachedDailyLog,
  setCachedDailyLog,
  getCachedHistoryBundle,
  setCachedHistoryBundle,
  getCachedUserProfile,
  setCachedUserProfile,
} from './cacheService';

export { getLocalDateKey };

export function countCompletedInMap(
  completedMap: Record<string, boolean>,
  activeHabitIds?: string[]
): number {
  if (activeHabitIds && activeHabitIds.length > 0) {
    return activeHabitIds.reduce((acc, id) => acc + (completedMap[id] ? 1 : 0), 0);
  }
  return Object.values(completedMap || {}).filter(Boolean).length;
}

export function calculateDailyProgress(
  completedHabits: Record<string, boolean>,
  activeHabitIds: string[] = []
): { completedCount: number; totalCount: number; percentage: number; isCompleted: boolean } {
  const completedCount = countCompletedInMap(completedHabits, activeHabitIds);
  const totalCount = activeHabitIds.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isCompleted = totalCount > 0 && completedCount >= totalCount;
  return { completedCount, totalCount, percentage, isCompleted };
}

export function createDefaultDailyLog(
  dateInput: string = getTodayDateString(),
  activeHabitsCount: number = DEFAULT_HABITS.length
): DailyLogData {
  const date = getLocalDateKey(dateInput);
  return {
    date,
    completedHabits: {},
    completedCount: 0,
    totalActiveCount: activeHabitsCount,
  };
}

export async function syncUserProfile(user: User): Promise<UserProfile> {
  const now = new Date().toISOString();
  const profile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || 'User',
    email: user.email || null,
    photoURL: user.photoURL || null,
    lastLoginAt: now,
  };

  // Cache immediately under user's UID
  setCachedUserProfile(profile);

  // Background sync to users/{uid}
  const userRef = doc(db, 'users', user.uid);
  try {
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.displayName) {
        profile.displayName = data.displayName;
        setCachedUserProfile(profile);
      }
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: profile.displayName || 'User',
          email: user.email || null,
          photoURL: user.photoURL || null,
          lastLoginAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    } else {
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: profile.displayName || 'User',
          email: user.email || null,
          photoURL: user.photoURL || null,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
          settings: {
            theme: 'light',
            dailyResetHour: 0,
          },
        },
        { merge: true }
      );
    }
  } catch (e: any) {
    console.warn('Profile sync notice:', e);
  }

  return profile;
}

export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  const cached = getCachedUserProfile(userId);
  if (cached) {
    cached.displayName = displayName;
    setCachedUserProfile(cached);
  }
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { displayName, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn('Update user profile notice (cached locally):', error);
  }
}

/**
 * Loads user habit settings from users/{userId}/habitSettings.
 * Uses local cache first for instant loading, then updates in background.
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
          icon: data.icon || 'check',
          order: typeof data.order === 'number' ? data.order : habits.length,
          reminderEnabled: typeof data.reminderEnabled === 'boolean' ? data.reminderEnabled : false,
          reminderTime: data.reminderTime || '08:00',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      const sorted = habits.sort((a, b) => a.order - b.order);
      setCachedHabits(userId, sorted);
      return sorted;
    }

    // Seed default habits if no habits found for this user
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    const seededHabits: HabitItem[] = DEFAULT_HABITS.map((item, idx) => ({
      id: item.id,
      name: item.name,
      target: item.target || '',
      icon: item.icon || 'check',
      order: idx,
      reminderEnabled: typeof item.reminderEnabled === 'boolean' ? item.reminderEnabled : false,
      reminderTime: item.reminderTime || '08:00',
      createdAt: now,
      updatedAt: now,
    }));

    for (const item of seededHabits) {
      const itemRef = doc(db, 'users', userId, 'habitSettings', item.id);
      batch.set(itemRef, item);

      // Also seed reminder settings subcollection
      const reminderRef = doc(db, 'users', userId, 'reminderSettings', item.id);
      batch.set(reminderRef, {
        habitId: item.id,
        reminderEnabled: !!item.reminderEnabled,
        reminderTime: item.reminderTime || '08:00',
        updatedAt: now,
      });
    }

    await batch.commit();
    setCachedHabits(userId, seededHabits);
    return seededHabits;
  } catch (error) {
    console.warn('Error fetching habit settings from network, using cached:', error);
    return getCachedHabits(userId);
  }
}

/**
 * Saves or updates a single habit setting and its reminder settings document.
 */
export async function saveHabitSetting(userId: string, habit: HabitItem): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    id: habit.id,
    name: habit.name,
    target: habit.target || '',
    icon: habit.icon || 'check',
    order: typeof habit.order === 'number' ? habit.order : 0,
    reminderEnabled: typeof habit.reminderEnabled === 'boolean' ? habit.reminderEnabled : false,
    reminderTime: habit.reminderTime || '08:00',
    createdAt: habit.createdAt || now,
    updatedAt: now,
  };

  try {
    const habitRef = doc(db, 'users', userId, 'habitSettings', habit.id);
    await setDoc(habitRef, payload, { merge: true });
  } catch (error) {
    console.warn('Save habit setting notice:', error);
  }

  // Sync to reminderSettings subcollection
  try {
    const reminderRef = doc(db, 'users', userId, 'reminderSettings', habit.id);
    await setDoc(
      reminderRef,
      {
        habitId: habit.id,
        reminderEnabled: typeof habit.reminderEnabled === 'boolean' ? habit.reminderEnabled : false,
        reminderTime: habit.reminderTime || '08:00',
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (reminderErr) {
    console.warn('Reminder sync notice:', reminderErr);
  }
}

/**
 * Deletes a habit from users/{userId}/habitSettings and users/{userId}/reminderSettings.
 */
export async function deleteHabitSetting(userId: string, habitId: string): Promise<void> {
  try {
    const habitRef = doc(db, 'users', userId, 'habitSettings', habitId);
    await deleteDoc(habitRef);
  } catch (error) {
    console.warn('Delete habit setting notice:', error);
  }

  try {
    const reminderRef = doc(db, 'users', userId, 'reminderSettings', habitId);
    await deleteDoc(reminderRef);
  } catch (reminderErr) {
    console.warn('Reminder delete notice:', reminderErr);
  }
}

/**
 * Fetches daily habit completion logs for a specific date.
 * Uses local cache first if available to save bandwidth.
 */
export async function fetchDailyLog(
  userId: string,
  dateInput: string,
  activeHabits: HabitItem[] = []
): Promise<DailyLogData> {
  const date = getLocalDateKey(dateInput);
  const activeIds = activeHabits.map((h) => h.id);

  // Check local cache first
  const cached = getCachedDailyLog(userId, date);
  if (cached) {
    const progress = calculateDailyProgress(cached.completedHabits || {}, activeIds);
    const updated = {
      ...cached,
      date,
      completedCount: progress.completedCount,
      totalActiveCount: activeHabits.length,
    };
    return updated;
  }

  try {
    const logDocRef = doc(db, 'users', userId, 'dailyLogs', date);
    const logSnap = await getDoc(logDocRef);

    if (logSnap.exists()) {
      const data = logSnap.data();
      const completedHabits: Record<string, boolean> = data.completedHabits || {};
      const progress = calculateDailyProgress(completedHabits, activeIds);
      const logData: DailyLogData = {
        date,
        completedHabits,
        completedCount: progress.completedCount,
        totalActiveCount: activeHabits.length,
        updatedAt: data.updatedAt,
      };
      setCachedDailyLog(userId, date, logData);
      return logData;
    }
  } catch (error) {
    console.warn(`Error fetching daily log for ${date}:`, error);
  }

  const fallback = createDefaultDailyLog(date, activeHabits.length);
  setCachedDailyLog(userId, date, fallback);
  return fallback;
}

export const getDailyLog = fetchDailyLog;

/**
 * Saves the daily completion log to Firestore and local storage cache.
 * Fully date-isolated: guarantees writes target only users/{userId}/dailyLogs/{date}.
 */
export async function saveDailyLog(
  userId: string,
  dateOrLog: string | DailyLogData,
  maybeLog?: DailyLogData
): Promise<void> {
  if (!userId) return;

  let date: string;
  let log: DailyLogData;

  if (typeof dateOrLog === 'string' && maybeLog) {
    date = getLocalDateKey(dateOrLog);
    log = { ...maybeLog, date };
  } else if (typeof dateOrLog === 'object' && dateOrLog !== null) {
    date = getLocalDateKey(dateOrLog.date);
    log = { ...dateOrLog, date };
  } else {
    return;
  }

  // Write to local cache immediately with strictly isolated key
  setCachedDailyLog(userId, date, log);

  const payload = {
    date,
    completedHabits: log.completedHabits || {},
    completedCount: typeof log.completedCount === 'number' ? log.completedCount : 0,
    totalActiveCount: typeof log.totalActiveCount === 'number' ? log.totalActiveCount : 0,
    updatedAt: new Date().toISOString(),
  };

  try {
    const logDocRef = doc(db, 'users', userId, 'dailyLogs', date);
    await setDoc(logDocRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Save daily log notice for ${date}:`, error);
  }
}

/**
 * Pure helper to toggle a habit for a specific date log.
 */
export function toggleHabit(
  userId: string,
  dateInput: string,
  habitId: string,
  currentLog: DailyLogData,
  habits: HabitItem[]
): { updatedLog: DailyLogData; completedCount: number; totalCount: number } {
  const date = getLocalDateKey(dateInput);
  const currentCompleted = !!(currentLog.completedHabits && currentLog.completedHabits[habitId]);
  const updatedCompletedHabits: Record<string, boolean> = {
    ...(currentLog.completedHabits || {}),
    [habitId]: !currentCompleted,
  };

  const activeHabitIds = habits.map((h) => h.id);
  const progress = calculateDailyProgress(updatedCompletedHabits, activeHabitIds);

  const updatedLog: DailyLogData = {
    date,
    completedHabits: updatedCompletedHabits,
    completedCount: progress.completedCount,
    totalActiveCount: habits.length,
    updatedAt: new Date().toISOString(),
  };

  return {
    updatedLog,
    completedCount: progress.completedCount,
    totalCount: progress.totalCount,
  };
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
  habits: HabitItem[],
  forceRefresh: boolean = false
): Promise<{
  history7Days: DayHistorySummary[];
  historyMap: Record<string, { completed: number; total: number }>;
  rawLogsMap: Record<string, DailyLogData>;
  streaks: StreakStats;
  analytics: AnalyticsStats;
}> {
  const normalizedToday = getLocalDateKey(todayDate);

  // Check local cache bundle first
  if (!forceRefresh) {
    const cachedBundle = getCachedHistoryBundle(userId);
    if (cachedBundle) {
      // Re-calculate today's streak & weekday mapping in case date rolled over
      const recalculatedStreaks = calculateStreaks(cachedBundle.historyMap, normalizedToday);
      const last7Dates = getLast7Days(normalizedToday);
      const history7Days: DayHistorySummary[] = last7Dates.map((date) => {
        const record = cachedBundle.historyMap[date];
        const completedCount = record ? record.completed : 0;
        const totalCount = record ? record.total : habits.length;
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

      return {
        ...cachedBundle,
        history7Days,
        streaks: recalculatedStreaks,
      };
    }
  }

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

  // 1. Fetch lightweight 35-day window from dailyLogs
  try {
    const logsCol = collection(db, 'users', userId, 'dailyLogs');
    let snapshot;
    try {
      const q = query(logsCol, orderBy('date', 'desc'), limit(35));
      snapshot = await getDocs(q);
    } catch {
      const fallbackQ = query(logsCol, limit(50));
      snapshot = await getDocs(fallbackQ);
    }

    snapshot.forEach((d) => {
      const dData = d.data();
      const dDate = getLocalDateKey(d.id || dData.date);
      const completedHabits: Record<string, boolean> = dData.completedHabits || {};
      const completed = typeof dData.completedCount === 'number'
        ? dData.completedCount
        : countCompletedInMap(completedHabits, activeIds);
      const total = typeof dData.totalActiveCount === 'number' && dData.totalActiveCount > 0
        ? dData.totalActiveCount
        : totalHabitsCount;

      historyMap[dDate] = { completed, total };
      const logData: DailyLogData = {
        date: dDate,
        completedHabits,
        completedCount: completed,
        totalActiveCount: total,
      };
      rawLogsMap[dDate] = logData;
      setCachedDailyLog(userId, dDate, logData);
      rawLogs.push({
        date: dDate,
        completedHabits,
        completedCount: completed,
        totalActiveCount: total,
      });
    });
  } catch (error) {
    console.warn('Error fetching dailyLogs history:', error);
  }

  // 2. Compute Streaks
  const streaks = calculateStreaks(historyMap, normalizedToday);

  // 3. Generate 7-Day History
  const last7Dates = getLast7Days(normalizedToday);
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

  // 4. Compute Full Analytics
  const analytics = calculateAnalytics(rawLogs, habits, normalizedToday, streaks);

  const resultBundle = {
    history7Days,
    historyMap,
    rawLogsMap,
    streaks,
    analytics,
  };

  setCachedHistoryBundle(userId, resultBundle);

  return resultBundle;
}
