import React from 'react';
import { DEFAULT_HABITS } from '../types';
import { HabitIcon } from './HabitIcon';
import { DailyHabitsLogo } from './DailyHabitsLogo';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen bg-[#07090D] flex items-center justify-center p-4 sm:p-6 transition-colors relative overflow-hidden text-zinc-100">
      {/* Subtle Ambient CSS Gradient background */}
      <div
        aria-hidden="true"
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-cyan-500/10 blur-3xl pointer-events-none -z-10"
      />

      <div className="w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Brand Header with New Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <DailyHabitsLogo size="lg" variant="stacked" showTagline={false} id="login-brand" />
          <h1 id="login-app-title" className="sr-only">
            Daily Habits
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
            Your personal space to build consistent habits, track outdoor runs, and analyze nutrition.
          </p>
        </div>

        {/* Feature Capability Highlights */}
        <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-4 mb-6">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center justify-between">
            <span>Core Workspace Features</span>
            <span className="text-zinc-500 font-normal">v1.0</span>
          </div>
          <div className="space-y-2 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Smart Habit Scheduling & Streak Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Live GPS Outdoor Running & Athletic Telemetry</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Intelligent 2k–10k Loop Route Discovery</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>AI Food & Macronutrient Analysis</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            id="auth-error-banner"
            className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-200 space-y-2"
          >
            <div className="font-medium flex items-start gap-2">
              <span className="text-red-400 font-bold shrink-0">⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </div>
            {typeof window !== 'undefined' && error.includes('Authorized domains') && (
              <div className="pt-1 flex items-center justify-between gap-2 bg-zinc-900 p-2 rounded-lg border border-red-800/60">
                <code className="text-[11px] font-mono text-zinc-200 truncate select-all">
                  {window.location.hostname}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.hostname);
                  }}
                  className="px-2 py-1 bg-red-900/60 hover:bg-red-800 active:bg-red-700 text-red-200 rounded text-[10px] font-semibold tracking-wide transition-colors cursor-pointer shrink-0"
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
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-sm font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-zinc-950" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Signing in...</span>
            </span>
          ) : (
            <>
              {/* Google G Logo SVG */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

        <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 text-center mt-4 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>Synced securely to private Cloud Firestore</span>
        </div>
      </div>
    </div>
  );
};
