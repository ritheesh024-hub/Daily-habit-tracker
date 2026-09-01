import React from 'react';

interface ProgressBarProps {
  completed: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isAllCompleted = completed === total && total > 0;

  return (
    <section id="today-progress-section" className="p-3.5 sm:p-4 rounded-xl glass-card space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <span id="progress-text" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Daily Progress
          </span>
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            (<span className="font-bold text-zinc-900 dark:text-zinc-100">{completed}</span> of {total} completed)
          </span>
        </div>
        <span id="progress-percentage" className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-zinc-800/60 px-2 py-0.5 rounded-full border border-zinc-300/40 dark:border-white/10">
          {percentage}%
        </span>
      </div>

      <div
        id="progress-bar-track"
        className="w-full h-2.5 bg-zinc-200/60 dark:bg-zinc-800/80 rounded-full border border-zinc-300/40 dark:border-white/5 overflow-hidden p-0.5"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          id="progress-bar-fill"
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isAllCompleted
              ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
              : 'bg-zinc-900 dark:bg-zinc-100 shadow-sm'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
};
