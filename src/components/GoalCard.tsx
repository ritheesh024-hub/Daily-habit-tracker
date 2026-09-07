import React, { useState } from 'react';
import {
  Target,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { GoalWithProgress, HabitGoal } from '../types';
import { HabitIcon } from './HabitIcon';

interface GoalCardProps {
  goal: GoalWithProgress;
  onEdit?: (goal: HabitGoal) => void;
  onDelete?: (goalId: string) => Promise<void>;
  compact?: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(goal.id);
    } catch (e) {
      console.error('Error deleting goal:', e);
      setIsDeleting(false);
      setIsConfirmingDelete(false);
    }
  };

  const isCompleted = goal.status === 'completed';
  const isExpired = goal.status === 'expired';

  const statusLabel = isCompleted
    ? 'Completed'
    : isExpired
    ? 'Expired'
    : goal.daysRemaining === 0
    ? 'Ends Today'
    : `${goal.daysRemaining}d left`;

  const statusBg = isCompleted
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    : isExpired
    ? 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20'
    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';

  const goalTitle = goal.title || `Complete ${goal.habitName} ${goal.targetCount} times`;

  return (
    <div
      id={`goal-card-${goal.id}`}
      className={`glass-card rounded-xl border transition-all ${
        compact ? 'p-3' : 'p-4'
      } ${
        isCompleted
          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/40 shadow-sm'
          : 'bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          {/* Icon */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isCompleted
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : goal.habitIcon ? (
              <HabitIcon icon={goal.habitIcon} className="w-4 h-4" />
            ) : (
              <Target className="w-4 h-4" />
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {goalTitle}
              </h4>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBg}`}
              >
                {statusLabel}
              </span>
            </div>

            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {goal.habitName} • {goal.periodType === 'this_week' ? 'Weekly' : goal.periodType === 'this_month' ? 'Monthly' : 'Custom'}
            </p>
          </div>
        </div>

        {/* Action buttons (only in non-compact mode or when edit/delete handlers provided) */}
        {!compact && (onEdit || onDelete) && (
          <div className="flex items-center gap-1 shrink-0">
            {isConfirmingDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-2 py-1 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  {isDeleting ? '...' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(goal)}
                    title="Edit Goal"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    title="Delete Goal"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar & Counter */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          <span>Progress</span>
          <span className="font-mono">
            {goal.currentCount} / {goal.targetCount} ({goal.progressPercentage}%)
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-emerald-500'
                : isExpired
                ? 'bg-zinc-400'
                : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(100, goal.progressPercentage)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
