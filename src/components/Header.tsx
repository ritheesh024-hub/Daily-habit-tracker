import React from 'react';
import { UserProfile, ConnectionStatus } from '../types';
import { formatHeaderFullDate } from '../lib/dateUtils';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { DailyHabitsMark } from './DailyHabitsLogo';

interface HeaderProps {
  user: UserProfile | null;
  currentDate: string;
  onOpenProfile: () => void;
  isSyncing?: boolean;
  connectionStatus?: ConnectionStatus;
  pendingCount?: number;
  onSyncNow?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentDate,
  onOpenProfile,
  isSyncing = false,
  connectionStatus = 'online',
  pendingCount = 0,
  onSyncNow,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full glass-surface border-b border-zinc-200/80 dark:border-white/10 py-2.5 sm:py-3 px-3.5 sm:px-6 transition-all duration-200 shadow-xs"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Logo, Project Name & Today's Date */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Logo Mark */}
          <div id="app-logo" className="shrink-0">
            <DailyHabitsMark className="w-8 h-8 sm:w-9 sm:h-9" id="header-logo-mark" />
          </div>

          {/* Project Title & Date */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 id="app-title" className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                Daily Habits
              </h1>
            </div>
            <p id="header-date" className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-tight truncate">
              {formatHeaderFullDate(currentDate)}
            </p>
          </div>
        </div>

        {/* Right: Status Indicator, PWA Install & Authenticated User Profile Photo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ConnectionStatusIndicator
            status={isSyncing ? 'syncing' : connectionStatus}
            pendingCount={pendingCount}
            onSyncNow={onSyncNow}
          />

          <PWAInstallButton className="hidden sm:inline-flex" />

          <button
            id="user-profile-btn"
            type="button"
            onClick={onOpenProfile}
            aria-label="Open Profile and Settings"
            title="Open Profile and Settings"
            className="min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center rounded-full hover:opacity-90 active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:outline-none transition-all duration-150 cursor-pointer group"
          >
            {user?.photoURL ? (
              <img
                id="user-avatar"
                src={user.photoURL}
                alt={user.displayName ? `${user.displayName}'s Profile photo` : 'User profile avatar'}
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-zinc-300/80 dark:border-white/20 object-cover shadow-sm group-hover:border-zinc-400 dark:group-hover:border-white/40 ring-1 ring-black/5 dark:ring-white/10 transition-all"
              />
            ) : (
              <div
                id="user-avatar-fallback"
                aria-hidden="true"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center text-xs sm:text-sm font-semibold shadow-sm border border-zinc-700 dark:border-white/20 ring-1 ring-black/5 dark:ring-white/10"
              >
                {((user?.displayName || user?.email || 'U')[0] || 'U').toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};


