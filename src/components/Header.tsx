import React from 'react';
import { UserProfile } from '../types';
import { formatHeaderFullDate } from '../lib/dateUtils';

interface HeaderProps {
  user: UserProfile | null;
  currentDate: string;
  onOpenProfile: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentDate,
  onOpenProfile,
  isSyncing = false,
}) => {
  return (
    <header id="app-header" className="border-b border-zinc-200 bg-white py-3.5 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo, Project Name & Today's Date */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo */}
          <div
            id="app-logo"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0 shadow-2xs"
            aria-hidden="true"
          >
            <svg className="w-5 h-5 text-white" viewBox="0 0 512 512" fill="none">
              <path
                d="M160 266L224 330L352 192"
                stroke="currentColor"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Project Title & Date */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 id="app-title" className="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 leading-tight">
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
            <p id="header-date" className="text-xs sm:text-sm text-zinc-500 font-normal mt-0.5 leading-tight truncate">
              {formatHeaderFullDate(currentDate)}
            </p>
          </div>
        </div>

        {/* Right: Authenticated User Profile Photo */}
        <div className="flex items-center shrink-0">
          <button
            id="user-profile-btn"
            type="button"
            onClick={onOpenProfile}
            aria-label="Open Profile"
            title="Open Profile"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:opacity-90 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none transition-opacity cursor-pointer group"
          >
            {user?.photoURL ? (
              <img
                id="user-avatar"
                src={user.photoURL}
                alt={user.displayName ? `${user.displayName}'s Profile photo` : 'User profile avatar'}
                referrerPolicy="no-referrer"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-zinc-200 object-cover shadow-2xs group-hover:border-zinc-300"
              />
            ) : (
              <div
                id="user-avatar-fallback"
                aria-hidden="true"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs sm:text-sm font-semibold shadow-2xs border border-zinc-800"
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

