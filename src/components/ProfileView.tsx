import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Sun,
  Moon,
  Monitor,
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  Check,
  CheckCircle2,
  Unlink,
  ExternalLink,
} from 'lucide-react';
import { UserProfile, ThemeMode, HabitItem, DailyLogData, CalendarSyncResult } from '../types';
import { calculateAge, isValidDateOfBirth, getLocalDateKey } from '../lib/dateUtils';
import { formatTime12Hour } from '../lib/googleCalendarService';

interface ProfileViewProps {
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
  onConnectGoogleCalendar: () => Promise<void>;
  onDisconnectGoogleCalendar: () => Promise<void>;
  onSyncHabitsToCalendar: () => Promise<CalendarSyncResult | null>;
  isSyncingCalendar?: boolean;
  theme: ThemeMode;
  onThemeChange: (newTheme: ThemeMode) => void;
  onSignOut: () => void;
  onExportData?: () => void;
  onClearData?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  habits: HabitItem[];
  rawLogsMap?: Record<string, DailyLogData>;
  todayDate?: string;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  onUpdateProfile,
  onConnectGoogleCalendar,
  onDisconnectGoogleCalendar,
  onSyncHabitsToCalendar,
  isSyncingCalendar = false,
  theme,
  onThemeChange,
  onSignOut,
  onExportData,
  onClearData,
  onDeleteAccount,
  habits,
  rawLogsMap = {},
  todayDate = getLocalDateKey(),
}) => {
  // Edit Profile Form State
  const [displayNameInput, setDisplayNameInput] = useState(user?.displayName || '');
  const [dobInput, setDobInput] = useState(user?.dateOfBirth || '');
  const [heightInput, setHeightInput] = useState(user?.height ? String(user.height) : '');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>(user?.heightUnit || 'cm');
  const [weightInput, setWeightInput] = useState(user?.weight ? String(user.weight) : '');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(user?.weightUnit || 'kg');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Clear Data & Delete Account State
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isClearSuccess, setIsClearSuccess] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);

  // Calendar sync feedback
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [calendarActionError, setCalendarActionError] = useState<string | null>(null);
  const [calendarSyncSuccessMessage, setCalendarSyncSuccessMessage] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Sync inputs when user prop updates
  useEffect(() => {
    if (user?.displayName) setDisplayNameInput(user.displayName);
    if (user?.dateOfBirth) setDobInput(user.dateOfBirth);
    if (user?.height) setHeightInput(String(user.height));
    if (user?.heightUnit) setHeightUnit(user.heightUnit);
    if (user?.weight) setWeightInput(String(user.weight));
    if (user?.weightUnit) setWeightUnit(user.weightUnit);
  }, [user]);

  const liveAge = useMemo(() => calculateAge(dobInput), [dobInput]);

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
        user,
        habits,
        dailyLogs: rawLogsMap,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `daily-habits-backup-${todayDate}.json`);
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
      setShowClearDataConfirm(false);
      setTimeout(() => setIsClearSuccess(false), 4000);
    } catch (err: any) {
      console.error('Clear data error:', err);
      setAccountActionError(err?.message || 'Failed to clear data. Please try again.');
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
    } catch (err: any) {
      console.error('Delete account error:', err);
      setAccountActionError(
        err?.message || 'Failed to delete account. You may need to sign in again first.'
      );
      setIsDeletingAccount(false);
    }
  };

  return (
    <div id="profile-view-container" className="space-y-6 animate-fadeIn pb-12">
      {/* Account Info Header */}
      <div className="p-5 glass-card rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {user?.photoURL ? (
            <img
              id="profile-avatar-img"
              src={user.photoURL}
              alt={user.displayName || 'Profile Photo'}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full border-2 border-zinc-200 dark:border-zinc-700 object-cover shadow-sm shrink-0"
            />
          ) : (
            <div
              id="profile-avatar-placeholder"
              className="w-14 h-14 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center text-xl font-bold shrink-0"
            >
              {((user?.displayName || user?.email || 'U')[0] || 'U').toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {user?.displayName || 'Habit Tracker User'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {user?.email || 'Connected Account'}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Google Account</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* 1. Appearance Theme Settings */}
      <section id="appearance-theme-section" className="p-5 glass-card rounded-2xl space-y-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Appearance Theme
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Choose light, dark, or system mode
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            id="profile-theme-light"
            onClick={() => onThemeChange('light')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-sm'
                : 'bg-zinc-100/70 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Light</span>
          </button>

          <button
            type="button"
            id="profile-theme-dark"
            onClick={() => onThemeChange('dark')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-sm'
                : 'bg-zinc-100/70 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            id="profile-theme-system"
            onClick={() => onThemeChange('system')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              theme === 'system'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-sm'
                : 'bg-zinc-100/70 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Monitor className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>System</span>
          </button>
        </div>
      </section>

      {/* 2. Edit Profile Information */}
      <section id="edit-profile-section" className="p-5 glass-card rounded-2xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Edit Profile
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Customize your personal details and body measurements
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5">
          {/* Name */}
          <div>
            <label htmlFor="view-edit-name-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Display Name
            </label>
            <input
              id="view-edit-name-input"
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Date of Birth & Live Age */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="view-edit-dob-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Date of Birth
              </label>
              {liveAge !== null && (
                <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {liveAge} years old
                </span>
              )}
            </div>
            <input
              id="view-edit-dob-input"
              type="date"
              value={dobInput}
              onChange={(e) => setDobInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="view-edit-height-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Height
              </label>
              <div className="flex rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
                <input
                  id="view-edit-height-input"
                  type="number"
                  step="any"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  placeholder="e.g. 175"
                  className="w-full px-3 py-2 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <select
                  value={heightUnit}
                  onChange={(e) => setHeightUnit(e.target.value as 'cm' | 'in')}
                  className="px-2.5 py-2 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-l border-zinc-300 dark:border-zinc-700 focus:outline-none cursor-pointer"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="view-edit-weight-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Weight
              </label>
              <div className="flex rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
                <input
                  id="view-edit-weight-input"
                  type="number"
                  step="any"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="e.g. 70"
                  className="w-full px-3 py-2 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
                  className="px-2.5 py-2 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-l border-zinc-300 dark:border-zinc-700 focus:outline-none cursor-pointer"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {formError}
            </p>
          )}

          {profileSavedSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              id="view-save-profile-btn"
              type="submit"
              disabled={isSavingProfile}
              className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* 3. Google Calendar Integration */}
      <section id="google-calendar-section" className="p-5 glass-card rounded-2xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Google Calendar Sync
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Sync scheduled daily habits directly as recurring events in your Google Calendar
            </p>
          </div>

          {user?.googleCalendarConnected ? (
            <button
              type="button"
              onClick={onDisconnectGoogleCalendar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                setIsConnectingCalendar(true);
                setCalendarActionError(null);
                try {
                  await onConnectGoogleCalendar();
                } catch (err: any) {
                  setCalendarActionError(err?.message || 'Calendar connection error');
                } finally {
                  setIsConnectingCalendar(false);
                }
              }}
              disabled={isConnectingCalendar}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isConnectingCalendar ? 'Connecting...' : 'Connect Calendar'}</span>
            </button>
          )}
        </div>

        {user?.googleCalendarConnected && (
          <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Connected to {user.googleCalendarEmail || user.email}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await onSyncHabitsToCalendar();
                  if (res) {
                    setCalendarSyncSuccessMessage(
                      `Synced ${res.syncedHabitsCount} habits to your Google Calendar.`
                    );
                    setTimeout(() => setCalendarSyncSuccessMessage(null), 4000);
                  }
                }}
                disabled={isSyncingCalendar}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 rounded-lg cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                <span>Sync Now</span>
              </button>
            </div>

            {calendarSyncSuccessMessage && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                {calendarSyncSuccessMessage}
              </p>
            )}
          </div>
        )}

        {calendarActionError && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            {calendarActionError}
          </p>
        )}
      </section>

      {/* 4. Data Export & App Settings */}
      <section id="app-settings-section" className="p-5 glass-card rounded-2xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Data Backup & Export
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Download your full habits, logs, and records in JSON format
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-white/10 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>

        {exportSuccess && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Data backup downloaded successfully!
          </p>
        )}
      </section>

      {/* 5. Account Management & Reset Actions */}
      <section id="account-management-section" className="p-5 glass-card rounded-2xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Account Management
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Reset habits or delete your Daily Habits account
          </p>
        </div>

        {accountActionError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-xs">
            {accountActionError}
          </div>
        )}

        {isClearSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-medium">
            ✓ All habit data has been cleared successfully.
          </div>
        )}

        {/* Clear All Data */}
        <div className="p-4 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Clear All Data</span>
            </h4>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-0.5">
              Permanently remove habits, logs, and streaks. Your account and Google login will remain.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAccountActionError(null);
              setShowClearDataConfirm(true);
            }}
            disabled={isClearingData || isDeletingAccount}
            className="px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200/80 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            Clear All Data
          </button>
        </div>

        {/* Delete Account */}
        <div className="p-4 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-xl flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-red-950 dark:text-red-200 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
              <span>Delete Account</span>
            </h4>
            <p className="text-[11px] text-red-800 dark:text-red-300/90 mt-0.5">
              Permanently delete your user profile, data, and Firebase account.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAccountActionError(null);
              setShowDeleteAccountConfirm(true);
            }}
            disabled={isClearingData || isDeletingAccount}
            className="px-3.5 py-2 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/60 hover:bg-red-200/80 dark:hover:bg-red-900 border border-red-300 dark:border-red-700 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            Delete Account
          </button>
        </div>
      </section>

      {/* Confirmation Modal: Clear Data */}
      {showClearDataConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Clear all data?
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This will permanently remove your habits, completion history, notes, milestones, streak history, and other Daily Habits data. Your account and Google login will remain.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearDataConfirm(false)}
                disabled={isClearingData}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClearData}
                disabled={isClearingData}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer"
              >
                {isClearingData ? 'Clearing...' : 'Clear Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Account */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Delete account permanently?
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This action cannot be undone. All your habits, completion history, notes, streaks, and profile data will be permanently wiped, and your Daily Habits account will be closed.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAccountConfirm(false)}
                disabled={isDeletingAccount}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteAccount}
                disabled={isDeletingAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
              >
                {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
