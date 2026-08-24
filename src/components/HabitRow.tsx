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
      className={`group flex items-center justify-between min-h-[48px] py-2.5 px-3.5 sm:px-4 rounded-lg border transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none ${
        completed
          ? 'bg-zinc-50/80 border-zinc-200 text-zinc-500'
          : 'bg-white border-zinc-200 hover:border-zinc-300 text-zinc-900 shadow-2xs'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
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
              ? 'bg-zinc-900 border-zinc-900 text-white'
              : 'border-zinc-300 bg-white group-hover:border-zinc-400'
          }`}
        >
          {completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        {/* Index, Icon & Habit Name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-zinc-400 w-4 shrink-0">{index + 1}.</span>
          {habit.icon && (
            <span
              className={`shrink-0 ${
                completed ? 'text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-800'
              }`}
            >
              <HabitIcon name={habit.icon} className="w-3.5 h-3.5" />
            </span>
          )}
          <span
            id={`habit-name-${habit.id}`}
            className={`text-sm font-medium tracking-tight truncate ${
              completed ? 'line-through text-zinc-400' : 'text-zinc-800'
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
            className={`text-xs px-2 py-0.5 rounded font-mono truncate max-w-[120px] sm:max-w-none inline-block ${
              completed
                ? 'bg-zinc-100 text-zinc-400'
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200/60'
            }`}
          >
            {habit.target}
          </span>
        </div>
      )}
    </div>
  );
};
