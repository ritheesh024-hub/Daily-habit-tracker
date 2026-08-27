import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Check,
  Flame,
  Award,
  Calendar,
  Clock,
  TrendingUp,
  LogOut,
  AlertCircle,
  User,
  ListOrdered,
  BarChart2,
  Bell,
  BellRing,
  Volume2,
  Lock,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { HabitItem, UserProfile, AnalyticsStats, DailyLogData, Milestone, UserReminderSettings, ThemeMode } from '../types';
import { HabitIcon } from './HabitIcon';
import { HabitModal } from './HabitModal';
import { AnalyticsView } from './AnalyticsView';
import { MilestonesView } from './MilestonesView';
import {
  formatTime12Hour,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  NotificationSupportStatus,
} from '../lib/reminderService';
import { calculateAge, isValidDateOfBirth, getLocalDateKey } from '../lib/dateUtils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateProfile: (updates: { displayName: string; dateOfBirth?: string }) => Promise<void>;
  habits: HabitItem[];
  onSaveHabit: (
    data: { name: string; target: string; icon: string; reminderEnabled?: boolean; reminderTime?: string },
    editingHabit?: HabitItem | null
  ) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onUpdateHabitReminder: (habitId: string, reminderEnabled: boolean, reminderTime: string) => Promise<void>;
  onTestNotification: () => void;
  reminderSettings?: UserReminderSettings;
  onUpdateReminderSettings?: (settings: UserReminderSettings) => Promise<void>;
  onTestSmartReminder?: () => void;
  analytics: AnalyticsStats;
  milestones?: Milestone[];
  rawLogsMap?: Record<string, DailyLogData>;
  todayDate?: string;
  onSignOut: () => void;
  initialTab?: TabType;
  theme?: ThemeMode;
  onThemeChange?: (newTheme: ThemeMode) => void;
}

export type TabType = 'analytics' | 'milestones' | 'habits' | 'reminders' | 'profile';

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateProfile,
  habits,
  onSaveHabit,
  onDeleteHabit,
  onUpdateHabitReminder,
  onTestNotification,
  reminderSettings = { remindersEnabled: true, reminderTime: '20:00' },
  onUpdateReminderSettings,
  onTestSmartReminder,
  analytics,
  milestones = [],
  rawLogsMap = {},
  todayDate = getLocalDateKey(),
  onSignOut,
  initialTab = 'analytics',
  theme = 'system',
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Edit Profile State
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Manage Habits Modal State
  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<HabitItem | null>(null);
  const [isDeletingHabit, setIsDeletingHabit] = useState(false);

  // Notification Permission State
  const [permissionStatus, setPermissionStatus] = useState<NotificationSupportStatus>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Calculate age live from the currently entered date of birth
  const liveAge = useMemo(() => {
    return calculateAge(dobInput);
  }, [dobInput]);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayNameInput(user.displayName);
    } else if (user?.email) {
      setDisplayNameInput(user.email.split('@')[0]);
    } else {
      setDisplayNameInput('');
    }

    if (user?.dateOfBirth) {
      setDobInput(user.dateOfBirth);
    } else {
      setDobInput('');
    }

    setFormError(null);
    setProfileSavedSuccess(false);
    setPermissionStatus(getNotificationPermissionStatus());
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

    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        displayName: trimmedName,
        dateOfBirth: dobInput || undefined,
      });
      setProfileSavedSuccess(true);
      setTimeout(() => setProfileSavedSuccess(false), 3000);
    } catch (err) {
      setFormError('Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
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

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const res = await requestNotificationPermission();
      setPermissionStatus(res);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleToggleReminder = async (habit: HabitItem, enabled: boolean) => {
    if (enabled && permissionStatus === 'default') {
      const res = await requestNotificationPermission();
      setPermissionStatus(res);
    }
    const time = habit.reminderTime || '08:00';
    await onUpdateHabitReminder(habit.id, enabled, time);
  };

  const handleChangeReminderTime = async (habit: HabitItem, newTime: string) => {
    if (!newTime) return;
    await onUpdateHabitReminder(habit.id, !!habit.reminderEnabled, newTime);
  };

  return (
    <>
      <div
        id="profile-modal-backdrop"
        className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 flex items-center justify-center p-3 sm:p-4 backdrop-blur-[1px] animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          id="profile-modal-card"
          className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header with Profile Card */}
          <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <img
                    id="profile-modal-avatar"
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center text-base font-semibold">
                    {((user?.displayName || user?.email || 'U')[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 id="profile-modal-name" className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
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
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-zinc-200/80 dark:border-zinc-800 overflow-x-auto no-scrollbar">
              <button
                type="button"
                id="tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'analytics'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button
                type="button"
                id="tab-milestones"
                onClick={() => setActiveTab('milestones')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'milestones'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Milestones</span>
                {milestones.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === 'milestones'
                        ? 'bg-zinc-700 dark:bg-zinc-300 text-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'habits'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Manage Habits</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'habits'
                      ? 'bg-zinc-700 dark:bg-zinc-300 text-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {habits.length}
                </span>
              </button>

              <button
                type="button"
                id="tab-reminders"
                onClick={() => setActiveTab('reminders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'reminders'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Reminders</span>
                {habits.filter((h) => h.reminderEnabled).length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === 'reminders'
                        ? 'bg-zinc-700 dark:bg-zinc-300 text-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {habits.filter((h) => h.reminderEnabled).length}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="tab-profile"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'profile'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile & Settings</span>
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
            {/* TAB 1: ANALYTICS */}
            {activeTab === 'analytics' && (
              <AnalyticsView
                analytics={analytics}
                rawLogsMap={rawLogsMap}
                habits={habits}
                todayDate={todayDate}
              />
            )}

            {/* TAB 2: MILESTONES */}
            {activeTab === 'milestones' && (
              <MilestonesView milestones={milestones} />
            )}

            {/* TAB 3: MANAGE HABITS */}
            {activeTab === 'habits' && (
              <div id="manage-habits-panel" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                      Current Habits ({habits.length})
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Edit habit names, targets, or add new ones.</p>
                  </div>
                  <button
                    id="profile-add-habit-btn"
                    type="button"
                    onClick={handleOpenAddHabit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Habit</span>
                  </button>
                </div>

                {/* Delete Confirmation Inside Manage Habits */}
                {habitToDelete && (
                  <div
                    id="manage-habits-delete-dialog"
                    className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 rounded-lg text-red-900 dark:text-red-200 space-y-2 animate-fadeIn"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold">Delete habit "{habitToDelete.name}"?</p>
                        <p className="text-red-700 dark:text-red-300 text-[11px] mt-0.5">
                          It will be removed from your daily checklist. Past days in history will remain intact.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setHabitToDelete(null)}
                        disabled={isDeletingHabit}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 rounded transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteHabit}
                        disabled={isDeletingHabit}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors cursor-pointer"
                      >
                        {isDeletingHabit ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Habits List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {habits.map((habit) => (
                    <div
                      key={habit.id}
                      id={`manage-habit-row-${habit.id}`}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100/80 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 rounded-lg flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                          <HabitIcon name={habit.icon} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{habit.name}</p>
                          {habit.target && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">{habit.target}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          id={`edit-habit-btn-${habit.id}`}
                          onClick={() => handleOpenEditHabit(habit)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded transition-colors cursor-pointer"
                          title="Edit Habit"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          id={`delete-habit-btn-${habit.id}`}
                          onClick={() => setHabitToDelete(habit)}
                          className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                          title="Delete Habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {habits.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-xs">
                      No habits found. Click "+ Add Habit" above to create one.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: REMINDER SETTINGS */}
            {activeTab === 'reminders' && (
              <div id="reminder-settings-panel" className="space-y-4">
                {/* 1. Main Smart Reminders Card */}
                <div
                  id="smart-reminders-card"
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shrink-0 shadow-2xs">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                          Smart Reminders
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Reminds you only about habits that are still unfinished today.
                        </p>
                      </div>
                    </div>

                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold font-mono text-zinc-700 dark:text-zinc-300">
                        {reminderSettings.remindersEnabled ? 'ON' : 'OFF'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          id="smart-reminders-toggle"
                          checked={reminderSettings.remindersEnabled}
                          onChange={async (e) => {
                            const newEnabled = e.target.checked;
                            if (newEnabled && permissionStatus === 'default') {
                              const res = await requestNotificationPermission();
                              setPermissionStatus(res);
                            }
                            if (onUpdateReminderSettings) {
                              await onUpdateReminderSettings({
                                ...reminderSettings,
                                remindersEnabled: newEnabled,
                              });
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900"></div>
                      </label>
                    </div>
                  </div>

                  {/* Reminder Time Setting */}
                  <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                        Reminder Time
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Local time: {formatTime12Hour(reminderSettings.reminderTime || '20:00')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        id="smart-reminder-time-input"
                        value={reminderSettings.reminderTime || '20:00'}
                        disabled={!reminderSettings.remindersEnabled}
                        onChange={async (e) => {
                          const newTime = e.target.value;
                          if (!newTime) return;
                          if (onUpdateReminderSettings) {
                            await onUpdateReminderSettings({
                              ...reminderSettings,
                              reminderTime: newTime,
                            });
                          }
                        }}
                        className={`px-2.5 py-1.5 text-xs font-mono rounded-lg border transition-colors ${
                          reminderSettings.remindersEnabled
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100'
                            : 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Notification Permission & Test Banner */}
                  <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      {permissionStatus === 'denied' ? (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 px-2.5 py-1 rounded-md">
                          Notifications are disabled in your browser settings.
                        </div>
                      ) : permissionStatus === 'granted' ? (
                        <div className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 px-2.5 py-1 rounded-md font-mono">
                          <Check className="w-3 h-3" /> Notifications enabled
                        </div>
                      ) : (
                        <button
                          type="button"
                          id="request-permission-btn"
                          onClick={handleRequestPermission}
                          disabled={isRequestingPermission}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-md transition-colors cursor-pointer"
                        >
                          {isRequestingPermission ? 'Requesting...' : 'Enable Browser Alerts'}
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      id="test-smart-reminder-btn"
                      onClick={() => {
                        if (onTestSmartReminder) {
                          onTestSmartReminder();
                        } else {
                          onTestNotification();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      <span>Test Smart Reminder</span>
                    </button>
                  </div>
                </div>

                {/* 2. Habit-Specific Reminder Schedule */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                      Individual Habit Times
                    </h3>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">Optional</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {habits.map((habit) => {
                      const isEnabled = !!habit.reminderEnabled;
                      const timeValue = habit.reminderTime || '08:00';

                      return (
                        <div
                          key={habit.id}
                          id={`reminder-row-${habit.id}`}
                          className={`p-2.5 border rounded-lg flex items-center justify-between gap-3 transition-colors ${
                            isEnabled
                              ? 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700'
                              : 'bg-white dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {/* Habit Info */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 shrink-0">
                              <HabitIcon name={habit.icon} className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {habit.name}
                              </p>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                                {isEnabled ? formatTime12Hour(timeValue) : 'Reminder Off'}
                              </p>
                            </div>
                          </div>

                          {/* Controls: Time Picker + Toggle */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <input
                              type="time"
                              id={`reminder-time-input-${habit.id}`}
                              value={timeValue}
                              onChange={(e) => handleChangeReminderTime(habit, e.target.value)}
                              disabled={!isEnabled}
                              className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                                isEnabled
                                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100'
                                  : 'bg-zinc-100 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800 cursor-not-allowed'
                              }`}
                            />

                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                id={`reminder-toggle-${habit.id}`}
                                checked={isEnabled}
                                onChange={(e) => handleToggleReminder(habit, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900"></div>
                            </label>
                          </div>
                        </div>
                      );
                    })}

                    {habits.length === 0 && (
                      <div className="text-center py-6 text-zinc-400 dark:text-zinc-500 text-xs">
                        No habits found to set reminders for.
                      </div>
                    )}
                  </div>
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
                      onChange={(e) => {
                        setDisplayNameInput(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="Your name"
                      className="w-full px-3 py-2 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      maxLength={50}
                      required
                    />
                  </div>

                  {/* 4. Date of Birth & Automatic Age Calculation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-dob-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Date of Birth
                      </label>
                      <input
                        id="edit-dob-input"
                        type="date"
                        value={dobInput}
                        max={todayDate}
                        onChange={(e) => {
                          setDobInput(e.target.value);
                          setFormError(null);
                        }}
                        className="w-full px-3 py-2 text-xs font-mono border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Age
                      </label>
                      <div
                        id="edit-profile-age-display"
                        className="w-full px-3 py-2 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center"
                      >
                        <span>{liveAge !== null ? `${liveAge} years` : dobInput ? 'Invalid date' : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Gmail (Read-Only) */}
                  <div>
                    <label htmlFor="edit-email-display" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Gmail
                    </label>
                    <div className="relative">
                      <input
                        id="edit-email-display"
                        type="email"
                        value={user?.email || ''}
                        readOnly
                        disabled
                        className="w-full px-3 py-2 text-xs font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-not-allowed select-none pr-8"
                      />
                      <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Feedback notices */}
                  {formError && (
                    <div
                      id="profile-form-error"
                      className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2 animate-fadeIn"
                    >
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {profileSavedSuccess && (
                    <div
                      id="profile-form-success"
                      className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn"
                    >
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Profile updated successfully.</span>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      id="save-profile-btn"
                      type="submit"
                      disabled={isSavingProfile || !displayNameInput.trim()}
                      className="px-4 py-2 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      {isSavingProfile ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <span>Save Profile</span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Logout Action */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 block">Sign Out</span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Logout of this session</span>
                  </div>
                  <button
                    id="profile-logout-btn"
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
            <span className="font-mono">Daily Habits v1.5</span>
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Habit Add/Edit Form Modal */}
      <HabitModal
        isOpen={isHabitFormOpen}
        onClose={() => {
          setIsHabitFormOpen(false);
          setHabitToEdit(null);
        }}
        onSave={async (data) => {
          await onSaveHabit(data, habitToEdit);
          setIsHabitFormOpen(false);
          setHabitToEdit(null);
        }}
        onDelete={async (habitId) => {
          await onDeleteHabit(habitId);
          setIsHabitFormOpen(false);
          setHabitToEdit(null);
        }}
        initialHabit={habitToEdit}
      />
    </>
  );
};
