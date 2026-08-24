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
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-6 sm:p-8 shadow-xs">
        {/* Header */}
        <div className="mb-6">
          <h1 id="login-app-title" className="text-2xl font-semibold tracking-tight text-zinc-900">
            Daily Habits
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            A simple personal daily checklist to track and manage your daily routines.
          </p>
        </div>

        {/* Preview of habits */}
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3.5 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
            Default Daily Routines
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-xs text-zinc-700 font-mono">
            {DEFAULT_HABITS.map((h, i) => (
              <div key={h.id} className="flex items-center gap-1.5 truncate">
                <span className="text-zinc-400">{i + 1}.</span>
                {h.icon && <HabitIcon name={h.icon} className="w-3 h-3 text-zinc-400 shrink-0" />}
                <span className="truncate">{h.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700"
          >
            {error}
          </div>
        )}

        {/* Google Sign-in Button */}
        <button
          id="google-signin-btn"
          type="button"
          disabled={isLoading}
          onClick={onSignInWithGoogle}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
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

        <p className="text-[11px] text-zinc-400 text-center mt-4">
          Data is synced securely to your private Firestore database.
        </p>
      </div>
    </div>
  );
};
