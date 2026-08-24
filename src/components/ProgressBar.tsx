import React from 'react';

interface ProgressBarProps {
  completed: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isAllCompleted = completed === total && total > 0;

  return (
    <section id="today-progress-section" className="py-2">
      <div className="flex items-baseline justify-between mb-2">
        <span id="progress-text" className="text-base sm:text-lg font-medium text-zinc-900">
          <span className="font-semibold text-zinc-950">{completed}</span> / {total} completed
        </span>
        <span id="progress-percentage" className="text-xs font-mono text-zinc-500">
          {percentage}%
        </span>
      </div>

      <div
        id="progress-bar-track"
        className="w-full h-2.5 bg-zinc-100 rounded-full border border-zinc-200/80 overflow-hidden"
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          id="progress-bar-fill"
          className={`h-full transition-all duration-200 ease-out ${
            isAllCompleted ? 'bg-emerald-600' : 'bg-zinc-800'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </section>
  );
};
