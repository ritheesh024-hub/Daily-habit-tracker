import React from 'react';
import { DEFAULT_HABITS } from '../types';
import { HabitIcon } from './HabitIcon';

interface LoginViewProps {
  onSignInWithGoogle: () => void;
  isLoading: boolean;
  error: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSignInWithGoogle,
  isLoading,
  error,
}) => {
  return (
    <div className="min-h-screen bg-zinc-50/70 dark:bg-zinc-950/80 flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden">
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-gradient-to-tr from-emerald-500/10 via-cyan-500/10 to-indigo-500/10 blur-3xl pointer-events-none -z-10"
      />

      <div className="w-full max-w-md glass-card rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 transition-all">
        {/* Header */}
        <div className="mb-6">
          <h1 id="login-app-title" className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Daily Habits
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            A simple personal daily checklist to track and manage your daily routines.
          </p>
        </div>

        {/* Preview of habits */}
        <div className="bg-white/40 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-white/5 rounded-xl p-4 mb-6 backdrop-blur-xs">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
            Default Daily Routines
          </div>
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-xs text-zinc-700 dark:text-zinc-300 font-mono">
            {DEFAULT_HABITS.map((h, i) => (
              <div key={h.id} className="flex items-center gap-1.5 truncate">
                <span className="text-zinc-400 dark:text-zinc-500">{i + 1}.</span>
                {h.icon && <HabitIcon name={h.icon} className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />}
                <span className="truncate">{h.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3.5 rounded-xl bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 text-xs text-red-800 dark:text-red-300 space-y-2 backdrop-blur-xs"
          >
            <div className="font-medium flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 font-bold shrink-0">⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </div>
            {typeof window !== 'undefined' && error.includes('Authorized domains') && (
              <div className="pt-1 flex items-center justify-between gap-2 bg-white/70 dark:bg-zinc-800/80 p-2 rounded-lg border border-red-200/60 dark:border-red-800/60">
                <code className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 truncate select-all">
                  {window.location.hostname}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.hostname);
                  }}
                  className="px-2 py-1 bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-800 active:bg-red-300 text-red-900 dark:text-red-200 rounded text-[10px] font-semibold tracking-wide transition-colors cursor-pointer shrink-0"
                >
                  Copy Domain
                </button>
              </div>
            )}
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          id="google-signin-btn"
          type="button"
          disabled={isLoading}
          onClick={onSignInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-900 dark:bg-zinc-100 hover:bg-black dark:hover:bg-white active:scale-98 text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white dark:text-zinc-900" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Signing in...
            </span>
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.6l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mt-4">
          Data is synced securely to your private Firestore database.
        </p>
      </div>
    </div>
  );
};
