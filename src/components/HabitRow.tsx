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
      className={`group flex items-center justify-between min-h-[44px] py-2 sm:py-2.5 px-3 sm:px-3.5 rounded-lg border transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:outline-none ${
        completed
          ? 'bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200/80 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-500'
          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
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
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
            completed
              ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900'
              : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 group-hover:border-zinc-400 dark:group-hover:border-zinc-500'
          }`}
        >
          {completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        {/* Index, Icon & Habit Name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500 w-4 shrink-0">{index + 1}.</span>
          {habit.icon && (
            <span
              className={`shrink-0 ${
                completed ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-200'
              }`}
            >
              <HabitIcon name={habit.icon} className="w-3.5 h-3.5" />
            </span>
          )}
          <span
            id={`habit-name-${habit.id}`}
            className={`text-xs sm:text-sm font-medium tracking-tight truncate ${
              completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'
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
            className={`text-[11px] sm:text-xs px-2 py-0.5 rounded font-mono truncate max-w-[120px] sm:max-w-none inline-block ${
              completed
                ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
            }`}
          >
            {habit.target}
          </span>
        </div>
      )}
    </div>
  );
};
