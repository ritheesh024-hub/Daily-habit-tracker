import React from 'react';
import { HabitItem } from '../types';
import { HabitRow } from './HabitRow';

interface HabitListProps {
  habits: HabitItem[];
  completedHabits: Record<string, boolean>;
  onToggleHabit: (habitId: string) => void;
  disabled?: boolean;
}

export const HabitList: React.FC<HabitListProps> = ({
  habits,
  completedHabits,
  onToggleHabit,
  disabled = false,
}) => {
  return (
    <div id="habit-list-section" className="space-y-2">
      {/* Habit Items */}
      {habits.length === 0 ? (
        <div
          id="no-habits-empty-state"
          className="py-8 px-4 text-center border border-dashed border-zinc-200 rounded-lg text-zinc-500 text-xs space-y-1"
        >
          <p className="font-medium text-zinc-700">No habits yet.</p>
          <p className="text-zinc-500">Add your first habit from Profile → Manage Habits.</p>
        </div>
      ) : (
        <div id="habit-list-container" className="space-y-2">
          {habits.map((habit, index) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              index={index}
              completed={!!completedHabits[habit.id]}
              onToggle={onToggleHabit}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
};
