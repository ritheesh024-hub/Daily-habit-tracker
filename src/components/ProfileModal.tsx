import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { HabitItem, UserProfile, AnalyticsStats, DailyLogData } from '../types';
import { HabitIcon } from './HabitIcon';
import { HabitModal } from './HabitModal';
import { AnalyticsView } from './AnalyticsView';
import {
  formatTime12Hour,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  NotificationSupportStatus,
} from '../lib/reminderService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateDisplayName: (newName: string) => Promise<void>;
  habits: HabitItem[];
  onSaveHabit: (
    data: { name: string; target: string; icon: string; reminderEnabled?: boolean; reminderTime?: string },
    editingHabit?: HabitItem | null
  ) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  onUpdateHabitReminder: (habitId: string, reminderEnabled: boolean, reminderTime: string) => Promise<void>;
  onTestNotification: () => void;
  analytics: AnalyticsStats;
  rawLogsMap?: Record<string, DailyLogData>;
  todayDate?: string;
  onSignOut: () => void;
  initialTab?: TabType;
}

export type TabType = 'analytics' | 'habits' | 'reminders' | 'profile';

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateDisplayName,
  habits,
  onSaveHabit,
  onDeleteHabit,
  onUpdateHabitReminder,
  onTestNotification,
  analytics,
  rawLogsMap = {},
  todayDate = new Date().toISOString().substring(0, 10),
  onSignOut,
  initialTab = 'analytics',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Edit Profile State
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);

  // Manage Habits Modal State
  const [isHabitFormOpen, setIsHabitFormOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<HabitItem | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<HabitItem | null>(null);
  const [isDeletingHabit, setIsDeletingHabit] = useState(false);

  // Notification Permission State
  const [permissionStatus, setPermissionStatus] = useState<NotificationSupportStatus>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    if (user.displayName) {
      setDisplayNameInput(user.displayName);
    } else if (user.email) {
      setDisplayNameInput(user.email.split('@')[0]);
    }
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
    if (!displayNameInput.trim()) return;

    setIsSavingProfile(true);
    try {
      await onUpdateDisplayName(displayNameInput.trim());
      setProfileSavedSuccess(true);
      setTimeout(() => setProfileSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
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
        className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-3 sm:p-4 backdrop-blur-[1px] animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          id="profile-modal-card"
          className="w-full max-w-xl bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header with Profile Card */}
          <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    id="profile-modal-avatar"
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-zinc-200 object-cover shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-zinc-800 text-white flex items-center justify-center text-base font-semibold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 id="profile-modal-name" className="text-base font-bold text-zinc-900 leading-tight">
                    {user.displayName || user.email?.split('@')[0] || 'User'}
                  </h2>
                  <p id="profile-modal-email" className="text-xs text-zinc-500 font-mono mt-0.5">
                    {user.email}
                  </p>
                </div>
              </div>

              <button
                id="close-profile-modal-btn"
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-200/60 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 mt-4 pt-2 border-t border-zinc-200/80 overflow-x-auto no-scrollbar">
              <button
                type="button"
                id="tab-analytics"
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'analytics'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>

              <button
                type="button"
                id="tab-habits"
                onClick={() => setActiveTab('habits')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'habits'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Manage Habits</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'habits' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-700'
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
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Reminders</span>
                {habits.filter((h) => h.reminderEnabled).length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === 'reminders' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-200 text-zinc-700'
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
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
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

            {/* TAB 2: MANAGE HABITS */}
            {activeTab === 'habits' && (
              <div id="manage-habits-panel" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                      Current Habits ({habits.length})
                    </h3>
                    <p className="text-[11px] text-zinc-500">Edit habit names, targets, or add new ones.</p>
                  </div>
                  <button
                    id="profile-add-habit-btn"
                    type="button"
                    onClick={handleOpenAddHabit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Habit</span>
                  </button>
                </div>

                {/* Delete Confirmation Inside Manage Habits */}
                {habitToDelete && (
                  <div
                    id="manage-habits-delete-dialog"
                    className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-900 space-y-2 animate-fadeIn"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold">Delete habit "{habitToDelete.name}"?</p>
                        <p className="text-red-700 text-[11px] mt-0.5">
                          It will be removed from your daily checklist. Past days in history will remain intact.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setHabitToDelete(null)}
                        disabled={isDeletingHabit}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-300 rounded transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteHabit}
                        disabled={isDeletingHabit}
                        className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
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
                      className="p-3 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-200 rounded-lg flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-md bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-700 shrink-0">
                          <HabitIcon name={habit.icon} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-900 truncate">{habit.name}</p>
                          {habit.target && (
                            <p className="text-[11px] text-zinc-500 font-mono truncate">{habit.target}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          id={`edit-habit-btn-${habit.id}`}
                          onClick={() => handleOpenEditHabit(habit)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-200/70 border border-zinc-200 rounded transition-colors cursor-pointer"
                          title="Edit Habit"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          id={`delete-habit-btn-${habit.id}`}
                          onClick={() => setHabitToDelete(habit)}
                          className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete Habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {habits.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 text-xs">
                      No habits found. Click "+ Add Habit" above to create one.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: REMINDER SETTINGS (PHASE 5) */}
            {activeTab === 'reminders' && (
              <div id="reminder-settings-panel" className="space-y-4">
                {/* Browser Notification Status Banner */}
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-zinc-200/80 flex items-center justify-center text-zinc-700 shrink-0">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-900 block">
                          Browser Notifications
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {permissionStatus === 'granted'
                            ? 'Permission granted. Notifications will alert you on time.'
                            : permissionStatus === 'denied'
                            ? 'Notifications are blocked in browser settings. In-app alerts will be used.'
                            : permissionStatus === 'unsupported'
                            ? 'Browser notifications unavailable. In-app alerts will be used.'
                            : 'Enable browser notifications for reminders when this tab is open.'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {permissionStatus === 'granted' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                          <Check className="w-3 h-3" /> Allowed
                        </span>
                      ) : permissionStatus === 'denied' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-mono">
                          Blocked
                        </span>
                      ) : (
                        <button
                          type="button"
                          id="request-permission-btn"
                          onClick={handleRequestPermission}
                          disabled={isRequestingPermission}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-black text-white text-xs font-medium rounded transition-colors cursor-pointer"
                        >
                          {isRequestingPermission ? 'Requesting...' : 'Allow Alerts'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Test notification button */}
                  <div className="pt-2 border-t border-zinc-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">
                      Test your notification sound & banner:
                    </span>
                    <button
                      type="button"
                      id="test-notification-btn"
                      onClick={onTestNotification}
                      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-100 px-2.5 py-1 rounded border border-zinc-300 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-zinc-500" />
                      <span>Test Reminder</span>
                    </button>
                  </div>
                </div>

                {/* Habit Specific Reminder Schedule */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
                      Habit Reminders
                    </h3>
                    <span className="text-[11px] text-zinc-400 font-mono">Local Time</span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {habits.map((habit) => {
                      const isEnabled = !!habit.reminderEnabled;
                      const timeValue = habit.reminderTime || '08:00';

                      return (
                        <div
                          key={habit.id}
                          id={`reminder-row-${habit.id}`}
                          className={`p-3 border rounded-lg flex items-center justify-between gap-3 transition-colors ${
                            isEnabled
                              ? 'bg-zinc-50 border-zinc-300'
                              : 'bg-white border-zinc-200/80 opacity-75 hover:opacity-100'
                          }`}
                        >
                          {/* Habit Info */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-7 h-7 rounded-md bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
                              <HabitIcon name={habit.icon} className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-zinc-900 truncate">
                                {habit.name}
                              </p>
                              <p className="text-[11px] text-zinc-500 font-mono truncate">
                                {isEnabled ? formatTime12Hour(timeValue) : 'Reminder Off'}
                              </p>
                            </div>
                          </div>

                          {/* Controls: Time Picker + Toggle */}
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Time Input */}
                            <input
                              type="time"
                              id={`reminder-time-input-${habit.id}`}
                              value={timeValue}
                              onChange={(e) => handleChangeReminderTime(habit, e.target.value)}
                              disabled={!isEnabled}
                              className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                                isEnabled
                                  ? 'bg-white text-zinc-900 border-zinc-300 focus:ring-1 focus:ring-zinc-900'
                                  : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                              }`}
                            />

                            {/* Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                id={`reminder-toggle-${habit.id}`}
                                checked={isEnabled}
                                onChange={(e) => handleToggleReminder(habit, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4.5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-zinc-900"></div>
                            </label>
                          </div>
                        </div>
                      );
                    })}

                    {habits.length === 0 && (
                      <div className="text-center py-6 text-zinc-400 text-xs">
                        No habits found to set reminders for.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: EDIT PROFILE */}
            {activeTab === 'profile' && (
              <div id="edit-profile-panel" className="space-y-4">
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div>
                    <label htmlFor="edit-name-input" className="block text-xs font-medium text-zinc-700 mb-1">
                      Display Name
                    </label>
                    <input
                      id="edit-name-input"
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2 text-xs font-medium border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                      maxLength={40}
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      This name is displayed in the application header.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Google Account Email
                    </label>
                    <input
                      type="text"
                      value={user.email || ''}
                      disabled
                      className="w-full px-3 py-2 text-xs font-mono text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-lg cursor-not-allowed"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Google Authentication and profile photo are linked to this Google account.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {profileSavedSuccess ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <Check className="w-3.5 h-3.5" /> Saved!
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      id="save-profile-btn"
                      type="submit"
                      disabled={isSavingProfile || !displayNameInput.trim()}
                      className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSavingProfile ? 'Saving...' : 'Save Name'}
                    </button>
                  </div>
                </form>

                {/* Logout Action */}
                <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-zinc-800 block">Sign Out</span>
                    <span className="text-[11px] text-zinc-400">Logout of this session</span>
                  </div>
                  <button
                    id="profile-logout-btn"
                    type="button"
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-red-600 bg-zinc-100 hover:bg-red-50 rounded-lg border border-zinc-200 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono">Daily Habits v1.5</span>
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
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
        initialHabit={habitToEdit}
      />
    </>
  );
};
