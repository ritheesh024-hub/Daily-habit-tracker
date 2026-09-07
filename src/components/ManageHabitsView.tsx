import React, { useState, useMemo } from 'react';
import {
  Plus,
  Clock,
  Calendar,
  Edit3,
  Trash2,
  CheckCircle2,
  Sparkles,
  Archive,
  ArchiveRestore,
  Filter,
  BarChart2,
  AlertCircle,
} from 'lucide-react';
import { HabitItem, HABIT_CATEGORIES, HABIT_ACCENTS } from '../types';
import { HabitIcon } from './HabitIcon';
import { formatTime12Hour } from '../lib/googleCalendarService';

interface ManageHabitsViewProps {
  habits: HabitItem[];
  onAddNewHabit: () => void;
  onEditHabit: (habit: HabitItem) => void;
  onDeleteHabit: (habitId: string) => void;
  onArchiveToggle?: (habit: HabitItem) => void;
  onOpenDetails?: (habit: HabitItem) => void;
  isCalendarConnected: boolean;
}

export const ManageHabitsView: React.FC<ManageHabitsViewProps> = ({
  habits,
  onAddNewHabit,
  onEditHabit,
  onDeleteHabit,
  onArchiveToggle,
  onOpenDetails,
  isCalendarConnected,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [habitToDelete, setHabitToDelete] = useState<HabitItem | null>(null);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const archivedHabits = useMemo(() => habits.filter((h) => !!h.archived), [habits]);

  const displayedHabits = useMemo(() => {
    const list = activeTab === 'active' ? activeHabits : archivedHabits;
    if (selectedCategory === 'all') return list;
    return list.filter(
      (h) => h.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [activeTab, activeHabits, archivedHabits, selectedCategory]);

  return (
    <div id="manage-habits-container" className="space-y-5 animate-fadeIn pb-8">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 glass-card rounded-2xl sm:rounded-3xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Habits Management</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Your Habit Routines
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Organize with categories, priorities, custom times, and flexible schedules.
          </p>
        </div>

        <button
          id="create-new-habit-btn"
          type="button"
          onClick={onAddNewHabit}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold rounded-xl hover:bg-black dark:hover:bg-white transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* Tabs: Active vs Archived & Calendar Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="inline-flex p-1 rounded-xl bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Active ({activeHabits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              activeTab === 'archived'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Archived ({archivedHabits.length})
          </button>
        </div>

        {isCalendarConnected && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Google Calendar Connected</span>
          </span>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
          <Filter className="w-3.5 h-3.5 inline mr-1" />
          Filter:
        </span>
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
              : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70'
          }`}
        >
          All ({activeTab === 'active' ? activeHabits.length : archivedHabits.length})
        </button>
        {HABIT_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                  : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Delete Confirmation Alert Modal inside view */}
      {habitToDelete && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3 text-red-900 dark:text-red-200">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-red-950 dark:text-red-100">
                Delete habit "{habitToDelete.name}"?
              </p>
              <p className="text-red-800/90 dark:text-red-300">
                This will permanently delete this habit. Historical completion logs are preserved. Google Calendar events will be removed.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setHabitToDelete(null)}
              className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800/80 hover:bg-zinc-300/60 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteHabit(habitToDelete.id);
                setHabitToDelete(null);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      )}

      {/* Habits List */}
      <div className="space-y-2.5">
        {displayedHabits.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-2xl space-y-3">
            {activeTab === 'archived' ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  No archived habits.
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Archived habits stay out of daily view while saving your stats.
                </p>
              </div>
            ) : selectedCategory !== 'all' ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  No habits in this category.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Build your routine
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Create your first habit to get started.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAddNewHabit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-black dark:hover:bg-white transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New Habit</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          displayedHabits.map((habit) => {
            const hasTime = !!(habit.time || habit.reminderTime);
            const displayTime = habit.time
              ? formatTime12Hour(habit.time)
              : habit.reminderTime
              ? formatTime12Hour(habit.reminderTime)
              : null;
            const frequency = habit.frequency || 'Every day';
            const accentDef =
              HABIT_ACCENTS.find((a) => a.id === habit.accent || a.id === habit.color) ||
              HABIT_ACCENTS[0];
            const categoryDef = HABIT_CATEGORIES.find(
              (c) =>
                c.id === habit.category?.toLowerCase() ||
                c.label.toLowerCase() === habit.category?.toLowerCase()
            );

            // Priority dot
            const priorityDot =
              habit.priority === 'high'
                ? 'bg-rose-500'
                : habit.priority === 'medium'
                ? 'bg-amber-500'
                : habit.priority === 'low'
                ? 'bg-zinc-400'
                : null;

            return (
              <div
                key={habit.id}
                id={`manage-habit-${habit.id}`}
                className="p-4 glass-card rounded-2xl flex items-center justify-between gap-3 group hover:border-zinc-300/80 dark:hover:border-white/20 transition-all"
              >
                {/* Habit details */}
                <div
                  className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                  onClick={() => onOpenDetails && onOpenDetails(habit)}
                >
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border ${accentDef.tintBg} ${accentDef.tintBorder} ${accentDef.tintText}`}
                  >
                    <HabitIcon name={habit.icon} className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {habit.name}
                      </span>
                      {priorityDot && (
                        <span
                          title={`${habit.priority} priority`}
                          className={`w-2 h-2 rounded-full shrink-0 ${priorityDot}`}
                        />
                      )}
                      {categoryDef && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-white/10">
                          <span>{categoryDef.emoji}</span>
                          <span>{categoryDef.label}</span>
                        </span>
                      )}
                      {(habit.target || habit.goal) && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          • {habit.target || habit.goal}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
                      {hasTime && displayTime && (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{displayTime}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {frequency}
                          {habit.scheduleDays && habit.scheduleDays.length > 0 && (
                            <span className="ml-1">({habit.scheduleDays.join(', ')})</span>
                          )}
                        </span>
                      </span>
                      {habit.googleCalendarSynced && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                          Synced
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Details / Stats trigger */}
                  {onOpenDetails && (
                    <button
                      type="button"
                      title="View Stats"
                      onClick={() => onOpenDetails(habit)}
                      className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Archive / Restore trigger */}
                  {onArchiveToggle && (
                    <button
                      type="button"
                      title={habit.archived ? 'Restore habit' : 'Archive habit'}
                      onClick={() => onArchiveToggle(habit)}
                      className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      {habit.archived ? (
                        <ArchiveRestore className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Archive className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {/* Edit trigger */}
                  <button
                    id={`edit-habit-btn-${habit.id}`}
                    type="button"
                    title={`Edit ${habit.name}`}
                    onClick={() => onEditHabit(habit)}
                    className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete trigger */}
                  <button
                    id={`delete-habit-btn-${habit.id}`}
                    type="button"
                    title={`Delete ${habit.name}`}
                    onClick={() => setHabitToDelete(habit)}
                    className="p-2 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
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
