import React from 'react';
import { StreakStats } from '../types';

interface StreakStatsCardProps {
  stats: StreakStats;
}

export const StreakStatsCard: React.FC<StreakStatsCardProps> = ({ stats }) => {
  return (
    <section id="streak-stats-section" className="grid grid-cols-2 gap-3">
      {/* Current Streak */}
      <div
        id="current-streak-card"
        className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs flex flex-col justify-between"
      >
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Current Streak
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-base" role="img" aria-label="fire">🔥</span>
          <span id="current-streak-value" className="text-lg sm:text-xl font-bold text-zinc-900 font-mono">
            {stats.currentStreak}
          </span>
          <span className="text-xs font-medium text-zinc-500">
            {stats.currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      {/* Best Streak */}
      <div
        id="best-streak-card"
        className="p-3.5 bg-white border border-zinc-200 rounded-lg shadow-2xs flex flex-col justify-between"
      >
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Best Streak
        </span>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span id="best-streak-value" className="text-lg sm:text-xl font-bold text-zinc-900 font-mono">
            {stats.bestStreak}
          </span>
          <span className="text-xs font-medium text-zinc-500">
            {stats.bestStreak === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>
    </section>
  );
};
