import React, { useState, useMemo, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  Trash2,
  LogOut,
  Check,
  CheckCircle2,
  Unlink,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { UserProfile, ThemeMode, HabitItem, DailyLogData, CalendarSyncResult } from '../types';
import { calculateAge, isValidDateOfBirth, getLocalDateKey } from '../lib/dateUtils';
import { getUserFriendlyErrorMessage } from '../lib/errorUtils';

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
  onDisconnectGoogleCalendar: (removeEvents?: boolean) => Promise<void>;
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
  const [deleteAccountStep, setDeleteAccountStep] = useState<1 | 2>(1);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [accountActionError, setAccountActionError] = useState<string | null>(null);

  // Calendar sync feedback
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [showDisconnectCalendarConfirm, setShowDisconnectCalendarConfirm] = useState(false);
  const [removeEventsOnDisconnect, setRemoveEventsOnDisconnect] = useState(false);
  const [isDisconnectingCalendar, setIsDisconnectingCalendar] = useState(false);
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
    if (trimmedName.length > 80) {
      setFormError('Display name cannot exceed 80 characters.');
      return;
    }

    if (dobInput && !isValidDateOfBirth(dobInput)) {
      setFormError('Please select a valid past date of birth.');
      return;
    }

    let numHeight: number | undefined = undefined;
    if (heightInput.trim()) {
      const parsed = parseFloat(heightInput.trim());
      if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0 || parsed > 350) {
        setFormError('Please enter a realistic height (1 - 350 cm).');
        return;
      }
      numHeight = parsed;
    }

    let numWeight: number | undefined = undefined;
    if (weightInput.trim()) {
      const parsed = parseFloat(weightInput.trim());
      if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0 || parsed > 500) {
        setFormError('Please enter a realistic weight (1 - 500 kg).');
        return;
      }
      numWeight = parsed;
    }

    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        displayName: trimmedName,
        dateOfBirth: dobInput || undefined,
        height: numHeight,
        heightUnit,
        weight: numWeight,
        weightUnit,
      });
      setProfileSavedSuccess(true);
      setTimeout(() => setProfileSavedSuccess(false), 3000);
    } catch (err) {
      setFormError(getUserFriendlyErrorMessage(err));
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
      setTimeout(() => setIsClearSuccess(false), 5000);
    } catch (err: any) {
      console.error('Clear data error:', err);
      setAccountActionError(getUserFriendlyErrorMessage(err));
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
      setAccountActionError(getUserFriendlyErrorMessage(err));
      setIsDeletingAccount(false);
    }
  };

  return (
    <div id="profile-view-container" className="space-y-3.5 sm:space-y-4 animate-fadeIn pb-12">
      {/* 1. GOOGLE ACCOUNT */}
      <section id="profile-google-account-section" className="p-4 sm:p-5 glass-card rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {user?.photoURL ? (
            <img
              id="profile-avatar-img"
              src={user.photoURL}
              alt={user.displayName || 'Profile Photo'}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-full border-2 border-zinc-200 dark:border-zinc-700 object-cover shadow-xs shrink-0"
            />
          ) : (
            <div
              id="profile-avatar-placeholder"
              className="w-12 h-12 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center text-lg font-bold shrink-0"
            >
              {((user?.displayName || user?.email || 'U')[0] || 'U').toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
              {user?.displayName || 'Daily Habits User'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
              {user?.email || 'Google Account'}
            </p>
          </div>
        </div>

        <button
          type="button"
          id="profile-sign-out-btn"
          onClick={onSignOut}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer shrink-0 min-h-[40px]"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </section>

      {/* 2. APPEARANCE */}
      <section id="profile-appearance-section" className="p-4 sm:p-5 glass-card rounded-2xl space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Appearance
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            id="profile-theme-light"
            onClick={() => onThemeChange('light')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[42px] ${
              theme === 'light'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-xs'
                : 'bg-zinc-100/70 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Light</span>
          </button>

          <button
            type="button"
            id="profile-theme-dark"
            onClick={() => onThemeChange('dark')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[42px] ${
              theme === 'dark'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-xs'
                : 'bg-zinc-100/70 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            id="profile-theme-system"
            onClick={() => onThemeChange('system')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer min-h-[42px] ${
              theme === 'system'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-xs'
                : 'bg-zinc-100/70 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>System</span>
          </button>
        </div>
      </section>

      {/* 3. EDIT PROFILE */}
      <section id="profile-edit-section" className="p-4 sm:p-5 glass-card rounded-2xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Edit Profile
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          {/* Authenticated Google Account / Gmail (Read-Only) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="view-edit-email-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Google Account / Gmail
              </label>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                <Lock className="w-3 h-3" />
                Read-only
              </span>
            </div>
            <input
              id="view-edit-email-input"
              type="email"
              readOnly
              disabled
              value={user?.email || 'Authenticated via Google'}
              className="w-full px-3 py-2 text-xs font-mono bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 rounded-xl cursor-not-allowed select-all"
            />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
              Your email is verified and secured by Google Authentication.
            </p>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="view-edit-name-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Name
            </label>
            <input
              id="view-edit-name-input"
              type="text"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Date of Birth & Live Calculated Age */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="view-edit-dob-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Date of Birth
              </label>
              {liveAge !== null && (
                <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-semibold">
                  {liveAge} yrs old
                </span>
              )}
            </div>
            <input
              id="view-edit-dob-input"
              type="date"
              value={dobInput}
              onChange={(e) => setDobInput(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {/* Height & Weight */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="view-edit-height-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Height
              </label>
              <div className="flex rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800/90 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
                <input
                  id="view-edit-height-input"
                  type="number"
                  step="any"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  placeholder="175"
                  className="w-full px-3 py-2 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <select
                  value={heightUnit}
                  onChange={(e) => setHeightUnit(e.target.value as 'cm' | 'in')}
                  className="px-2 py-2 text-xs bg-zinc-100 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 border-l border-zinc-300 dark:border-zinc-700 focus:outline-none cursor-pointer"
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
              <div className="flex rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden bg-white dark:bg-zinc-800/90 focus-within:ring-1 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100">
                <input
                  id="view-edit-weight-input"
                  type="number"
                  step="any"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="70"
                  className="w-full px-3 py-2 text-xs bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
                <select
                  value={weightUnit}
                  onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'lbs')}
                  className="px-2 py-2 text-xs bg-zinc-100 dark:bg-zinc-700/80 text-zinc-700 dark:text-zinc-200 border-l border-zinc-300 dark:border-zinc-700 focus:outline-none cursor-pointer"
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
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <button
              id="view-save-profile-btn"
              type="submit"
              disabled={isSavingProfile}
              className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer min-h-[38px]"
            >
              {isSavingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* 4. GOOGLE CALENDAR */}
      <section id="profile-google-calendar-section" className="p-4 sm:p-5 glass-card rounded-2xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Google Calendar
            </h3>
          </div>

          {user?.googleCalendarConnected ? (
            <button
              type="button"
              id="profile-disconnect-calendar-btn"
              onClick={() => {
                setCalendarActionError(null);
                setRemoveEventsOnDisconnect(false);
                setShowDisconnectCalendarConfirm(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 rounded-xl transition-colors cursor-pointer shrink-0 min-h-[36px]"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              type="button"
              id="profile-connect-calendar-btn"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white rounded-xl transition-colors cursor-pointer shrink-0 min-h-[36px]"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{isConnectingCalendar ? 'Connecting...' : 'Connect Google Calendar'}</span>
            </button>
          )}
        </div>

        {user?.googleCalendarConnected && (
          <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block truncate">
                    ✓ Google Calendar Connected
                  </span>
                  {user.googleCalendarEmail && (
                    <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 truncate block font-mono">
                      {user.googleCalendarEmail}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                id="profile-sync-calendar-btn"
                onClick={async () => {
                  setCalendarActionError(null);
                  setCalendarSyncSuccessMessage(null);
                  try {
                    const res = await onSyncHabitsToCalendar();
                    if (res) {
                      if (res.success) {
                        setCalendarSyncSuccessMessage('Habits synced with Google Calendar.');
                      } else {
                        setCalendarActionError(res.error || 'Failed to sync habits with Google Calendar.');
                      }
                      setTimeout(() => setCalendarSyncSuccessMessage(null), 5000);
                    }
                  } catch (err: any) {
                    setCalendarActionError(err?.message || 'Failed to sync habits with Google Calendar.');
                  }
                }}
                disabled={isSyncingCalendar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-950 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/70 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300/60 dark:border-emerald-700/60 rounded-xl cursor-pointer transition-colors shrink-0 min-h-[34px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                <span>{isSyncingCalendar ? 'Syncing...' : 'Sync Habits'}</span>
              </button>
            </div>

            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Your scheduled habits synchronize automatically as recurring events on your primary Google Calendar.
            </p>

            {calendarSyncSuccessMessage && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{calendarSyncSuccessMessage}</span>
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

      {/* 5. DATA & ACCOUNT */}
      <section id="profile-data-account-section" className="p-4 sm:p-5 glass-card rounded-2xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Data & Account
        </h3>

        {accountActionError && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-xs">
            {accountActionError}
          </div>
        )}

        {isClearSuccess && (
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-medium">
            ✓ Your data has been cleared.
          </div>
        )}

        <div className="space-y-2">
          {/* Option 1: Export Data */}
          <div className="p-3 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-white/5 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Export Data
              </span>
            </div>
            <button
              type="button"
              id="profile-export-data-btn"
              onClick={handleExportData}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Export JSON
            </button>
          </div>
          {exportSuccess && (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pl-1">
              ✓ Data backup downloaded successfully!
            </p>
          )}

          {/* Option 2: Clear All Data */}
          <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-950 dark:text-amber-200">
                Clear All Data
              </span>
            </div>
            <button
              type="button"
              id="profile-clear-data-btn"
              onClick={() => {
                setAccountActionError(null);
                setShowClearDataConfirm(true);
              }}
              disabled={isClearingData || isDeletingAccount}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200/80 dark:hover:bg-amber-900 border border-amber-300/80 dark:border-amber-700/80 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              Clear Data
            </button>
          </div>

          {/* Option 3: Delete Account */}
          <div className="p-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/25 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span className="text-xs font-semibold text-red-950 dark:text-red-200">
                Delete Account
              </span>
            </div>
            <button
              type="button"
              id="profile-delete-account-btn"
              onClick={() => {
                setAccountActionError(null);
                setShowDeleteAccountConfirm(true);
              }}
              disabled={isClearingData || isDeletingAccount}
              className="px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/70 hover:bg-red-200/80 dark:hover:bg-red-900 border border-red-300/80 dark:border-red-700/80 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation Modal: Disconnect Google Calendar */}
      {showDisconnectCalendarConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100">
              <Unlink className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Disconnect Google Calendar?
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Your habits will continue working, but future Calendar synchronization will stop.
            </p>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={removeEventsOnDisconnect}
                  onChange={(e) => setRemoveEventsOnDisconnect(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-700"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Remove Daily Habits events from Google Calendar?
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block leading-tight">
                    {removeEventsOnDisconnect
                      ? 'Will remove ONLY events created by Daily Habits. Your habits will not be deleted.'
                      : 'Existing Daily Habits events will remain on your Google Calendar.'}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDisconnectCalendarConfirm(false)}
                disabled={isDisconnectingCalendar}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-disconnect-calendar-btn"
                onClick={async () => {
                  setIsDisconnectingCalendar(true);
                  setCalendarActionError(null);
                  try {
                    await onDisconnectGoogleCalendar(removeEventsOnDisconnect);
                    setShowDisconnectCalendarConfirm(false);
                  } catch (err: any) {
                    setCalendarActionError(err?.message || 'Failed to disconnect Google Calendar.');
                  } finally {
                    setIsDisconnectingCalendar(false);
                  }
                }}
                disabled={isDisconnectingCalendar}
                className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDisconnectingCalendar ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear Data */}
      {showClearDataConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl animate-scaleUp">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Clear all your Daily Habits data?
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              This will remove all your habits, completion logs, notes, goals, and streak history. Your Daily Habits account and Google login will remain active.
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

      {/* Confirmation Modal: Delete Account (Two-Step Flow) */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl animate-scaleUp">
            {deleteAccountStep === 1 ? (
              <>
                <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Delete your account?
                  </h3>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Are you sure you want to delete your Daily Habits account? This will initiate the account deletion process and permanently remove your records.
                </p>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccountConfirm(false);
                      setDeleteAccountStep(1);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteAccountStep(2)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                  <Trash2 className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    This permanently deletes your Daily Habits account and associated data.
                  </h3>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  This action is permanent and cannot be undone. All your habits, completion logs, notes, streaks, and personal records will be permanently removed from Firestore and local caches. Your Google account itself will not be deleted.
                </p>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteAccountConfirm(false);
                      setDeleteAccountStep(1);
                    }}
                    disabled={isDeletingAccount}
                    className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeleteAccount}
                    disabled={isDeletingAccount}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
