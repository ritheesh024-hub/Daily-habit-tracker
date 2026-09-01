import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import { HabitItem } from '../types';
import { AVAILABLE_ICONS, HabitIcon } from './HabitIcon';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: { name: string; target: string; icon: string; reminderEnabled?: boolean; reminderTime?: string }) => void;
  onDelete?: (habitId: string) => void;
  initialHabit?: HabitItem | null;
  isSaving?: boolean;
}

const PRESET_EXAMPLES = [
  { name: 'Meditation', target: '20 mins', icon: 'activity', reminderTime: '07:00' },
  { name: 'Walking', target: '30 mins', icon: 'footprints', reminderTime: '17:30' },
  { name: 'Study', target: '2 hours', icon: 'brain', reminderTime: '19:00' },
  { name: 'Cold Shower', target: '5 mins', icon: 'droplet', reminderTime: '07:30' },
  { name: 'Journaling', target: '10 mins', icon: 'book', reminderTime: '21:00' },
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialHabit,
  isSaving = false,
}) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('check');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!initialHabit;

  useEffect(() => {
    if (initialHabit) {
      setName(initialHabit.name || '');
      setTarget(initialHabit.target || '');
      setSelectedIcon(initialHabit.icon || 'check');
      setReminderEnabled(!!initialHabit.reminderEnabled);
      setReminderTime(initialHabit.reminderTime || '08:00');
    } else {
      setName('');
      setTarget('');
      setSelectedIcon('check');
      setReminderEnabled(false);
      setReminderTime('08:00');
    }
    setShowDeleteConfirm(false);
    setError(null);
  }, [initialHabit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a habit name');
      return;
    }
    onSave({
      name: trimmedName,
      target: target.trim(),
      icon: selectedIcon,
      reminderEnabled,
      reminderTime,
    });
  };

  const handleApplyPreset = (preset: typeof PRESET_EXAMPLES[0]) => {
    setName(preset.name);
    setTarget(preset.target);
    setSelectedIcon(preset.icon);
    if (preset.reminderTime) {
      setReminderTime(preset.reminderTime);
    }
    setError(null);
  };

  return (
    <div
      id="habit-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        id="habit-modal-card"
        className="w-full max-w-md glass-modal rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/70 dark:border-white/10">
          <h2 id="modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {isEditing ? 'Edit Habit' : 'Add Habit'}
          </h2>
          <button
            id="modal-close-btn"
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Delete Confirmation View */}
        {showDeleteConfirm && isEditing && initialHabit ? (
          <div id="delete-confirmation-view" className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-xl text-red-900 dark:text-red-200 backdrop-blur-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-red-950 dark:text-red-100">Delete habit "{initialHabit.name}"?</p>
                <p className="text-red-700 dark:text-red-300">
                  This will remove it from your active daily list. Past completion records in history will be preserved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                id="cancel-delete-btn"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800/80 hover:bg-zinc-300/60 dark:hover:bg-zinc-700 rounded-xl border border-zinc-300/60 dark:border-white/10 transition-colors cursor-pointer"
              >
                Keep Habit
              </button>
              <button
                id="confirm-delete-btn"
                type="button"
                onClick={() => onDelete && onDelete(initialHabit.id)}
                disabled={isSaving}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
              >
                {isSaving ? 'Deleting...' : 'Yes, Delete Habit'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Edit/Add Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Quick Presets (Only on Add) */}
            {!isEditing && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Quick Suggestions
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EXAMPLES.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 glass-pill hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <HabitIcon name={p.icon} className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                      <span>{p.name}</span>
                      <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">({p.target})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Habit Name Field */}
            <div className="space-y-1.5">
              <label htmlFor="habit-name-input" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Habit Name <span className="text-red-500">*</span>
              </label>
              <input
                id="habit-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Meditation, Walking, Read a chapter"
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 glass-input rounded-xl focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                autoFocus
              />
            </div>

            {/* Target / Value Field */}
            <div className="space-y-1.5">
              <label htmlFor="habit-target-input" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Target / Goal <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              <input
                id="habit-target-input"
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 20 mins, 8 glasses, 10:30 PM, 1 hour"
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 glass-input rounded-xl focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              />
            </div>

            {/* Optional Icon Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Icon <span className="text-zinc-400 dark:text-zinc-500 font-normal">(optional)</span>
              </label>
              <div
                id="icon-picker-grid"
                className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 p-2 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 rounded-xl max-h-32 overflow-y-auto"
              >
                {AVAILABLE_ICONS.map((item) => {
                  const isSelected = selectedIcon === item.name;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      title={item.label}
                      onClick={() => setSelectedIcon(item.name)}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm scale-105'
                          : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 border border-zinc-200/80 dark:border-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reminder Setting inside Form */}
            <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">Daily Reminder</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Get notified at scheduled time</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="modal-reminder-toggle"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900"></div>
                </label>
              </div>

              {reminderEnabled && (
                <div className="pt-2 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between">
                  <label htmlFor="modal-reminder-time" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    Reminder Time:
                  </label>
                  <input
                    id="modal-reminder-time"
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <p id="modal-error-message" className="text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </p>
            )}

            {/* Footer actions */}
            <div className="pt-3 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
              {isEditing && onDelete ? (
                <button
                  id="delete-habit-btn"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete habit</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  id="modal-cancel-btn"
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800/80 hover:bg-zinc-300/60 dark:hover:bg-zinc-700 rounded-xl border border-zinc-300/60 dark:border-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="modal-save-btn"
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
