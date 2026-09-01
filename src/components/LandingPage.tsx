import React from 'react';
import {
  Flame,
  BarChart3,
  Bell,
  BookOpen,
  Trophy,
  Download,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
  Target,
  Check,
  Smartphone,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  isLoading: boolean;
  error: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  isLoading,
  error,
}) => {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      {/* 1. Header / Navigation */}
      <header
        id="landing-header"
        className="sticky top-0 z-50 glass-surface border-b border-zinc-200/70 dark:border-white/10 transition-colors shadow-xs"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              id="landing-logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900 dark:bg-zinc-800 border border-zinc-800/80 dark:border-zinc-700/80 flex items-center justify-center shrink-0 shadow-2xs relative overflow-hidden"
              aria-hidden="true"
            >
              <svg className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" viewBox="0 0 512 512" fill="none">
                <defs>
                  <filter id="landing-tick-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="12" />
                  </filter>
                  <radialGradient id="landing-inner-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
                    <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="256" cy="256" r="220" fill="url(#landing-inner-glow)" />
                <path
                  d="M80 270L202 392L432 145"
                  stroke="#ffffff"
                  strokeWidth="78"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.32"
                  filter="url(#landing-tick-glow)"
                />
                <path
                  d="M80 270L202 392L432 145"
                  stroke="#ffffff"
                  strokeWidth="58"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                Daily Habits
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#why" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Why Daily Habits
            </a>
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              How it works
            </a>
            <a href="#preview" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Preview
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onGetStarted}
              disabled={isLoading}
              className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              disabled={isLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-black dark:hover:bg-white rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-8 sm:pt-14 pb-14 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[420px] bg-gradient-to-b from-zinc-200/40 dark:from-zinc-800/30 to-transparent blur-3xl pointer-events-none -z-10 opacity-70 dark:opacity-40 animate-soft-glow"
        />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Brand Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-[11px] sm:text-xs font-mono font-medium text-zinc-600 dark:text-zinc-300 mb-5 sm:mb-6 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Track • Improve • Achieve</span>
          </div>

          {/* Main Headline */}
          <h1
            id="landing-hero-headline"
            className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.15] max-w-3xl"
          >
            Build better days,
            <br />
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
              one habit at a time.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 mt-4 sm:mt-5 max-w-xl leading-relaxed">
            Track your routines, stay consistent, and see your progress every day with a clean, distraction-free tracker.
          </p>

          {/* Auth Error Banner (if any) */}
          {error && (
            <div
              id="landing-auth-error"
              className="w-full max-w-md mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 flex items-center gap-2 text-left"
            >
              <span className="font-bold text-red-600 dark:text-red-400 shrink-0">⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Hero CTAs */}
          <div className="mt-6 sm:mt-8 w-full max-w-xs flex flex-col items-center gap-3">
            <button
              id="landing-primary-cta"
              type="button"
              disabled={isLoading}
              onClick={onGetStarted}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm sm:text-base rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white dark:text-zinc-900" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Connecting...</span>
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  <span>Get Started with Google</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            {/* Secondary Action */}
            <button
              type="button"
              onClick={onGetStarted}
              disabled={isLoading}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors py-1 cursor-pointer"
            >
              Already have an account? <span className="underline font-medium">Sign in</span>
            </button>
          </div>

          {/* 3. Hero Visual & Subtle 3D Floating Dashboard Preview */}
          <div className="mt-10 sm:mt-14 w-full max-w-xl perspective-1000">
            <div className="animate-subtle-float relative glass-card rounded-2xl p-4 sm:p-6 shadow-2xl transition-all text-left">
              {/* Top Bar of Floating Preview */}
              <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/70 dark:border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 shadow-xs">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs tracking-tight">Today's Habits</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-mono">4 of 5 completed</span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold shadow-2xs">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>5-Day Streak</span>
                </div>
              </div>

              {/* Progress Bar in Preview */}
              <div className="mt-3.5 bg-zinc-100/60 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200/60 dark:border-white/5 backdrop-blur-xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  <span>Daily Completion</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">80%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200/80 dark:bg-zinc-700/80 rounded-full overflow-hidden p-0.5 border border-zinc-300/30 dark:border-white/5">
                  <div className="h-full bg-emerald-500 rounded-full w-[80%] transition-all shadow-xs" />
                </div>
              </div>

              {/* Realistic Habit Items List */}
              <div className="mt-3.5 space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl glass-tile border-zinc-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                    <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="line-through text-zinc-400 dark:text-zinc-500 font-medium">Drink 2.5L Water</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">08:30 AM</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl glass-tile border-zinc-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                    <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="line-through text-zinc-400 dark:text-zinc-500 font-medium">Morning Workout</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">09:15 AM</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl glass-tile border-zinc-200/60 dark:border-white/5">
                  <div className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200">
                    <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="line-through text-zinc-400 dark:text-zinc-500 font-medium">Read 20 Pages</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">01:45 PM</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl glass-card border-zinc-300/80 dark:border-white/15 shadow-sm">
                  <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <div className="w-4 h-4 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center" />
                    <span>Evening Mindfulness (10 mins)</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">Pending</span>
                </div>
              </div>

              {/* Floating Context Badges */}
              <div className="absolute -top-3 -right-2 sm:-right-4 px-3 py-1 rounded-full bg-zinc-950/90 dark:bg-zinc-100/95 backdrop-blur-md text-white dark:text-zinc-950 text-[10px] font-bold shadow-xl border border-white/20 dark:border-zinc-900/10 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                <span>Instant Cloud Sync</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: Why Daily Habits */}
      <section id="why" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-zinc-200/70 dark:border-white/10 bg-zinc-100/30 dark:bg-zinc-900/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Everything you need to stay consistent.
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2.5">
              Built on the core principles of habit formation: organized tracking, insightful feedback, and visible momentum.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1: Track */}
            <div className="p-5 sm:p-6 rounded-2xl glass-card shadow-lg hover:border-zinc-400/50 dark:hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Track
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Keep your daily habits organized and see what you've completed with a clear, distraction-free single-screen checklist.
              </p>
            </div>

            {/* Card 2: Improve */}
            <div className="p-5 sm:p-6 rounded-2xl glass-card shadow-lg hover:border-zinc-400/50 dark:hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center mb-4 shadow-xs">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Improve
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Understand your routine, log daily reflections, and identify trends in your weekly consistency and metrics.
              </p>
            </div>

            {/* Card 3: Achieve */}
            <div className="p-5 sm:p-6 rounded-2xl glass-card shadow-lg hover:border-zinc-400/50 dark:hover:border-white/20 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4 shadow-xs">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Achieve
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Build real momentum through automatic streak calculations, milestone unlocks, and measurable health records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: Feature Showcase */}
      <section id="features" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-zinc-200/70 dark:border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              Engineered for consistency
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* 1. Smart Streaks */}
            <div className="p-5 rounded-2xl glass-card transition-all hover:border-zinc-400/50 dark:hover:border-white/20 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                  <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Smart Streaks</h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Track consistency automatically with current and all-time best streak counts calculated dynamically from your history.
              </p>
            </div>

            {/* 2. Progress Analytics */}
            <div className="p-5 rounded-2xl glass-card transition-all hover:border-zinc-400/50 dark:hover:border-white/20 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Progress Analytics</h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Understand your daily, weekly, and monthly performance with completion rate breakdowns and activity trends.
              </p>
            </div>

            {/* 3. Smart Reminders */}
            <div className="p-5 rounded-2xl glass-card transition-all hover:border-zinc-400/50 dark:hover:border-white/20 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Smart Reminders</h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Get intelligent browser notifications about your remaining unfinished habits at your chosen schedule.
              </p>
            </div>

            {/* 4. Daily Notes */}
            <div className="p-5 rounded-2xl glass-card transition-all hover:border-zinc-400/50 dark:hover:border-white/20 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Daily Notes</h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Capture quick reflections, daily wins, or context alongside each day's checklist for a complete personal journal.
              </p>
            </div>

            {/* 5. Milestones */}
            <div className="p-5 rounded-2xl glass-card transition-all hover:border-zinc-400/50 dark:hover:border-white/20 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Milestones</h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Celebrate your consistency as you hit 3-day, 7-day, 30-day, and 100-day streaks with commemorative milestone badges.
              </p>
            </div>

            {/* 6. Data Export & Ownership */}
            <div className="p-5 rounded-2xl glass-card transition-all hover:border-zinc-400/50 dark:hover:border-white/20 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center justify-center shrink-0 shadow-2xs">
                  <Download className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Data Export & Backup</h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Export your full habit logs, history, milestones, and notes anytime in clean, open JSON format.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: How It Works */}
      <section id="how-it-works" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-zinc-200/70 dark:border-white/10 bg-zinc-100/30 dark:bg-zinc-900/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
              Simple Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-start p-6 rounded-2xl glass-card shadow-lg">
              <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 mb-2">
                01
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Create your routine
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Choose the habits that matter to you or select from curated daily templates.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-start p-6 rounded-2xl glass-card shadow-lg">
              <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 mb-2">
                02
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Track every day
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Mark habits as you complete them and add optional daily reflections and notes.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-start p-6 rounded-2xl glass-card shadow-lg">
              <span className="text-xs font-mono font-bold text-zinc-400 dark:text-zinc-500 mb-2">
                03
              </span>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Improve over time
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Use your completion percentages, streak charts, and milestone progress to build long-term consistency.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section: Product Preview */}
      <section id="preview" className="py-12 sm:py-16 px-4 sm:px-6 border-t border-zinc-200/70 dark:border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
            Designed for Daily Clarity
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            Your day. At a glance.
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2 max-w-lg mx-auto">
            A single, focused view that displays your daily checklist, streaks, and progress without cluttered sidebars or complex menus.
          </p>

          {/* Product Preview Mockup Container */}
          <div className="mt-8 sm:mt-10 max-w-2xl mx-auto rounded-2xl glass-card p-5 sm:p-7 shadow-2xl text-left">
            {/* Header snippet */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/70 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs shadow-xs font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Daily Habits</h4>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Wednesday, August 31</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                  Cloud Active
                </span>
              </div>
            </div>

            {/* Streak & Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="p-3 rounded-xl glass-tile">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">Streak</span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">5 days</span>
              </div>
              <div className="p-3 rounded-xl glass-tile">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">Completed</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">4 / 5</span>
              </div>
              <div className="p-3 rounded-xl glass-tile">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">Best Record</span>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono">14 days</span>
              </div>
            </div>

            {/* Checklist sample */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl glass-tile text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-2xs font-bold">
                    ✓
                  </div>
                  <span className="line-through text-zinc-400 dark:text-zinc-500 font-medium">Morning Hydration (500ml)</span>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Done</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl glass-tile text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-2xs font-bold">
                    ✓
                  </div>
                  <span className="line-through text-zinc-400 dark:text-zinc-500 font-medium">30 Min Strength Training</span>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Done</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl glass-tile text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px] shadow-2xs font-bold">
                    ✓
                  </div>
                  <span className="line-through text-zinc-400 dark:text-zinc-500 font-medium">Deep Work Session (90 min)</span>
                </div>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Done</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section: Final CTA */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 border-t border-zinc-200/70 dark:border-white/10 bg-zinc-100/30 dark:bg-zinc-900/30">
        <div className="max-w-xl mx-auto text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center mb-4 shadow-md font-bold">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Start building better days.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-zinc-600 dark:text-zinc-400 mt-2.5 max-w-md">
            Track your habits. Improve your routine. Achieve your goals.
          </p>

          <div className="mt-6 w-full max-w-xs">
            <button
              type="button"
              disabled={isLoading}
              onClick={onGetStarted}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* 9. Minimal Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 text-center text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center text-white text-[10px]">
              ✓
            </div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Daily Habits</span>
          </div>

          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            Track • Improve • Achieve
          </p>

          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
            Private & Secure • Cloud Powered
          </p>
        </div>
      </footer>
    </div>
  );
};
