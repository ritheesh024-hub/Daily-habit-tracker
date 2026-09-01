import React from 'react';
import { Check } from 'lucide-react';
import { HabitItem } from '../types';
import { HabitIcon } from './HabitIcon';

interface HabitRowProps {
  habit: HabitItem;
  index: number;
  completed: boolean;
  onToggle: (habitId: string) => void;
  disabled?: boolean;
}

export const HabitRow: React.FC<HabitRowProps> = ({
  habit,
  index,
  completed,
  onToggle,
  disabled = false,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(habit.id);
    }
  };

  return (
    <div
      id={`habit-row-${habit.id}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${habit.name}${habit.target ? `, Goal: ${habit.target}` : ''}, Status: ${completed ? 'Completed' : 'Incomplete'}`}
      onKeyDown={handleKeyDown}
      onClick={() => !disabled && onToggle(habit.id)}
      className={`group flex items-center justify-between min-h-[48px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl glass-tile cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:outline-none ${
        completed
          ? 'opacity-70 dark:opacity-60 bg-zinc-100/50 dark:bg-zinc-900/30'
          : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
    >
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
        {/* Checkbox button */}
        <button
          type="button"
          id={`checkbox-${habit.id}`}
          aria-checked={completed}
          role="checkbox"
          tabIndex={-1}
          aria-label={`Mark ${habit.name} as ${completed ? 'incomplete' : 'completed'}`}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggle(habit.id);
          }}
          className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-lg border flex items-center justify-center transition-all duration-200 shrink-0 shadow-2xs ${
            completed
              ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 scale-100'
              : 'border-zinc-300 dark:border-zinc-600 bg-white/80 dark:bg-zinc-800/80 group-hover:border-zinc-400 dark:group-hover:border-zinc-400 group-hover:scale-105'
          }`}
        >
          {completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Index, Icon & Habit Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 w-4 shrink-0">{index + 1}.</span>
          {habit.icon && (
            <span
              className={`shrink-0 transition-colors ${
                completed ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
              }`}
            >
              <HabitIcon name={habit.icon} className="w-4 h-4" />
            </span>
          )}
          <span
            id={`habit-name-${habit.id}`}
            className={`text-xs sm:text-sm font-medium tracking-tight truncate transition-colors ${
              completed ? 'line-through text-zinc-400 dark:text-zinc-500 font-normal' : 'text-zinc-900 dark:text-zinc-100 font-semibold'
            }`}
          >
            {habit.name}
          </span>
        </div>
      </div>

      {/* Target Tag */}
      {habit.target && (
        <div className="shrink-0 ml-2">
          <span
            id={`habit-target-${habit.id}`}
            className={`text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-mono truncate max-w-[120px] sm:max-w-none inline-block backdrop-blur-xs transition-colors ${
              completed
                ? 'bg-zinc-200/40 dark:bg-zinc-800/40 text-zinc-400 dark:text-zinc-500 border border-transparent'
                : 'bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/10'
            }`}
          >
            {habit.target}
          </span>
        </div>
      )}
    </div>
  );
};
