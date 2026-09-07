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
  DEFAULT_HABITS,
  StreakStats,
  UserProfile,
  ThemeMode,
  CalendarSyncResult,
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
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  syncHabitToGoogleCalendar,
  syncAllHabitsToGoogleCalendar,
  deleteHabitFromGoogleCalendar,
  getCachedCalendarToken,
} from './lib/googleCalendarService';
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

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getCachedUserProfile());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [landingNotification, setLandingNotification] = useState<string | null>(null);

  // Today date tracker & selected date tracker for time machine / date switching
  const [todayDate, setTodayDate] = useState<string>(() => getTodayDateString());
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());

  // Main state with instant offline-first cache
  const [habits, setHabits] = useState<HabitItem[]>(() => {
    const cachedUser = getCachedUserProfile();
    return getCachedHabits(cachedUser?.uid);
  });

  const [dailyLog, setDailyLog] = useState<DailyLogData>(() => {
    const cachedUser = getCachedUserProfile();
    const cached = getCachedDailyLog(cachedUser?.uid, getTodayDateString());
    return cached || createDefaultDailyLog(getTodayDateString(), 8);
  });

  const [history, setHistory] = useState<DayHistorySummary[]>(() => {
    const cachedUser = getCachedUserProfile();
    const bundle = getCachedHistoryBundle(cachedUser?.uid);
    return bundle?.history7Days || [];
  });

  const [historyMap, setHistoryMap] = useState<Record<string, { completed: number; total: number }>>(() => {
    const cachedUser = getCachedUserProfile();
    const bundle = getCachedHistoryBundle(cachedUser?.uid);
    return bundle?.historyMap || {};
  });

  const [rawLogsMap, setRawLogsMap] = useState<Record<string, DailyLogData>>(() => {
    const cachedUser = getCachedUserProfile();
    const bundle = getCachedHistoryBundle(cachedUser?.uid);
    return bundle?.rawLogsMap || {};
  });

  const [streaks, setStreaks] = useState<StreakStats>(() => {
    const cachedUser = getCachedUserProfile();
    const bundle = getCachedHistoryBundle(cachedUser?.uid);
    return bundle?.streaks || { currentStreak: 0, bestStreak: 0 };
  });

  const [analytics, setAnalytics] = useState<AnalyticsStats>(() => {
    const cachedUser = getCachedUserProfile();
    const bundle = getCachedHistoryBundle(cachedUser?.uid);
    return bundle?.analytics || DEFAULT_ANALYTICS;
  });

  const [persistedMilestonesMap, setPersistedMilestonesMap] = useState<Record<string, { unlockedAt: string; metricValue?: number }>>(() => {
    const cachedUser = getCachedUserProfile();
    return getCachedMilestones(cachedUser?.uid) || {};
  });

  // UI Modals State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<TabType>('analytics');
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Network offline tracker
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Current Date Fetch reference
  const currentDateFetchRef = useRef<string>(selectedDate);

  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => getCachedTheme());

  const isToday = selectedDate === todayDate;

  // Listen to network status changes
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

  // Initialize theme on start & listen to system changes
  useEffect(() => {
    applyTheme(theme);
    const cleanup = listenToSystemThemeChange(() => {
      const currentSetting = getCachedTheme();
      if (currentSetting === 'system') {
        applyTheme('system');
      }
    });
    return cleanup;
  }, [theme]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    setCachedTheme(newTheme, currentUser?.uid);
    applyTheme(newTheme);
  };

  // Firebase Auth State Listener & Redirect Handler
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
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

  // Sync full history in background on initial login or date roll
  const safeHabitsList = Array.isArray(habits) ? habits : [];
  const habitsKey = safeHabitsList.map((h) => `${h?.id || ''}_${h?.name || ''}`).join('|');
  useEffect(() => {
    if (!currentUser?.uid || safeHabitsList.length === 0) return;

    fetchHabitHistoryAndStreaks(currentUser.uid, todayDate, safeHabitsList)
      .then((historyData) => {
        if (historyData) {
          setHistory(Array.isArray(historyData.history7Days) ? historyData.history7Days : []);
          setHistoryMap(historyData.historyMap || {});
          setRawLogsMap(historyData.rawLogsMap || {});
          setStreaks(historyData.streaks || { currentStreak: 0, bestStreak: 0 });
          setAnalytics(historyData.analytics || DEFAULT_ANALYTICS);
        }
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

  // Instant switch when selectedDate changes
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

    // 3. Set clean blank state immediately
    const blankLog = createDefaultDailyLog(selectedDate, habits.length);
    setDailyLog(blankLog);

    // 4. Fetch document from Firestore if not in cache
    getDailyLog(currentUser.uid, selectedDate, habits).then((remoteLog) => {
      if (currentDateFetchRef.current === selectedDate) {
        setDailyLog(remoteLog);
        setRawLogsMap((prev) => ({ ...prev, [selectedDate]: remoteLog }));
      }
    });
  }, [selectedDate, currentUser?.uid, habits]);

  // Google Sign-in handler
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    setLandingNotification(null);
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
      disconnectGoogleCalendar();
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
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Weekly Weight Modal state
  const [showWeeklyWeightModal, setShowWeeklyWeightModal] = useState<boolean>(false);
  const hasPromptedWeeklyWeightThisSession = useRef<boolean>(false);

  // Check if weekly weight reminder is needed
  useEffect(() => {
    if (
      currentUser?.uid &&
      currentUser.onboardingCompleted &&
      !hasPromptedWeeklyWeightThisSession.current
    ) {
      if (checkWeeklyWeightReminderNeeded(currentUser)) {
        hasPromptedWeeklyWeightThisSession.current = true;
        setShowWeeklyWeightModal(true);
      }
    }
  }, [currentUser]);

  // Update Profile
  const handleUpdateProfile = async (updates: {
    displayName: string;
    dateOfBirth?: string;
    height?: number;
    heightUnit?: 'cm' | 'in';
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
    googleCalendarConnected?: boolean;
    googleCalendarEmail?: string;
    lastGoogleCalendarSync?: string;
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
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) {
      throw new Error('Please sign in to save your weight.');
    }

    const todayDateStr = getLocalDateKey();
    await saveWeightEntry(uid, weight, unit, todayDateStr);

    dismissWeeklyWeightReminder(uid);
    hasPromptedWeeklyWeightThisSession.current = true;

    const updatedUser: UserProfile = {
      ...(currentUser || {
        uid,
        displayName: auth.currentUser?.displayName || 'User',
        email: auth.currentUser?.email || null,
        photoURL: auth.currentUser?.photoURL || null,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      weight,
      weightUnit: unit,
      lastWeightCheckInDate: todayDateStr,
    };
    setCurrentUser(updatedUser);
    setCachedUserProfile(updatedUser);
    setShowWeeklyWeightModal(false);
  };

  const handleDismissWeeklyWeight = () => {
    const uid = auth.currentUser?.uid || currentUser?.uid;
    if (uid) {
      dismissWeeklyWeightReminder(uid);
    }
    hasPromptedWeeklyWeightThisSession.current = true;
    setShowWeeklyWeightModal(false);
  };

  // Clear all user habit data & reset dashboard to clean empty state
  const handleClearUserData = async () => {
    const user = auth.currentUser;
    const uid = user?.uid || currentUser?.uid;
    if (!uid) {
      throw new Error('No authenticated user found.');
    }

    await clearUserData(uid);

    const resetUser: UserProfile = {
      ...(currentUser || {
        uid,
        displayName: user?.displayName || 'User',
        email: user?.email || null,
        photoURL: user?.photoURL || null,
      }),
      onboardingCompleted: true,
      weight: undefined,
      lastWeightCheckInDate: undefined,
      googleCalendarConnected: false,
      googleCalendarEmail: undefined,
      lastGoogleCalendarSync: undefined,
    };

    setCurrentUser(resetUser);
    setCachedUserProfile(resetUser);

    setHabits([]);
    setDailyLog(createDefaultDailyLog(todayDate, 0));
    setHistory([]);
    setHistoryMap({});
    setRawLogsMap({});
    setStreaks({ currentStreak: 0, bestStreak: 0 });
    setAnalytics(DEFAULT_ANALYTICS);
    setPersistedMilestonesMap({});
  };

  // Permanently delete user account & all cloud records
  const handleDeleteUserAccount = async () => {
    const user = auth.currentUser;
    const uid = user?.uid || currentUser?.uid;
    if (!user && !uid) {
      throw new Error('No authenticated user found.');
    }

    if (user) {
      await deleteUserAccount(user);
    } else if (uid) {
      await clearUserData(uid);
    }

    // Only executed if deletion succeeded without error:
    if (uid) {
      clearUserCache(uid);
    }
    clearActiveSession();
    disconnectGoogleCalendar();
    setCurrentUser(null);
    setCachedUserProfile(null);
    setIsProfileModalOpen(false);
    setHabits([]);
    setDailyLog(createDefaultDailyLog(getTodayDateString(), 0));
    setHistory([]);
    setHistoryMap({});
    setRawLogsMap({});
    setStreaks({ currentStreak: 0, bestStreak: 0 });
    setAnalytics(DEFAULT_ANALYTICS);
    setPersistedMilestonesMap({});
    setLandingNotification('Your Daily Habits account has been deleted.');
  };

  // Export complete user data backup as JSON
  const handleExportUserData = () => {
    try {
      const weightHistory = currentUser?.uid ? getCachedWeightHistory(currentUser.uid) : [];
      const exportPayload = {
        app: 'Daily Habits',
        version: '2.0',
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
          googleCalendarConnected: currentUser?.googleCalendarConnected,
          lastGoogleCalendarSync: currentUser?.lastGoogleCalendarSync,
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

  // Toggle habit checkbox for a specific date
  const handleToggleHabitForDate = async (targetDateInput: string, habitId: string) => {
    if (!currentUser?.uid) return;

    const targetDate = getLocalDateKey(targetDateInput);

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

    if (selectedDate === targetDate) {
      setDailyLog(updatedLog);
    }

    const nextRawLogsMap = {
      ...rawLogsMap,
      [targetDate]: updatedLog,
    };
    setRawLogsMap(nextRawLogsMap);

    const updatedHistoryMap = {
      ...historyMap,
      [targetDate]: { completed: completedCount, total: totalCount },
    };
    setHistoryMap(updatedHistoryMap);

    const newStreaks = calculateStreaks(updatedHistoryMap, todayDate);
    setStreaks(newStreaks);

    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const isCompleted = totalCount > 0 && completedCount >= totalCount;

    let updatedHistoryList: DayHistorySummary[] = [];
    setHistory((prevHistory) => {
      const safePrev = Array.isArray(prevHistory) ? prevHistory : [];
      const nextList = safePrev.map((item) =>
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

      setCachedHistoryBundle(currentUser.uid, {
        history7Days: updatedHistoryList.length > 0 ? updatedHistoryList : history,
        historyMap: updatedHistoryMap,
        rawLogsMap: nextRawLogsMap,
        streaks: newStreaks,
        analytics: nextAnalytics,
      });

      return nextAnalytics;
    });

    setCachedDailyLog(currentUser.uid, targetDate, updatedLog);

    setIsSavingLog(true);
    try {
      await saveDailyLog(currentUser.uid, targetDate, updatedLog);
    } catch (error) {
      console.warn(`Background daily log save notice for ${targetDate}:`, error);
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

  const handleToggleHabit = (habitId: string) => {
    handleToggleHabitForDate(selectedDate, habitId);
  };

  // State & Handlers for Daily Note
  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleSaveDailyNote = async (targetDate: string, noteText: string) => {
    if (!currentUser?.uid) return;
    const dateKey = getLocalDateKey(targetDate);
    setIsSavingNote(true);

    try {
      const updatedLog = await saveDailyNote(currentUser.uid, dateKey, noteText);

      if (dateKey === selectedDate) {
        setDailyLog((prev) => ({
          ...prev,
          note: noteText,
        }));
      }

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

  // Google Calendar Integration Handlers
  const handleConnectGoogleCalendar = async () => {
    if (!currentUser?.uid) return;
    const res = await connectGoogleCalendar();

    const now = new Date().toISOString();
    const updatedUser = await updateUserProfile(currentUser.uid, {
      googleCalendarConnected: true,
      googleCalendarEmail: res.email || currentUser.email || undefined,
      lastGoogleCalendarSync: now,
    });
    setCurrentUser(updatedUser);
    setCachedUserProfile(updatedUser);

    // Automatically perform initial sync of scheduled habits
    setIsSyncingCalendar(true);
    try {
      const syncRes = await syncAllHabitsToGoogleCalendar(habits, res.accessToken);
      if (syncRes.success && syncRes.updatedHabits) {
        setHabits(syncRes.updatedHabits);
        setCachedHabits(currentUser.uid, syncRes.updatedHabits);
        for (const h of syncRes.updatedHabits) {
          if (h.googleCalendarSynced) {
            await saveHabitSetting(currentUser.uid, h);
          }
        }
      }
    } catch (err) {
      console.warn('Initial calendar sync notice:', err);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    if (!currentUser?.uid) return;
    disconnectGoogleCalendar();
    const updatedUser = await updateUserProfile(currentUser.uid, {
      googleCalendarConnected: false,
      googleCalendarEmail: undefined,
      lastGoogleCalendarSync: undefined,
    });
    setCurrentUser(updatedUser);
    setCachedUserProfile(updatedUser);
  };

  const handleSyncHabitsToCalendar = async (): Promise<CalendarSyncResult | null> => {
    if (!currentUser?.uid) return null;

    let token = getCachedCalendarToken();
    if (!token) {
      // Prompt OAuth connection if token not currently in memory
      const conn = await connectGoogleCalendar();
      token = conn.accessToken;
      const updatedUser = await updateUserProfile(currentUser.uid, {
        googleCalendarConnected: true,
        googleCalendarEmail: conn.email || currentUser.email || undefined,
      });
      setCurrentUser(updatedUser);
      setCachedUserProfile(updatedUser);
    }

    setIsSyncingCalendar(true);
    try {
      const result = await syncAllHabitsToGoogleCalendar(habits, token);
      if (result.success && result.updatedHabits) {
        setHabits(result.updatedHabits);
        setCachedHabits(currentUser.uid, result.updatedHabits);
        for (const h of result.updatedHabits) {
          if (h.googleCalendarSynced) {
            await saveHabitSetting(currentUser.uid, h);
          }
        }
        const now = new Date().toISOString();
        const updated = await updateUserProfile(currentUser.uid, {
          lastGoogleCalendarSync: now,
        });
        setCurrentUser(updated);
        setCachedUserProfile(updated);
      }
      return result;
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  // Save changes from HabitModal
  const handleSaveHabitFromProfile = async (
    data: {
      name: string;
      target: string;
      icon: string;
      time?: string;
      reminderEnabled?: boolean;
      reminderTime?: string;
    },
    editingHabit?: HabitItem | null
  ) => {
    if (!currentUser?.uid) return;

    const scheduledTime = data.time || data.reminderTime;
    let savedHabit: HabitItem;

    if (editingHabit) {
      savedHabit = {
        ...editingHabit,
        name: data.name,
        target: data.target,
        icon: data.icon,
        time: scheduledTime,
        reminderEnabled: !!scheduledTime,
        reminderTime: scheduledTime || '08:00',
      };

      const nextHabits = habits.map((h) => (h.id === savedHabit.id ? savedHabit : h));
      setHabits(nextHabits);
      setCachedHabits(currentUser.uid, nextHabits);
      await saveHabitSetting(currentUser.uid, savedHabit);
    } else {
      const newId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      savedHabit = {
        id: newId,
        name: data.name,
        target: data.target,
        icon: data.icon,
        order: habits.length,
        time: scheduledTime,
        reminderEnabled: !!scheduledTime,
        reminderTime: scheduledTime || '08:00',
        createdAt: new Date().toISOString(),
      };

      const nextHabits = [...habits, savedHabit];
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

      await saveHabitSetting(currentUser.uid, savedHabit);
      await saveDailyLog(currentUser.uid, updatedLog);
    }

    // If Google Calendar is connected, automatically sync this habit to Google Calendar
    if (currentUser.googleCalendarConnected && scheduledTime) {
      const token = getCachedCalendarToken();
      if (token) {
        try {
          const { habit: syncedHabit } = await syncHabitToGoogleCalendar(savedHabit, token);
          const withSync = habits.map((h) => (h.id === syncedHabit.id ? syncedHabit : h));
          setHabits(withSync);
          setCachedHabits(currentUser.uid, withSync);
          await saveHabitSetting(currentUser.uid, syncedHabit);
        } catch (err) {
          console.warn('Auto calendar sync error for habit:', err);
        }
      }
    }
  };

  // Delete habit handler
  const handleDeleteHabitFromProfile = async (habitId: string) => {
    if (!currentUser?.uid) return;

    const habitToDelete = habits.find((h) => h.id === habitId);
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

    // If habit had a synced Google Calendar event, remove it from calendar
    if (currentUser.googleCalendarConnected && habitToDelete?.googleCalendarEventId) {
      const token = getCachedCalendarToken();
      if (token) {
        try {
          await deleteHabitFromGoogleCalendar(habitToDelete.googleCalendarEventId, token);
        } catch (err) {
          console.warn('Calendar event deletion notice:', err);
        }
      }
    }
  };

  // Select a date from history or return to today
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  // If not authenticated, show clean landing / login view
  if (!currentUser) {
    return (
      <LandingPage
        onGetStarted={handleGoogleSignIn}
        isLoading={isAuthLoading}
        error={authError}
        notification={landingNotification}
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
    <div className="min-h-screen relative bg-zinc-100/70 dark:bg-[#0d0d11] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors overflow-x-hidden">
      {/* Ambient background light gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] sm:w-[700px] h-[350px] bg-gradient-to-b from-zinc-200/50 via-zinc-300/20 to-transparent dark:from-zinc-800/25 dark:via-zinc-900/10 dark:to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[40%] -left-32 w-72 h-72 bg-gradient-to-tr from-zinc-300/30 to-transparent dark:from-zinc-800/15 dark:to-transparent rounded-full blur-3xl opacity-60" />
        <div className="absolute top-[65%] -right-32 w-80 h-80 bg-gradient-to-tl from-zinc-300/30 to-transparent dark:from-zinc-800/15 dark:to-transparent rounded-full blur-3xl opacity-60" />
      </div>

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
          className="relative z-10 bg-amber-500/10 dark:bg-amber-500/15 backdrop-blur-md border-b border-amber-500/20 text-amber-900 dark:text-amber-300 px-4 py-2 text-xs text-center font-medium shadow-xs"
        >
          Offline Mode — your habit progress is preserved and will sync when you reconnect.
        </div>
      )}

      {/* Main Single Page Content */}
      <main id="main-content" className="relative z-10 flex-1 max-w-2xl w-full mx-auto p-3 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Date Selector / Notice when viewing historical past days */}
        {!isToday && (
          <div
            id="past-date-banner"
            className="flex items-center justify-between p-3 rounded-xl glass-card text-xs text-zinc-800 dark:text-zinc-200 animate-slideUp"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Viewing past date:</span>
              <span className="font-mono">{formatHeaderDate(selectedDate)}</span>
            </div>
            <button
              id="return-to-today-btn"
              type="button"
              onClick={() => setSelectedDate(todayDate)}
              className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100 hover:opacity-80 transition-opacity underline cursor-pointer active:scale-[0.98]"
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

      {/* Profile, Manage Habits, Analytics & Integrations Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onUpdateProfile={handleUpdateProfile}
        habits={habits}
        onSaveHabit={handleSaveHabitFromProfile}
        onDeleteHabit={handleDeleteHabitFromProfile}
        onConnectGoogleCalendar={handleConnectGoogleCalendar}
        onDisconnectGoogleCalendar={handleDisconnectGoogleCalendar}
        onSyncHabitsToCalendar={handleSyncHabitsToCalendar}
        isSyncingCalendar={isSyncingCalendar}
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
        onDismiss={handleDismissWeeklyWeight}
        onSaveWeight={handleSaveWeeklyWeight}
        onSave={handleSaveWeeklyWeight}
        currentWeight={currentUser?.weight}
        currentUnit={currentUser?.weightUnit}
      />

      {/* Subtle Footer */}
      <footer id="app-footer" className="py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">
        Track • Improve • Achieve
      </footer>
    </div>
  );
}

export default App;

