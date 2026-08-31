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
import { User, updateProfile, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';
import {
  DEFAULT_HABITS,
  HabitItem,
  DailyLogData,
  DayHistorySummary,
  StreakStats,
  UserProfile,
  AnalyticsStats,
  HabitConsistency,
  UserReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
  ThemeMode,
  WeightHistoryEntry,
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
  getCachedReminderSettings,
  setCachedReminderSettings,
  getCachedWeightHistory,
  setCachedWeightHistory,
  clearUserCache,
} from './cacheService';
import {
  getCachedTheme,
  setCachedTheme,
  applyTheme,
} from './themeService';

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

export function syncUserProfile(
  user: User,
  onProfileLoaded?: (profile: UserProfile) => void
): UserProfile {
  const now = new Date().toISOString();
  const cached = getCachedUserProfile(user.uid);

  const profile: UserProfile = {
    uid: user.uid,
    displayName: cached?.displayName || user.displayName || 'User',
    name: cached?.name || cached?.displayName || user.displayName || 'User',
    email: user.email || null,
    photoURL: user.photoURL || null,
    dateOfBirth: cached?.dateOfBirth,
    height: cached?.height,
    heightUnit: cached?.heightUnit || 'cm',
    weight: cached?.weight,
    weightUnit: cached?.weightUnit || 'kg',
    onboardingCompleted: cached?.onboardingCompleted,
    lastWeightCheckInDate: cached?.lastWeightCheckInDate,
    createdAt: cached?.createdAt,
    updatedAt: cached?.updatedAt,
    lastLoginAt: now,
  };

  // Cache immediately under user's UID
  setCachedUserProfile(profile);

  // Background sync with Firestore users/{uid}
  const userRef = doc(db, 'users', user.uid);
  getDoc(userRef)
    .then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const updatedProfile: UserProfile = {
          uid: user.uid,
          displayName: data.displayName || cached?.displayName || user.displayName || 'User',
          name: data.name || data.displayName || cached?.name || user.displayName || 'User',
          email: user.email || data.email || null,
          photoURL: user.photoURL || data.photoURL || null,
          dateOfBirth: data.dateOfBirth || cached?.dateOfBirth,
          height: data.height ?? cached?.height,
          heightUnit: data.heightUnit || cached?.heightUnit || 'cm',
          weight: data.weight ?? cached?.weight,
          weightUnit: data.weightUnit || cached?.weightUnit || 'kg',
          onboardingCompleted:
            typeof data.onboardingCompleted === 'boolean'
              ? data.onboardingCompleted
              : typeof cached?.onboardingCompleted === 'boolean'
              ? cached.onboardingCompleted
              : data.createdAt ? true : false,
          lastWeightCheckInDate: data.lastWeightCheckInDate || cached?.lastWeightCheckInDate,
          createdAt: data.createdAt || cached?.createdAt || now,
          updatedAt: data.updatedAt || cached?.updatedAt,
          lastLoginAt: now,
        };
        setCachedUserProfile(updatedProfile);
        if (onProfileLoaded) {
          onProfileLoaded(updatedProfile);
        }

        // Update login metadata without overwriting custom properties
        setDoc(
          userRef,
          {
            uid: user.uid,
            email: user.email || null,
            photoURL: user.photoURL || null,
            lastLoginAt: now,
          },
          { merge: true }
        ).catch((e) => console.warn('Login metadata update notice:', e));
      } else {
        // Initial new user profile document
        const initialProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || 'User',
          name: user.displayName || 'User',
          email: user.email || null,
          photoURL: user.photoURL || null,
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };
        setCachedUserProfile(initialProfile);
        if (onProfileLoaded) {
          onProfileLoaded(initialProfile);
        }
        setDoc(
          userRef,
          {
            uid: user.uid,
            displayName: initialProfile.displayName,
            name: initialProfile.name,
            email: user.email || null,
            photoURL: user.photoURL || null,
            onboardingCompleted: false,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: now,
            settings: {
              theme: 'light',
              dailyResetHour: 0,
            },
          },
          { merge: true }
        ).catch((e) => console.warn('Background profile create notice:', e));
      }
    })
    .catch((e) => {
      console.warn('Background profile sync notice:', e);
    });

  return profile;
}

export async function updateUserProfile(
  userId: string,
  updates: {
    displayName?: string;
    name?: string;
    dateOfBirth?: string;
    height?: number;
    heightUnit?: 'cm' | 'in';
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
    onboardingCompleted?: boolean;
  }
): Promise<UserProfile> {
  const cached = getCachedUserProfile(userId);
  const now = new Date().toISOString();

  const cleanName = updates.displayName ? updates.displayName.trim() : updates.name ? updates.name.trim() : (cached?.displayName || 'User');
  const cleanDob = updates.dateOfBirth !== undefined ? (updates.dateOfBirth.trim() || undefined) : cached?.dateOfBirth;

  const updatedProfile: UserProfile = {
    uid: userId,
    displayName: cleanName,
    name: cleanName,
    email: cached?.email || auth.currentUser?.email || null,
    photoURL: cached?.photoURL || auth.currentUser?.photoURL || null,
    dateOfBirth: cleanDob,
    height: updates.height !== undefined ? updates.height : cached?.height,
    heightUnit: updates.heightUnit || cached?.heightUnit || 'cm',
    weight: updates.weight !== undefined ? updates.weight : cached?.weight,
    weightUnit: updates.weightUnit || cached?.weightUnit || 'kg',
    onboardingCompleted: updates.onboardingCompleted !== undefined ? updates.onboardingCompleted : (cached?.onboardingCompleted ?? true),
    lastWeightCheckInDate: cached?.lastWeightCheckInDate,
    updatedAt: now,
    lastLoginAt: cached?.lastLoginAt || now,
    createdAt: cached?.createdAt || now,
  };

  // 1. Immediate local cache write
  setCachedUserProfile(updatedProfile);

  // 2. Update Firebase Auth displayName where supported
  if (auth.currentUser && auth.currentUser.uid === userId && updates.displayName) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: cleanName,
      });
    } catch (authError) {
      console.warn('Firebase Auth updateProfile notice:', authError);
    }
  }

  // 3. Persist to Firestore user document with merge: true
  const userRef = doc(db, 'users', userId);
  const firestoreUpdates: Record<string, any> = {
    uid: userId,
    displayName: cleanName,
    name: cleanName,
    dateOfBirth: cleanDob || null,
    updatedAt: now,
  };
  if (updates.height !== undefined) firestoreUpdates.height = updates.height;
  if (updates.heightUnit !== undefined) firestoreUpdates.heightUnit = updates.heightUnit;
  if (updates.weight !== undefined) firestoreUpdates.weight = updates.weight;
  if (updates.weightUnit !== undefined) firestoreUpdates.weightUnit = updates.weightUnit;
  if (updates.onboardingCompleted !== undefined) firestoreUpdates.onboardingCompleted = updates.onboardingCompleted;

  await setDoc(userRef, firestoreUpdates, { merge: true });

  return updatedProfile;
}

export async function updateUserDisplayName(userId: string, displayName: string): Promise<void> {
  await updateUserProfile(userId, { displayName });
}

/**
 * Saves completed onboarding data (profile attributes & custom chosen habits).
 */
export async function saveOnboardingProfileAndHabits(
  userId: string,
  profileData: {
    displayName: string;
    dateOfBirth?: string;
    height?: number;
    heightUnit?: 'cm' | 'in';
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
  },
  selectedHabits: HabitItem[]
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const todayKey = getLocalDateKey();
  const cached = getCachedUserProfile(userId);

  const cleanName = profileData.displayName.trim() || 'User';
  const cleanDob = profileData.dateOfBirth?.trim() || undefined;

  const updatedProfile: UserProfile = {
    uid: userId,
    displayName: cleanName,
    name: cleanName,
    email: cached?.email || auth.currentUser?.email || null,
    photoURL: cached?.photoURL || auth.currentUser?.photoURL || null,
    dateOfBirth: cleanDob,
    height: profileData.height,
    heightUnit: profileData.heightUnit || 'cm',
    weight: profileData.weight,
    weightUnit: profileData.weightUnit || 'kg',
    onboardingCompleted: true,
    lastWeightCheckInDate: profileData.weight ? todayKey : undefined,
    createdAt: cached?.createdAt || now,
    updatedAt: now,
    lastLoginAt: cached?.lastLoginAt || now,
  };

  // 1. Update Firebase Auth displayName
  if (auth.currentUser && auth.currentUser.uid === userId) {
    try {
      await updateProfile(auth.currentUser, { displayName: cleanName });
    } catch (e) {
      console.warn('Firebase Auth updateProfile notice:', e);
    }
  }

  // 2. Persist profile document to Firestore
  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      uid: userId,
      displayName: cleanName,
      name: cleanName,
      dateOfBirth: cleanDob || null,
      height: profileData.height ?? null,
      heightUnit: profileData.heightUnit || 'cm',
      weight: profileData.weight ?? null,
      weightUnit: profileData.weightUnit || 'kg',
      onboardingCompleted: true,
      lastWeightCheckInDate: profileData.weight ? todayKey : null,
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. Save selected habits to Firestore
  const habitBatch = writeBatch(db);
  const habitsToSave: HabitItem[] = selectedHabits.map((h, index) => ({
    ...h,
    order: index,
    updatedAt: now,
  }));
  for (const h of habitsToSave) {
    const hRef = doc(db, 'users', userId, 'habitSettings', h.id);
    habitBatch.set(hRef, h);
  }
  await habitBatch.commit();
  setCachedHabits(userId, habitsToSave);

  // 4. If weight was provided, record initial entry in weightHistory
  if (profileData.weight && profileData.weight > 0) {
    const entryId = `weight_${Date.now()}`;
    const weightEntry: WeightHistoryEntry = {
      id: entryId,
      userId,
      weight: profileData.weight,
      unit: profileData.weightUnit || 'kg',
      date: todayKey,
      createdAt: now,
    };
    try {
      const weightRef = doc(db, 'users', userId, 'weightHistory', entryId);
      await setDoc(weightRef, weightEntry);
      setCachedWeightHistory(userId, [weightEntry]);
    } catch (err) {
      console.warn('Initial weight entry save notice:', err);
    }
  }

  // 5. Update local cache
  setCachedUserProfile(updatedProfile);
  setCachedHabits(userId, habitsToSave);

  return updatedProfile;
}

/**
 * Fetches user weight history.
 */
export async function fetchWeightHistory(userId: string): Promise<WeightHistoryEntry[]> {
  const cached = getCachedWeightHistory(userId);
  try {
    const weightCol = collection(db, 'users', userId, 'weightHistory');
    const q = query(weightCol, orderBy('date', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const entries: WeightHistoryEntry[] = [];
      snap.forEach((d) => {
        entries.push(d.data() as WeightHistoryEntry);
      });
      setCachedWeightHistory(userId, entries);
      return entries;
    }
  } catch (err) {
    console.warn('Weight history fetch notice:', err);
  }
  return cached;
}

/**
 * Saves a new voluntary weight entry and updates user profile weight.
 */
export async function saveWeightEntry(
  userId: string,
  weight: number,
  unit: 'kg' | 'lbs',
  dateInput?: string
): Promise<WeightHistoryEntry> {
  const now = new Date().toISOString();
  const date = dateInput ? getLocalDateKey(dateInput) : getLocalDateKey();
  const id = `weight_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const entry: WeightHistoryEntry = {
    id,
    userId,
    weight,
    unit,
    date,
    createdAt: now,
  };

  // Update local cache immediately
  const existing = getCachedWeightHistory(userId);
  const updated = [entry, ...existing.filter((e) => e.date !== date)];
  setCachedWeightHistory(userId, updated);

  const cachedUser = getCachedUserProfile(userId);
  if (cachedUser) {
    setCachedUserProfile({
      ...cachedUser,
      weight,
      weightUnit: unit,
      lastWeightCheckInDate: date,
    });
  }

  // Persist to Firestore
  try {
    const entryRef = doc(db, 'users', userId, 'weightHistory', id);
    await setDoc(entryRef, entry);

    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        weight,
        weightUnit: unit,
        lastWeightCheckInDate: date,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Error saving weight entry to Firestore:', err);
  }

  return entry;
}

/**
 * Checks if a weekly weight check-in prompt should be shown.
 * Prompts at most once every 7 days, and only if user has finished onboarding.
 */
export function checkWeeklyWeightReminderNeeded(user: UserProfile | null): boolean {
  if (!user || !user.onboardingCompleted) return false;

  const userId = user.uid;
  const dismissedUntil = localStorage.getItem(`dh_weight_prompt_dismissed_until_${userId}`);
  const todayKey = getLocalDateKey();

  if (dismissedUntil && dismissedUntil > todayKey) {
    return false;
  }

  const lastCheckIn = user.lastWeightCheckInDate || (user.createdAt ? getLocalDateKey(user.createdAt) : null);
  if (!lastCheckIn) return true;

  // Calculate days difference between today and last check-in
  const [cy, cm, cd] = todayKey.split('-').map(Number);
  const [ly, lm, ld] = lastCheckIn.split('-').map(Number);
  const nowDate = new Date(cy, cm - 1, cd).getTime();
  const prevDate = new Date(ly, lm - 1, ld).getTime();
  const diffDays = Math.floor((nowDate - prevDate) / (1000 * 60 * 60 * 24));

  return diffDays >= 7;
}

/**
 * Dismisses weekly weight check-in prompt for the next 7 days.
 */
export function dismissWeeklyWeightReminder(userId: string): void {
  const [y, m, d] = getLocalDateKey().split('-').map(Number);
  const nextWeek = new Date(y, m - 1, d + 7);
  const nextWeekKey = getLocalDateKey(nextWeek);
  localStorage.setItem(`dh_weight_prompt_dismissed_until_${userId}`, nextWeekKey);
}

/**
 * Clears all user habit history, daily notes, analytics, milestones, food logs, and weight history.
 * Preserves the Firebase Auth account.
 */
export async function clearUserData(userId: string): Promise<void> {
  // 1. Delete documents from subcollections
  const subcollections = ['dailyLogs', 'milestones', 'foodLogs', 'weightHistory'];
  for (const sub of subcollections) {
    try {
      const colRef = collection(db, 'users', userId, sub);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn(`Error clearing subcollection ${sub}:`, e);
    }
  }

  // 2. Reset user document weight & onboarding state in Firestore
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();
  await setDoc(
    userRef,
    {
      weight: null,
      lastWeightCheckInDate: null,
      onboardingCompleted: false,
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. Purge local storage cache for this user
  clearUserCache(userId);
}

/**
 * Permanently deletes the user's account and all associated Firestore data.
 * If re-authentication is required by Firebase Auth, triggers Google popup re-auth.
 */
export async function deleteUserAccount(currentUser: User): Promise<void> {
  const userId = currentUser.uid;

  // 1. Delete all user subcollections
  const subcollections = [
    'dailyLogs',
    'habitSettings',
    'reminderSettings',
    'settings',
    'milestones',
    'foodLogs',
    'weightHistory',
  ];

  for (const sub of subcollections) {
    try {
      const colRef = collection(db, 'users', userId, sub);
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    } catch (e) {
      console.warn(`Error deleting subcollection ${sub}:`, e);
    }
  }

  // 2. Delete user root document
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (e) {
    console.warn('Error deleting user root doc:', e);
  }

  // 3. Purge all user cache
  clearUserCache(userId);

  // 4. Delete Firebase Auth user
  try {
    await deleteUser(currentUser);
  } catch (err: any) {
    if (err?.code === 'auth/requires-recent-login') {
      await reauthenticateWithPopup(currentUser, googleProvider);
      await deleteUser(currentUser);
    } else {
      throw err;
    }
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
        note: typeof data.note === 'string' ? data.note : undefined,
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

  const payload: Record<string, any> = {
    date,
    completedHabits: log.completedHabits || {},
    completedCount: typeof log.completedCount === 'number' ? log.completedCount : 0,
    totalActiveCount: typeof log.totalActiveCount === 'number' ? log.totalActiveCount : 0,
    updatedAt: new Date().toISOString(),
  };

  if (typeof log.note === 'string') {
    payload.note = log.note;
  }

  try {
    const logDocRef = doc(db, 'users', userId, 'dailyLogs', date);
    await setDoc(logDocRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Save daily log notice for ${date}:`, error);
    throw error;
  }
}

/**
 * Saves or updates a personal daily note for the specific date.
 * Fully date-isolated and does not affect habit completion status.
 */
export async function saveDailyNote(
  userId: string,
  dateInput: string,
  noteText: string
): Promise<DailyLogData> {
  const date = getLocalDateKey(dateInput);
  const trimmed = noteText.slice(0, 500);
  const cached = getCachedDailyLog(userId, date);

  const updatedLog: DailyLogData = {
    date,
    completedHabits: cached?.completedHabits || {},
    completedCount: typeof cached?.completedCount === 'number' ? cached.completedCount : 0,
    totalActiveCount: typeof cached?.totalActiveCount === 'number' ? cached.totalActiveCount : 0,
    note: trimmed,
    updatedAt: new Date().toISOString(),
  };

  // Local storage write immediately
  setCachedDailyLog(userId, date, updatedLog);

  // Firestore background write with merge: true to avoid overwriting habit completions
  try {
    const logDocRef = doc(db, 'users', userId, 'dailyLogs', date);
    await setDoc(
      logDocRef,
      {
        date,
        note: trimmed,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`Save daily note notice for ${date}:`, error);
  }

  return updatedLog;
}

/**
 * Clears the daily note for a specific date without deleting or changing habit progress.
 */
export async function clearDailyNote(
  userId: string,
  dateInput: string
): Promise<DailyLogData> {
  const date = getLocalDateKey(dateInput);
  const cached = getCachedDailyLog(userId, date);

  const updatedLog: DailyLogData = {
    date,
    completedHabits: cached?.completedHabits || {},
    completedCount: typeof cached?.completedCount === 'number' ? cached.completedCount : 0,
    totalActiveCount: typeof cached?.totalActiveCount === 'number' ? cached.totalActiveCount : 0,
    note: '',
    updatedAt: new Date().toISOString(),
  };

  setCachedDailyLog(userId, date, updatedLog);

  try {
    const logDocRef = doc(db, 'users', userId, 'dailyLogs', date);
    await setDoc(
      logDocRef,
      {
        date,
        note: '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn(`Clear daily note notice for ${date}:`, error);
  }

  return updatedLog;
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
    note: typeof currentLog.note === 'string' ? currentLog.note : '',
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
        note: typeof dData.note === 'string' ? dData.note : undefined,
        updatedAt: dData.updatedAt,
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

/**
 * Loads user reminder preferences from users/{userId}/settings/reminders.
 * Cache-first for instant UI loading with background synchronization.
 */
export async function fetchUserReminderSettings(userId: string): Promise<UserReminderSettings> {
  const cached = getCachedReminderSettings(userId);
  try {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'reminders');
    const snap = await getDoc(settingsDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const settings: UserReminderSettings = {
        remindersEnabled: typeof data.remindersEnabled === 'boolean' ? data.remindersEnabled : true,
        reminderTime: typeof data.reminderTime === 'string' ? data.reminderTime : '20:00',
        updatedAt: data.updatedAt,
      };
      setCachedReminderSettings(userId, settings);
      return settings;
    }
  } catch (error) {
    console.warn(`Background reminder settings fetch notice for ${userId}:`, error);
  }
  return cached;
}

/**
 * Saves user reminder preferences to users/{userId}/settings/reminders.
 */
export async function saveUserReminderSettings(
  userId: string,
  settings: UserReminderSettings
): Promise<void> {
  const now = new Date().toISOString();
  const payload: UserReminderSettings = {
    remindersEnabled: settings.remindersEnabled,
    reminderTime: settings.reminderTime || '20:00',
    updatedAt: now,
  };

  // Immediate local cache update
  setCachedReminderSettings(userId, payload);

  // Background Firestore persistence
  try {
    const settingsDocRef = doc(db, 'users', userId, 'settings', 'reminders');
    await setDoc(settingsDocRef, payload, { merge: true });
  } catch (error) {
    console.warn(`Background save reminder settings error for ${userId}:`, error);
    throw error;
  }
}

/**
 * Loads user theme preference from users/{userId}/settings/preferences.
 * Cache-first for instant UI loading with background synchronization.
 */
export async function fetchUserThemePreference(userId: string): Promise<ThemeMode> {
  const cached = getCachedTheme(userId);
  try {
    const prefDocRef = doc(db, 'users', userId, 'settings', 'preferences');
    const snap = await getDoc(prefDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'system') {
        setCachedTheme(data.theme, userId);
        return data.theme;
      }
    }
  } catch (error) {
    console.warn(`Background theme preference fetch notice for ${userId}:`, error);
  }
  return cached;
}

/**
 * Saves user theme preference to users/{userId}/settings/preferences.
 */
export async function saveUserThemePreference(userId: string, theme: ThemeMode): Promise<void> {
  setCachedTheme(theme, userId);
  applyTheme(theme);
  try {
    const prefDocRef = doc(db, 'users', userId, 'settings', 'preferences');
    await setDoc(prefDocRef, { theme, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn(`Background save theme preference error for ${userId}:`, error);
  }
}
