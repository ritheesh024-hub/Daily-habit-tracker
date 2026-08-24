/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
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
} from './types';
import { getTodayDateString, formatHeaderDate } from './lib/dateUtils';
import {
  createDefaultDailyLog,
  countCompletedInMap,
  fetchUserHabitSettings,
  saveHabitSetting,
  deleteHabitSetting,
  fetchDailyLog,
  saveDailyLog,
  syncUserProfile,
  updateUserDisplayName,
  fetchHabitHistoryAndStreaks,
  calculateStreaks,
} from './lib/habitService';
import {
  triggerBrowserNotification,
} from './lib/reminderService';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { StreakStatsCard } from './components/StreakStatsCard';
import { HabitList } from './components/HabitList';
import { HistoryList } from './components/HistoryList';
import { ProfileModal, TabType } from './components/ProfileModal';
import { LoginView } from './components/LoginView';
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
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // User's habit configuration
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [isHabitsConfigLoading, setIsHabitsConfigLoading] = useState<boolean>(true);

  // Daily log state for selected date
  const [dailyLog, setDailyLog] = useState<DailyLogData>(() =>
    createDefaultDailyLog(getTodayDateString(), 8)
  );
  const [isDailyLogLoading, setIsDailyLogLoading] = useState<boolean>(false);
  const [isSavingLog, setIsSavingLog] = useState<boolean>(false);

  // 7-day history & streak states
  const [history, setHistory] = useState<DayHistorySummary[]>([]);
  const [historyMap, setHistoryMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [rawLogsMap, setRawLogsMap] = useState<Record<string, DailyLogData>>({});
  const [streaks, setStreaks] = useState<StreakStats>({ currentStreak: 0, bestStreak: 0 });
  const [analytics, setAnalytics] = useState<AnalyticsStats>(DEFAULT_ANALYTICS);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  // Profile Modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [profileModalTab, setProfileModalTab] = useState<TabType>('analytics');

  // Active Toast reminders in state
  const [activeReminders, setActiveReminders] = useState<ActiveReminderNotice[]>([]);
  const notifiedHabitTimesRef = useRef<Record<string, boolean>>({});

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

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        if (user) {
          const profile = await syncUserProfile(user);
          setCurrentUser(profile);
          setAuthError(null);
        } else {
          setCurrentUser(null);
          setHabits([]);
          setHistory([]);
          setHistoryMap({});
          setRawLogsMap({});
          setStreaks({ currentStreak: 0, bestStreak: 0 });
          setAnalytics(DEFAULT_ANALYTICS);
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

  // Daily Reset & Midnight Handler: Detect date change when calendar day rolls over or tab regains focus
  useEffect(() => {
    const checkMidnightRollover = () => {
      const realToday = getTodayDateString();
      setTodayDate((prevToday) => {
        if (realToday !== prevToday) {
          // If the user was on the previous "today", advance their view to the fresh new day
          setSelectedDate((prevSelected) =>
            prevSelected === prevToday ? realToday : prevSelected
          );
          // Clear reminder notification triggers for new day
          notifiedHabitTimesRef.current = {};
          return realToday;
        }
        return prevToday;
      });
    };

    // Check periodically every 15 seconds
    const interval = setInterval(checkMidnightRollover, 15000);

    // Also check on tab focus / visibility change (e.g. laptop opened in morning)
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

  // Load habit settings when user signs in
  useEffect(() => {
    if (!currentUser?.uid) return;

    let isMounted = true;
    setIsHabitsConfigLoading(true);

    fetchUserHabitSettings(currentUser.uid)
      .then((userHabits) => {
        if (isMounted) {
          setHabits(userHabits);
          setIsHabitsConfigLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load user habit settings:', err);
        if (isMounted) setIsHabitsConfigLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Load daily log and 7-day history + streaks + analytics
  const loadDayData = useCallback(
    async (userId: string, date: string, currentHabits: HabitItem[]) => {
      setIsDailyLogLoading(true);
      setIsHistoryLoading(true);

      try {
        const [log, historyData] = await Promise.all([
          fetchDailyLog(userId, date, currentHabits),
          fetchHabitHistoryAndStreaks(userId, todayDate, currentHabits),
        ]);

        setDailyLog(log);
        setHistory(historyData.history7Days);
        setHistoryMap(historyData.historyMap);
        setRawLogsMap(historyData.rawLogsMap);
        setStreaks(historyData.streaks);
        setAnalytics(historyData.analytics);
      } catch (err) {
        console.error('Failed to load day data from Firestore:', err);
      } finally {
        setIsDailyLogLoading(false);
        setIsHistoryLoading(false);
      }
    },
    [todayDate]
  );

  useEffect(() => {
    if (currentUser?.uid && !isHabitsConfigLoading) {
      loadDayData(currentUser.uid, selectedDate, habits);
    }
  }, [currentUser?.uid, selectedDate, habits, isHabitsConfigLoading, loadDayData]);

  // Habit Reminder Scheduler Loop
  useEffect(() => {
    if (habits.length === 0) return;

    const checkReminders = () => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayStr = getTodayDateString();

      habits.forEach((habit) => {
        if (!habit.reminderEnabled || !habit.reminderTime) return;

        // Check if current time matches scheduled habit reminder time
        if (habit.reminderTime === currentTimeStr) {
          const triggerKey = `${habit.id}_${todayStr}_${currentTimeStr}`;
          if (!notifiedHabitTimesRef.current[triggerKey]) {
            notifiedHabitTimesRef.current[triggerKey] = true;

            // Trigger browser notification
            triggerBrowserNotification(habit);

            // Display in-app reminder toast
            const noticeId = `${habit.id}-${Date.now()}`;
            setActiveReminders((prev) => [
              ...prev.filter((item) => item.habit.id !== habit.id),
              { id: noticeId, habit, timestamp: Date.now() },
            ]);
          }
        }
      });
    };

    // Run reminder check immediately and every 15 seconds
    checkReminders();
    const timer = setInterval(checkReminders, 15000);

    return () => clearInterval(timer);
  }, [habits]);

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await syncUserProfile(result.user);
      setCurrentUser(profile);
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User voluntarily closed popup - do not show scary error
        setAuthError(null);
      } else if (error.code === 'auth/network-request-failed') {
        setAuthError('Network error. Please check your internet connection and try again.');
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        setAuthError('Could not sign in with Google. Please check your connection and try again.');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle Sign-out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setSelectedDate(todayDate);
      setHabits([]);
      setDailyLog(createDefaultDailyLog(todayDate, 8));
      setHistory([]);
      setHistoryMap({});
      setRawLogsMap({});
      setStreaks({ currentStreak: 0, bestStreak: 0 });
      setAnalytics(DEFAULT_ANALYTICS);
      setIsProfileModalOpen(false);
      setActiveReminders([]);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Handle Display Name Edit
  const handleUpdateDisplayName = async (newName: string) => {
    if (!currentUser?.uid) return;
    await updateUserDisplayName(currentUser.uid, newName);
    setCurrentUser((prev) => (prev ? { ...prev, displayName: newName } : null));
  };

  // Toggle habit checkbox with immediate optimistic update and Firestore sync
  const handleToggleHabit = async (habitId: string) => {
    if (!currentUser?.uid) return;

    const currentCompleted = !!dailyLog.completedHabits[habitId];
    const updatedMap = {
      ...dailyLog.completedHabits,
      [habitId]: !currentCompleted,
    };

    const activeIds = habits.map((h) => h.id);
    const completedCount = countCompletedInMap(updatedMap, activeIds);
    const totalActiveCount = habits.length;

    const updatedLog: DailyLogData = {
      ...dailyLog,
      completedHabits: updatedMap,
      completedCount,
      totalActiveCount,
    };

    // Optimistic UI state update for current day log
    setDailyLog(updatedLog);

    // Update historyMap and recalculate streaks immediately
    const updatedHistoryMap = {
      ...historyMap,
      [selectedDate]: { completed: completedCount, total: totalActiveCount },
    };
    setHistoryMap(updatedHistoryMap);
    setRawLogsMap((prev) => ({ ...prev, [selectedDate]: updatedLog }));

    const newStreaks = calculateStreaks(updatedHistoryMap, todayDate);
    setStreaks(newStreaks);

    // Update 7-day history list in local state immediately
    const percentage = totalActiveCount > 0 ? Math.round((completedCount / totalActiveCount) * 100) : 0;
    const isCompleted = totalActiveCount > 0 && completedCount >= totalActiveCount;

    setHistory((prevHistory) =>
      prevHistory.map((item) =>
        item.date === selectedDate
          ? {
              ...item,
              completedCount,
              totalCount: totalActiveCount,
              percentage,
              isCompleted,
            }
          : item
      )
    );

    // Update analytics immediately
    setAnalytics((prev) => ({
      ...prev,
      currentStreak: newStreaks.currentStreak,
      bestStreak: newStreaks.bestStreak,
      todayPercentage: selectedDate === todayDate ? percentage : prev.todayPercentage,
      totalCompletedHabits: !currentCompleted
        ? prev.totalCompletedHabits + 1
        : Math.max(0, prev.totalCompletedHabits - 1),
    }));

    // Save to Firestore in background
    setIsSavingLog(true);
    try {
      await saveDailyLog(currentUser.uid, updatedLog);
    } catch (error) {
      console.error('Failed to save daily log to Firestore:', error);
    } finally {
      setIsSavingLog(false);
    }
  };

  // Save changes from HabitModal in Profile Management (Add or Edit)
  const handleSaveHabitFromProfile = async (
    data: { name: string; target: string; icon: string; reminderEnabled?: boolean; reminderTime?: string },
    editingHabit?: HabitItem | null
  ) => {
    if (!currentUser?.uid) return;

    if (editingHabit) {
      // Editing existing habit
      const updatedHabit: HabitItem = {
        ...editingHabit,
        name: data.name,
        target: data.target,
        icon: data.icon,
        reminderEnabled: typeof data.reminderEnabled === 'boolean' ? data.reminderEnabled : editingHabit.reminderEnabled,
        reminderTime: data.reminderTime || editingHabit.reminderTime || '08:00',
      };

      await saveHabitSetting(currentUser.uid, updatedHabit);

      const nextHabits = habits.map((h) => (h.id === updatedHabit.id ? updatedHabit : h));
      setHabits(nextHabits);

      // Refresh analytics with updated habit labels
      loadDayData(currentUser.uid, selectedDate, nextHabits);
    } else {
      // Adding new habit
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

      await saveHabitSetting(currentUser.uid, newHabit);

      const nextHabits = [...habits, newHabit];
      setHabits(nextHabits);

      // Update current day log total count
      const activeIds = nextHabits.map((h) => h.id);
      const newCompletedCount = countCompletedInMap(dailyLog.completedHabits, activeIds);
      const updatedLog: DailyLogData = {
        ...dailyLog,
        completedCount: newCompletedCount,
        totalActiveCount: nextHabits.length,
      };
      setDailyLog(updatedLog);
      await saveDailyLog(currentUser.uid, updatedLog);

      loadDayData(currentUser.uid, selectedDate, nextHabits);
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

    // Optimistic local state update
    const nextHabits = habits.map((h) => (h.id === habitId ? updatedHabit : h));
    setHabits(nextHabits);

    // Save to Firestore
    try {
      await saveHabitSetting(currentUser.uid, updatedHabit);
    } catch (err) {
      console.error('Failed to update habit reminder setting:', err);
    }
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

  // Mark habit done directly from in-app toast
  const handleCompleteHabitFromToast = (habitId: string) => {
    if (!dailyLog.completedHabits[habitId]) {
      handleToggleHabit(habitId);
    }
  };

  // Delete habit handler from Profile Management
  const handleDeleteHabitFromProfile = async (habitId: string) => {
    if (!currentUser?.uid) return;

    await deleteHabitSetting(currentUser.uid, habitId);

    const nextHabits = habits.filter((h) => h.id !== habitId);
    setHabits(nextHabits);

    // Recalculate completed count for current log
    const activeIds = nextHabits.map((h) => h.id);
    const newCompletedCount = countCompletedInMap(dailyLog.completedHabits, activeIds);
    const updatedLog: DailyLogData = {
      ...dailyLog,
      completedCount: newCompletedCount,
      totalActiveCount: nextHabits.length,
    };
    setDailyLog(updatedLog);

    await saveDailyLog(currentUser.uid, updatedLog);
    loadDayData(currentUser.uid, selectedDate, nextHabits);
  };

  // Select a date from history or return to today
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  // If checking auth initially
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Loading Daily Habits...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, show minimal Google login view
  if (!currentUser) {
    return (
      <LoginView
        onSignInWithGoogle={handleGoogleSignIn}
        isLoading={isAuthLoading}
        error={authError}
      />
    );
  }

  const activeIds = habits.map((h) => h.id);
  const completedCount = countCompletedInMap(dailyLog.completedHabits, activeIds);
  const totalCount = habits.length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans antialiased selection:bg-zinc-200">
      {/* Header with profile trigger */}
      <Header
        user={currentUser}
        currentDate={selectedDate}
        onSignOut={handleSignOut}
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
          className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-1.5 text-xs text-center font-medium"
        >
          Offline Mode — your habit progress is preserved and will sync when you reconnect.
        </div>
      )}

      {/* Main Single Page Content */}
      <main id="main-content" className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Date Selector / Notice when viewing historical past days */}
        {!isToday && (
          <div
            id="past-date-banner"
            className="flex items-center justify-between p-3 rounded-lg bg-zinc-200/80 border border-zinc-300/80 text-xs text-zinc-800"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900">Viewing past date:</span>
              <span className="font-mono">{formatHeaderDate(selectedDate)}</span>
            </div>
            <button
              id="return-to-today-btn"
              type="button"
              onClick={() => setSelectedDate(todayDate)}
              className="inline-flex items-center gap-1 font-medium text-zinc-900 hover:text-black underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Today
            </button>
          </div>
        )}

        {/* Streaks Statistics (Current & Best Streak) */}
        <StreakStatsCard stats={streaks} />

        {/* Daily Completion Progress Section */}
        <ProgressBar
          completed={completedCount}
          total={totalCount}
        />

        {/* Habit List Section (Clean & Simple: Checkbox, Name, Target) */}
        <section id="habit-checklist-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="checklist-heading" className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
              {isToday ? "Today's Checklist" : `Checklist for ${formatHeaderDate(selectedDate)}`}
            </h2>
            {(isDailyLogLoading || isHabitsConfigLoading) && (
              <span className="text-xs text-zinc-400 font-mono">Syncing...</span>
            )}
          </div>

          <HabitList
            habits={habits}
            completedHabits={dailyLog.completedHabits}
            onToggleHabit={handleToggleHabit}
            disabled={isDailyLogLoading || isHabitsConfigLoading}
          />
        </section>

        {/* 7-Day History Section */}
        <HistoryList
          history={history}
          currentSelectedDate={selectedDate}
          todayDate={todayDate}
          onSelectDate={handleSelectDate}
          isLoading={isHistoryLoading}
        />
      </main>

      {/* Profile, Manage Habits, Analytics & Reminders Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onUpdateDisplayName={handleUpdateDisplayName}
        habits={habits}
        onSaveHabit={handleSaveHabitFromProfile}
        onDeleteHabit={handleDeleteHabitFromProfile}
        onUpdateHabitReminder={handleUpdateHabitReminder}
        onTestNotification={handleTestNotification}
        analytics={analytics}
        rawLogsMap={rawLogsMap}
        todayDate={todayDate}
        onSignOut={handleSignOut}
        initialTab={profileModalTab}
      />

      {/* Active In-App Reminder Notifications */}
      <ReminderToast
        reminders={activeReminders}
        onDismiss={handleDismissReminder}
        onCompleteHabit={handleCompleteHabitFromToast}
      />

      {/* Subtle Footer */}
      <footer id="app-footer" className="py-4 border-t border-zinc-200/80 text-center text-xs text-zinc-400 font-mono">
        Daily Habits • Personal Routine Tracker
      </footer>
    </div>
  );
}
