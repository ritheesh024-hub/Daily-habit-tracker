import React from 'react';
import { Plus, Clock, Calendar, Edit3, Trash2, CheckCircle2, Sparkles } from 'lucide-react';
import { HabitItem } from '../types';
import { HabitIcon } from './HabitIcon';

interface ManageHabitsViewProps {
  habits: HabitItem[];
  onAddNewHabit: () => void;
  onEditHabit: (habit: HabitItem) => void;
  onDeleteHabit: (habitId: string) => void;
  isCalendarConnected: boolean;
}

export const ManageHabitsView: React.FC<ManageHabitsViewProps> = ({
  habits,
  onAddNewHabit,
  onEditHabit,
  onDeleteHabit,
  isCalendarConnected,
}) => {
  return (
    <div id="manage-habits-container" className="space-y-6 animate-fadeIn pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 glass-card rounded-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Habits Management</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Your Daily Habits
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Create, edit targets, set times, and customize your routine.
          </p>
        </div>

        <button
          id="create-new-habit-btn"
          type="button"
          onClick={onAddNewHabit}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Habits list */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Active Habits ({habits.length})
          </span>
          {isCalendarConnected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Google Calendar Connected</span>
            </span>
          )}
        </div>

        {habits.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-2xl space-y-3">
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              No habits created yet.
            </p>
            <button
              type="button"
              onClick={onAddNewHabit}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add your first habit</span>
            </button>
          </div>
        ) : (
          habits.map((habit) => {
            const hasTime = !!(habit.time || habit.reminderTime);
            const displayTime = habit.time || habit.reminderTime;
            const frequency = habit.frequency || 'Every day';

            return (
              <div
                key={habit.id}
                id={`manage-habit-${habit.id}`}
                className="p-4 glass-card rounded-xl flex items-center justify-between gap-3 group hover:border-zinc-300/80 dark:hover:border-zinc-700/80 transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center shrink-0 text-zinc-700 dark:text-zinc-300">
                    <HabitIcon name={habit.icon} className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {habit.name}
                      </span>
                      {habit.target && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          • {habit.target}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
                      {hasTime && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{displayTime}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{frequency}</span>
                      </span>
                      {habit.googleCalendarSynced && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded">
                          Calendar Synced
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id={`edit-habit-btn-${habit.id}`}
                    type="button"
                    title={`Edit ${habit.name}`}
                    onClick={() => onEditHabit(habit)}
                    className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    id={`delete-habit-btn-${habit.id}`}
                    type="button"
                    title={`Delete ${habit.name}`}
                    onClick={() => onDeleteHabit(habit.id)}
                    className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
