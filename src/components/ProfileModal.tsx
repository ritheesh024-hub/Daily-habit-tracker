import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Award,
  Calendar,
  Clock,
  LogOut,
  AlertCircle,
  User,
  ListOrdered,
  BarChart2,
  Sun,
  Moon,
  Monitor,
  AlertTriangle,
  Scale,
  ShieldAlert,
  Download,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Unlink,
} from 'lucide-react';
import {
  HabitItem,
  UserProfile,
  AnalyticsStats,
  DailyLogData,
  Milestone,
  ThemeMode,
  CalendarSyncResult,
} from '../types';
import { HabitIcon } from './HabitIcon';
import { HabitModal } from './HabitModal';
import { AnalyticsView } from './AnalyticsView';
import { MilestonesView } from './MilestonesView';
import { calculateAge, isValidDateOfBirth, getLocalDateKey } from '../lib/dateUtils';
import { formatTime12Hour } from '../lib/googleCalendarService';

export type TabType = 'analytics' | 'milestones' | 'habits' | 'integrations' | 'profile';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateProfile: (updates: {
    displayName: string;
    dateOfBirth?: string;
    height?: number;
    heightUnit?: 'cm' | 'in';
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
    googleCalendarConnected?: boolean;
    googleCalendarEmail?: string;
    lastGoogleCalendarSync?: string;
  }) => Promise<void>;
  habits: HabitItem[];
  onSaveHabit: (
    data: { name: string; target: string; icon: string; time?: string; reminderEnabled?: boolean; reminderTime?: string },
    editingHabit?: HabitItem | null
  ) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onConnectGoogleCalendar: () => Promise<void>;
  onDisconnectGoogleCalendar: () => Promise<void>;
  onSyncHabitsToCalendar: () => Promise<CalendarSyncResult | null>;
  isSyncingCalendar?: boolean;
  analytics: AnalyticsStats;
  milestones?: Milestone[];
  rawLogsMap?: Record<string, DailyLogData>;
  todayDate?: string;
  onSignOut: () => void;
  onExportData?: () => void;
  onClearData?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  initialTab?: TabType;
  theme?: ThemeMode;
  onThemeChange?: (newTheme: ThemeMode) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  habits,
  onSaveHabit,
  onDeleteHabit,
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar,
  onSyncHabitsToCalendar,
  isSyncingCalendar = false,
  analytics,
  milestones = [],
  rawLogsMap = {},
  todayDate = getLocalDateKey(),
  onSignOut,
  onExportData,
  onClearData,
  onDeleteAccount,
  initialTab = 'analytics',
  theme = 'system',
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Edit Profile State
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>('cm');
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Clear Data & Delete Account State
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isClearSuccess, setIsClearSuccess] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);

  // Manage Habits Modal State
  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<HabitItem | null>(null);
  const [isDeletingHabit, setIsDeletingHabit] = useState(false);

  // Google Calendar Integration State
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [calendarActionError, setCalendarActionError] = useState<string | null>(null);
  const [calendarSyncSuccessMessage, setCalendarSyncSuccessMessage] = useState<string | null>(null);

  // Calculate age live from the currently entered date of birth
  const liveAge = useMemo(() => {
    return calculateAge(dobInput);
  }, [dobInput]);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayNameInput(user.displayName);
    } else if (user?.email && typeof user.email === 'string') {
      setDisplayNameInput(user.email.split('@')[0] || '');
    } else {
      setDisplayNameInput('');
    }

    if (user?.dateOfBirth) {
      setDobInput(user.dateOfBirth);
    } else {
      setDobInput('');
    }

    if (user?.height !== undefined && user?.height !== null) {
      setHeightInput(String(user.height));
    } else {
      setHeightInput('');
    }
    setHeightUnit(user?.heightUnit || 'cm');

    if (user?.weight !== undefined && user?.weight !== null) {
      setWeightInput(String(user.weight));
    } else {
      setWeightInput('');
    }
    setWeightUnit(user?.weightUnit || 'kg');

    setFormError(null);
    setProfileSavedSuccess(false);
    setShowClearDataConfirm(false);
    setShowDeleteAccountConfirm(false);
    setAccountActionError(null);
    setCalendarActionError(null);
    setCalendarSyncSuccessMessage(null);
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setProfileSavedSuccess(false);

    const trimmedName = displayNameInput.trim();
    if (!trimmedName) {
      setFormError('Display name cannot be empty.');
      return;
    }

    if (dobInput && !isValidDateOfBirth(dobInput)) {
      setFormError('Please select a valid past date of birth.');
      return;
    }

    const numHeight = heightInput.trim() ? parseFloat(heightInput.trim()) : undefined;
    const numWeight = weightInput.trim() ? parseFloat(weightInput.trim()) : undefined;

    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        displayName: trimmedName,
        dateOfBirth: dobInput || undefined,
        height: numHeight && numHeight > 0 ? numHeight : undefined,
        heightUnit,
        weight: numWeight && numWeight > 0 ? numWeight : undefined,
        weightUnit,
      });
      setProfileSavedSuccess(true);
      setTimeout(() => setProfileSavedSuccess(false), 3000);
    } catch {
      setFormError('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleExportData = () => {
    if (onExportData) {
      onExportData();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
      return;
    }
    try {
      const exportPayload = {
        app: 'Daily Habits',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        user: {
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
          dateOfBirth: user?.dateOfBirth,
          height: user?.height,
          heightUnit: user?.heightUnit,
          weight: user?.weight,
          weightUnit: user?.weightUnit,
          googleCalendarConnected: user?.googleCalendarConnected,
          lastGoogleCalendarSync: user?.lastGoogleCalendarSync,
          createdAt: user?.createdAt,
          lastLoginAt: user?.lastLoginAt,
        },
        habits,
        dailyLogs: rawLogsMap,
        milestones,
        analytics,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const dateStr = todayDate || getLocalDateKey();
      downloadAnchor.setAttribute('download', `daily-habits-backup-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const handleExecuteClearData = async () => {
    if (!onClearData || isClearingData) return;
    setIsClearingData(true);
    setAccountActionError(null);
    try {
      await onClearData();
      setIsClearSuccess(true);
      setTimeout(() => {
        setIsClearSuccess(false);
        setShowClearDataConfirm(false);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to clear user data technical error:', err);
      setAccountActionError(err?.message || 'Unable to clear your data. Please try again.');
    } finally {
      setIsClearingData(false);
    }
  };

  const handleExecuteDeleteAccount = async () => {
    if (!onDeleteAccount || isDeletingAccount) return;
    setIsDeletingAccount(true);
    setAccountActionError(null);
    try {
      await onDeleteAccount();
      setShowDeleteAccountConfirm(false);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      setAccountActionError(
        err?.message || 'Failed to delete account. You may need to sign in again to verify identity.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleOpenAddHabit = () => {
    setHabitToEdit(null);
    setIsHabitFormOpen(true);
  };

  const handleOpenEditHabit = (habit: HabitItem) => {
    setHabitToEdit(habit);
    setIsHabitFormOpen(true);
  };

  const handleConfirmDeleteHabit = async () => {
    if (!habitToDelete) return;
    setIsDeletingHabit(true);
    try {
      await onDeleteHabit(habitToDelete.id);
      setHabitToDelete(null);
    } catch (err) {
      console.error('Error deleting habit:', err);
    } finally {
      setIsDeletingHabit(false);
    }
  };

  const handleConnectCalendar = async () => {
    setIsConnectingCalendar(true);
    setCalendarActionError(null);
    setCalendarSyncSuccessMessage(null);
    try {
      await onConnectGoogleCalendar();
    } catch (err: any) {
      setCalendarActionError(err.message || 'Failed to connect Google Calendar.');
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    setCalendarActionError(null);
    setCalendarSyncSuccessMessage(null);
    try {
      await onDisconnectGoogleCalendar();
    } catch (err: any) {
      setCalendarActionError(err.message || 'Failed to disconnect Google Calendar.');
    }
  };

  const handleTriggerSync = async () => {
    setCalendarActionError(null);
    setCalendarSyncSuccessMessage(null);
    try {
      const res = await onSyncHabitsToCalendar();
      if (res && res.success) {
        setCalendarSyncSuccessMessage(
          `Successfully synchronized ${res.syncedCount} habit${res.syncedCount === 1 ? '' : 's'} to Google Calendar!`
        );
        setTimeout(() => setCalendarSyncSuccessMessage(null), 5000);
      } else if (res && res.error) {
        setCalendarActionError(res.error);
      }
    } catch (err: any) {
      setCalendarActionError(err.message || 'Failed to sync habits with Google Calendar.');
    }
  };

  const scheduledHabitsCount = habits.filter((h) => !!(h.time || h.reminderTime)).length;

  return (
    <>
      <div
        id="profile-modal-backdrop"
        className="fixed inset-0 z-40 bg-black/50 dark:bg-black/75 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          id="profile-modal-card"
          className="w-full max-w-xl glass-modal rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header with Profile Card */}
          <div className="p-4 sm:p-5 border-b border-zinc-200/80 dark:border-white/10 bg-white/40 dark:bg-zinc-900/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    id="profile-modal-avatar"
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-white/60 dark:border-white/15 object-cover shadow-sm ring-2 ring-zinc-200/50 dark:ring-zinc-800/60"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-900 dark:from-zinc-700 dark:to-zinc-800 text-white flex items-center justify-center text-base font-semibold shadow-sm ring-2 ring-zinc-200/50 dark:ring-zinc-800/60">
                    {((user?.displayName || user?.email || 'U')[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 id="profile-modal-name" className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {user?.displayName || (user?.email && typeof user.email === 'string' ? user.email.split('@')[0] : '') || 'User'}
                  </h2>
                  <p id="profile-modal-email" className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                    {user?.email || 'No email provided'}
                  </p>
                </div>
              </div>

              <button
                id="close-profile-modal-btn"
                type="button"
                onClick={onClose}
                className="text-zinc-400 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 p-1.5 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-zinc-200/60 dark:border-white/10 overflow-x-auto no-scrollbar">
              <button
                type="button"
                id="tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'analytics'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button
                type="button"
                id="tab-milestones"
                onClick={() => setActiveTab('milestones')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'milestones'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Milestones</span>
                {milestones.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                      activeTab === 'milestones'
                        ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                        : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {milestones.filter((m) => m.isUnlocked).length}/{milestones.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="tab-habits"
                onClick={() => setActiveTab('habits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'habits'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Manage Habits</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                    activeTab === 'habits'
                      ? 'bg-zinc-700 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900'
                      : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {habits.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-integrations"
                onClick={() => setActiveTab('integrations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'integrations'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Integrations</span>
                {user?.googleCalendarConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                )}
              </button>

              <button
                type="button"
                id="tab-profile"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'profile'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm scale-[1.02]'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-white/5'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>
            </div>
          </div>

          {/* Modal Body / Tab Content */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {/* TAB 1: ANALYTICS & INSIGHTS */}
            {activeTab === 'analytics' && (
              <AnalyticsView analytics={analytics} rawLogsMap={rawLogsMap} />
            )}

            {/* TAB 2: MILESTONES & ACHIEVEMENTS */}
            {activeTab === 'milestones' && (
              <MilestonesView milestones={milestones} />
            )}

            {/* TAB 3: MANAGE HABITS */}
            {activeTab === 'habits' && (
              <div id="manage-habits-panel" className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                      Your Habits ({habits.length})
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Add, update scheduled times, or remove habits.
                    </p>
                  </div>
                  <button
                    type="button"
                    id="add-new-habit-btn"
                    onClick={handleOpenAddHabit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Habit</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                  {(Array.isArray(habits) ? habits : []).map((habit) => {
                    const timeVal = habit.time || habit.reminderTime;
                    return (
                      <div
                        key={habit.id}
                        id={`manage-habit-card-${habit.id}`}
                        className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 rounded-xl flex items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shrink-0 shadow-2xs">
                            <HabitIcon name={habit.icon} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {habit.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {habit.target && (
                                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                                  {habit.target}
                                </span>
                              )}
                              {timeVal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatTime12Hour(timeVal)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            id={`edit-habit-btn-${habit.id}`}
                            onClick={() => handleOpenEditHabit(habit)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer"
                            title="Edit Habit"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            id={`delete-habit-btn-${habit.id}`}
                            onClick={() => setHabitToDelete(habit)}
                            className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Habit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {habits.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">
                      No habits found. Click "+ Add Habit" above to create one.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: INTEGRATIONS (GOOGLE CALENDAR) */}
            {activeTab === 'integrations' && (
              <div id="integrations-panel" className="space-y-4">
                {/* Main Google Calendar Card */}
                <div
                  id="google-calendar-integration-card"
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-sm">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                          Google Calendar
                          {user?.googleCalendarConnected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Connected
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          Sync your scheduled habits with Google Calendar and receive reminders from Google Calendar.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Messages */}
                  {calendarActionError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <span>{calendarActionError}</span>
                    </div>
                  )}

                  {calendarSyncSuccessMessage && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{calendarSyncSuccessMessage}</span>
                    </div>
                  )}

                  {/* Disconnected State */}
                  {!user?.googleCalendarConnected ? (
                    <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-700/80 space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <div className="p-2.5 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/70 dark:border-white/5">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-200">Daily Recurring Events</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Habits with scheduled times appear automatically in your daily calendar.
                          </p>
                        </div>
                        <div className="p-2.5 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/70 dark:border-white/5">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-200">Phone & Desktop Alerts</p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Receive notifications via Google Calendar at your scheduled times.
                          </p>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          {scheduledHabitsCount} habit{scheduledHabitsCount === 1 ? '' : 's'} ready to sync
                        </span>
                        <button
                          type="button"
                          id="connect-google-calendar-btn"
                          onClick={handleConnectCalendar}
                          disabled={isConnectingCalendar}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isConnectingCalendar ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Connect Google Calendar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Connected State */
                    <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-700/80 space-y-4">
                      {/* Connection Details */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-white/5">
                        <div>
                          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Connected Account
                          </p>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 font-mono truncate">
                            {user?.googleCalendarEmail || user?.email || 'Google Calendar'}
                          </p>
                          {user?.lastGoogleCalendarSync && (
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono mt-0.5">
                              Last synced: {new Date(user.lastGoogleCalendarSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>

                        {/* Action Buttons: Sync Habits & Disconnect */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            id="sync-habits-calendar-btn"
                            onClick={handleTriggerSync}
                            disabled={isSyncingCalendar}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                            <span>{isSyncingCalendar ? 'Syncing...' : 'Sync Habits'}</span>
                          </button>

                          <button
                            type="button"
                            id="disconnect-google-calendar-btn"
                            onClick={handleDisconnectCalendar}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span>Disconnect</span>
                          </button>
                        </div>
                      </div>

                      {/* Synced Habits Preview List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                            Calendar Habits ({scheduledHabitsCount})
                          </h4>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                            Daily recurring
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {(Array.isArray(habits) ? habits : []).map((habit) => {
                            const timeVal = habit.time || habit.reminderTime;
                            return (
                              <div
                                key={habit.id}
                                className="p-2 bg-white dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-white/5 rounded-xl flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <HabitIcon name={habit.icon} className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                    {habit.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {timeVal ? (
                                    <span className="text-[11px] font-mono font-medium text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                                      {formatTime12Hour(timeVal)}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">
                                      No time set
                                    </span>
                                  )}
                                  {habit.googleCalendarSynced && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: EDIT PROFILE & PREFERENCES */}
            {activeTab === 'profile' && (
              <div id="edit-profile-panel" className="space-y-4">
                {/* 1. Theme Appearance Mode Selector */}
                <div
                  id="appearance-theme-card"
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Appearance Theme
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Choose your preferred theme mode
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      id="theme-btn-light"
                      onClick={() => onThemeChange && onThemeChange('light')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        theme === 'light'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-300 shadow-2xs font-semibold ring-1 ring-zinc-900 dark:ring-zinc-300'
                          : 'bg-white/70 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Light</span>
                    </button>

                    <button
                      type="button"
                      id="theme-btn-dark"
                      onClick={() => onThemeChange && onThemeChange('dark')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-300 shadow-2xs font-semibold ring-1 ring-zinc-900 dark:ring-zinc-300'
                          : 'bg-white/70 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Dark</span>
                    </button>

                    <button
                      type="button"
                      id="theme-btn-system"
                      onClick={() => onThemeChange && onThemeChange('system')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        theme === 'system'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-300 shadow-2xs font-semibold ring-1 ring-zinc-900 dark:ring-zinc-300'
                          : 'bg-white/70 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>System</span>
                    </button>
                  </div>
                </div>

                {/* 2. Profile Photo */}
                <div
                  id="edit-profile-photo-container"
                  className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-lg"
                >
                  {user?.photoURL ? (
                    <img
                      id="edit-profile-avatar"
                      src={user.photoURL}
                      alt={user.displayName || 'Profile Photo'}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shadow-2xs shrink-0"
                    />
                  ) : (
                    <div
                      id="edit-profile-avatar"
                      className="w-12 h-12 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center text-base font-semibold shrink-0"
                    >
                      {((user?.displayName || user?.email || 'U')[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Profile Account</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {user?.email || 'Connected Account'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-3.5">
                  {/* 3. Name */}
                  <div>
                    <label htmlFor="edit-name-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Name
                    </label>
                    <input
                      id="edit-name-input"
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </div>

                  {/* 4. Date of Birth & Live Age */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="edit-dob-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Date of Birth
                      </label>
                      {liveAge !== null && (
                        <span id="profile-live-age-badge" className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {liveAge} years old
                        </span>
                      )}
                    </div>
                    <input
                      id="edit-dob-input"
                      type="date"
                      value={dobInput}
                      onChange={(e) => setDobInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                    />
                  </div>

                  {/* 5. Height & Weight Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-height-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Height
                      </label>
                      <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
                        <input
                          id="edit-height-input"
                          type="number"
                          step="any"
                          value={heightInput}
                          onChange={(e) => setHeightInput(e.target.value)}
                          placeholder="e.g. 175"
                          className="w-full px-2.5 py-1.5 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                        <select
                          id="edit-height-unit"
                          value={heightUnit}
                          onChange={(e) => setHeightUnit(e.target.value as 'cm' | 'in')}
                          className="px-2 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-l border-zinc-300 dark:border-zinc-700 focus:outline-none cursor-pointer"
                        >
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="edit-weight-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Weight
                      </label>
                      <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
                        <input
                          id="edit-weight-input"
                          type="number"
                          step="any"
                          value={weightInput}
                          onChange={(e) => setWeightInput(e.target.value)}
                          placeholder="e.g. 70"
                          className="w-full px-2.5 py-1.5 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                        <select
                          id="edit-weight-unit"
                          value={weightUnit}
                          onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
                          className="px-2 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-l border-zinc-300 dark:border-zinc-700 focus:outline-none cursor-pointer"
                        >
                          <option value="kg">kg</option>
                          <option value="lbs">lbs</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {formError && (
                    <p id="profile-form-error" className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {formError}
                    </p>
                  )}

                  {profileSavedSuccess && (
                    <div id="profile-saved-toast" className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Profile updated successfully!</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      id="save-profile-btn"
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>

                {/* 6. Export Data Card */}
                <div
                  id="export-data-card"
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Export Data Backup
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Download a full JSON backup of your habits, completion logs, and milestones.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="export-data-btn"
                      onClick={handleExportData}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>

                  {exportSuccess && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Data backup downloaded successfully!
                    </p>
                  )}
                </div>

                {/* 7. Clear Habits & Reset Data Card */}
                <div
                  id="clear-data-card"
                  className="p-3.5 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Clear Habit History & Data
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
                        Permanently remove your habits, completion history, notes, milestones, and streak records.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="open-clear-data-modal-btn"
                      onClick={() => {
                        setAccountActionError(null);
                        setShowClearDataConfirm(true);
                      }}
                      disabled={isClearingData || isDeletingAccount}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200/80 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear All Data
                    </button>
                  </div>
                </div>

                {/* 8. Danger Zone: Delete Account */}
                <div
                  id="danger-zone-card"
                  className="p-3.5 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-red-950 dark:text-red-200 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        Delete Account
                      </h4>
                      <p className="text-[11px] text-red-800 dark:text-red-300/90 mt-0.5">
                        Permanently delete your Daily Habits account and all associated cloud data.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="open-delete-account-modal-btn"
                      onClick={() => {
                        setAccountActionError(null);
                        setShowDeleteAccountConfirm(true);
                      }}
                      disabled={isClearingData || isDeletingAccount}
                      className="px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 hover:bg-red-200/80 dark:hover:bg-red-900 border border-red-300 dark:border-red-800 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>

                {/* 9. Sign Out Button */}
                <div className="pt-2 border-t border-zinc-200/70 dark:border-white/10 flex justify-end">
                  <button
                    type="button"
                    id="profile-signout-btn"
                    onClick={() => {
                      onSignOut();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Habit Edit/Add Modal */}
      <HabitModal
        isOpen={isHabitFormOpen}
        onClose={() => setIsHabitFormOpen(false)}
        onSave={async (data) => {
          await onSaveHabit(data, habitToEdit);
          setIsHabitFormOpen(false);
        }}
        initialHabit={habitToEdit}
      />

      {/* Delete Habit Confirmation Dialog */}
      {habitToDelete && (
        <div
          id="delete-habit-confirm-backdrop"
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => setHabitToDelete(null)}
        >
          <div
            id="delete-habit-confirm-modal"
            className="w-full max-w-sm glass-modal rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Delete "{habitToDelete.name}"?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  This will remove the habit from your daily tracking list and Google Calendar if synced. Past history records remain saved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setHabitToDelete(null)}
                disabled={isDeletingHabit}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800 rounded-xl hover:bg-zinc-300/60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-habit-btn"
                onClick={handleConfirmDeleteHabit}
                disabled={isDeletingHabit}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {isDeletingHabit ? 'Deleting...' : 'Delete Habit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Data Confirmation Dialog */}
      {showClearDataConfirm && (
        <div
          id="clear-data-confirm-backdrop"
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isClearingData && setShowClearDataConfirm(false)}
        >
          <div
            id="clear-data-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-data-confirm-title"
            className="w-full max-w-sm glass-modal rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {isClearSuccess ? (
              <div className="py-4 text-center space-y-2.5">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  All Daily Habits data has been cleared.
                </h3>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h3
                      id="clear-data-confirm-title"
                      className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
                    >
                      Clear all data?
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                      This will permanently remove your habits, completion history, notes, milestones, streak history, and other Daily Habits data. Your account and Google login will remain.
                    </p>
                  </div>
                </div>

                {accountActionError && (
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    {accountActionError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/60 dark:border-white/10">
                  <button
                    type="button"
                    id="cancel-clear-data-btn"
                    onClick={() => setShowClearDataConfirm(false)}
                    disabled={isClearingData}
                    className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800 rounded-xl hover:bg-zinc-300/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="confirm-clear-data-btn"
                    onClick={handleExecuteClearData}
                    disabled={isClearingData}
                    className="min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isClearingData && (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    <span>{isClearingData ? 'Clearing data...' : 'Clear Data'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      {showDeleteAccountConfirm && (
        <div
          id="delete-account-confirm-backdrop"
          className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isDeletingAccount && setShowDeleteAccountConfirm(false)}
        >
          <div
            id="delete-account-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-confirm-title"
            className="w-full max-w-sm glass-modal rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h3
                  id="delete-account-confirm-title"
                  className="text-sm font-bold text-zinc-900 dark:text-zinc-100"
                >
                  Delete your account?
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  This permanently deletes your Daily Habits account and all associated data. This action cannot be undone.
                </p>
              </div>
            </div>

            {accountActionError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                {accountActionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/60 dark:border-white/10">
              <button
                type="button"
                id="cancel-delete-account-btn"
                onClick={() => setShowDeleteAccountConfirm(false)}
                disabled={isDeletingAccount}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800 rounded-xl hover:bg-zinc-300/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-account-btn"
                onClick={handleExecuteDeleteAccount}
                disabled={isDeletingAccount}
                className="min-h-[38px] px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isDeletingAccount && (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                <span>{isDeletingAccount ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
