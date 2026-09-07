import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
  Archive,
  ArchiveRestore,
  Check,
} from 'lucide-react';
import {
  HabitItem,
  HabitPriority,
  HABIT_CATEGORIES,
  HABIT_ACCENTS,
} from '../types';
import { AVAILABLE_ICONS, HabitIcon } from './HabitIcon';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: {
    name: string;
    target: string;
    goal?: string;
    description?: string;
    category?: string;
    priority?: HabitPriority;
    accent?: string;
    icon: string;
    time?: string;
    frequency?: string;
    scheduleDays?: string[];
    archived?: boolean;
    reminderEnabled?: boolean;
    reminderTime?: string;
  }) => void;
  onDelete?: (habitId: string) => void;
  initialData?: HabitItem | null;
  initialHabit?: HabitItem | null; // Compatibility
  isEditing?: boolean;
  isSaving?: boolean;
}

const PRESET_EXAMPLES = [
  { name: 'Drink Water', target: '8 glasses', icon: 'droplet', category: 'wellness', priority: 'high' as HabitPriority, time: '08:00', accent: 'cyan' },
  { name: 'Morning Run', target: '3 km', icon: 'footprints', category: 'fitness', priority: 'high' as HabitPriority, time: '07:00', accent: 'emerald' },
  { name: 'Read Book', target: '30 mins', icon: 'book', category: 'study', priority: 'medium' as HabitPriority, time: '20:30', accent: 'amber' },
  { name: 'Meditation', target: '15 mins', icon: 'activity', category: 'health', priority: 'medium' as HabitPriority, time: '07:30', accent: 'violet' },
  { name: 'Deep Work', target: '90 mins', icon: 'briefcase', category: 'work', priority: 'high' as HabitPriority, time: '09:30', accent: 'blue' },
  { name: 'Sleep Early', target: '10:30 PM', icon: 'moon', category: 'wellness', priority: 'low' as HabitPriority, time: '22:30', accent: 'indigo' },
];

const DAYS_OF_WEEK = [
  { id: 'Mon', label: 'M' },
  { id: 'Tue', label: 'T' },
  { id: 'Wed', label: 'W' },
  { id: 'Thu', label: 'T' },
  { id: 'Fri', label: 'F' },
  { id: 'Sat', label: 'S' },
  { id: 'Sun', label: 'S' },
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  initialHabit,
  isEditing: isEditingProp,
  isSaving = false,
}) => {
  const currentHabit = initialData || initialHabit || null;
  const isEditing = typeof isEditingProp === 'boolean' ? isEditingProp : !!currentHabit;

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<HabitPriority | ''>('');
  const [accent, setAccent] = useState<string>('indigo');
  const [selectedIcon, setSelectedIcon] = useState('check');
  const [hasScheduledTime, setHasScheduledTime] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [frequency, setFrequency] = useState('Every day');
  const [scheduleDays, setScheduleDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [archived, setArchived] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (currentHabit) {
      setName(currentHabit.name || '');
      setTarget(currentHabit.target || currentHabit.goal || '');
      setDescription(currentHabit.description || '');
      setCategory(currentHabit.category || '');
      setPriority(currentHabit.priority || '');
      setAccent(currentHabit.accent || currentHabit.color || 'indigo');
      setSelectedIcon(currentHabit.icon || 'check');
      setFrequency(currentHabit.frequency || 'Every day');
      setScheduleDays(
        currentHabit.scheduleDays && currentHabit.scheduleDays.length > 0
          ? currentHabit.scheduleDays
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      );
      setArchived(!!currentHabit.archived);

      const timeVal = currentHabit.time || currentHabit.reminderTime;
      if (timeVal) {
        setHasScheduledTime(true);
        setScheduledTime(timeVal);
      } else {
        setHasScheduledTime(false);
        setScheduledTime('08:00');
      }
    } else {
      setName('');
      setTarget('');
      setDescription('');
      setCategory('');
      setPriority('');
      setAccent('indigo');
      setSelectedIcon('check');
      setFrequency('Every day');
      setScheduleDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setHasScheduledTime(false);
      setScheduledTime('08:00');
      setArchived(false);
    }
    setShowDeleteConfirm(false);
    setError(null);
    setSaveSuccess(false);
  }, [currentHabit, isOpen]);

  if (!isOpen) return null;

  const handleToggleDay = (dayId: string) => {
    setScheduleDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]
    );
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a habit name.');
      return;
    }
    if (trimmedName.length > 80) {
      setError('Habit name cannot exceed 80 characters.');
      return;
    }

    const trimmedTarget = target.trim();
    if (trimmedTarget.length > 60) {
      setError('Target / goal cannot exceed 60 characters.');
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 400) {
      setError('Description cannot exceed 400 characters.');
      return;
    }

    if (hasScheduledTime && !scheduledTime) {
      setError('Please select a valid time.');
      return;
    }

    if (hasScheduledTime && scheduledTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(scheduledTime)) {
      setError('Please select a valid time in HH:MM format.');
      return;
    }

    if (frequency === 'Selected days' && scheduleDays.length === 0) {
      setError('Select at least one day.');
      return;
    }

    const finalTime = hasScheduledTime && scheduledTime ? scheduledTime : undefined;

    setSaveSuccess(true);
    onSave({
      name: trimmedName,
      target: trimmedTarget,
      goal: trimmedTarget,
      description: trimmedDesc || undefined,
      category: category || undefined,
      priority: (priority as HabitPriority) || undefined,
      accent,
      icon: selectedIcon,
      time: finalTime,
      frequency,
      scheduleDays: frequency === 'Selected days' ? scheduleDays : undefined,
      archived,
      reminderEnabled: hasScheduledTime,
      reminderTime: finalTime,
    });
  };

  const handleApplyPreset = (preset: (typeof PRESET_EXAMPLES)[0]) => {
    setName(preset.name);
    setTarget(preset.target);
    setSelectedIcon(preset.icon);
    if (preset.category) setCategory(preset.category);
    if (preset.priority) setPriority(preset.priority);
    if (preset.accent) setAccent(preset.accent);
    if (preset.time) {
      setHasScheduledTime(true);
      setScheduledTime(preset.time);
    }
    setError(null);
  };

  return (
    <div
      id="habit-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        id="habit-modal-card"
        className="w-full max-w-lg glass-modal rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/70 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-zinc-500" />
            <h2 id="modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {isEditing ? 'Edit Habit' : 'New Habit'}
            </h2>
          </div>
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
        {showDeleteConfirm && isEditing && currentHabit ? (
          <div id="delete-confirmation-view" className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-xl text-red-900 dark:text-red-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-red-950 dark:text-red-100">
                  Delete this habit?
                </p>
                <p className="text-red-800/90 dark:text-red-300">
                  This will remove the habit and its associated active data. If the habit has a Google Calendar event, only its corresponding event will be deleted.
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
                onClick={() => onDelete && onDelete(currentHabit.id)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
              >
                {isSaving ? 'Deleting...' : 'Yes, Delete Habit'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Edit/Add Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Quick Presets (Only on Add) */}
            {!isEditing && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Quick Ideas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EXAMPLES.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 glass-pill hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <HabitIcon name={p.icon} className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{p.name}</span>
                      <span className="text-zinc-400 font-mono text-[10px]">({p.target})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Habit Name Field */}
            <div className="space-y-1">
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
                placeholder="e.g. Drink Water, Morning Run, Read Book"
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 glass-input rounded-xl focus:outline-none placeholder:text-zinc-400"
                autoFocus
              />
            </div>

            {/* Target / Goal Field */}
            <div className="space-y-1">
              <label htmlFor="habit-target-input" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Goal / Target <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="habit-target-input"
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 8 glasses, 30 minutes, 3 km, 10:30 PM"
                className="w-full px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 glass-input rounded-xl focus:outline-none placeholder:text-zinc-400"
              />
            </div>

            {/* 1. Category Selector & 2. Priority Selector (Side-by-side on sm) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category */}
              <div className="space-y-1">
                <label htmlFor="habit-category-select" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Category <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <select
                  id="habit-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 glass-input rounded-xl focus:outline-none cursor-pointer bg-white dark:bg-zinc-800"
                >
                  <option value="">[ Select category ]</option>
                  {HABIT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Priority <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'high', label: 'High', dot: 'bg-rose-500' },
                    { id: 'medium', label: 'Med', dot: 'bg-amber-500' },
                    { id: 'low', label: 'Low', dot: 'bg-zinc-400' },
                  ].map((p) => {
                    const isSelected = priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(isSelected ? '' : (p.id as HabitPriority))}
                        className={`py-2 px-1 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs font-semibold'
                            : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Accent Color Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                Accent Color
              </label>
              <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5">
                {HABIT_ACCENTS.map((item) => {
                  const isSelected = accent === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.name}
                      onClick={() => setAccent(item.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        item.dotClass
                      } ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-zinc-900 dark:ring-zinc-100 scale-110'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icon Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                Icon
              </label>
              <div
                id="icon-picker-grid"
                className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 p-2 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 rounded-xl max-h-32 overflow-y-auto"
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
                          : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 border border-zinc-200/80 dark:border-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Flexible Schedule & Days */}
            <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Schedule & Frequency
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {['Every day', 'Weekdays', 'Weekends', 'Selected days'].map((freqOption) => {
                  const isSelected = frequency === freqOption;
                  return (
                    <button
                      key={freqOption}
                      type="button"
                      onClick={() => {
                        setFrequency(freqOption);
                        if (error) setError(null);
                      }}
                      className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-zinc-900 dark:border-zinc-100 shadow-xs font-semibold'
                          : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70'
                      }`}
                    >
                      {freqOption}
                    </button>
                  );
                })}
              </div>

              {/* Selected Days multi-picker */}
              {frequency === 'Selected days' && (
                <div className="pt-2 border-t border-zinc-200/70 dark:border-white/10 space-y-1.5 animate-fadeIn">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block">
                    Select active days:
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    {DAYS_OF_WEEK.map((day) => {
                      const isChecked = scheduleDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => handleToggleDay(day.id)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center border ${
                            isChecked
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-2xs'
                              : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-200/70'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Scheduled Daily Time (Google Calendar sync) */}
            <div className="p-3.5 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      Scheduled Time
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Syncs automatically with Google Calendar
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="modal-schedule-toggle"
                    checked={hasScheduledTime}
                    onChange={(e) => setHasScheduledTime(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 dark:peer-checked:after:bg-zinc-900"></div>
                </label>
              </div>

              {hasScheduledTime && (
                <div className="pt-2 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between animate-fadeIn">
                  <label htmlFor="modal-scheduled-time" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                    Daily Time:
                  </label>
                  <input
                    id="modal-scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => {
                      setScheduledTime(e.target.value);
                      if (error) setError(null);
                    }}
                    className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                  />
                </div>
              )}
            </div>

            {/* 8. Habit Description */}
            <div className="space-y-1">
              <label htmlFor="habit-description-input" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Description <span className="text-zinc-400 font-normal">(optional notes)</span>
              </label>
              <textarea
                id="habit-description-input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Read at least 20 pages before sleeping. Keep hydration bottle at desk."
                className="w-full px-3.5 py-2 text-xs text-zinc-900 dark:text-zinc-100 glass-input rounded-xl focus:outline-none placeholder:text-zinc-400 resize-none"
              />
            </div>

            {/* 10. Archive Option for Editing Habit */}
            {isEditing && (
              <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {archived ? (
                    <ArchiveRestore className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Archive className="w-4 h-4 text-zinc-500" />
                  )}
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                      {archived ? 'Archived Habit' : 'Archive Habit'}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {archived
                        ? 'Hidden from active tasks. Click to unarchive.'
                        : 'Hides from today without losing historical progress.'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setArchived(!archived)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    archived
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      : 'bg-zinc-200/60 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border-zinc-300/60'
                  }`}
                >
                  {archived ? 'Archived (Restore)' : 'Archive'}
                </button>
              </div>
            )}

            {/* Error Feedback */}
            {error && (
              <div id="modal-error-message" className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-3">
              {isEditing && onDelete ? (
                <button
                  id="delete-habit-btn"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
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
                  className="px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer min-w-[70px] flex items-center justify-center"
                >
                  {isSaving ? 'Saving...' : saveSuccess ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
