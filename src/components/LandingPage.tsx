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
  Download,
  Check,
  Lock,
  Trophy,
  MapPin,
  Clock,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { DailyHabitsMark, DailyHabitsLogo } from './DailyHabitsLogo';

interface LandingPageProps {
  onGetStarted: () => void;
  isLoading: boolean;
  error: string | null;
  notification?: string | null;
}

// Subtle motion variants for gentle reveals
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
            <a href="#daily-run-showcase" className="hover:text-white transition-colors">
              Daily Run
            </a>
            <a href="#daily-routes-showcase" className="hover:text-white transition-colors">
              Daily Routes
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How it works
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
              className="text-xs sm:text-sm font-medium text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              disabled={isLoading}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Typography & Layout Driven */}
      <section className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Subtle Ambient CSS Gradient Background */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[520px] bg-gradient-to-b from-emerald-500/10 via-zinc-900/30 to-transparent blur-3xl pointer-events-none -z-10"
        />

        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
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
            className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.12] max-w-3xl"
          >
            Build Better Habits.
            <br />
            <span className="text-emerald-400">Track Every Run.</span>{' '}
            <span className="text-zinc-400 font-medium">Improve Every Day.</span>
          </motion.h1>

          {/* Supporting Text */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="text-sm sm:text-base md:text-lg text-zinc-400 mt-5 max-w-xl leading-relaxed"
          >
            Your personal space to build consistent habits, track your daily progress, analyze your food and discover running routes — all in one unified application.
          </motion.p>

          {/* Status / Success Notification */}
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

          {/* Clean Typography-Driven Product Console (Zero Images, Zero 3D) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="w-full max-w-4xl mt-12 sm:mt-16 text-left"
          >
            <div className="rounded-2xl bg-zinc-900/80 border border-white/10 p-5 sm:p-7 shadow-2xl backdrop-blur-sm">
              {/* Console Top Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/10 gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-zinc-700/80" />
                    <span className="w-3 h-3 rounded-full bg-zinc-700/80" />
                    <span className="w-3 h-3 rounded-full bg-zinc-700/80" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400">daily-habits.app · live preview</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Synchronized · Cloud Firestore
                  </span>
                </div>
              </div>

              {/* 4 Pillars Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                {/* 1. Habit Tracker Pillar */}
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">100% TODAY</span>
                  </div>
                  <h4 className="text-xs font-bold text-white pt-1">Habit Consistency</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Morning Run, Reading, Hydration logged with daily notes.
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 pt-1">
                    Streak: <span className="text-zinc-300 font-bold">7 consecutive days</span>
                  </div>
                </div>

                {/* 2. Daily Run Pillar */}
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">1 Hz GPS</span>
                  </div>
                  <h4 className="text-xs font-bold text-white pt-1">Outdoor Run</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    5.02 km · 26:14 · 5:13 /km with weight-based calories.
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 pt-1">
                    Personal Record: <span className="text-zinc-300 font-bold">Fastest 5K</span>
                  </div>
                </div>

                {/* 3. Daily Routes Pillar */}
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">LOOP ENGINE</span>
                  </div>
                  <h4 className="text-xs font-bold text-white pt-1">Route Discovery</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    5k circular loop from home through local parks & trails.
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 pt-1">
                    Guidance: <span className="text-zinc-300 font-bold">Off-route alert</span>
                  </div>
                </div>

                {/* 4. Food AI Pillar */}
                <div className="p-4 rounded-xl bg-zinc-950/70 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                      <Utensils className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">VISION AI</span>
                  </div>
                  <h4 className="text-xs font-bold text-white pt-1">Food Analysis</h4>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Instant calorie, protein, carb, and fiber estimates.
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 pt-1">
                    Nutrients: <span className="text-zinc-300 font-bold">42g Protein logged</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. Section: Features Section (7 Core Capabilities with Clean Text Cards) */}
      <section id="features" className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/10 bg-zinc-950">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Complete Health & Routine Suite
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              Everything in one unified space
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-2">
              Integrated routine management, real-time GPS outdoor running, loop discovery, and nutrition analytics.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {/* 1. Smart Habit Tracking */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-emerald-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold px-2 py-0.5 rounded bg-zinc-800/80 border border-white/5">
                    Habit Suite
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    1. Smart Habit Tracking
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Organize, customize, and check off your daily routines with clean priorities, custom icons, and smart reminder schedules.
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Flexible daily & custom frequencies</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Color tags and priority markers</span>
                </div>
              </div>
            </motion.div>

            {/* 2. Daily Progress & Streaks */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-amber-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 fill-amber-500/30 text-amber-400" />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold px-2 py-0.5 rounded bg-zinc-800/80 border border-white/5">
                    Momentum
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    2. Daily Progress & Streaks
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Build unstoppable momentum with automated streak calculations, milestone badges (3, 7, 30, 100 days), and daily notes.
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Automatic streak preservation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Achievement milestone celebration</span>
                </div>
              </div>
            </motion.div>

            {/* 3. AI Food Analysis */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-purple-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold px-2 py-0.5 rounded bg-zinc-800/80 border border-white/5">
                    Nutrition AI
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    3. AI Food Analysis
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Analyze meal photos with Gemini vision models for instant estimated calories, protein, carbs, fat, and fiber with nutritional tips.
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Instant macronutrient breakdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Dietary balance & guidance tips</span>
                </div>
              </div>
            </motion.div>

            {/* 4. Daily Run GPS Tracker */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-orange-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold px-2 py-0.5 rounded bg-zinc-800/80 border border-white/5">
                    Outdoor GPS
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-orange-300 transition-colors">
                    4. Daily Run GPS Tracker
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Outdoor workout tracking with real-time GPS coordinates, interactive Leaflet route drawing, rolling pace, speed, and calories.
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>1 Hz live GPS with stationary noise filtering</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>Weight-based MET calorie calculations</span>
                </div>
              </div>
            </motion.div>

            {/* 5. Running History & Analytics */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-blue-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold px-2 py-0.5 rounded bg-zinc-800/80 border border-white/5">
                    Analytics
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                    5. Running History & Analytics
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    In-depth running dashboard with volume trend charts, monthly running calendar, personal records (longest run, fastest pace), and time filters.
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Weekly volume and pace distribution</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>All-time PRs for pace and distance</span>
                </div>
              </div>
            </motion.div>

            {/* 6. Offline Run Support */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 bg-zinc-900/90 border border-white/10 hover:border-emerald-500/30 shadow-md flex flex-col justify-between transition-colors group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <WifiOff className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold px-2 py-0.5 rounded bg-zinc-800/80 border border-white/5">
                    Offline First
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    6. Offline Run Support
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
                    Keep recording GPS coordinates even without internet connectivity. Unfinished runs recover automatically and sync seamlessly to the cloud.
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-5 border-t border-white/5 space-y-1.5 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Local IndexedDB zero-data caching</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Automatic crash and refresh recovery</span>
                </div>
              </div>
            </motion.div>

            {/* 7. Daily Route Discovery (Prominent Wide Card) */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-2xl p-6 sm:p-7 bg-zinc-900/90 border border-white/10 hover:border-indigo-500/30 shadow-md sm:col-span-2 lg:col-span-3 transition-colors group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      Closed Loop Engine
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    7. Daily Route Discovery & Loop Planner
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Intelligent route discovery planning pedestrian loop routes (2k, 3k, 5k, 8k, 10k) from home or GPS location, routing through local parks and recreational landmarks with elevation profiles and live off-route deviation guidance.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 shrink-0 text-xs text-zinc-300 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>2k–10k circular loops</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Park & green path discovery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Real-time off-route guidance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Saved home & GPS starting points</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 4. Daily Run Showcase: Pure CSS & Typography Telemetry Card */}
      <section id="daily-run-showcase" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/10 bg-[#090c10]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="space-y-4"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400 font-mono">
              Live Outdoor Tracking
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Daily Run: Real-time GPS & Athletic Telemetry
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Experience clean, distraction-free running tracking directly in your browser. Record your real outdoor routes on an interactive OpenStreetMap canvas with accurate Haversine distance, active duration, rolling pace, and estimated calories burned based on your verified body weight.
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Live GPS route polyline with stationary noise filtering</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Instant pause and resume without straight-line GPS gaps</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Personal records for longest distance, fastest pace, and best duration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Monthly calendar and weekly volume analytics charts</span>
              </li>
            </ul>
          </motion.div>

          {/* Clean Typography-Driven Workout Telemetry Card (Zero Images, Zero 3D) */}
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
                <span className="text-xs font-bold text-white">Morning 5K Outdoor Run</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-orange-400">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                GPS LOCKED · ±4m
              </span>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Distance</span>
                <span className="text-xl font-bold font-mono text-white">5.02 km</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Duration</span>
                <span className="text-xl font-bold font-mono text-white">00:26:14</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Rolling Pace</span>
                <span className="text-xl font-bold font-mono text-orange-400">5:13 /km</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Avg Speed</span>
                <span className="text-lg font-bold font-mono text-white">11.5 km/h</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Energy</span>
                <span className="text-lg font-bold font-mono text-white">~348 kcal</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 text-center">
                <span className="text-[10px] text-zinc-400 block font-mono">Elevation</span>
                <span className="text-lg font-bold font-mono text-emerald-400">+24 m</span>
              </div>
            </div>

            {/* Structured Kilometer Splits Breakdown (Pure CSS & Typography) */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/5 space-y-2">
              <div className="text-[11px] font-mono font-semibold text-zinc-400 flex items-center justify-between">
                <span>KILOMETER SPLITS</span>
                <span>PACE / ELEV</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>KM 1</span>
                  <div className="w-32 bg-zinc-800 h-1.5 rounded-full overflow-hidden mx-2 hidden sm:block">
                    <div className="bg-orange-400 h-full w-[85%]" />
                  </div>
                  <span>5:22 /km · +4m</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>KM 2</span>
                  <div className="w-32 bg-zinc-800 h-1.5 rounded-full overflow-hidden mx-2 hidden sm:block">
                    <div className="bg-orange-400 h-full w-[88%]" />
                  </div>
                  <span>5:18 /km · +8m</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>KM 3</span>
                  <div className="w-32 bg-zinc-800 h-1.5 rounded-full overflow-hidden mx-2 hidden sm:block">
                    <div className="bg-orange-400 h-full w-[91%]" />
                  </div>
                  <span>5:11 /km · +2m</span>
                </div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>KM 4</span>
                  <div className="w-32 bg-zinc-800 h-1.5 rounded-full overflow-hidden mx-2 hidden sm:block">
                    <div className="bg-orange-400 h-full w-[94%]" />
                  </div>
                  <span>5:08 /km · -6m</span>
                </div>
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>KM 5.02</span>
                  <div className="w-32 bg-zinc-800 h-1.5 rounded-full overflow-hidden mx-2 hidden sm:block">
                    <div className="bg-emerald-400 h-full w-[98%]" />
                  </div>
                  <span>5:04 /km · +16m</span>
                </div>
              </div>
            </div>

            {/* Personal Record Indicator */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs font-medium text-amber-200">
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Personal Record: Fastest 5K Pace</span>
              </span>
              <span className="font-mono font-bold text-amber-400">5:13 /km</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. Daily Routes Showcase: Pure CSS & Typography Route Planning Card */}
      <section id="daily-routes-showcase" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/10 bg-zinc-950">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Loop Route Planning Card (Zero Images, Zero 3D) */}
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
                <span className="text-xs font-bold text-white">Suggested Circular Loop</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LOOP VERIFIED
              </span>
            </div>

            {/* Route Title & Telemetry Header */}
            <div className="space-y-1.5 p-4 rounded-2xl bg-zinc-950/80 border border-white/5">
              <h4 className="text-base font-bold text-white">
                Queen's Park & Waterfront Trail Loop
              </h4>
              <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono flex-wrap">
                <span className="font-bold text-white">5.18 km distance</span>
                <span aria-hidden="true">·</span>
                <span>~27 min est</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">+28m gain</span>
              </div>
            </div>

            {/* Discovered Landmarks Timeline (Pure Typography & Badges) */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3">
              <div className="text-[11px] font-mono font-semibold text-zinc-400 uppercase">
                Route Waypoints & Discovered Landmarks
              </div>
              <div className="space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    01
                  </div>
                  <div>
                    <span className="font-semibold text-white">Start / Finish Point</span>
                    <span className="text-zinc-500 text-[11px] block">Saved Home location or current GPS fix</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    02
                  </div>
                  <div>
                    <span className="font-semibold text-white">Queen's Park West Promenade</span>
                    <span className="text-zinc-500 text-[11px] block">Traffic-free pedestrian trail · 1.6 km</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    03
                  </div>
                  <div>
                    <span className="font-semibold text-white">Waterfront Esplanade Path</span>
                    <span className="text-zinc-500 text-[11px] block">Scenic riverway sidewalk · 2.1 km</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                    04
                  </div>
                  <div>
                    <span className="font-semibold text-white">Complete Loop Return</span>
                    <span className="text-zinc-500 text-[11px] block">Seamless circular return to start</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Path Surface Breakdown Bar */}
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>SURFACE: 82% PAVED · 18% TRAIL</span>
                <span>CROSSINGS: 2</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                <div className="bg-indigo-400 h-full w-[82%]" title="Paved Sidewalk" />
                <div className="bg-emerald-400 h-full w-[18%]" title="Park Trail" />
              </div>
            </div>

            {/* Guidance Status */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-emerald-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Live off-route deviation guidance enabled</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">ACTIVE</span>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="order-1 md:order-2 space-y-4"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Loop Route Discovery
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Daily Routes: Intelligent Loop Route Planner
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Never get bored of your regular route. Pick your current GPS position or saved home location, choose your target distance (2k, 3k, 5k, 8k, or 10k), and discover scenic circular routes that start and finish at your doorstep.
            </p>

            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pedestrian-safe paths following actual sidewalks and park trails</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Discovers nearby public parks, lakes, running tracks, and recreation grounds</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Save favourite routes to your account with offline caching</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Live route guidance with off-route alerts and loop completion indicators</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* 6. Section: How It Works */}
      <section id="how-it-works" className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/10 bg-[#090c10]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
            className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
              Simple 5-Step Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
              How Daily Habits works
            </h2>
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
                One-tap sign-in with your Google account. Your records stay isolated to your UID.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">02</span>
              <h3 className="text-xs font-bold text-white">Set daily habits</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Customize habits, priorities, and smart schedules for daily consistency.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">03</span>
              <h3 className="text-xs font-bold text-white">Track activities</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Check off routines, scan meals with AI, and track outdoor runs with live GPS.
              </p>
            </motion.div>

            {/* Step 4 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">04</span>
              <h3 className="text-xs font-bold text-white">Discover routes</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Generate 2k–10k pedestrian loop routes starting and returning to your doorstep.
              </p>
            </motion.div>

            {/* Step 5 */}
            <motion.div variants={fadeInUp} whileHover={{ y: -2 }} className="p-4 rounded-2xl bg-zinc-900 border border-white/10">
              <span className="text-xs font-mono font-bold text-emerald-400 mb-1.5 block">05</span>
              <h3 className="text-xs font-bold text-white">Review progress</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Inspect streak milestones, weekly volume trends, and personal records.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 7. Privacy & Data Security Section */}
      <section id="privacy" className="py-14 sm:py-20 px-4 sm:px-6 border-t border-white/10 bg-zinc-950">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={fadeInUp}
          className="max-w-4xl mx-auto text-center space-y-4"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-5 h-5" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Privacy & Strict User Data Isolation
          </h2>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Your personal habits, profile information, meal records, run telemetry, and saved routes belong exclusively to you. Every document is scoped under your private authenticated user identifier and strictly guarded by Cloud Firestore security rules. GPS location data is only captured when you explicitly start a run workout, and is never shared, sold, or monitored in the background.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4 text-xs font-medium text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Firebase ABAC Protected</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>1-Tap Full Data Export</span>
            </span>
          </div>
        </motion.div>
      </section>

      {/* 8. Final CTA */}
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
            Start building better days.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-zinc-400 mt-2.5 max-w-md">
            Build consistent habits. Track your outdoor runs. Discover local loop routes.
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

      {/* 9. Footer */}
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
            <a href="#daily-run-showcase" className="hover:text-white transition-colors">
              Daily Run
            </a>
            <a href="#daily-routes-showcase" className="hover:text-white transition-colors">
              Daily Routes
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
