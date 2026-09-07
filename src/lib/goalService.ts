import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { HabitGoal, GoalWithProgress, DailyLogData } from '../types';
import { getCachedGoals, setCachedGoals } from './cacheService';
import { getLocalDateKey } from './dateUtils';

/**
 * Gets Monday (start) and Sunday (end) for the week containing dateStr (YYYY-MM-DD).
 */
export function getWeekBoundaries(dateStr: string = getLocalDateKey()): { startDate: string; endDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (dObj: Date) =>
    `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;

  return {
    startDate: format(monday),
    endDate: format(sunday),
  };
}

/**
 * Gets 1st day (start) and last day (end) for the month containing dateStr (YYYY-MM-DD).
 */
export function getMonthBoundaries(dateStr: string = getLocalDateKey()): { startDate: string; endDate: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDayNumber = new Date(y, m, 0).getDate();
  const lastDay = `${y}-${String(m).padStart(2, '0')}-${String(lastDayNumber).padStart(2, '0')}`;

  return {
    startDate: firstDay,
    endDate: lastDay,
  };
}

/**
 * Fetches user goals from users/{userId}/goals.
 * Cache-first for instant loading with background Firestore sync.
 */
export async function fetchUserGoals(userId: string): Promise<HabitGoal[]> {
  if (!userId) return [];

  const cached = getCachedGoals(userId);

  try {
    const goalsCol = collection(db, 'users', userId, 'goals');
    const q = query(goalsCol, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const goals: HabitGoal[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Partial<HabitGoal>;
        goals.push({
          id: docSnap.id,
          userId,
          habitId: data.habitId || 'all',
          habitName: data.habitName || 'Habit',
          habitIcon: data.habitIcon,
          habitAccent: data.habitAccent,
          targetCount: typeof data.targetCount === 'number' ? data.targetCount : 10,
          periodType: data.periodType || 'this_month',
          startDate: data.startDate || getMonthBoundaries().startDate,
          endDate: data.endDate || getMonthBoundaries().endDate,
          title: data.title || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
          completedAt: data.completedAt,
          celebrated: !!data.celebrated,
        });
      });

      setCachedGoals(userId, goals);
      return goals;
    }
  } catch (err) {
    console.warn('Background goals fetch notice, falling back to cached:', err);
  }

  return cached;
}

/**
 * Saves or updates a personal habit goal.
 */
export async function saveUserGoal(userId: string, goal: HabitGoal): Promise<HabitGoal> {
  if (!userId) throw new Error('User ID is required to save a goal.');

  const now = new Date().toISOString();
  const payload: HabitGoal = {
    ...goal,
    userId,
    updatedAt: now,
  };

  // Immediate local cache update
  const current = getCachedGoals(userId);
  const updated = [payload, ...current.filter((g) => g.id !== goal.id)];
  setCachedGoals(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'goals', goal.id);
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn(`Save goal network notice for ${goal.id}:`, err);
  }

  return payload;
}

/**
 * Deletes a goal permanently.
 */
export async function deleteUserGoal(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) return;

  const current = getCachedGoals(userId);
  const updated = current.filter((g) => g.id !== goalId);
  setCachedGoals(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Delete goal network notice for ${goalId}:`, err);
  }
}

/**
 * Marks a goal celebration as seen so it doesn't prompt again.
 */
export async function markGoalCelebrated(userId: string, goalId: string): Promise<void> {
  if (!userId || !goalId) return;

  const current = getCachedGoals(userId);
  const updated = current.map((g) => (g.id === goalId ? { ...g, celebrated: true } : g));
  setCachedGoals(userId, updated);

  try {
    const docRef = doc(db, 'users', userId, 'goals', goalId);
    await setDoc(docRef, { celebrated: true, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn(`Mark goal celebrated notice for ${goalId}:`, err);
  }
}

/**
 * Evaluates goal progress using real habit completion data from rawLogsMap.
 * Accurately counts completions within the goal's date range, never counting future dates.
 */
export function calculateGoalProgress(
  goal: HabitGoal,
  rawLogsMap: Record<string, DailyLogData> = {},
  todayDate: string = getLocalDateKey()
): GoalWithProgress {
  const { habitId, targetCount, startDate, endDate } = goal;

  let currentCount = 0;

  // Iterate all dates between startDate and endDate
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);

  const curDate = new Date(sy, sm - 1, sd);
  const lastDate = new Date(ey, em - 1, ed);

  // Safety cap of 366 days
  for (let i = 0; i < 366 && curDate <= lastDate; i++) {
    const dateStr = `${curDate.getFullYear()}-${String(curDate.getMonth() + 1).padStart(2, '0')}-${String(curDate.getDate()).padStart(2, '0')}`;

    // Do NOT count future dates beyond today
    if (dateStr <= todayDate) {
      const log = rawLogsMap[dateStr];
      if (log && log.completedHabits) {
        if (habitId === 'all') {
          // Count all completed habits on this date
          Object.values(log.completedHabits).forEach((done) => {
            if (done) currentCount++;
          });
        } else {
          // Count specific habit completion
          if (log.completedHabits[habitId]) {
            currentCount++;
          }
        }
      }
    }

    curDate.setDate(curDate.getDate() + 1);
  }

  const progressPercentage = targetCount > 0
    ? Math.min(100, Math.round((currentCount / targetCount) * 100))
    : 0;

  // Determine status
  let status: 'active' | 'completed' | 'expired' = 'active';
  if (currentCount >= targetCount) {
    status = 'completed';
  } else if (endDate < todayDate) {
    status = 'expired';
  }

  // Days remaining calculation
  let daysRemaining = 0;
  if (status === 'active' && endDate >= todayDate) {
    const [ty, tm, td] = todayDate.split('-').map(Number);
    const tDateObj = new Date(ty, tm - 1, td);
    const eDateObj = new Date(ey, em - 1, ed);
    const diffMs = eDateObj.getTime() - tDateObj.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    ...goal,
    currentCount,
    progressPercentage,
    status,
    daysRemaining,
  };
}

/**
 * Calculates progress for an array of goals.
 */
export function calculateAllGoalsProgress(
  goals: HabitGoal[],
  rawLogsMap: Record<string, DailyLogData> = {},
  todayDate: string = getLocalDateKey()
): GoalWithProgress[] {
  if (!Array.isArray(goals)) return [];
  return goals.map((g) => calculateGoalProgress(g, rawLogsMap, todayDate));
}
