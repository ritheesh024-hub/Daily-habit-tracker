import React from 'react';
import { Bell, Check, X, Clock } from 'lucide-react';
import { HabitItem, ActiveSmartReminderNotice } from '../types';
import { getHabitEmoji } from '../lib/reminderService';
import { HabitIcon } from './HabitIcon';

export interface ActiveReminderNotice {
  id: string;
  habit: HabitItem;
  timestamp: number;
}

interface ReminderToastProps {
  reminders?: ActiveReminderNotice[];
  smartReminders?: ActiveSmartReminderNotice[];
  onDismiss: (id: string) => void;
  onDismissSmart?: (id: string) => void;
  onCompleteHabit: (habitId: string) => void;
}

export const ReminderToast: React.FC<ReminderToastProps> = ({
  reminders = [],
  smartReminders = [],
  onDismiss,
  onDismissSmart,
  onCompleteHabit,
}) => {
  if (reminders.length === 0 && smartReminders.length === 0) return null;

  return (
    <div
      id="reminder-notifications-stack"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {/* Smart Reminders */}
      {smartReminders.map(({ id, title, body, incompleteHabits }) => (
        <div
          key={id}
          id={`smart-reminder-toast-${id}`}
          className="pointer-events-auto bg-zinc-900 text-white p-3.5 rounded-xl shadow-2xl border border-zinc-800 flex items-start justify-between gap-3 animate-slideUp"
          role="alert"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm shrink-0 border border-amber-500/30">
              <Bell className="w-4 h-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-400">
                  Smart Reminder
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5 leading-snug">
                {body}
              </p>

              {incompleteHabits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {incompleteHabits.slice(0, 4).map((h) => (
                    <span
                      key={h.id}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono"
                    >
                      <HabitIcon name={h.icon} className="w-3 h-3 text-zinc-400" />
                      {h.name}
                    </span>
                  ))}
                  {incompleteHabits.length > 4 && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                      +{incompleteHabits.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Quick action buttons */}
              <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-zinc-800">
                {incompleteHabits.length === 1 && (
                  <button
                    type="button"
                    id={`toast-mark-done-${incompleteHabits[0].id}`}
                    onClick={() => {
                      onCompleteHabit(incompleteHabits[0].id);
                      if (onDismissSmart) onDismissSmart(id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Mark {incompleteHabits[0].name} Done</span>
                  </button>
                )}
                <button
                  type="button"
                  id={`smart-toast-dismiss-btn-${id}`}
                  onClick={() => onDismissSmart ? onDismissSmart(id) : onDismiss(id)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            id={`dismiss-smart-toast-btn-${id}`}
            onClick={() => onDismissSmart ? onDismissSmart(id) : onDismiss(id)}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {/* Individual Habit Reminders */}
      {reminders.map(({ id, habit }) => {
        const emoji = getHabitEmoji(habit.icon);
        return (
          <div
            key={id}
            id={`reminder-toast-${habit.id}`}
            className="pointer-events-auto bg-zinc-900 text-white p-3.5 rounded-xl shadow-2xl border border-zinc-800 flex items-start justify-between gap-3 animate-slideUp"
            role="alert"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-sm shrink-0 border border-zinc-700">
                {habit.icon ? (
                  <HabitIcon name={habit.icon} className="w-4 h-4 text-zinc-200" />
                ) : (
                  <span>{emoji}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
                    Habit Reminder
                  </span>
                </div>
                <p className="text-sm font-semibold text-white truncate mt-0.5">
                  Time for {habit.name} {emoji}
                </p>
                {habit.target && (
                  <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                    Goal: {habit.target}
                  </p>
                )}

                {/* Quick actions */}
                <div className="flex items-center gap-2 mt-2 pt-1 border-t border-zinc-800">
                  <button
                    type="button"
                    id={`toast-mark-done-${habit.id}`}
                    onClick={() => {
                      onCompleteHabit(habit.id);
                      onDismiss(id);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Mark Done</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(id)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 transition-colors cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              id={`dismiss-toast-btn-${habit.id}`}
              onClick={() => onDismiss(id)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors shrink-0"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

