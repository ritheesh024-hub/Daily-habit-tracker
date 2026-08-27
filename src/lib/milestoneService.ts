import {
  collection,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Milestone,
  StreakStats,
  AnalyticsStats,
  DailyLogData,
} from '../types';
import {
  getCachedMilestones,
  setCachedMilestones,
} from './cacheService';
import { formatHeaderDate, getLocalDateKey } from './dateUtils';

export interface MilestoneDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'perfect_days' | 'completions' | 'consistency';
  targetValue: number;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: 'streak_7',
    title: '7 Day Streak',
    description: 'Complete all active habits for 7 consecutive completed days.',
    icon: 'flame',
    category: 'streak',
    targetValue: 7,
  },
  {
    id: 'streak_30',
    title: '30 Day Streak',
    description: 'Complete all active habits for 30 consecutive completed days.',
    icon: 'flame',
    category: 'streak',
    targetValue: 30,
  },
  {
    id: 'perfect_10',
    title: '10 Perfect Days',
    description: 'Have 10 days where all active habits were completed.',
    icon: 'check',
    category: 'perfect_days',
    targetValue: 10,
  },
  {
    id: 'perfect_30',
    title: '30 Perfect Days',
    description: 'Have 30 fully completed days.',
    icon: 'check',
    category: 'perfect_days',
    targetValue: 30,
  },
  {
    id: 'completions_100',
    title: '100 Habit Completions',
    description: 'Reach 100 individual habit completions.',
    icon: 'book',
    category: 'completions',
    targetValue: 100,
  },
  {
    id: 'monthly_90',
    title: '90% Monthly Consistency',
    description: 'Reach at least 90% completion for a calendar month.',
    icon: 'target',
    category: 'consistency',
    targetValue: 90,
  },
];

/**
 * Pure calculation helper that evaluates milestone progress and unlocked status
 * from user's actual daily log data, streaks, and analytics without duplicate reads.
 */
export function evaluateMilestones(
  historyMap: Record<string, { completed: number; total: number }>,
  rawLogsMap: Record<string, DailyLogData>,
  analytics: AnalyticsStats,
  streaks: StreakStats,
  persistedUnlockedMap: Record<string, string>, // milestoneId -> unlockedAt
  todayDate: string = getLocalDateKey()
): { milestones: Milestone[]; newlyUnlocked: string[] } {
  // 1. Calculate actual perfect days (where scheduled active habits were >= 1 and completed >= total)
  let perfectDaysCount = 0;
  Object.values(historyMap).forEach((rec) => {
    if (rec && rec.total > 0 && rec.completed >= rec.total) {
      perfectDaysCount++;
    }
  });

  // 2. Calculate best / active streak
  const bestStreak = Math.max(streaks.bestStreak || 0, streaks.currentStreak || 0);

  // 3. Calculate total individual habit completions from daily logs
  let totalCompletions = 0;
  Object.values(rawLogsMap).forEach((log) => {
    if (log && log.completedHabits) {
      Object.values(log.completedHabits).forEach((isDone) => {
        if (isDone) totalCompletions++;
      });
    }
  });
  // Fall back to analytics total if logs map is empty or partial
  if (totalCompletions === 0 && analytics.totalCompletedHabits > 0) {
    totalCompletions = analytics.totalCompletedHabits;
  }

  // 4. Calculate monthly consistency (last 30 days %)
  const monthlyConsistencyPct = analytics.last30DaysPercentage || 0;
  const hasActiveLogDays =
    (analytics.thirtyDaySummary?.completedDays || 0) +
      (analytics.thirtyDaySummary?.partialDays || 0) >
    0;

  const newlyUnlocked: string[] = [];

  const milestones: Milestone[] = MILESTONE_DEFINITIONS.map((def) => {
    let currentValue = 0;
    let isEligible = false;
    let progressText = '';

    switch (def.id) {
      case 'streak_7':
        currentValue = bestStreak;
        isEligible = bestStreak >= 7;
        progressText = `${Math.min(currentValue, 7)} / 7 days`;
        break;

      case 'streak_30':
        currentValue = bestStreak;
        isEligible = bestStreak >= 30;
        progressText = `${Math.min(currentValue, 30)} / 30 days`;
        break;

      case 'perfect_10':
        currentValue = perfectDaysCount;
        isEligible = perfectDaysCount >= 10;
        progressText = `${Math.min(currentValue, 10)} / 10 days`;
        break;

      case 'perfect_30':
        currentValue = perfectDaysCount;
        isEligible = perfectDaysCount >= 30;
        progressText = `${Math.min(currentValue, 30)} / 30 days`;
        break;

      case 'completions_100':
        currentValue = totalCompletions;
        isEligible = totalCompletions >= 100;
        progressText = `${Math.min(currentValue, 100)} / 100 completions`;
        break;

      case 'monthly_90':
        currentValue = monthlyConsistencyPct;
        isEligible = monthlyConsistencyPct >= 90 && hasActiveLogDays;
        progressText = `${currentValue}% / 90% consistency`;
        break;

      default:
        currentValue = 0;
        isEligible = false;
        progressText = `0 / ${def.targetValue}`;
    }

    // A milestone is unlocked if it is currently eligible OR was previously unlocked and recorded
    const previouslyUnlockedAt = persistedUnlockedMap[def.id];
    const isUnlocked = !!previouslyUnlockedAt || isEligible;

    let unlockedAt = previouslyUnlockedAt;
    if (isUnlocked && !unlockedAt) {
      // First time unlocked
      unlockedAt = todayDate;
      newlyUnlocked.push(def.id);
    }

    // Format display unlocked date if available
    let formattedUnlockedAt: string | undefined = undefined;
    if (unlockedAt) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(unlockedAt)) {
        formattedUnlockedAt = formatHeaderDate(unlockedAt);
      } else {
        formattedUnlockedAt = unlockedAt;
      }
    }

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      currentValue,
      targetValue: def.targetValue,
      isUnlocked,
      unlockedAt: formattedUnlockedAt,
      progressText,
    };
  });

  return { milestones, newlyUnlocked };
}

/**
 * Fetches persisted milestone records for a specific user.
 * Seamlessly integrates local cache and Firestore.
 */
export async function fetchUserMilestoneRecords(
  userId: string
): Promise<Record<string, string>> {
  if (!userId) return {};

  const cached = getCachedMilestones(userId);
  if (cached && Object.keys(cached).length > 0) {
    return cached;
  }

  const result: Record<string, string> = {};
  try {
    const colRef = collection(db, 'users', userId, 'milestones');
    const snap = await getDocs(colRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.unlockedAt) {
        result[docSnap.id] = data.unlockedAt;
      }
    });

    setCachedMilestones(userId, result);
  } catch (err) {
    console.warn('Background milestone sync notice:', err);
  }

  return result;
}

/**
 * Persists newly unlocked milestones to Firestore and local cache.
 * Avoids duplicate writes if already persisted.
 */
export async function persistUnlockedMilestones(
  userId: string,
  newlyUnlockedIds: string[],
  existingRecords: Record<string, string>,
  todayDate: string = getLocalDateKey()
): Promise<Record<string, string>> {
  if (!userId || newlyUnlockedIds.length === 0) return existingRecords;

  const updatedRecords = { ...existingRecords };
  const writePromises: Promise<any>[] = [];

  newlyUnlockedIds.forEach((id) => {
    if (!updatedRecords[id]) {
      updatedRecords[id] = todayDate;
      const docRef = doc(db, 'users', userId, 'milestones', id);
      writePromises.push(
        setDoc(
          docRef,
          {
            id,
            unlocked: true,
            unlockedAt: todayDate,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch((err) => {
          console.warn(`Error persisting milestone ${id} notice:`, err);
        })
      );
    }
  });

  // Immediate local cache update
  setCachedMilestones(userId, updatedRecords);

  // Background non-blocking persistence
  if (writePromises.length > 0) {
    Promise.all(writePromises).catch(() => {});
  }

  return updatedRecords;
}
