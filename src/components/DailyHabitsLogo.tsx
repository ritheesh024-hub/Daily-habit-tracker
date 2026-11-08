import React from 'react';

export interface DailyHabitsLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'mark' | 'full' | 'stacked';
  showTagline?: boolean;
  className?: string;
  id?: string;
}

const SIZE_MAP = {
  xs: { icon: 'w-6 h-6', text: 'text-sm', badge: 'text-[9px]' },
  sm: { icon: 'w-8 h-8', text: 'text-base', badge: 'text-[10px]' },
  md: { icon: 'w-10 h-10', text: 'text-lg', badge: 'text-[11px]' },
  lg: { icon: 'w-12 h-12', text: 'text-xl', badge: 'text-xs' },
  xl: { icon: 'w-16 h-16', text: 'text-2xl', badge: 'text-xs' },
};

/**
 * Geometric Vector Emblem for Daily Habits
 * Represents continuous daily continuity loop & forward athletic momentum
 */
export const DailyHabitsMark: React.FC<{ className?: string; id?: string }> = ({
  className = 'w-8 h-8',
  id = 'daily-habits-mark',
}) => {
  return (
    <div
      id={id}
      className={`relative shrink-0 rounded-xl overflow-hidden shadow-sm transition-transform duration-200 group-hover:scale-105 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={`${id}-bg`} x1="64" y1="48" x2="448" y2="464" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="50%" stopColor="#090D16" />
            <stop offset="100%" stopColor="#04070D" />
          </linearGradient>

          <linearGradient id={`${id}-border`} x1="96" y1="64" x2="416" y2="448" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id={`${id}-ribbon`} x1="120" y1="360" x2="400" y2="140" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="35%" stopColor="#10B981" />
            <stop offset="70%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
        </defs>

        {/* Base Squircle */}
        <rect x="24" y="24" width="464" height="464" rx="124" fill={`url(#${id}-bg)`} />
        <rect x="24" y="24" width="464" height="464" rx="124" stroke={`url(#${id}-border)`} strokeWidth="10" />

        {/* Ambient Core Light */}
        <circle cx="256" cy="256" r="190" fill="#10B981" fillOpacity="0.08" />

        {/* Soft Ambient Glow under Mark */}
        <g filter={`url(#${id}-glow)`} opacity="0.45">
          <path
            d="M172 328 C128 328 104 290 104 246 C104 186 148 148 206 148 C258 148 296 182 308 232"
            stroke="#10B981"
            strokeWidth="50"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M148 262 L228 342 L408 162"
            stroke="#38BDF8"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* 1. Daily Continuity Loop (Habits & Running Loop) */}
        <path
          d="M184 324 C142 324 116 292 116 250 C116 196 156 160 212 160 C264 160 300 194 312 242"
          stroke={`url(#${id}-ribbon)`}
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 2. Forward Stride & Momentum Check (Progress & Achievement) */}
        <path
          d="M156 264 L228 336 L396 168"
          stroke={`url(#${id}-ribbon)`}
          strokeWidth="44"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Apex Accent Landmark Node */}
        <circle cx="396" cy="168" r="14" fill="#E0F2FE" />
        <circle cx="396" cy="168" r="8" fill="#38BDF8" />
      </svg>
    </div>
  );
};

export const DailyHabitsLogo: React.FC<DailyHabitsLogoProps> = ({
  size = 'sm',
  variant = 'full',
  showTagline = false,
  className = '',
  id = 'daily-habits-logo',
}) => {
  const sizeConfig = SIZE_MAP[size];

  if (variant === 'mark') {
    return <DailyHabitsMark className={`${sizeConfig.icon} ${className}`} id={`${id}-mark`} />;
  }

  if (variant === 'stacked') {
    return (
      <div className={`flex flex-col items-center text-center gap-2 group ${className}`} id={id}>
        <DailyHabitsMark className={sizeConfig.icon} id={`${id}-mark`} />
        <div>
          <span className={`font-bold tracking-tight text-zinc-900 dark:text-white leading-tight ${sizeConfig.text}`}>
            Daily Habits
          </span>
          {showTagline && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Track • Improve • Achieve
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 group ${className}`} id={id}>
      <DailyHabitsMark className={sizeConfig.icon} id={`${id}-mark`} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-bold tracking-tight text-zinc-900 dark:text-white leading-tight ${sizeConfig.text}`}>
            Daily Habits
          </span>
        </div>
        {showTagline && (
          <p className={`text-zinc-500 dark:text-zinc-400 font-normal leading-none truncate ${sizeConfig.badge}`}>
            Track • Improve • Achieve
          </p>
        )}
      </div>
    </div>
  );
};
