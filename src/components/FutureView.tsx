import React from 'react';
import {
  Sparkles,
  Trophy,
  Target,
  Compass,
  Cpu,
  Watch,
  Users,
  LayoutGrid,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Milestone, StreakStats } from '../types';

interface FutureViewProps {
  milestones?: Milestone[];
  streaks?: StreakStats;
}

interface UpcomingFeature {
  title: string;
  category: string;
  icon: React.ElementType;
  description: string;
  timeline: string;
}

const UPCOMING_GOALS: UpcomingFeature[] = [
  {
    title: 'Custom Habit Targets & Milestones',
    category: 'Goals',
    icon: Target,
    description: 'Set custom volume milestones (e.g. "Run 100km", "Read 12 Books") and track cumulative progress over time.',
    timeline: 'Coming Soon',
  },
  {
    title: 'Habit Stacking & Daily Routines',
    category: 'Routines',
    icon: Compass,
    description: 'Group habits into structured Morning and Evening sequences with one-tap batch completion.',
    timeline: 'Coming Soon',
  },
];

const UPCOMING_CHALLENGES: UpcomingFeature[] = [
  {
    title: '30-Day Sunrise Sprint',
    category: 'Challenge',
    icon: Sparkles,
    description: 'Commit to waking up early consistently for 30 days and earn exclusive community badges.',
    timeline: 'Coming Soon',
  },
  {
    title: 'Deep Work Focus Loop',
    category: 'Challenge',
    icon: Target,
    description: 'Build a daily distraction-free study and work rhythm with focused session tracking.',
    timeline: 'Coming Soon',
  },
  {
    title: 'Hydration Sprint',
    category: 'Challenge',
    icon: Trophy,
    description: 'Complete your daily water goal every day for 21 days to form an unbreakable hydration habit.',
    timeline: 'Coming Soon',
  },
];

const PLANNED_IMPROVEMENTS: UpcomingFeature[] = [
  {
    title: 'AI Habit Coach & Pattern Insights',
    category: 'AI Engine',
    icon: Cpu,
    description: 'Personalized pattern discovery that identifies your optimal habit timing and prevents streak breaks.',
    timeline: 'Coming Soon',
  },
  {
    title: 'Wearables & Health Sync',
    category: 'Integrations',
    icon: Watch,
    description: 'Automatic synchronization with Apple Health, Google Fit, and smartwatches for step and gym tracking.',
    timeline: 'Coming Soon',
  },
  {
    title: 'Accountability Circles',
    category: 'Community',
    icon: Users,
    description: 'Privately share streaks and progress with trusted friends or accountability partners.',
    timeline: 'Coming Soon',
  },
  {
    title: 'Home Screen Widgets',
    category: 'Platform',
    icon: LayoutGrid,
    description: 'Quick check-in widgets for your mobile home screen to complete habits without opening the app.',
    timeline: 'Coming Soon',
  },
];

export const FutureView: React.FC<FutureViewProps> = ({ milestones = [], streaks }) => {
  const unlockedCount = milestones.filter((m) => m.isUnlocked).length;

  return (
    <div id="future-roadmap-view" className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="p-5 glass-card rounded-2xl space-y-1">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Product Roadmap</span>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Future & Achievements
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Explore your active milestones and preview upcoming features in development.
        </p>
      </div>

      {/* ========================================================= */}
      {/* 1. YOUR ACHIEVEMENTS (ACTIVE & REAL)                      */}
      {/* ========================================================= */}
      <section id="achievements-section" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Achievements & Milestones
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 font-semibold">
            {unlockedCount} of {milestones.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                milestone.isUnlocked
                  ? 'bg-zinc-100/80 dark:bg-zinc-900/80 border-zinc-300 dark:border-zinc-700'
                  : 'bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-white/5 opacity-70'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                  milestone.isUnlocked
                    ? 'bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30'
                    : 'bg-zinc-200/60 dark:bg-zinc-800 border border-zinc-300/40 dark:border-zinc-700'
                }`}
              >
                {milestone.isUnlocked ? milestone.icon : <Lock className="w-4 h-4 text-zinc-400" />}
              </div>

              <div className="min-w-0 space-y-0.5 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {milestone.name}
                  </span>
                  {milestone.isUnlocked && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Unlocked</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  {milestone.description}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  <span>{milestone.progressText}</span>
                  {milestone.unlockedAt && <span>{milestone.unlockedAt}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. UPCOMING GOALS (COMING SOON)                           */}
      {/* ========================================================= */}
      <section id="upcoming-goals-section" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Goals & Routine Tracking
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded">
            Coming Soon
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {UPCOMING_GOALS.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-4 glass-card rounded-xl space-y-2 border-dashed"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full">
                    {feature.timeline}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. SEASONAL CHALLENGES (COMING SOON)                      */}
      {/* ========================================================= */}
      <section id="upcoming-challenges-section" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Seasonal Challenges
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded">
            Coming Soon
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {UPCOMING_CHALLENGES.map((challenge) => {
            const Icon = challenge.icon;
            return (
              <div
                key={challenge.title}
                className="p-4 glass-card rounded-xl space-y-2 border-dashed"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full">
                    {challenge.timeline}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {challenge.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {challenge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. PLANNED IMPROVEMENTS (COMING SOON)                     */}
      {/* ========================================================= */}
      <section id="planned-improvements-section" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-teal-500 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Planned Improvements
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded">
            Coming Soon
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PLANNED_IMPROVEMENTS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-4 glass-card rounded-xl space-y-2 border-dashed"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-full">
                    {item.timeline}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
