/**
 * Lightweight, offline-first local cache manager with strict UID isolation.
 * Guarantees that no user's private habit, log, streak or profile data leaks
 * across different user accounts on the same browser/device.
 */
import {
  HabitItem,
  DailyLogData,
  UserProfile,
  StreakStats,
  AnalyticsStats,
  DayHistorySummary,
  DEFAULT_HABITS,
  UserReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
  WeightHistoryEntry,
} from '../types';
import { getLocalDateKey } from './dateUtils';

const PREFIX = 'dh_cache_';

export function getCachedUserProfile(userId?: string): UserProfile | null {
  try {
    if (!userId) {
      const activeUid = localStorage.getItem(`${PREFIX}active_uid`);
      if (!activeUid) return null;
      userId = activeUid;
    }
    const raw = localStorage.getItem(`${PREFIX}user_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUserProfile(profile: UserProfile | null): void {
  try {
    if (profile && profile.uid) {
      localStorage.setItem(`${PREFIX}active_uid`, profile.uid);
      localStorage.setItem(`${PREFIX}user_${profile.uid}`, JSON.stringify(profile));
    } else {
      localStorage.removeItem(`${PREFIX}active_uid`);
    }
  } catch (e) {
    console.warn('Cache write error (user profile):', e);
  }
}

export function getCachedHabits(userId?: string): HabitItem[] {
  if (!userId) {
    return DEFAULT_HABITS.map((h) => ({ ...h }));
  }
  try {
    const raw = localStorage.getItem(`${PREFIX}habits_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Cache read error (habits for ${userId}):`, e);
  }
  return DEFAULT_HABITS.map((h) => ({ ...h }));
}

export function setCachedHabits(userId: string, habits: HabitItem[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${PREFIX}habits_${userId}`, JSON.stringify(habits));
  } catch (e) {
    console.warn(`Cache write error (habits for ${userId}):`, e);
  }
}

export function getCachedDailyLog(userId: string, date: string): DailyLogData | null {
  if (!userId || !date) return null;
  const normalizedDate = getLocalDateKey(date);
  try {
    const raw = localStorage.getItem(`${PREFIX}log_${userId}_${normalizedDate}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedDailyLog(userId: string, date: string, log: DailyLogData): void {
  if (!userId || !date) return;
  const normalizedDate = getLocalDateKey(date);
  try {
    localStorage.setItem(`${PREFIX}log_${userId}_${normalizedDate}`, JSON.stringify({
      ...log,
      date: normalizedDate,
    }));
  } catch (e) {
    console.warn(`Cache write error (daily log for ${userId} on ${normalizedDate}):`, e);
  }
}

export interface CachedHistoryBundle {
  history7Days: DayHistorySummary[];
  historyMap: Record<string, { completed: number; total: number }>;
  rawLogsMap: Record<string, DailyLogData>;
  streaks: StreakStats;
  analytics: AnalyticsStats;
  timestamp: number;
}

export function getCachedHistoryBundle(userId: string): CachedHistoryBundle | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}history_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedHistoryBundle(
  userId: string,
  bundle: Omit<CachedHistoryBundle, 'timestamp'>
): void {
  if (!userId) return;
  try {
    localStorage.setItem(
      `${PREFIX}history_${userId}`,
      JSON.stringify({ ...bundle, timestamp: Date.now() })
    );
  } catch (e) {
    console.warn(`Cache write error (history bundle for ${userId}):`, e);
  }
}

export function getCachedMilestones(userId: string): Record<string, string> | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}milestones_${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedMilestones(userId: string, records: Record<string, string>): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${PREFIX}milestones_${userId}`, JSON.stringify(records));
  } catch (e) {
    console.warn(`Cache write error (milestones for ${userId}):`, e);
  }
}

export function getCachedReminderSettings(userId?: string): UserReminderSettings {
  if (!userId) {
    return { ...DEFAULT_REMINDER_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(`${PREFIX}reminders_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          remindersEnabled: typeof parsed.remindersEnabled === 'boolean' ? parsed.remindersEnabled : true,
          reminderTime: typeof parsed.reminderTime === 'string' ? parsed.reminderTime : '20:00',
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch (e) {
    console.warn(`Cache read error (reminders for ${userId}):`, e);
  }
  return { ...DEFAULT_REMINDER_SETTINGS };
}

export function setCachedReminderSettings(userId: string, settings: UserReminderSettings): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${PREFIX}reminders_${userId}`, JSON.stringify(settings));
  } catch (e) {
    console.warn(`Cache write error (reminders for ${userId}):`, e);
  }
}

export function getCachedWeightHistory(userId?: string): WeightHistoryEntry[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}weight_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`Cache read error (weight history for ${userId}):`, e);
  }
  return [];
}

export function setCachedWeightHistory(userId: string, entries: WeightHistoryEntry[]): void {
  if (!userId) return;
  try {
    localStorage.setItem(`${PREFIX}weight_${userId}`, JSON.stringify(entries));
  } catch (e) {
    console.warn(`Cache write error (weight history for ${userId}):`, e);
  }
}

/**
 * Completely purges all stored cache for a specific user.
 */
export function clearUserCache(userId: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(`${PREFIX}user_${userId}`);
    localStorage.removeItem(`${PREFIX}habits_${userId}`);
    localStorage.removeItem(`${PREFIX}history_${userId}`);
    localStorage.removeItem(`${PREFIX}milestones_${userId}`);
    localStorage.removeItem(`${PREFIX}reminders_${userId}`);
    localStorage.removeItem(`${PREFIX}theme_${userId}`);
    localStorage.removeItem(`${PREFIX}weight_${userId}`);
    localStorage.removeItem(`dh_food_logs_${userId}`);

    // Clean up all date logs and any keys matching this user
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(`${PREFIX}log_${userId}_`) || key.includes(userId))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));

    if (localStorage.getItem(`${PREFIX}active_uid`) === userId) {
      localStorage.removeItem(`${PREFIX}active_uid`);
    }
  } catch (e) {
    console.warn(`Cache clear error for ${userId}:`, e);
  }
}

/**
 * Clears active session identifier on sign-out.
 */
export function clearActiveSession(): void {
  try {
    localStorage.removeItem(`${PREFIX}active_uid`);
  } catch (e) {
    console.warn('Error clearing active session cache:', e);
  }
}

