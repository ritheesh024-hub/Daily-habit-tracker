/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User,
} from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import { auth, googleProvider } from './lib/firebase';
import {
  AnalyticsStats,
  DailyLogData,
  DayHistorySummary,
  HabitItem,
  StreakStats,
  UserProfile,
  UserReminderSettings,
  ActiveSmartReminderNotice,
  DEFAULT_REMINDER_SETTINGS,
  ThemeMode,
} from './types';
import { getTodayDateString, formatHeaderDate } from './lib/dateUtils';
import {
  getCachedTheme,
  setCachedTheme,
  applyTheme,
  listenToSystemThemeChange,
} from './lib/themeService';
import {
  createDefaultDailyLog,
  countCompletedInMap,
  calculateDailyProgress,
  fetchUserHabitSettings,
  saveHabitSetting,
  deleteHabitSetting,
  fetchDailyLog,
  getDailyLog,
  saveDailyLog,
  toggleHabit,
  saveDailyNote,
  clearDailyNote,
  syncUserProfile,
  updateUserProfile,
  updateUserDisplayName,
  fetchHabitHistoryAndStreaks,
  calculateStreaks,
  getLocalDateKey,
  fetchUserReminderSettings,
  saveUserReminderSettings,
  saveOnboardingProfileAndHabits,
  saveWeightEntry,
  checkWeeklyWeightReminderNeeded,
  dismissWeeklyWeightReminder,
  clearUserData,
  deleteUserAccount,
} from './lib/habitService';
import {
  getCachedUserProfile,
  setCachedUserProfile,
  getCachedHabits,
  setCachedHabits,
  getCachedDailyLog,
  setCachedDailyLog,
  getCachedHistoryBundle,
  setCachedHistoryBundle,
  getCachedMilestones,
  setCachedMilestones,
  getCachedReminderSettings,
  setCachedReminderSettings,
  getCachedWeightHistory,
  clearUserCache,
  clearActiveSession,
} from './lib/cacheService';
import {
  evaluateMilestones,
  fetchUserMilestoneRecords,
  persistUnlockedMilestones,
} from './lib/milestoneService';
import {
  triggerBrowserNotification,
  triggerSmartBrowserNotification,
  getIncompleteHabits,
  generateSmartReminderMessage,
} from './lib/reminderService';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { StreakStatsCard } from './components/StreakStatsCard';
import { HabitList } from './components/HabitList';
import { DailyNote } from './components/DailyNote';
import { HistoryList } from './components/HistoryList';
import { ProfileModal, TabType } from './components/ProfileModal';
import { LoginView } from './components/LoginView';
import { LandingPage } from './components/LandingPage';
import { OnboardingModal } from './components/OnboardingModal';
import { WeeklyWeightModal } from './components/WeeklyWeightModal';
import { ReminderToast, ActiveReminderNotice } from './components/ReminderToast';

const DEFAULT_ANALYTICS: AnalyticsStats = {
  currentStreak: 0,
  bestStreak: 0,
  todayPercentage: 0,
  last7DaysPercentage: 0,
  last30DaysPercentage: 0,
  sevenDayBreakdown: [],
  thirtyDaySummary: {
    averagePercentage: 0,
    completedDays: 0,
    partialDays: 0,
    noActivityDays: 0,
    totalCompletedHabits: 0,
    totalIncompleteHabits: 0,
  },
  weeklyComparison: {
    thisWeekPercentage: 0,
    lastWeekPercentage: 0,
    improvement: 0,
  },
  totalCompletedHabits: 0,
  mostConsistentHabit: null,
  leastCompletedHabit: null,
  habitBreakdown: [],
  totalLoggedDays: 0,
  hasEnoughData: false,
};

export default function App() {
  const [todayDate, setTodayDate] = useState<string>(getTodayDateString);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString);

  // Cached-first Auth State: 0ms initial load
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCachedUserProfile());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(() => !getCachedUserProfile());
  const [authError, setAuthError] = useState<string | null>(null);

  // Habits configuration: loaded synchronously from cache
  const [habits, setHabits] = useState<HabitItem[]>(() => getCachedHabits(currentUser?.uid));

  // Daily log state for selected date: loaded synchronously from cache
  const [dailyLog, setDailyLog] = useState<DailyLogData>(() => {
    const today = getTodayDateString();
    const cached = currentUser?.uid ? getCachedDailyLog(currentUser.uid, today) : null;
    return cached || createDefaultDailyLog(today, habits.length);
  });
  const [isSavingLog, setIsSavingLog] = useState<boolean>(false);

  // 7-day history & streak states: loaded synchronously from cache
  const [history, setHistory] = useState<DayHistorySummary[]>(() => {
    const bundle = currentUser?.uid ? getCachedHistoryBundle(currentUser.uid) : null;
    return bundle?.history7Days || [];
  });
  const [historyMap, setHistoryMap] = useState<Record<string, { completed: number; total: number }>>(() => {
    const bundle = currentUser?.uid ? getCachedHistoryBundle(currentUser.uid) : null;
    return bundle?.historyMap || {};
  });
  const [rawLogsMap, setRawLogsMap] = useState<Record<string, DailyLogData>>(() => {
    const bundle = currentUser?.uid ? getCachedHistoryBundle(currentUser.uid) : null;
    return bundle?.rawLogsMap || {};
  });
  const [streaks, setStreaks] = useState<StreakStats>(() => {
    const bundle = currentUser?.uid ? getCachedHistoryBundle(currentUser.uid) : null;
    return bundle?.streaks || { currentStreak: 0, bestStreak: 0 };
  });
  const [analytics, setAnalytics] = useState<AnalyticsStats>(() => {
    const bundle = currentUser?.uid ? getCachedHistoryBundle(currentUser.uid) : null;
    return bundle?.analytics || DEFAULT_ANALYTICS;
  });

  // Milestones persisted unlock mapping: loaded synchronously from cache
  const [persistedMilestonesMap, setPersistedMilestonesMap] = useState<Record<string, string>>(() => {
    const cached = currentUser?.uid ? getCachedMilestones(currentUser.uid) : null;
    return cached || {};
  });

  // Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<TabType>('analytics');

  // Smart Reminder Settings state
  const [reminderSettings, setReminderSettings] = useState<UserReminderSettings>(() =>
    getCachedReminderSettings(currentUser?.uid)
  );

  // Appearance Theme state ('system' | 'light' | 'dark')
  const [theme, setTheme] = useState<ThemeMode>(() => getCachedTheme(currentUser?.uid));

  // Initialize and apply theme on mount and whenever theme or currentUser changes
  useEffect(() => {
    applyTheme(theme);
    if (theme === 'system') {
      const unsubscribe = listenToSystemThemeChange(() => {
        applyTheme('system');
      });
      return () => unsubscribe();
    }
  }, [theme]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setCachedTheme(newTheme, currentUser?.uid);
    applyTheme(newTheme);
  };

  // Active Toast reminders in state
  const [activeReminders, setActiveReminders] = useState<ActiveReminderNotice[]>([]);
  const [activeSmartReminders, setActiveSmartReminders] = useState<ActiveSmartReminderNotice[]>([]);
  const notifiedHabitTimesRef = useRef<Record<string, boolean>>({});
  const smartReminderNotifiedDatesRef = useRef<Record<string, boolean>>({});
  const currentDateFetchRef = useRef<string>(selectedDate);

  // Online / Offline state
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isToday = selectedDate === todayDate;

  // Listen to Firebase auth state & handle redirect login result
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const profile = syncUserProfile(result.user, (syncedProfile) => {
            setCurrentUser(syncedProfile);
            setCachedUserProfile(syncedProfile);
          });
          setCurrentUser(profile);
          setCachedUserProfile(profile);
          setAuthError(null);
        }
      })
      .catch((error) => {
        const errMsg = error?.message || '';
        if (
          errMsg.includes('Database is closing') ||
          errMsg.includes('IndexedDB') ||
          error?.name === 'AbortError' ||
          error?.name === 'InvalidStateError' ||
          (error?.code === 'auth/internal-error' && errMsg.includes('closing'))
        ) {
          return;
        }

        console.error('Redirect sign-in error:', error);
        if (error.code === 'auth/unauthorized-domain') {
          const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
          setAuthError(
            `Domain "${currentDomain}" is not authorized. In Firebase Console, go to Authentication > Settings > Authorized domains and add "${currentDomain}".`
          );
        } else if (error.code === 'auth/operation-not-allowed') {
          setAuthError(
            'Google Sign-in provider is disabled. In Firebase Console, go to Authentication > Sign-in method and enable Google.'
          );
        } else if (error.code) {
          setAuthError(error.message || 'Authentication redirect error');
        }
      });

    const unsubscribe = onAuthStateChanged(
      auth,
      (user: User | null) => {
        if (user) {
          const profile = syncUserProfile(user, (syncedProfile) => {
            setCurrentUser(syncedProfile);
            setCachedUserProfile(syncedProfile);
          });
          setCurrentUser(profile);
          setCachedUserProfile(profile);
          setAuthError(null);

          // Load user-specific cached habits or defaults
          const userHabits = getCachedHabits(user.uid);
          setHabits(userHabits);

          // Load user-specific daily log
          const cachedLog = getCachedDailyLog(user.uid, todayDate);
          if (cachedLog) {
            setDailyLog(cachedLog);
          } else {
            setDailyLog(createDefaultDailyLog(todayDate, userHabits.length));
          }

          // Load user-specific history bundle
          const userBundle = getCachedHistoryBundle(user.uid);
          if (userBundle) {
            setHistory(userBundle.history7Days || []);
            setHistoryMap(userBundle.historyMap || {});
            setRawLogsMap(userBundle.rawLogsMap || {});
            setStreaks(userBundle.streaks || { currentStreak: 0, bestStreak: 0 });
            setAnalytics(userBundle.analytics || DEFAULT_ANALYTICS);
          } else {
            setHistory([]);
            setHistoryMap({});
            setRawLogsMap({});
            setStreaks({ currentStreak: 0, bestStreak: 0 });
            setAnalytics(DEFAULT_ANALYTICS);
          }

          // Load user-specific cached milestones
          const cachedMilestones = getCachedMilestones(user.uid);
          setPersistedMilestonesMap(cachedMilestones || {});

          // Fetch and sync user-specific reminder settings
          fetchUserReminderSettings(user.uid).then((settings) => {
            setReminderSettings(settings);
          });
        } else {
          setCurrentUser(null);
          setCachedUserProfile(null);
          clearActiveSession();
          setHabits(getCachedHabits());
          setDailyLog(createDefaultDailyLog(todayDate, 8));
          setHistory([]);
          setHistoryMap({});
          setRawLogsMap({});
          setStreaks({ currentStreak: 0, bestStreak: 0 });
          setAnalytics(DEFAULT_ANALYTICS);
          setPersistedMilestonesMap({});
          setReminderSettings(DEFAULT_REMINDER_SETTINGS);
          setActiveReminders([]);
          setActiveSmartReminders([]);
          notifiedHabitTimesRef.current = {};
          smartReminderNotifiedDatesRef.current = {};
        }
        setIsAuthLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setAuthError(error.message);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Daily Reset & Midnight Handler
  useEffect(() => {
    const checkMidnightRollover = () => {
      const realToday = getTodayDateString();
      setTodayDate((prevToday) => {
        if (realToday !== prevToday) {
          setSelectedDate((prevSelected) =>
            prevSelected === prevToday ? realToday : prevSelected
          );
          notifiedHabitTimesRef.current = {};
          smartReminderNotifiedDatesRef.current = {};
          return realToday;
        }
        return prevToday;
      });
    };

    const interval = setInterval(checkMidnightRollover, 15000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkMidnightRollover();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkMidnightRollover);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkMidnightRollover);
    };
  }, []);

  // Background sync for habit settings when user signs in (instant cache first)
  useEffect(() => {
    if (!currentUser?.uid) return;

    fetchUserHabitSettings(currentUser.uid)
      .then((userHabits) => {
        setHabits(userHabits);
      })
      .catch((err) => {
        console.warn('Background habits sync:', err);
      });
  }, [currentUser?.uid]);

  // Sync full history in background on initial login or date roll (Data Saver: 35 days limit)
  const habitsKey = habits.map((h) => `${h.id}_${h.name}`).join('|');
  useEffect(() => {
    if (!currentUser?.uid || habits.length === 0) return;

    fetchHabitHistoryAndStreaks(currentUser.uid, todayDate, habits)
      .then((historyData) => {
        setHistory(historyData.history7Days);
        setHistoryMap(historyData.historyMap);
        setRawLogsMap(historyData.rawLogsMap);
        setStreaks(historyData.streaks);
        setAnalytics(historyData.analytics);
      })
      .catch((err) => {
        console.warn('Background history sync:', err);
      });
  }, [currentUser?.uid, todayDate, habitsKey]);

  // Sync persisted milestone records in background
  useEffect(() => {
    if (!currentUser?.uid) return;

    fetchUserMilestoneRecords(currentUser.uid)
      .then((records) => {
        if (records && Object.keys(records).length > 0) {
          setPersistedMilestonesMap((prev) => ({ ...prev, ...records }));
        }
      })
      .catch((err) => {
        console.warn('Background milestone sync notice:', err);
      });
  }, [currentUser?.uid]);

  // Evaluate Milestones based on actual daily logs, streaks, and analytics
  const milestones = useMemo(() => {
    const result = evaluateMilestones(
      historyMap,
      rawLogsMap,
      analytics,
      streaks,
      persistedMilestonesMap,
      todayDate
    );

    // If there are newly unlocked milestones, persist them to Firestore & cache
    if (currentUser?.uid && result.newlyUnlocked.length > 0) {
      persistUnlockedMilestones(
        currentUser.uid,
        result.newlyUnlocked,
        persistedMilestonesMap,
        todayDate
      ).then((updated) => {
        setPersistedMilestonesMap(updated);
      });
    }

    return result.milestones;
  }, [
    historyMap,
    rawLogsMap,
    analytics,
    streaks,
    persistedMilestonesMap,
    todayDate,
    currentUser?.uid,
  ]);

  // Instant switch when selectedDate changes (Data-Saver: 0 internet calls when in memory / local storage)
  useEffect(() => {
    if (!currentUser?.uid) return;

    currentDateFetchRef.current = selectedDate;
    const activeIds = habits.map((h) => h.id);

    // 1. Check in-memory rawLogsMap
    if (rawLogsMap[selectedDate]) {
      const memoryLog = rawLogsMap[selectedDate];
      setDailyLog({
        ...memoryLog,
        date: selectedDate,
        completedCount: countCompletedInMap(memoryLog.completedHabits, activeIds),
        totalActiveCount: habits.length,
      });
      return;
    }

    // 2. Check localStorage
    const cachedLog = getCachedDailyLog(currentUser.uid, selectedDate);
    if (cachedLog) {
      const readyLog = {
        ...cachedLog,
        date: selectedDate,
        completedCount: countCompletedInMap(cachedLog.completedHabits, activeIds),
        totalActiveCount: habits.length,
      };
      setDailyLog(readyLog);
      setRawLogsMap((prev) => ({ ...prev, [selectedDate]: readyLog }));
      return;
    }

    // 3. Set clean blank state immediately so previous day's habits never linger
    const blankLog = createDefaultDailyLog(selectedDate, habits.length);
    setDailyLog(blankLog);

    // 4. Fetch document from Firestore if not in cache
    getDailyLog(currentUser.uid, selectedDate, habits).then((remoteLog) => {
      // Prevent stale response race condition
      if (currentDateFetchRef.current === selectedDate) {
        setDailyLog(remoteLog);
        setRawLogsMap((prev) => ({ ...prev, [selectedDate]: remoteLog }));
      }
    });
  }, [selectedDate, currentUser?.uid, habits]);

  // Habit & Smart Reminder Scheduler Loop
  useEffect(() => {
    if (habits.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = getTodayDateString();

      // 1. Check Smart Reminder
      if (reminderSettings.remindersEnabled && reminderSettings.reminderTime === currentTimeStr) {
        if (!smartReminderNotifiedDatesRef.current[todayStr]) {
          smartReminderNotifiedDatesRef.current[todayStr] = true;

          const todayLog =
            (selectedDate === todayStr ? dailyLog : rawLogsMap[todayStr]) ||
            (currentUser?.uid ? getCachedDailyLog(currentUser.uid, todayStr) : null) ||
            createDefaultDailyLog(todayStr, habits.length);

          const completedMap = todayLog.completedHabits || {};
          const incomplete = getIncompleteHabits(habits, completedMap);

          // Only send reminder if there are incomplete habits!
          if (incomplete.length > 0) {
            const message = generateSmartReminderMessage(incomplete);
            if (message) {
              triggerSmartBrowserNotification(message.title, message.body);

              const noticeId = `smart-${todayStr}-${Date.now()}`;
              setActiveSmartReminders((prev) => [
                ...prev.filter((item) => !item.id.startsWith(`smart-${todayStr}`)),
                {
                  id: noticeId,
                  title: message.title,
                  body: message.body,
                  incompleteHabits: incomplete,
                  timestamp: Date.now(),
                },
              ]);
            }
          }
        }
      }

      // 2. Check Individual Habit Reminders
      habits.forEach((habit) => {
        if (!habit.reminderEnabled || !habit.reminderTime) return;

        if (habit.reminderTime === currentTimeStr) {
          const triggerKey = `${habit.id}_${todayStr}_${currentTimeStr}`;
          if (!notifiedHabitTimesRef.current[triggerKey]) {
            notifiedHabitTimesRef.current[triggerKey] = true;
            triggerBrowserNotification(habit);

            const noticeId = `${habit.id}-${Date.now()}`;
            setActiveReminders((prev) => [
              ...prev.filter((item) => item.habit.id !== habit.id),
              { id: noticeId, habit, timestamp: Date.now() },
            ]);
          }
        }
      });
    };

    checkReminders();
    const timer = setInterval(checkReminders, 15000);

    return () => clearInterval(timer);
  }, [habits, reminderSettings, dailyLog, rawLogsMap, selectedDate, currentUser?.uid]);

  // Google Sign-in handler
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = syncUserProfile(result.user);
      setCurrentUser(profile);
      setCachedUserProfile(profile);
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        setAuthError(null);
      } else if (
        error.code === 'auth/popup-blocked' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setAuthError(redirectErr?.message || 'Login redirect failed.');
        }
      } else if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
        setAuthError(
          `Domain "${currentDomain}" is not authorized. In Firebase Console, go to Authentication > Settings > Authorized domains and add "${currentDomain}".`
        );
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError(
          'Google Sign-in provider is disabled. In Firebase Console, go to Authentication > Sign-in method and enable Google.'
        );
      } else {
        setAuthError(error?.message || 'Could not sign in with Google.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      if (currentUser?.uid) {
        clearUserCache(currentUser.uid);
      }
      clearActiveSession();
      await signOut(auth);
      setCurrentUser(null);
      setHabits(getCachedHabits());
      setDailyLog(createDefaultDailyLog(getTodayDateString(), 8));
      setHistory([]);
      setHistoryMap({});
      setRawLogsMap({});
      setStreaks({ currentStreak: 0, bestStreak: 0 });
      setAnalytics(DEFAULT_ANALYTICS);
      setIsProfileModalOpen(false);
      setActiveReminders([]);
      notifiedHabitTimesRef.current = {};
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Weekly Weight Modal state
  const [showWeeklyWeightModal, setShowWeeklyWeightModal] = useState<boolean>(false);

  // Check if weekly weight reminder is needed
  useEffect(() => {
    if (currentUser?.uid && currentUser.onboardingCompleted) {
      if (checkWeeklyWeightReminderNeeded(currentUser)) {
        setShowWeeklyWeightModal(true);
      }
    }
  }, [currentUser]);

  // Update Profile (Name, Date of Birth, Height, Weight)
  const handleUpdateProfile = async (updates: {
    displayName: string;
    dateOfBirth?: string;
    height?: number;
    heightUnit?: 'cm' | 'in';
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
  }) => {
    if (!currentUser?.uid) return;
    const updated = await updateUserProfile(currentUser.uid, updates);
    setCurrentUser(updated);
    setCachedUserProfile(updated);
  };

  // Complete Onboarding Flow
  const handleOnboardingComplete = async (
    profileData: {
      displayName: string;
      dateOfBirth?: string;
      height?: number;
      heightUnit?: 'cm' | 'in';
      weight?: number;
      weightUnit?: 'kg' | 'lbs';
    },
    chosenHabits: HabitItem[]
  ) => {
    if (!currentUser?.uid) return;
    const updated = await saveOnboardingProfileAndHabits(currentUser.uid, profileData, chosenHabits);
    setCurrentUser(updated);
    setCachedUserProfile(updated);
    setHabits(chosenHabits);
    setCachedHabits(currentUser.uid, chosenHabits);

    const activeIds = chosenHabits.map((h) => h.id);
    const newCompletedCount = countCompletedInMap(dailyLog.completedHabits, activeIds);
    const updatedLog: DailyLogData = {
      ...dailyLog,
      completedCount: newCompletedCount,
      totalActiveCount: chosenHabits.length,
    };
    setDailyLog(updatedLog);
    setCachedDailyLog(currentUser.uid, todayDate, updatedLog);
    await saveDailyLog(currentUser.uid, todayDate, updatedLog);
  };

  // Save Weekly Weight Check-in
  const handleSaveWeeklyWeight = async (weight: number, unit: 'kg' | 'lbs') => {
    if (!currentUser?.uid) return;
    await saveWeightEntry(currentUser.uid, weight, unit);
    const updatedUser: UserProfile = {
      ...currentUser,
      weight,
      weightUnit: unit,
      lastWeightCheckInDate: getTodayDateString(),
    };
    setCurrentUser(updatedUser);
    setCachedUserProfile(updatedUser);
    setShowWeeklyWeightModal(false);
  };

  const handleDismissWeeklyWeight = () => {
    if (currentUser?.uid) {
      dismissWeeklyWeightReminder(currentUser.uid);
    }
    setShowWeeklyWeightModal(false);
  };

  // Clear all user habit data & reset onboarding
  const handleClearUserData = async () => {
    if (!currentUser?.uid) return;
    await clearUserData(currentUser.uid);

    const resetUser: UserProfile = {
      ...currentUser,
      onboardingCompleted: false,
      weight: undefined,
      height: undefined,
      dateOfBirth: undefined,
    };
    setCurrentUser(resetUser);
    setCachedUserProfile(resetUser);

    const defaultHabits = getCachedHabits(currentUser.uid);
    setHabits(defaultHabits);
    setDailyLog(createDefaultDailyLog(todayDate, defaultHabits.length));
    setHistory([]);
    setHistoryMap({});
    setRawLogsMap({});
    setStreaks({ currentStreak: 0, bestStreak: 0 });
    setAnalytics(DEFAULT_ANALYTICS);
    setPersistedMilestonesMap({});
    setIsProfileModalOpen(false);
  };

  // Permanently delete user account & all cloud records
  const handleDeleteUserAccount = async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    await deleteUserAccount(auth.currentUser);
    clearUserCache(uid);
    clearActiveSession();
    setCurrentUser(null);
    setCachedUserProfile(null);
    setIsProfileModalOpen(false);
    setHabits(getCachedHabits());
    setDailyLog(createDefaultDailyLog(getTodayDateString(), 8));
    setHistory([]);
    setHistoryMap({});
    setRawLogsMap({});
    setStreaks({ currentStreak: 0, bestStreak: 0 });
    setAnalytics(DEFAULT_ANALYTICS);
    setPersistedMilestonesMap({});
  };

  // Export complete user data backup as JSON
  const handleExportUserData = () => {
    try {
      const weightHistory = currentUser?.uid ? getCachedWeightHistory(currentUser.uid) : [];
      const exportPayload = {
        app: 'Daily Habits',
        version: '1.5',
        exportedAt: new Date().toISOString(),
        user: {
          uid: currentUser?.uid,
          email: currentUser?.email,
          displayName: currentUser?.displayName,
          dateOfBirth: currentUser?.dateOfBirth,
          height: currentUser?.height,
          heightUnit: currentUser?.heightUnit,
          weight: currentUser?.weight,
          weightUnit: currentUser?.weightUnit,
          createdAt: currentUser?.createdAt,
          lastLoginAt: currentUser?.lastLoginAt,
          onboardingCompleted: currentUser?.onboardingCompleted,
        },
        habits,
        dailyLogs: rawLogsMap,
        weightHistory,
        milestones,
        streaks,
        analytics,
        reminderSettings,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `daily-habits-backup-${todayDate}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export user data:', err);
    }
  };

  // Toggle habit checkbox for a specific date: completely isolated by user + targetDate + habitId
  const handleToggleHabitForDate = async (targetDateInput: string, habitId: string) => {
    if (!currentUser?.uid) return;

    const targetDate = getLocalDateKey(targetDateInput);

    // Retrieve the base log specifically for targetDate
    let baseLog: DailyLogData;
    if (selectedDate === targetDate && dailyLog.date === targetDate) {
      baseLog = dailyLog;
    } else if (rawLogsMap[targetDate]) {
      baseLog = rawLogsMap[targetDate];
    } else {
      const cached = getCachedDailyLog(currentUser.uid, targetDate);
      baseLog = cached || createDefaultDailyLog(targetDate, habits.length);
    }

    const { updatedLog, completedCount, totalCount } = toggleHabit(
      currentUser.uid,
      targetDate,
      habitId,
      baseLog,
      habits
    );

    const isCurrentCompleted = !!(baseLog.completedHabits && baseLog.completedHabits[habitId]);
    const nextCompleted = !isCurrentCompleted;

    // 1. If currently viewing targetDate, update dailyLog immediately
    if (selectedDate === targetDate) {
      setDailyLog(updatedLog);
    }

    // 2. Update rawLogsMap for targetDate
    const nextRawLogsMap = {
      ...rawLogsMap,
      [targetDate]: updatedLog,
    };
    setRawLogsMap(nextRawLogsMap);

    // 3. Update historyMap for targetDate
    const updatedHistoryMap = {
      ...historyMap,
      [targetDate]: { completed: completedCount, total: totalCount },
    };
    setHistoryMap(updatedHistoryMap);

    // 4. Recalculate streaks
    const newStreaks = calculateStreaks(updatedHistoryMap, todayDate);
    setStreaks(newStreaks);

    // 5. Update 7-day history list
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isCompleted = totalCount > 0 && completedCount >= totalCount;

    let updatedHistoryList: DayHistorySummary[] = [];
    setHistory((prevHistory) => {
      const nextList = prevHistory.map((item) =>
        item.date === targetDate
          ? {
              ...item,
              completedCount,
              totalCount,
              percentage,
              isCompleted,
            }
          : item
      );
      updatedHistoryList = nextList;
      return nextList;
    });

    // 6. Update analytics
    setAnalytics((prev) => {
      const nextTotalCompleted = nextCompleted
        ? prev.totalCompletedHabits + 1
        : Math.max(0, prev.totalCompletedHabits - 1);

      const nextAnalytics: AnalyticsStats = {
        ...prev,
        currentStreak: newStreaks.currentStreak,
        bestStreak: newStreaks.bestStreak,
        todayPercentage: targetDate === todayDate ? percentage : prev.todayPercentage,
        totalCompletedHabits: nextTotalCompleted,
      };

      // Persist history bundle cache with latest calculated state
      setCachedHistoryBundle(currentUser.uid, {
        history7Days: updatedHistoryList.length > 0 ? updatedHistoryList : history,
        historyMap: updatedHistoryMap,
        rawLogsMap: nextRawLogsMap,
        streaks: newStreaks,
        analytics: nextAnalytics,
      });

      return nextAnalytics;
    });

    // 7. Save to local storage cache specifically for targetDate
    setCachedDailyLog(currentUser.uid, targetDate, updatedLog);

    // 8. Save to Firestore in background without blocking
    setIsSavingLog(true);
    try {
      await saveDailyLog(currentUser.uid, targetDate, updatedLog);
    } catch (error) {
      console.warn(`Background daily log save notice for ${targetDate}:`, error);
      // If saving fails while online due to a real error, gracefully rollback optimistic change
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        if (selectedDate === targetDate) {
          setDailyLog(baseLog);
        }
        setRawLogsMap((prev) => ({ ...prev, [targetDate]: baseLog }));
        setCachedDailyLog(currentUser.uid, targetDate, baseLog);
      }
    } finally {
      setIsSavingLog(false);
    }
  };

  // Toggle habit on currently selected date
  const handleToggleHabit = (habitId: string) => {
    handleToggleHabitForDate(selectedDate, habitId);
  };

  // State & Handlers for Daily Note (Strictly Date-Isolated)
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveDailyNote = async (targetDate: string, noteText: string) => {
    if (!currentUser?.uid) return;
    const dateKey = getLocalDateKey(targetDate);
    setIsSavingNote(true);

    try {
      const updatedLog = await saveDailyNote(currentUser.uid, dateKey, noteText);

      // If the saved note belongs to the currently displayed date, update state
      if (dateKey === selectedDate) {
        setDailyLog((prev) => ({
          ...prev,
          note: noteText,
        }));
      }

      // Update in-memory rawLogsMap & cached bundle without mutating streak/analytics
      setRawLogsMap((prev) => {
        const existing = prev[dateKey] || createDefaultDailyLog(dateKey, habits.length);
        const nextMap = {
          ...prev,
          [dateKey]: {
            ...existing,
            note: noteText,
          },
        };

        setCachedHistoryBundle(currentUser.uid, {
          history7Days: history,
          historyMap,
          rawLogsMap: nextMap,
          streaks,
          analytics,
        });

        return nextMap;
      });
    } catch (err) {
      console.error('Error saving daily note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleClearDailyNote = async (targetDate: string) => {
    if (!currentUser?.uid) return;
    const dateKey = getLocalDateKey(targetDate);
    setIsSavingNote(true);

    try {
      await clearDailyNote(currentUser.uid, dateKey);

      if (dateKey === selectedDate) {
        setDailyLog((prev) => ({
          ...prev,
          note: '',
        }));
      }

      setRawLogsMap((prev) => {
        const existing = prev[dateKey];
        if (!existing) return prev;
        const nextMap = {
          ...prev,
          [dateKey]: {
            ...existing,
            note: '',
          },
        };

        setCachedHistoryBundle(currentUser.uid, {
          history7Days: history,
          historyMap,
          rawLogsMap: nextMap,
          streaks,
          analytics,
        });

        return nextMap;
      });
    } catch (err) {
      console.error('Error clearing daily note:', err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Save changes from HabitModal
  const handleSaveHabitFromProfile = async (
    data: { name: string; target: string; icon: string; reminderEnabled?: boolean; reminderTime?: string },
    editingHabit?: HabitItem | null
  ) => {
    if (!currentUser?.uid) return;

    if (editingHabit) {
      const updatedHabit: HabitItem = {
        ...editingHabit,
        name: data.name,
        target: data.target,
        icon: data.icon,
        reminderEnabled: typeof data.reminderEnabled === 'boolean' ? data.reminderEnabled : editingHabit.reminderEnabled,
        reminderTime: data.reminderTime || editingHabit.reminderTime || '08:00',
      };

      const nextHabits = habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h));
      setHabits(nextHabits);
      setCachedHabits(currentUser.uid, nextHabits);
      await saveHabitSetting(currentUser.uid, updatedHabit);
    } else {
      const newId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newHabit: HabitItem = {
        id: newId,
        name: data.name,
        target: data.target,
        icon: data.icon,
        order: habits.length,
        reminderEnabled: !!data.reminderEnabled,
        reminderTime: data.reminderTime || '08:00',
        createdAt: new Date().toISOString(),
      };

      const nextHabits = [...habits, newHabit];
      setHabits(nextHabits);
      setCachedHabits(currentUser.uid, nextHabits);

      const activeIds = nextHabits.map((h) => h.id);
      const newCompletedCount = countCompletedInMap(dailyLog.completedHabits, activeIds);
      const updatedLog: DailyLogData = {
        ...dailyLog,
        completedCount: newCompletedCount,
        totalActiveCount: nextHabits.length,
      };
      setDailyLog(updatedLog);

      await saveHabitSetting(currentUser.uid, newHabit);
      await saveDailyLog(currentUser.uid, updatedLog);
    }
  };

  // Update specific habit reminder settings
  const handleUpdateHabitReminder = async (
    habitId: string,
    reminderEnabled: boolean,
    reminderTime: string
  ) => {
    if (!currentUser?.uid) return;

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const updatedHabit: HabitItem = {
      ...habit,
      reminderEnabled,
      reminderTime,
    };

    const nextHabits = habits.map((h) => (h.id === habitId ? updatedHabit : h));
    setHabits(nextHabits);
    setCachedHabits(currentUser.uid, nextHabits);

    try {
      await saveHabitSetting(currentUser.uid, updatedHabit);
    } catch (err) {
      console.warn('Failed to update habit reminder setting:', err);
    }
  };

  // Update user global smart reminder settings
  const handleUpdateReminderSettings = async (settings: UserReminderSettings) => {
    setReminderSettings(settings);
    if (currentUser?.uid) {
      try {
        await saveUserReminderSettings(currentUser.uid, settings);
      } catch (err) {
        console.warn('Failed to save reminder settings to Firestore:', err);
      }
    }
  };

  // Test Smart Reminder Trigger (evaluates today's unfinished habits)
  const handleTestSmartReminder = () => {
    const todayLog =
      (selectedDate === todayDate ? dailyLog : rawLogsMap[todayDate]) ||
      (currentUser?.uid ? getCachedDailyLog(currentUser.uid, todayDate) : null) ||
      createDefaultDailyLog(todayDate, habits.length);

    const completedMap = todayLog.completedHabits || {};
    const incomplete = getIncompleteHabits(habits, completedMap);

    if (incomplete.length === 0) {
      // All completed for today
      triggerSmartBrowserNotification('Daily Habits', 'All habits are completed for today! Keep up the great work.');
      const noticeId = `smart-test-${Date.now()}`;
      setActiveSmartReminders((prev) => [
        ...prev.filter((r) => r.id !== noticeId),
        {
          id: noticeId,
          title: 'Daily Habits',
          body: 'All habits are completed for today! Keep up the great work.',
          incompleteHabits: [],
          timestamp: Date.now(),
        },
      ]);
    } else {
      const msg = generateSmartReminderMessage(incomplete);
      if (msg) {
        triggerSmartBrowserNotification(msg.title, msg.body);
        const noticeId = `smart-test-${Date.now()}`;
        setActiveSmartReminders((prev) => [
          ...prev.filter((r) => r.id !== noticeId),
          {
            id: noticeId,
            title: msg.title,
            body: msg.body,
            incompleteHabits: incomplete,
            timestamp: Date.now(),
          },
        ]);
      }
    }
  };

  // Dismiss a smart reminder toast
  const handleDismissSmartReminder = (noticeId: string) => {
    setActiveSmartReminders((prev) => prev.filter((item) => item.id !== noticeId));
  };

  // Test Notification Trigger
  const handleTestNotification = () => {
    const sampleHabit: HabitItem = habits[0] || {
      id: 'reading',
      name: 'Reading',
      target: '1 hour',
      icon: 'book',
      order: 0,
      reminderEnabled: true,
      reminderTime: '20:30',
    };

    triggerBrowserNotification(sampleHabit);

    const noticeId = `test-${Date.now()}`;
    setActiveReminders((prev) => [
      ...prev.filter((r) => r.id !== noticeId),
      { id: noticeId, habit: sampleHabit, timestamp: Date.now() },
    ]);
  };

  // Dismiss a reminder toast
  const handleDismissReminder = (noticeId: string) => {
    setActiveReminders((prev) => prev.filter((item) => item.id !== noticeId));
  };

  // Mark habit done directly from in-app toast (always applies to today's date)
  const handleCompleteHabitFromToast = (habitId: string) => {
    const todayLog = rawLogsMap[todayDate] || (selectedDate === todayDate ? dailyLog : getCachedDailyLog(currentUser?.uid || '', todayDate));
    if (!todayLog?.completedHabits?.[habitId]) {
      handleToggleHabitForDate(todayDate, habitId);
    }
  };

  // Delete habit handler
  const handleDeleteHabitFromProfile = async (habitId: string) => {
    if (!currentUser?.uid) return;

    const nextHabits = habits.filter((h) => h.id !== habitId);
    setHabits(nextHabits);
    setCachedHabits(currentUser.uid, nextHabits);

    const activeIds = nextHabits.map((h) => h.id);
    const newCompletedCount = countCompletedInMap(dailyLog.completedHabits, activeIds);
    const updatedLog: DailyLogData = {
      ...dailyLog,
      completedCount: newCompletedCount,
      totalActiveCount: nextHabits.length,
    };
    setDailyLog(updatedLog);

    await deleteHabitSetting(currentUser.uid, habitId);
    await saveDailyLog(currentUser.uid, updatedLog);
  };

  // Select a date from history or return to today (Instant switch)
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  // If not authenticated, show clean Google landing / login view
  if (!currentUser) {
    return (
      <LandingPage
        onGetStarted={handleGoogleSignIn}
        isLoading={isAuthLoading}
        error={authError}
      />
    );
  }

  // If first-time user hasn't completed onboarding, render onboarding wizard
  if (currentUser.onboardingCompleted === false) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased">
        <Header
          user={currentUser}
          currentDate={todayDate}
          onOpenProfile={() => {}}
          isSyncing={false}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <OnboardingModal
            isOpen={true}
            user={currentUser}
            onComplete={handleOnboardingComplete}
            onSignOut={handleSignOut}
          />
        </main>
      </div>
    );
  }

  const activeIds = habits.map((h) => h.id);
  const completedCount = countCompletedInMap(dailyLog.completedHabits, activeIds);
  const totalCount = habits.length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      {/* Header with profile trigger */}
      <Header
        user={currentUser}
        currentDate={selectedDate}
        onOpenProfile={() => {
          setProfileModalTab('analytics');
          setIsProfileModalOpen(true);
        }}
        isSyncing={isSavingLog}
      />

      {/* Offline state notice banner */}
      {!isOnline && (
        <div
          id="offline-banner"
          role="status"
          className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 px-4 py-1.5 text-xs text-center font-medium"
        >
          Offline Mode — your habit progress is preserved and will sync when you reconnect.
        </div>
      )}

      {/* Main Single Page Content */}
      <main id="main-content" className="flex-1 max-w-2xl w-full mx-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Date Selector / Notice when viewing historical past days */}
        {!isToday && (
          <div
            id="past-date-banner"
            className="flex items-center justify-between p-3 rounded-lg bg-zinc-200/80 dark:bg-zinc-800/80 border border-zinc-300/80 dark:border-zinc-700/80 text-xs text-zinc-800 dark:text-zinc-200"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Viewing past date:</span>
              <span className="font-mono">{formatHeaderDate(selectedDate)}</span>
            </div>
            <button
              id="return-to-today-btn"
              type="button"
              onClick={() => setSelectedDate(todayDate)}
              className="inline-flex items-center gap-1 font-medium text-zinc-900 dark:text-zinc-100 hover:text-black dark:hover:text-white underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Today
            </button>
          </div>
        )}

        {/* Streaks Statistics */}
        <StreakStatsCard stats={streaks} />

        {/* Daily Completion Progress Section */}
        <ProgressBar
          completed={completedCount}
          total={totalCount}
        />

        {/* Habit List Section */}
        <section id="habit-checklist-section" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 id="checklist-heading" className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              {isToday ? "Today's Checklist" : `Checklist for ${formatHeaderDate(selectedDate)}`}
            </h2>
          </div>

          <HabitList
            habits={habits}
            completedHabits={dailyLog.completedHabits}
            onToggleHabit={handleToggleHabit}
          />
        </section>

        {/* Daily Note Section */}
        <DailyNote
          selectedDate={selectedDate}
          isToday={isToday}
          note={dailyLog.note || ''}
          onSaveNote={handleSaveDailyNote}
          onClearNote={handleClearDailyNote}
          isSaving={isSavingNote}
        />

        {/* 7-Day History Section */}
        <HistoryList
          history={history}
          currentSelectedDate={selectedDate}
          todayDate={todayDate}
          onSelectDate={handleSelectDate}
        />
      </main>

      {/* Profile, Manage Habits, Analytics & Reminders Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onUpdateProfile={handleUpdateProfile}
        habits={habits}
        onSaveHabit={handleSaveHabitFromProfile}
        onDeleteHabit={handleDeleteHabitFromProfile}
        onUpdateHabitReminder={handleUpdateHabitReminder}
        onTestNotification={handleTestNotification}
        reminderSettings={reminderSettings}
        onUpdateReminderSettings={handleUpdateReminderSettings}
        onTestSmartReminder={handleTestSmartReminder}
        analytics={analytics}
        milestones={milestones}
        rawLogsMap={rawLogsMap}
        todayDate={todayDate}
        onSignOut={handleSignOut}
        onExportData={handleExportUserData}
        onClearData={handleClearUserData}
        onDeleteAccount={handleDeleteUserAccount}
        initialTab={profileModalTab}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Weekly Weight Check-in Voluntary Modal */}
      <WeeklyWeightModal
        isOpen={showWeeklyWeightModal}
        onClose={handleDismissWeeklyWeight}
        onSave={handleSaveWeeklyWeight}
        currentWeight={currentUser?.weight}
        currentUnit={currentUser?.weightUnit}
      />

      {/* Active In-App Reminder Notifications */}
      <ReminderToast
        reminders={activeReminders}
        smartReminders={activeSmartReminders}
        onDismiss={handleDismissReminder}
        onDismissSmart={handleDismissSmartReminder}
        onCompleteHabit={handleCompleteHabitFromToast}
      />

      {/* Subtle Footer */}
      <footer id="app-footer" className="py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">
        Track • Improve • Achieve
      </footer>
    </div>
  );
}
