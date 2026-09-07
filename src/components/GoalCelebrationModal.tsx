import React from 'react';
import { Trophy, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { GoalWithProgress } from '../types';

interface GoalCelebrationModalProps {
  goal: GoalWithProgress | null;
  onClose: () => void;
}

export const GoalCelebrationModal: React.FC<GoalCelebrationModalProps> = ({
  goal,
  onClose,
}) => {
  if (!goal) return null;

  return (
    <div
      id="goal-celebration-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="goal-celebration-card"
        className="w-full max-w-sm glass-card rounded-2xl p-6 text-center space-y-4 bg-white/95 dark:bg-zinc-900/95 border border-amber-500/30 shadow-2xl relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Celebratory Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/40 shadow-inner">
          <Trophy className="w-8 h-8 animate-bounce" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Goal Achieved!</span>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Congratulations!
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-xs mx-auto">
            You completed your goal for{' '}
            <span className="font-semibold text-zinc-900 dark:text-zinc-200">
              {goal.habitName}
            </span>{' '}
            by reaching{' '}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {goal.currentCount} / {goal.targetCount}
            </span>{' '}
            completions!
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
          >
            Keep Crushing It!
          </button>
        </div>
      </div>
    </div>
  );
};
