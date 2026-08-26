import React from 'react';
import { LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { formatHeaderDate } from '../lib/dateUtils';

interface HeaderProps {
  user: UserProfile | null;
  currentDate: string;
  onSignOut: () => void;
  onOpenProfile: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentDate,
  onSignOut,
  onOpenProfile,
  isSyncing = false,
}) => {
  return (
    <header id="app-header" className="border-b border-zinc-200 bg-white py-4 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        {/* App Title & Date */}
        <div>
          <div className="flex items-center gap-2">
            <h1 id="app-title" className="text-xl font-semibold tracking-tight text-zinc-900">
              Daily Habits
            </h1>
            {isSyncing && (
              <span
                id="sync-status"
                className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                title="Saving changes..."
              />
            )}
          </div>
          <p id="header-date" className="text-xs sm:text-sm text-zinc-500 font-normal mt-0.5">
            {formatHeaderDate(currentDate)}
          </p>
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Profile Trigger Button */}
          <button
            id="user-profile-btn"
            type="button"
            onClick={onOpenProfile}
            aria-label="Open Profile, Habits & Analytics"
            className="flex items-center gap-2 text-right p-1.5 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer group select-none border border-transparent hover:border-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none"
            title="Open Profile, Habits & Analytics"
          >
            {user?.photoURL ? (
              <img
                id="user-avatar"
                src={user.photoURL}
                alt={user.displayName ? `${user.displayName}'s Profile photo` : 'User profile avatar'}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-zinc-200 object-cover group-hover:border-zinc-300"
              />
            ) : (
              <div
                id="user-avatar-fallback"
                aria-hidden="true"
                className="w-8 h-8 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-medium"
              >
                {((user?.displayName || user?.email || 'U')[0] || 'U').toUpperCase()}
              </div>
            )}
            <div className="text-left hidden xs:block">
              <span
                id="user-display-name"
                className="block text-xs sm:text-sm font-medium text-zinc-800 group-hover:text-zinc-900 max-w-[120px] sm:max-w-[150px] truncate"
              >
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="block text-[10px] text-zinc-500 font-mono">
                Profile & Settings
              </span>
            </div>
          </button>

          {/* Direct Logout Button */}
          <button
            id="logout-btn"
            onClick={onSignOut}
            type="button"
            aria-label="Sign out"
            className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded border border-zinc-200/80 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
