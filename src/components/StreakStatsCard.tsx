import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Trophy, Flame } from 'lucide-react';
import { StreakStats } from '../types';

interface StreakStatsCardProps {
  stats: StreakStats;
}

export const StreakStatsCard: React.FC<StreakStatsCardProps> = ({ stats }) => {
  const prevBestRef = useRef<number>(stats.bestStreak);
  const [showCelebration, setShowCelebration] = useState(false);

  // Trigger celebration when best streak improves or when a new milestone peak is achieved
  useEffect(() => {
    if (stats.bestStreak > prevBestRef.current && prevBestRef.current > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
    prevBestRef.current = stats.bestStreak;
  }, [stats.bestStreak]);

  const isCurrentAllTimeBest = stats.currentStreak > 0 && stats.currentStreak >= stats.bestStreak;
  const isHighMilestone = stats.bestStreak >= 3;

  return (
    <section id="streak-stats-section" className="space-y-2">
      {/* Milestone Achieved Banner (Triggered when user beats previous best streak) */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            id="milestone-achieved-banner"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-amber-500/15 dark:bg-amber-500/10 backdrop-blur-md border border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/30 text-amber-900 dark:text-amber-200 shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
              </span>
              <span className="text-xs font-semibold tracking-tight">
                Milestone Reached! New Best Streak ({stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'})
              </span>
            </div>
            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-500/30">
              Personal Record 🎉
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Current Streak */}
        <motion.div
          id="current-streak-card"
          animate={
            isCurrentAllTimeBest && stats.currentStreak > 1
              ? { scale: [1, 1.01, 1] }
              : {}
          }
          transition={{ duration: 0.35 }}
          className={`p-3.5 sm:p-4 rounded-xl glass-card flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
            isCurrentAllTimeBest && stats.currentStreak > 1
              ? 'border-amber-500/40 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/5'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Current Streak
            </span>
            {isCurrentAllTimeBest && stats.currentStreak > 1 && (
              <span
                id="active-record-pill"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full backdrop-blur-xs"
                title="Current streak is matching or setting your all-time best record"
              >
                <Flame className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                <span>Peak</span>
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl" role="img" aria-label="fire">🔥</span>
            <span id="current-streak-value" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
              {stats.currentStreak}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {stats.currentStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </motion.div>

        {/* Best Streak */}
        <motion.div
          id="best-streak-card"
          animate={
            showCelebration
              ? {
                  scale: [1, 1.02, 1],
                  borderColor: ['#fcd34d', '#f59e0b', '#fcd34d'],
                }
              : {}
          }
          transition={{ duration: 0.4 }}
          className={`p-3.5 sm:p-4 rounded-xl glass-card flex flex-col justify-between transition-all duration-200 relative overflow-hidden group ${
            showCelebration
              ? 'border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-500/20 bg-amber-500/10'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Best Streak
            </span>
            {stats.bestStreak > 0 && (
              <span
                id="best-streak-badge"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-white/10 px-2 py-0.5 rounded-full backdrop-blur-xs"
              >
                <Trophy className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
                <span>Record</span>
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span id="best-streak-value" className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
              {stats.bestStreak}
            </span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {stats.bestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

