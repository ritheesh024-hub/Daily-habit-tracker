import React from 'react';

interface RunMetricCardProps {
  id: string;
  label: string;
  value: string;
  unit?: string;
  subLabel?: string;
  icon?: React.ReactNode;
  isHero?: boolean;
  highlight?: boolean;
}

export const RunMetricCard: React.FC<RunMetricCardProps> = ({
  id,
  label,
  value,
  unit,
  subLabel,
  icon,
  isHero = false,
  highlight = false,
}) => {
  return (
    <div
      id={id}
      className={`glass-card rounded-2xl p-3.5 sm:p-4.5 flex flex-col justify-between transition-all ${
        isHero
          ? 'col-span-2 sm:col-span-1 border-orange-500/30 dark:border-orange-500/25 bg-gradient-to-br from-orange-500/[0.04] to-transparent'
          : ''
      } ${
        highlight
          ? 'border-zinc-300 dark:border-white/15'
          : 'border-zinc-200/80 dark:border-white/10'
      }`}
    >
      {/* Metric Label Header */}
      <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5">
        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {icon && (
          <span className="text-zinc-400 dark:text-zinc-500" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>

      {/* Main Metric Value & Unit */}
      <div>
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className={`font-mono font-bold tracking-tight text-zinc-900 dark:text-zinc-50 truncate ${
              isHero
                ? 'text-3xl sm:text-4xl lg:text-5xl'
                : 'text-2xl sm:text-3xl'
            }`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 lowercase">
              {unit}
            </span>
          )}
        </div>

        {/* Optional Secondary Statistic (e.g. Average vs Current) */}
        {subLabel && (
          <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 truncate">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  );
};
