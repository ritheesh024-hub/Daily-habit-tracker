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
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex items-center justify-between px-3.5 py-2 rounded-lg bg-amber-50/90 border border-amber-200/90 text-amber-900 shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-200 text-amber-800 shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
              </span>
              <span className="text-xs font-semibold tracking-tight">
                Milestone Reached! New Best Streak ({stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'})
              </span>
            </div>
            <span className="text-[11px] font-medium text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
              Personal Record 🎉
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3">
        {/* Current Streak */}
        <motion.div
          id="current-streak-card"
          animate={
            isCurrentAllTimeBest && stats.currentStreak > 1
              ? { scale: [1, 1.01, 1] }
              : {}
          }
          transition={{ duration: 0.4 }}
          className={`p-3.5 bg-white border rounded-lg shadow-2xs flex flex-col justify-between transition-colors relative overflow-hidden ${
            isCurrentAllTimeBest && stats.currentStreak > 1
              ? 'border-amber-200/90 bg-gradient-to-b from-amber-50/30 to-white'
              : 'border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Current Streak
            </span>
            {isCurrentAllTimeBest && stats.currentStreak > 1 && (
              <span
                id="active-record-pill"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/70 border border-amber-200/80 px-1.5 py-0.5 rounded-full"
                title="Current streak is matching or setting your all-time best record"
              >
                <Flame className="w-2.5 h-2.5 text-amber-600" />
                <span>Peak</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base" role="img" aria-label="fire">🔥</span>
            <span id="current-streak-value" className="text-lg sm:text-xl font-bold text-zinc-900 font-mono">
              {stats.currentStreak}
            </span>
            <span className="text-xs font-medium text-zinc-500">
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
          transition={{ duration: 0.5 }}
          className={`p-3.5 bg-white border rounded-lg shadow-2xs flex flex-col justify-between transition-all relative overflow-hidden ${
            showCelebration
              ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20'
              : isHighMilestone
              ? 'border-zinc-200/90'
              : 'border-zinc-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Best Streak
            </span>
            {stats.bestStreak > 0 && (
              <span
                id="best-streak-badge"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded-full"
              >
                <Trophy className="w-2.5 h-2.5 text-amber-600" />
                <span>Record</span>
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span id="best-streak-value" className="text-lg sm:text-xl font-bold text-zinc-900 font-mono">
              {stats.bestStreak}
            </span>
            <span className="text-xs font-medium text-zinc-500">
              {stats.bestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

