import React from 'react';
import { Check, Clock, ChevronRight } from 'lucide-react';
import { HabitItem, HABIT_ACCENTS, HABIT_CATEGORIES } from '../types';
import { HabitIcon } from './HabitIcon';
import { formatTime12Hour } from '../lib/googleCalendarService';

interface HabitRowProps {
  habit: HabitItem;
  index: number;
  completed: boolean;
  onToggle: (habitId: string) => void;
  onOpenDetails?: (habit: HabitItem) => void;
  disabled?: boolean;
}

export const HabitRow: React.FC<HabitRowProps> = ({
  habit,
  index,
  completed,
  onToggle,
  onOpenDetails,
  disabled = false,
}) => {
  // Find accent styling definition
  const accentDef =
    HABIT_ACCENTS.find((a) => a.id === habit.accent || a.id === habit.color) ||
    HABIT_ACCENTS[0];

  // Priority indicator
  const priorityDot =
    habit.priority === 'high'
      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
      : habit.priority === 'medium'
      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
      : habit.priority === 'low'
      ? 'bg-zinc-400'
      : null;

  const categoryDef = HABIT_CATEGORIES.find(
    (c) => c.id === habit.category?.toLowerCase() || c.label.toLowerCase() === habit.category?.toLowerCase()
  );

  const displayTime = habit.time ? formatTime12Hour(habit.time) : null;
  const goalTarget = habit.target || habit.goal || null;

  const handleCardClick = () => {
    if (disabled) return;
    if (onOpenDetails) {
      onOpenDetails(habit);
    } else {
      onToggle(habit.id);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      onToggle(habit.id);
    }
  };

  return (
    <div
      id={`habit-card-${habit.id}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${habit.name}${goalTarget ? `, Goal: ${goalTarget}` : ''}, Status: ${
        completed ? 'Completed' : 'Incomplete'
      }`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(habit.id);
        }
      }}
      className={`group relative p-3.5 sm:p-4 rounded-2xl glass-tile cursor-pointer select-none transition-all duration-200 border ${
        completed
          ? 'opacity-70 dark:opacity-60 bg-zinc-100/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-white/5'
          : 'hover:border-zinc-300/80 dark:hover:border-white/20 hover:shadow-sm'
      } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left side: Icon, Name, Target, Time */}
        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
          {/* Custom Accent Habit Icon */}
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
              completed
                ? 'bg-zinc-200/60 dark:bg-zinc-800/60 border-transparent text-zinc-400 dark:text-zinc-500'
                : `${accentDef.tintBg} ${accentDef.tintBorder} ${accentDef.tintText}`
            }`}
          >
            <HabitIcon name={habit.icon} className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
          </div>

          <div className="min-w-0 space-y-0.5 flex-1">
            {/* Top row: Habit Name and Priority Indicator */}
            <div className="flex items-center gap-2">
              <span
                id={`habit-name-${habit.id}`}
                className={`text-sm sm:text-base font-semibold tracking-tight truncate transition-colors ${
                  completed
                    ? 'line-through text-zinc-400 dark:text-zinc-500 font-normal'
                    : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {habit.name}
              </span>

              {/* Priority dot */}
              {priorityDot && (
                <span
                  title={`${habit.priority} priority`}
                  className={`w-2 h-2 rounded-full shrink-0 ${priorityDot}`}
                />
              )}

              {/* Subtle Category Emoji */}
              {categoryDef && (
                <span
                  title={categoryDef.label}
                  className="text-xs opacity-75 shrink-0 hidden sm:inline"
                >
                  {categoryDef.emoji}
                </span>
              )}
            </div>

            {/* Subtitle row: Goal / Target & Scheduled Time */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {goalTarget && (
                <span className="truncate max-w-[150px] sm:max-w-none text-zinc-600 dark:text-zinc-300">
                  {goalTarget}
                </span>
              )}

              {goalTarget && displayTime && <span className="text-zinc-300 dark:text-zinc-700">•</span>}

              {displayTime && (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                  <Clock className="w-3 h-3" />
                  <span>{displayTime}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Checkbox action & Details trigger */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Checkmark Button (Large 44px touch area) */}
          <button
            type="button"
            id={`checkbox-${habit.id}`}
            aria-checked={completed}
            role="checkbox"
            aria-label={`Mark ${habit.name} as ${completed ? 'incomplete' : 'completed'}`}
            disabled={disabled}
            onClick={handleCheckboxClick}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 ${
              completed
                ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                : 'border-zinc-300/80 dark:border-zinc-700 bg-white/90 dark:bg-zinc-800/90 text-transparent hover:border-zinc-400 dark:hover:border-zinc-500 hover:scale-105'
            }`}
          >
            <Check
              className={`w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5] transition-transform ${
                completed ? 'scale-100' : 'scale-0'
              }`}
            />
          </button>

          {/* Details arrow */}
          {onOpenDetails && (
            <button
              type="button"
              id={`details-btn-${habit.id}`}
              title="View habit details and analytics"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails(habit);
              }}
              className="p-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors hidden sm:flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
