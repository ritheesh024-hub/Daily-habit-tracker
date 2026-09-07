import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { HabitItem } from '../types';
import { HabitRow } from './HabitRow';

interface HabitListProps {
  habits: HabitItem[];
  completedHabits: Record<string, boolean>;
  onToggleHabit: (habitId: string) => void;
  onOpenDetails?: (habit: HabitItem) => void;
  onAddNewHabit?: () => void;
  disabled?: boolean;
}

export const HabitList: React.FC<HabitListProps> = ({
  habits,
  completedHabits,
  onToggleHabit,
  onOpenDetails,
  onAddNewHabit,
  disabled = false,
}) => {
  const safeHabits = Array.isArray(habits) ? habits : [];

  return (
    <div id="habit-list-section" className="space-y-2">
      {/* Habit Items */}
      {safeHabits.length === 0 ? (
        <div
          id="no-habits-empty-state"
          className="p-8 text-center glass-card rounded-2xl border border-dashed border-zinc-300/80 dark:border-white/10 text-zinc-500 dark:text-zinc-400 space-y-3"
        >
          <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Build your routine
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              Create your first habit to get started.
            </p>
          </div>
          {onAddNewHabit && (
            <button
              id="empty-state-add-habit-btn"
              type="button"
              onClick={onAddNewHabit}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-black dark:hover:bg-white transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Habit</span>
            </button>
          )}
        </div>
      ) : (
        <div id="habit-list-container" className="space-y-2">
          {safeHabits.map((habit, index) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              index={index}
              completed={!!completedHabits[habit.id]}
              onToggle={onToggleHabit}
              onOpenDetails={onOpenDetails}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
