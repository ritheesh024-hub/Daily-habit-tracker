import React, { useState, useMemo } from 'react';
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
  Plus,
  Flame,
  Award,
  BookOpen,
  Calendar,
  Zap,
  Crown,
  Filter,
} from 'lucide-react';
import { Milestone, StreakStats, GoalWithProgress, HabitGoal, HabitItem, AchievementCategory } from '../types';
import { GoalCard } from './GoalCard';

interface FutureViewProps {
  milestones?: Milestone[];
  streaks?: StreakStats;
  goals?: GoalWithProgress[];
  onOpenNewGoal?: () => void;
  onEditGoal?: (goal: HabitGoal) => void;
  onDeleteGoal?: (goalId: string) => Promise<void>;
  habits?: HabitItem[];
}

interface UpcomingFeature {
  title: string;
  category: string;
  icon: React.ElementType;
  description: string;
  timeline: string;
}

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
    title: 'Habit Stacking & Daily Routines',
    category: 'Routines',
    icon: Compass,
    description: 'Group habits into structured Morning and Evening sequences with one-tap batch completion.',
    timeline: 'Coming Soon',
  },
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
];

const ACHIEVEMENT_CATEGORIES: { id: 'all' | AchievementCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'streak', label: 'Streaks' },
  { id: 'completions', label: 'Completions' },
  { id: 'consistency', label: 'Consistency' },
  { id: 'perfect_days', label: 'Perfect Days' },
  { id: 'personal_best', label: 'Personal Best' },
];

function renderMilestoneIcon(iconName: string, isUnlocked: boolean) {
  if (!isUnlocked) {
    return <Lock className="w-4 h-4 text-zinc-400" />;
  }

  switch (iconName) {
    case 'flame':
      return <Flame className="w-4 h-4 text-amber-500" />;
    case 'sparkles':
      return <Sparkles className="w-4 h-4 text-amber-400" />;
    case 'trophy':
      return <Trophy className="w-4 h-4 text-amber-500" />;
    case 'crown':
      return <Crown className="w-4 h-4 text-amber-500" />;
    case 'award':
      return <Award className="w-4 h-4 text-indigo-500" />;
    case 'book':
      return <BookOpen className="w-4 h-4 text-emerald-500" />;
    case 'calendar':
      return <Calendar className="w-4 h-4 text-blue-500" />;
    case 'zap':
      return <Zap className="w-4 h-4 text-amber-500" />;
    case 'target':
      return <Target className="w-4 h-4 text-rose-500" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
}

export const FutureView: React.FC<FutureViewProps> = ({
  milestones = [],
  streaks,
  goals = [],
  onOpenNewGoal,
  onEditGoal,
  onDeleteGoal,
}) => {
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed' | 'expired'>('all');
  const [achievementCategory, setAchievementCategory] = useState<'all' | AchievementCategory>('all');

  const unlockedCount = useMemo(() => milestones.filter((m) => m.isUnlocked).length, [milestones]);
  const activeGoalsCount = useMemo(() => goals.filter((g) => g.status === 'active').length, [goals]);
  const completedGoalsCount = useMemo(() => goals.filter((g) => g.status === 'completed').length, [goals]);

  // Filtered goals
  const filteredGoals = useMemo(() => {
    if (goalFilter === 'all') return goals;
    return goals.filter((g) => g.status === goalFilter);
  }, [goals, goalFilter]);

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    if (achievementCategory === 'all') return milestones;
    return milestones.filter((m) => m.category === achievementCategory);
  }, [milestones, achievementCategory]);

  return (
    <div id="future-roadmap-view" className="space-y-7 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="p-5 glass-card rounded-2xl space-y-3 bg-gradient-to-br from-indigo-500/5 via-transparent to-amber-500/5 border border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Goals & Achievements</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {activeGoalsCount} Active Goals
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {unlockedCount} / {milestones.length} Badges
            </span>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Milestones & Habit Targets
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Set custom weekly & monthly completion targets and unlock badges as you build consistency.
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. PERSONAL HABIT GOALS SECTION                           */}
      {/* ========================================================= */}
      <section id="goals-section" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Personal Goals
            </h3>
          </div>

          {onOpenNewGoal && (
            <button
              id="new-goal-btn"
              type="button"
              onClick={onOpenNewGoal}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Goal</span>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['all', 'active', 'completed', 'expired'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setGoalFilter(filter)}
              className={`px-3 py-1 rounded-lg font-medium capitalize transition-colors ${
                goalFilter === filter
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {filter}
              {filter === 'active' && activeGoalsCount > 0 && ` (${activeGoalsCount})`}
              {filter === 'completed' && completedGoalsCount > 0 && ` (${completedGoalsCount})`}
            </button>
          ))}
        </div>

        {/* Goals List / Empty State */}
        {filteredGoals.length === 0 ? (
          <div className="p-6 glass-card rounded-2xl text-center space-y-3 border-dashed border-zinc-300 dark:border-zinc-800">
            <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {goalFilter === 'all'
                  ? 'No habit goals set yet'
                  : `No ${goalFilter} goals found`}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Set a target to complete a habit a certain number of times this week or month.
              </p>
            </div>
            {onOpenNewGoal && (
              <button
                type="button"
                onClick={onOpenNewGoal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Your First Goal</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={onEditGoal}
                onDelete={onDeleteGoal}
              />
            ))}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 2. ACHIEVEMENTS & MILESTONES SECTION                      */}
      {/* ========================================================= */}
      <section id="achievements-section" className="space-y-3.5">
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

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {ACHIEVEMENT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setAchievementCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                achievementCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Milestones Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                milestone.isUnlocked
                  ? 'bg-zinc-50/80 dark:bg-zinc-900/80 border-amber-500/30 dark:border-amber-500/20 shadow-sm'
                  : 'bg-zinc-50/40 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-white/5 opacity-75'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base ${
                  milestone.isUnlocked
                    ? 'bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30'
                    : 'bg-zinc-200/60 dark:bg-zinc-800 border border-zinc-300/40 dark:border-zinc-700'
                }`}
              >
                {renderMilestoneIcon(milestone.icon, milestone.isUnlocked)}
              </div>

              <div className="min-w-0 space-y-0.5 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                    {milestone.title || milestone.name}
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
          {UPCOMING_CHALLENGES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-3.5 glass-card rounded-xl space-y-1.5 border-dashed"
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {feature.title}
                  </h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. UPCOMING ROADMAP PREVIEW                               */}
      {/* ========================================================= */}
      <section id="upcoming-roadmap-section" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Product Roadmap
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded">
            In Development
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PLANNED_IMPROVEMENTS.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="p-3.5 glass-card rounded-xl space-y-1 border-dashed"
              >
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400">
                    {feature.category}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 pt-1">
                  {feature.title}
                </h4>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
