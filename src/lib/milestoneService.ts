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
  AchievementCategory,
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
  category: AchievementCategory;
  targetValue: number;
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  // ================= STREAKS =================
  {
    id: 'streak_3',
    title: '3-Day Streak',
    description: 'Complete all scheduled habits for 3 consecutive days.',
    icon: 'flame',
    category: 'streak',
    targetValue: 3,
  },
  {
    id: 'streak_7',
    title: '7-Day Streak',
    description: 'Complete all scheduled habits for 7 consecutive completed days.',
    icon: 'flame',
    category: 'streak',
    targetValue: 7,
  },
  {
    id: 'streak_14',
    title: '14-Day Streak',
    description: 'Complete all scheduled habits for 14 consecutive completed days.',
    icon: 'flame',
    category: 'streak',
    targetValue: 14,
  },
  {
    id: 'streak_30',
    title: '30-Day Streak',
    description: 'Complete all scheduled habits for 30 consecutive completed days.',
    icon: 'flame',
    category: 'streak',
    targetValue: 30,
  },
  {
    id: 'streak_60',
    title: '60-Day Streak',
    description: 'Two full months of unbreakable habit consistency.',
    icon: 'flame',
    category: 'streak',
    targetValue: 60,
  },
  {
    id: 'streak_100',
    title: '100-Day Streak',
    description: 'Triple-digit mastery: 100 consecutive days completed.',
    icon: 'flame',
    category: 'streak',
    targetValue: 100,
  },
  {
    id: 'streak_365',
    title: '365-Day Streak',
    description: 'One full year of unbroken habit tracking dedication.',
    icon: 'flame',
    category: 'streak',
    targetValue: 365,
  },

  // ================= COMPLETIONS =================
  {
    id: 'completions_10',
    title: '10 Completions',
    description: 'Log your first 10 individual habit completions.',
    icon: 'check',
    category: 'completions',
    targetValue: 10,
  },
  {
    id: 'completions_50',
    title: '50 Completions',
    description: 'Reach 50 individual habit completions.',
    icon: 'check',
    category: 'completions',
    targetValue: 50,
  },
  {
    id: 'completions_100',
    title: '100 Completions',
    description: 'Reach 100 individual habit completions.',
    icon: 'book',
    category: 'completions',
    targetValue: 100,
  },
  {
    id: 'completions_250',
    title: '250 Completions',
    description: 'Reach a milestone of 250 habit completions.',
    icon: 'award',
    category: 'completions',
    targetValue: 250,
  },
  {
    id: 'completions_500',
    title: '500 Completions',
    description: 'Log half a thousand individual habit check-ins.',
    icon: 'trophy',
    category: 'completions',
    targetValue: 500,
  },
  {
    id: 'completions_1000',
    title: '1,000 Completions',
    description: 'Legendary dedication: 1,000 habit completions logged.',
    icon: 'award',
    category: 'completions',
    targetValue: 1000,
  },

  // ================= CONSISTENCY (ACTIVE DAYS) =================
  {
    id: 'active_days_7',
    title: '7 Active Days',
    description: 'Check in and complete at least one habit on 7 distinct days.',
    icon: 'calendar',
    category: 'consistency',
    targetValue: 7,
  },
  {
    id: 'active_days_14',
    title: '14 Active Days',
    description: 'Active habit tracking on 14 distinct days.',
    icon: 'calendar',
    category: 'consistency',
    targetValue: 14,
  },
  {
    id: 'active_days_30',
    title: '30 Active Days',
    description: 'Active habit tracking on 30 distinct days.',
    icon: 'calendar',
    category: 'consistency',
    targetValue: 30,
  },
  {
    id: 'active_days_50',
    title: '50 Active Days',
    description: 'Active habit tracking on 50 distinct days.',
    icon: 'calendar',
    category: 'consistency',
    targetValue: 50,
  },
  {
    id: 'active_days_100',
    title: '100 Active Days',
    description: 'Active habit tracking across 100 distinct days.',
    icon: 'calendar',
    category: 'consistency',
    targetValue: 100,
  },

  // ================= PERFECT DAYS =================
  {
    id: 'perfect_day_first',
    title: 'First Perfect Day',
    description: 'Complete 100% of all scheduled habits for a day.',
    icon: 'sparkles',
    category: 'perfect_days',
    targetValue: 1,
  },
  {
    id: 'perfect_days_7',
    title: '7 Perfect Days',
    description: 'Log 7 days where all active habits were completed.',
    icon: 'sparkles',
    category: 'perfect_days',
    targetValue: 7,
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
    id: 'perfect_days_30',
    title: '30 Perfect Days',
    description: 'Log 30 days where all active habits were completed.',
    icon: 'sparkles',
    category: 'perfect_days',
    targetValue: 30,
  },

  // ================= PERSONAL BEST =================
  {
    id: 'personal_best',
    title: 'Personal Best',
    description: 'Establish and beat your personal best streak record.',
    icon: 'zap',
    category: 'personal_best',
    targetValue: 2,
  },

  // ================= MONTHLY CONSISTENCY =================
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
  persistedUnlockedMap: Record<string, any> = {},
  todayDate: string = getLocalDateKey()
): { milestones: Milestone[]; newlyUnlocked: string[] } {
  // 1. Calculate actual perfect days strictly on or before today
  let perfectDaysCount = 0;
  let activeDaysCount = 0;

  Object.entries(historyMap).forEach(([dateStr, rec]) => {
    if (dateStr <= todayDate && rec) {
      if (rec.completed > 0) {
        activeDaysCount++;
      }
      if (rec.total > 0 && rec.completed >= rec.total) {
        perfectDaysCount++;
      }
    }
  });

  // 2. Calculate best streak from verified streaks computation
  const bestStreak = Math.max(streaks.bestStreak || 0, streaks.currentStreak || 0);

  // 3. Calculate total individual habit completions from daily logs strictly on or before today
  let totalCompletions = 0;
  Object.entries(rawLogsMap).forEach(([dateStr, log]) => {
    if (dateStr <= todayDate && log && log.completedHabits) {
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
      // Streak Milestones
      case 'streak_3':
        currentValue = bestStreak;
        isEligible = bestStreak >= 3;
        progressText = `${Math.min(currentValue, 3)} / 3 days`;
        break;

      case 'streak_7':
        currentValue = bestStreak;
        isEligible = bestStreak >= 7;
        progressText = `${Math.min(currentValue, 7)} / 7 days`;
        break;

      case 'streak_14':
        currentValue = bestStreak;
        isEligible = bestStreak >= 14;
        progressText = `${Math.min(currentValue, 14)} / 14 days`;
        break;

      case 'streak_30':
        currentValue = bestStreak;
        isEligible = bestStreak >= 30;
        progressText = `${Math.min(currentValue, 30)} / 30 days`;
        break;

      case 'streak_60':
        currentValue = bestStreak;
        isEligible = bestStreak >= 60;
        progressText = `${Math.min(currentValue, 60)} / 60 days`;
        break;

      case 'streak_100':
        currentValue = bestStreak;
        isEligible = bestStreak >= 100;
        progressText = `${Math.min(currentValue, 100)} / 100 days`;
        break;

      case 'streak_365':
        currentValue = bestStreak;
        isEligible = bestStreak >= 365;
        progressText = `${Math.min(currentValue, 365)} / 365 days`;
        break;

      // Completion Milestones
      case 'completions_10':
        currentValue = totalCompletions;
        isEligible = totalCompletions >= 10;
        progressText = `${Math.min(currentValue, 10)} / 10 completions`;
        break;

      case 'completions_50':
        currentValue = totalCompletions;
        isEligible = totalCompletions >= 50;
        progressText = `${Math.min(currentValue, 50)} / 50 completions`;
        break;

      case 'completions_100':
        currentValue = totalCompletions;
        isEligible = totalCompletions >= 100;
        progressText = `${Math.min(currentValue, 100)} / 100 completions`;
        break;

      case 'completions_250':
        currentValue = totalCompletions;
        isEligible = totalCompletions >= 250;
        progressText = `${Math.min(currentValue, 250)} / 250 completions`;
        break;

      case 'completions_500':
        currentValue = totalCompletions;
        isEligible = totalCompletions >= 500;
        progressText = `${Math.min(currentValue, 500)} / 500 completions`;
        break;

      case 'completions_1000':
        currentValue = totalCompletions;
        isEligible = totalCompletions >= 1000;
        progressText = `${Math.min(currentValue, 1000)} / 1,000 completions`;
        break;

      // Consistency (Active Days) Milestones
      case 'active_days_7':
        currentValue = activeDaysCount;
        isEligible = activeDaysCount >= 7;
        progressText = `${Math.min(currentValue, 7)} / 7 active days`;
        break;

      case 'active_days_14':
        currentValue = activeDaysCount;
        isEligible = activeDaysCount >= 14;
        progressText = `${Math.min(currentValue, 14)} / 14 active days`;
        break;

      case 'active_days_30':
        currentValue = activeDaysCount;
        isEligible = activeDaysCount >= 30;
        progressText = `${Math.min(currentValue, 30)} / 30 active days`;
        break;

      case 'active_days_50':
        currentValue = activeDaysCount;
        isEligible = activeDaysCount >= 50;
        progressText = `${Math.min(currentValue, 50)} / 50 active days`;
        break;

      case 'active_days_100':
        currentValue = activeDaysCount;
        isEligible = activeDaysCount >= 100;
        progressText = `${Math.min(currentValue, 100)} / 100 active days`;
        break;

      // Perfect Days Milestones
      case 'perfect_day_first':
        currentValue = perfectDaysCount;
        isEligible = perfectDaysCount >= 1;
        progressText = isEligible ? '1 / 1 perfect day' : '0 / 1 perfect day';
        break;

      case 'perfect_days_7':
        currentValue = perfectDaysCount;
        isEligible = perfectDaysCount >= 7;
        progressText = `${Math.min(currentValue, 7)} / 7 perfect days`;
        break;

      case 'perfect_10':
        currentValue = perfectDaysCount;
        isEligible = perfectDaysCount >= 10;
        progressText = `${Math.min(currentValue, 10)} / 10 perfect days`;
        break;

      case 'perfect_days_30':
        currentValue = perfectDaysCount;
        isEligible = perfectDaysCount >= 30;
        progressText = `${Math.min(currentValue, 30)} / 30 perfect days`;
        break;

      // Personal Best
      case 'personal_best':
        currentValue = bestStreak;
        isEligible = bestStreak >= 2;
        progressText = isEligible ? `Personal best: ${bestStreak} days` : `${bestStreak} / 2 days`;
        break;

      // Monthly 90%
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
    const rawPrev = persistedUnlockedMap[def.id];
    const previouslyUnlockedAt =
      typeof rawPrev === 'string'
        ? rawPrev
        : rawPrev && typeof rawPrev.unlockedAt === 'string'
        ? rawPrev.unlockedAt
        : undefined;

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
      name: def.title,
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
  existingRecords: Record<string, any>,
  todayDate: string = getLocalDateKey()
): Promise<Record<string, string>> {
  if (!userId || newlyUnlockedIds.length === 0) return existingRecords;

  const updatedRecords: Record<string, string> = {};
  Object.entries(existingRecords).forEach(([k, v]) => {
    updatedRecords[k] = typeof v === 'string' ? v : v?.unlockedAt || todayDate;
  });

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
