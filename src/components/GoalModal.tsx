import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Calendar,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  Layers,
} from 'lucide-react';
import { HabitGoal, HabitItem, GoalPeriodType } from '../types';
import { HabitIcon } from './HabitIcon';
import { getWeekBoundaries, getMonthBoundaries } from '../lib/goalService';
import { getLocalDateKey } from '../lib/dateUtils';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: HabitGoal) => Promise<void>;
  habits: HabitItem[];
  editingGoal?: HabitGoal | null;
  userId: string;
  presetHabitId?: string;
}

const PRESET_TARGETS = [5, 10, 15, 20, 25, 30];

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  habits,
  editingGoal,
  userId,
  presetHabitId,
}) => {
  const activeHabits = habits.filter((h) => !h.archived);

  const [selectedHabitId, setSelectedHabitId] = useState<string>(
    editingGoal?.habitId || presetHabitId || (activeHabits[0]?.id ?? 'all')
  );
  const [targetCount, setTargetCount] = useState<number>(editingGoal?.targetCount || 10);
  const [periodType, setPeriodType] = useState<GoalPeriodType>(editingGoal?.periodType || 'this_month');
  const [startDate, setStartDate] = useState<string>(
    editingGoal?.startDate || getMonthBoundaries().startDate
  );
  const [endDate, setEndDate] = useState<string>(
    editingGoal?.endDate || getMonthBoundaries().endDate
  );
  const [customTitle, setCustomTitle] = useState<string>(editingGoal?.title || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state when modal opens or editingGoal changes
  useEffect(() => {
    if (isOpen) {
      if (editingGoal) {
        setSelectedHabitId(editingGoal.habitId);
        setTargetCount(editingGoal.targetCount);
        setPeriodType(editingGoal.periodType);
        setStartDate(editingGoal.startDate);
        setEndDate(editingGoal.endDate);
        setCustomTitle(editingGoal.title || '');
      } else {
        const defaultHabit = presetHabitId || (activeHabits[0]?.id ?? 'all');
        setSelectedHabitId(defaultHabit);
        setTargetCount(10);
        setPeriodType('this_month');
        const bounds = getMonthBoundaries();
        setStartDate(bounds.startDate);
        setEndDate(bounds.endDate);
        setCustomTitle('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, editingGoal, presetHabitId]);

  // Handle period change
  const handlePeriodChange = (newPeriod: GoalPeriodType) => {
    setPeriodType(newPeriod);
    const today = getLocalDateKey();
    if (newPeriod === 'this_week') {
      const bounds = getWeekBoundaries(today);
      setStartDate(bounds.startDate);
      setEndDate(bounds.endDate);
    } else if (newPeriod === 'this_month') {
      const bounds = getMonthBoundaries(today);
      setStartDate(bounds.startDate);
      setEndDate(bounds.endDate);
    }
  };

  if (!isOpen) return null;

  const selectedHabit = activeHabits.find((h) => h.id === selectedHabitId);
  const habitDisplayName = selectedHabitId === 'all' ? 'All Habits' : selectedHabit?.name || 'Habit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (targetCount <= 0) {
      setErrorMsg('Target completions must be at least 1.');
      return;
    }

    if (startDate > endDate) {
      setErrorMsg('End date cannot be earlier than start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = editingGoal ? editingGoal.id : `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newGoal: HabitGoal = {
        id,
        userId,
        habitId: selectedHabitId,
        habitName: habitDisplayName,
        habitIcon: selectedHabit?.icon,
        habitAccent: selectedHabit?.accent,
        targetCount: Number(targetCount),
        periodType,
        startDate,
        endDate,
        title: customTitle.trim() || undefined,
        createdAt: editingGoal ? editingGoal.createdAt : new Date().toISOString(),
        celebrated: editingGoal ? editingGoal.celebrated : false,
      };

      await onSave(newGoal);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save goal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="goal-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="goal-modal-card"
        className="w-full max-w-lg glass-card rounded-2xl p-6 space-y-5 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {editingGoal ? 'Edit Habit Goal' : 'Set New Habit Goal'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track personal completion milestones over time
              </p>
            </div>
          </div>
          <button
            id="goal-modal-close-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Habit Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Target Habit
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedHabitId('all')}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                  selectedHabitId === 'all'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">All Habits</p>
                  <p className="text-[10px] text-zinc-400">Total volume across habits</p>
                </div>
              </button>

              {activeHabits.map((habit) => {
                const isSelected = selectedHabitId === habit.id;
                return (
                  <button
                    key={habit.id}
                    type="button"
                    onClick={() => setSelectedHabitId(habit.id)}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <HabitIcon icon={habit.icon} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{habit.name}</p>
                      <p className="text-[10px] text-zinc-400">{habit.category || 'Habit'}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Target Count */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Target Completions
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                {targetCount} times
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="goal-target-input"
                type="number"
                min="1"
                max="500"
                value={targetCount}
                onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 text-sm font-semibold rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_TARGETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetCount(preset)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      targetCount === preset
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Period Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Timeframe Period
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePeriodChange('this_week')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  periodType === 'this_week'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('this_month')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  periodType === 'this_month'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('custom')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  periodType === 'custom'
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Date Pickers (Custom or Read-only confirmation) */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 text-xs">
            <div>
              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mb-1">
                Start Date
              </span>
              <input
                type="date"
                value={startDate}
                disabled={periodType !== 'custom'}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mb-1">
                End Date
              </span>
              <input
                type="date"
                value={endDate}
                disabled={periodType !== 'custom'}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 disabled:opacity-75 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* 4. Optional Custom Label */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Goal Title <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              id="goal-title-input"
              type="text"
              placeholder={`Complete ${habitDisplayName} ${targetCount} times`}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="goal-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
