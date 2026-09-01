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
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full glass-surface border-b border-zinc-200/70 dark:border-white/10 py-2.5 sm:py-3 px-3.5 sm:px-6 transition-all duration-200 shadow-xs"
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo, Project Name & Today's Date */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Logo */}
          <div
            id="app-logo"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-900 dark:bg-zinc-800 border border-zinc-700/80 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-md relative overflow-hidden transition-transform duration-200 hover:scale-105"
            aria-hidden="true"
          >
            <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" viewBox="0 0 512 512" fill="none">
              <defs>
                <filter id="header-tick-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="12" />
                </filter>
                <radialGradient id="header-inner-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
                  <stop offset="60%" stopColor="#ffffff" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Soft subtle radial ambient light */}
              <circle cx="256" cy="256" r="220" fill="url(#header-inner-glow)" />

              {/* Subtle soft illuminated glow around tick mark */}
              <path
                d="M80 270L202 392L432 145"
                stroke="#ffffff"
                strokeWidth="78"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.35"
                filter="url(#header-tick-glow)"
              />

              {/* Sharp, prominent, centered tick mark */}
              <path
                d="M80 270L202 392L432 145"
                stroke="#ffffff"
                strokeWidth="58"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Project Title & Date */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 id="app-title" className="text-sm sm:text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                Daily Habits
              </h1>
              {isSyncing && (
                <span
                  id="sync-status"
                  className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-500/20"
                  title="Saving changes..."
                />
              )}
            </div>
            <p id="header-date" className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-normal leading-tight truncate">
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
            aria-label="Open Profile and Settings"
            title="Open Profile and Settings"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:opacity-90 active:scale-95 focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:outline-none transition-all duration-150 cursor-pointer group"
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

