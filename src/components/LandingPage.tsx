import React from 'react';
import { motion, type Variants } from 'motion/react';
import {
  Flame,
  BarChart3,
  CheckCircle2,
  Utensils,
  WifiOff,
  Compass,
  Activity,
  ArrowRight,
  ShieldCheck,
  Check,
  Lock,
  Trophy,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DailyHabitsMark } from './DailyHabitsLogo';

interface LandingPageProps {
  onGetStarted: () => void;
  isLoading: boolean;
  error: string | null;
  notification?: string | null;
}

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  isLoading,
  error,
  notification,
}) => {
  return (
    <div className="min-h-screen bg-[#07090d] text-zinc-100 font-sans antialiased selection:bg-emerald-950 selection:text-emerald-200 transition-colors overflow-x-hidden">
      {/* 1. Header / Navigation */}
      <header
        id="landing-header"
        className="sticky top-0 z-50 bg-zinc-950/85 backdrop-blur-md border-b border-white/10 transition-colors shadow-xs"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <a href="#" className="flex items-center gap-2.5 sm:gap-3 group">
            <div id="landing-logo" className="shrink-0">
              <DailyHabitsMark className="w-8 h-8 sm:w-9 sm:h-9" id="landing-header-mark" />
            </div>
            <div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-white leading-tight">
                Daily Habits
              </span>
            </div>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#daily-run" className="hover:text-white transition-colors">
              Daily Run
            </a>
            <a href="#daily-routes" className="hover:text-white transition-colors">
              Daily Routes
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onGetStarted}
              disabled={isLoading}
              className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              disabled={isLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-14 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Subtle Ambient CSS Gradient Background */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[460px] bg-gradient-to-b from-emerald-500/10 via-zinc-900/30 to-transparent blur-3xl pointer-events-none -z-10"
        />

        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          {/* Eyebrow Tag */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] sm:text-xs font-mono font-medium text-zinc-300 mb-6 shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            <span>Habits · Running · Routes · Nutrition</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            id="landing-hero-headline"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.14] max-w-3xl"
          >
            Build Better Habits.
            <br />
            <span className="text-emerald-400">Track Every Run.</span>{' '}
            <span className="text-zinc-400 font-medium">Improve Every Day.</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="text-sm sm:text-base md:text-lg text-zinc-400 mt-5 max-w-2xl leading-relaxed"
          >
            Your personal space to build consistent habits, track daily progress, analyze your food and discover running routes — all in one unified application.
          </motion.p>

          {/* Status Notification */}
          {notification && (
            <motion.div
              id="landing-status-notification"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md mt-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2.5 text-left shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold leading-relaxed">{notification}</span>
            </motion.div>
          )}

          {/* Auth Error Banner */}
          {error && (
            <motion.div
              id="landing-auth-error"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2 text-left"
            >
              <span className="font-bold text-red-400 shrink-0">⚠️</span>
              <span className="leading-relaxed">{error}</span>
            </motion.div>
          )}

          {/* Hero CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="mt-8 w-full max-w-sm flex flex-col sm:flex-row items-center justify-center gap-3 z-20"
          >
            <button
              id="landing-primary-cta"
              type="button"
              disabled={isLoading}
              onClick={onGetStarted}
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-sm sm:text-base rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-zinc-950" viewBox="0 0 24 24" fill="none">
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
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 text-zinc-950 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <a
              href="#features"
              className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center px-5 py-3 bg-zinc-900/90 border border-white/10 hover:border-white/20 rounded-xl text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-colors shadow-2xs"
            >
              Explore Features
            </a>
          </motion.div>
        </div>
      </section>

      {/* 3. Product Overview: Four Distinct Highlights */}
      <section className="py-8 px-4 sm:px-6 border-y border-white/10 bg-zinc-950/60">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Highlight 1 */}
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Habit Tracking</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Daily routines, streaks and progress.
                </p>
              </div>
            </div>

            {/* Highlight 2 */}
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Daily Run</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Real-time GPS outdoor running.
                </p>
              </div>
            </div>

            {/* Highlight 3 */}
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Daily Routes</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Discover and save circular running routes.
                </p>
              </div>
            </div>

            {/* Highlight 4 */}
            <div className="p-4 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">Food Analysis</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  AI-powered nutritional estimates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features: Everything You Need in One Place (Seven Core Features Exactly Once) */}
      <section id="features" className="py-14 sm:py-20 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Everything You Need in One Place
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              A single workspace designed for daily consistency, outdoor athletic tracking, and nutrition.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {/* Feature 1 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-emerald-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    1. Smart Habit Tracking
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Build and organize custom daily routines with flexible scheduling, priorities, and category tags.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Flexible daily & weekly schedules</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Priority levels and custom icons</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Flame className="w-5 h-5 fill-amber-500/30 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    2. Daily Progress & Streaks
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Build momentum with automated streak calculations, milestone badges, and daily reflections.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Automatic streak preservation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Milestone badges and daily notes</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-purple-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    3. AI Food Analysis
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Analyze meal photos for estimated calories, protein, carbs, fat, and fiber with dietary tips.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Macronutrient & calorie estimates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Balanced meal recommendations</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-orange-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors">
                    4. Daily Run GPS Tracker
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Track outdoor running workouts with live GPS coordinates, rolling pace, active duration, and calories.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Real-time GPS route drawing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Weight-based calorie calculation</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 5 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-blue-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    5. Running History & Analytics
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Review completed runs with weekly and monthly volume trend charts, running calendar, and personal records.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Weekly and monthly distance charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>All-time PRs for distance and pace</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 6 */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-emerald-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    6. Offline Run Support
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Record GPS coordinates without internet connectivity, with local caching and seamless cloud synchronization.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-4 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>IndexedDB offline run recording</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Automatic cloud sync when reconnected</span>
                </div>
              </div>
            </motion.div>

            {/* Feature 7 (Full Width Span) */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 sm:p-7 bg-zinc-900/90 border border-white/10 hover:border-indigo-500/30 shadow-md sm:col-span-2 lg:col-span-3 transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      7. Daily Route Discovery
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                      Plan pedestrian-safe circular running loops (2k, 3k, 5k, 8k, 10k) from your home or live location.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 shrink-0 text-xs text-zinc-300 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>2k to 10k circular loops</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Park and sidewalk routing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Saved home & GPS start points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Live off-route guidance</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 5. Daily Run Dedicated Section */}
      <section id="daily-run" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/10 bg-[#090c10]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Information */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="space-y-4"
          >
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400">
              Live Outdoor Tracking
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Daily Run
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Record real outdoor running sessions with live GPS telemetry. Track your distance, duration, rolling pace, average speed, and estimated calories burned, with full history and personal records saved to your account.
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Real-time GPS tracking and route drawing</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Distance and duration with pause deduction</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Pace, speed and weight-based calorie estimation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Run history, calendar logs and personal records</span>
              </li>
            </ul>
          </motion.div>

          {/* Compact Product Interface Preview */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl p-5 sm:p-6 bg-zinc-900 border border-white/10 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-white">Active Workout Preview</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono font-semibold text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                GPS Active
              </span>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Distance</span>
                <span className="text-xl font-bold font-mono text-white">5.00 km</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Duration</span>
                <span className="text-xl font-bold font-mono text-white">25:30</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Pace</span>
                <span className="text-xl font-bold font-mono text-orange-400">5:06 /km</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Speed</span>
                <span className="text-lg font-bold font-mono text-white">11.8 km/h</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Calories</span>
                <span className="text-lg font-bold font-mono text-white">345 kcal</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Status</span>
                <span className="text-lg font-bold font-mono text-emerald-400">Tracking</span>
              </div>
            </div>

            {/* Personal Records Highlight */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 flex items-center justify-between text-xs font-medium text-zinc-300">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Personal Records</span>
              </span>
              <span className="font-mono text-zinc-400">Longest Run · Fastest 5K</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 6. Daily Routes Dedicated Section */}
      <section id="daily-routes" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/10 bg-zinc-950">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Compact Product Interface Preview */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="order-2 md:order-1 rounded-3xl p-5 sm:p-6 bg-zinc-900 border border-white/10 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Loop Route Planner</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Circular
              </span>
            </div>

            {/* Distance Options */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/5 space-y-2">
              <div className="text-[11px] font-mono font-semibold text-zinc-400">
                TARGET DISTANCE
              </div>
              <div className="flex items-center gap-2">
                {['2 km', '3 km', '5 km', '8 km', '10 km'].map((dist, idx) => (
                  <span
                    key={dist}
                    className={`flex-1 py-1.5 rounded-lg text-center font-mono text-xs font-semibold ${
                      idx === 2
                        ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                        : 'bg-zinc-900 border border-white/5 text-zinc-400'
                    }`}
                  >
                    {dist}
                  </span>
                ))}
              </div>
            </div>

            {/* Starting Point Options */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/5 space-y-2 text-xs text-zinc-300">
              <div className="text-[11px] font-mono font-semibold text-zinc-400">
                STARTING LOCATION
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Current GPS or Saved Home</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-400">Doorstep Return</span>
              </div>
            </div>

            {/* Route Features */}
            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Pedestrian trails with off-route alerts</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-400 font-bold">Enabled</span>
            </div>
          </motion.div>

          {/* Information */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="order-1 md:order-2 space-y-4"
          >
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
              Loop Route Discovery
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Daily Routes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Generate pedestrian-safe circular running routes that start and end at the same location. Plan customized loops from your home or live position, discover local parks, and save your favourite routes.
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Circular routes from saved home or current GPS location</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>2k, 3k, 5k, 8k and 10k distance options</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Nearby parks and pedestrian paths</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Saved favourite routes with offline caching</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Live off-route deviation guidance</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* 7. How It Works: Five-Step Process Exactly Once */}
      <section id="how-it-works" className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/10 bg-[#090c10]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
          >
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Five simple steps to build consistency and track workouts.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 relative text-left"
          >
            {/* Step 1 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">01</span>
              <h3 className="text-xs font-bold text-white">Sign in securely</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Connect with your Google account.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">02</span>
              <h3 className="text-xs font-bold text-white">Set daily habits</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Define your routines and schedules.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">03</span>
              <h3 className="text-xs font-bold text-white">Track activities</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Log habits, meals, and outdoor runs.
              </p>
            </motion.div>

            {/* Step 4 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">04</span>
              <h3 className="text-xs font-bold text-white">Discover routes</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Find circular loops from your location.
              </p>
            </motion.div>

            {/* Step 5 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">05</span>
              <h3 className="text-xs font-bold text-white">Review progress</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Inspect streaks, volume, and personal records.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 8. Privacy Section */}
      <section id="privacy" className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/10 bg-zinc-950">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
          className="max-w-3xl mx-auto text-center space-y-4"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-5 h-5" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Privacy & Data Security
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Your personal habits, profile details, meal records, run telemetry, and saved routes belong exclusively to you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto pt-2">
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300">
                <span className="font-semibold text-white block">Secure Google Authentication</span>
                <span>Direct login without storing sensitive third-party passwords.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300">
                <span className="font-semibold text-white block">User-Specific Firestore Data</span>
                <span>All documents are isolated to your authenticated account ID.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300">
                <span className="font-semibold text-white block">GPS Only During Active Runs</span>
                <span>Location is captured solely when you start a workout, never in background.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300">
                <span className="font-semibold text-white block">No Unauthorized Sharing</span>
                <span>Your personal health, habit, and location data is never shared.</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/10 bg-[#090c10]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
          className="max-w-xl mx-auto text-center flex flex-col items-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-zinc-950 flex items-center justify-center mb-4 shadow-md font-bold">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
            Start Building Better Days.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-zinc-400 mt-2.5 max-w-md">
            Build consistent habits, track your outdoor runs and discover new routes.
          </p>

          <div className="mt-6 w-full max-w-xs">
            <button
              type="button"
              disabled={isLoading}
              onClick={onGetStarted}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-sm sm:text-base rounded-xl transition-all shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 text-zinc-950 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* 10. Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-white/10 bg-zinc-950 text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <DailyHabitsMark className="w-5 h-5" id="landing-footer-mark" />
            <span className="font-bold text-white text-xs">Daily Habits</span>
            <span className="text-zinc-600 text-[11px] font-mono">v1.0</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#daily-run" className="hover:text-white transition-colors">
              Daily Run
            </a>
            <a href="#daily-routes" className="hover:text-white transition-colors">
              Daily Routes
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#privacy" className="hover:text-white transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
