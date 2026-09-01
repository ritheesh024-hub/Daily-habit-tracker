import React, { useState, useMemo } from 'react';
import {
  Check,
  User,
  Activity,
  ListChecks,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { HabitItem, UserProfile, DEFAULT_HABITS } from '../types';
import { HabitIcon } from './HabitIcon';
import { HabitModal } from './HabitModal';
import { calculateAge, isValidDateOfBirth, getLocalDateKey } from '../lib/dateUtils';

interface OnboardingModalProps {
  user: UserProfile;
  onComplete: (data: {
    displayName: string;
    dateOfBirth?: string;
    height?: number;
    heightUnit: 'cm' | 'in';
    weight?: number;
    weightUnit: 'kg' | 'lbs';
    habits: HabitItem[];
  }) => Promise<void>;
  isLoading?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  user,
  onComplete,
  isLoading = false,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Profile State
  const [displayName, setDisplayName] = useState(user.displayName || user.name || '');
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || '');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Step 2: Body Details State
  const [heightInput, setHeightInput] = useState<string>(user.height ? String(user.height) : '');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>(user.heightUnit || 'cm');
  const [weightInput, setWeightInput] = useState<string>(user.weight ? String(user.weight) : '');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(user.weightUnit || 'kg');

  // Step 3: Habits Selection & Customization
  const [habitsList, setHabitsList] = useState<HabitItem[]>(() =>
    DEFAULT_HABITS.map((h) => ({ ...h }))
  );
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(
    () => new Set(DEFAULT_HABITS.map((h) => h.id))
  );

  // Edit / Add Habit in Step 3
  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);

  const todayDate = useMemo(() => getLocalDateKey(), []);
  const age = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  const activeHabits = useMemo(() => {
    return habitsList.filter((h) => selectedHabitIds.has(h.id));
  }, [habitsList, selectedHabitIds]);

  const handleToggleHabitSelection = (habitId: string) => {
    setSelectedHabitIds((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) {
        if (next.size <= 1) {
          return prev; // keep at least 1 habit
        }
        next.delete(habitId);
      } else {
        next.add(habitId);
      }
      return next;
    });
  };

  const handleOpenAddCustomHabit = () => {
    setEditingHabit(null);
    setIsHabitModalOpen(true);
  };

  const handleOpenEditHabit = (habit: HabitItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingHabit(habit);
    setIsHabitModalOpen(true);
  };

  const handleSaveHabit = (data: { name: string; target: string; icon: string }) => {
    if (editingHabit) {
      setHabitsList((prev) =>
        prev.map((h) => (h.id === editingHabit.id ? { ...h, ...data } : h))
      );
    } else {
      const newId = `habit_${Date.now()}`;
      const newHabit: HabitItem = {
        id: newId,
        name: data.name,
        target: data.target,
        icon: data.icon,
        order: habitsList.length,
      };
      setHabitsList((prev) => [...prev, newHabit]);
      setSelectedHabitIds((prev) => new Set(prev).add(newId));
    }
    setIsHabitModalOpen(false);
    setEditingHabit(null);
  };

  const handleDeleteHabit = (habitId: string) => {
    setHabitsList((prev) => prev.filter((h) => h.id !== habitId));
    setSelectedHabitIds((prev) => {
      const next = new Set(prev);
      next.delete(habitId);
      return next;
    });
    setIsHabitModalOpen(false);
    setEditingHabit(null);
  };

  // Step 1 Validation
  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const trimmed = displayName.trim();
    if (!trimmed) {
      setProfileError('Please enter your name.');
      return;
    }

    if (dateOfBirth && !isValidDateOfBirth(dateOfBirth)) {
      setProfileError('Please choose a valid date of birth.');
      return;
    }

    setStep(2);
  };

  // Step 2 Validation
  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  // Step 3 Validation
  const handleNextFromStep3 = () => {
    if (selectedHabitIds.size === 0) return;
    setStep(4);
  };

  // Final Complete
  const handleFinishOnboarding = async () => {
    const numHeight = heightInput.trim() ? parseFloat(heightInput.trim()) : undefined;
    const numWeight = weightInput.trim() ? parseFloat(weightInput.trim()) : undefined;

    await onComplete({
      displayName: displayName.trim() || 'User',
      dateOfBirth: dateOfBirth || undefined,
      height: numHeight && numHeight > 0 ? numHeight : undefined,
      heightUnit,
      weight: numWeight && numWeight > 0 ? numWeight : undefined,
      weightUnit,
      habits: activeHabits,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl glass-modal rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all">
        {/* Step Indicator Top Bar */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-200/70 dark:border-white/10 bg-zinc-100/50 dark:bg-zinc-900/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
              Step {step} of 4
            </span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {step === 1 && 'Profile Details'}
              {step === 2 && 'Personal Metrics'}
              {step === 3 && 'Choose Routines'}
              {step === 4 && 'Ready to Begin'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full bg-zinc-200/80 dark:bg-zinc-800/80 rounded-full overflow-hidden flex p-0.5 border border-zinc-300/40 dark:border-white/5">
            <div
              className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 rounded-full shadow-sm"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7">
          {/* STEP 1: Basic Profile */}
          {step === 1 && (
            <form onSubmit={handleNextFromStep1} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Welcome to Daily Habits
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Let’s set up your profile details. You can update these anytime.
                </p>
              </div>

              {/* Name input */}
              <div>
                <label htmlFor="onboarding-name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Your Name
                </label>
                <input
                  id="onboarding-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setProfileError(null);
                  }}
                  placeholder="Enter your name"
                  required
                  maxLength={50}
                  className="w-full px-3.5 py-2.5 text-sm font-medium glass-input rounded-xl focus:outline-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Date of Birth & Age Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="onboarding-dob" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    id="onboarding-dob"
                    type="date"
                    max={todayDate}
                    value={dateOfBirth}
                    onChange={(e) => {
                      setDateOfBirth(e.target.value);
                      setProfileError(null);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm font-mono glass-input rounded-xl focus:outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Calculated Age
                  </label>
                  <div className="w-full px-3.5 py-2.5 text-sm font-mono font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 rounded-xl flex items-center min-h-[42px]">
                    <span>{age !== null ? `${age} years old` : dateOfBirth ? 'Invalid date' : 'Optional'}</span>
                  </div>
                </div>
              </div>

              {/* Google Gmail (Read-Only) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Connected Gmail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user.email || ''}
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 rounded-xl cursor-not-allowed select-none pr-9"
                  />
                  <Lock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {profileError && (
                <div className="p-3 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 text-xs text-red-700 dark:text-red-300 rounded-xl backdrop-blur-xs">
                  {profileError}
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Body Information */}
          {step === 2 && (
            <form onSubmit={handleNextFromStep2} className="space-y-4">
              <div className="mb-4">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Personal Tracking Metrics
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Add your current metrics if you'd like to track physical routines.
                </p>
              </div>

              {/* Height Input & Unit Toggle */}
              <div>
                <label htmlFor="onboarding-height" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Height (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="onboarding-height"
                    type="number"
                    step="0.1"
                    min="0"
                    max="300"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    placeholder={heightUnit === 'cm' ? 'e.g. 175' : 'e.g. 68'}
                    className="flex-1 px-3.5 py-2.5 text-sm font-mono glass-input rounded-xl focus:outline-none text-zinc-900 dark:text-zinc-100"
                  />
                  <div className="flex rounded-xl border border-zinc-300/60 dark:border-white/10 overflow-hidden bg-zinc-100/80 dark:bg-zinc-800/80 p-0.5">
                    <button
                      type="button"
                      onClick={() => setHeightUnit('cm')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        heightUnit === 'cm'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeightUnit('in')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        heightUnit === 'in'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      in
                    </button>
                  </div>
                </div>
              </div>

              {/* Weight Input & Unit Toggle */}
              <div>
                <label htmlFor="onboarding-weight" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Weight (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="onboarding-weight"
                    type="number"
                    step="0.1"
                    min="0"
                    max="500"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    placeholder={weightUnit === 'kg' ? 'e.g. 72.5' : 'e.g. 160'}
                    className="flex-1 px-3.5 py-2.5 text-sm font-mono glass-input rounded-xl focus:outline-none text-zinc-900 dark:text-zinc-100"
                  />
                  <div className="flex rounded-xl border border-zinc-300/60 dark:border-white/10 overflow-hidden bg-zinc-100/80 dark:bg-zinc-800/80 p-0.5">
                    <button
                      type="button"
                      onClick={() => setWeightUnit('kg')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        weightUnit === 'kg'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('lbs')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        weightUnit === 'lbs'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                          : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>
              </div>

              {/* Privacy Notice Banner */}
              <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/70 dark:border-white/5 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-zinc-900 dark:text-zinc-100 font-semibold block">Private Personal Records</strong>
                  These metrics are strictly private to your personal account. Daily Habits does not enforce restrictive calorie targets, ideal weight calculations, or body comparisons.
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Choose Your Habits */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Choose Your Habits
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Select the routines you want on your daily checklist. You can edit or add custom habits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddCustomHabit}
                  className="px-3 py-1.5 text-xs font-semibold bg-zinc-200/70 hover:bg-zinc-300/70 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-zinc-300/40 dark:border-white/5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Custom Habit</span>
                </button>
              </div>

              {/* Habits List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {habitsList.map((habit) => {
                  const isSelected = selectedHabitIds.has(habit.id);
                  return (
                    <div
                      key={habit.id}
                      onClick={() => handleToggleHabitSelection(habit.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'glass-tile border-zinc-400/50 dark:border-white/20'
                          : 'bg-zinc-100/40 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                              : 'border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {habit.icon && (
                          <HabitIcon
                            name={habit.icon}
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'
                            }`}
                          />
                        )}

                        <div className="min-w-0">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            {habit.name}
                          </p>
                          {habit.target && (
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
                              {habit.target}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Edit / Delete Buttons */}
                      <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEditHabit(habit, e)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-white/10 transition-colors"
                          title="Edit Habit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-colors"
                          title="Remove Habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={selectedHabitIds.size === 0}
                  onClick={handleNextFromStep3}
                  className="px-5 py-2.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center gap-2 disabled:opacity-40"
                >
                  <span>Review & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Finish & Review */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 mb-3 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  You're all set, {displayName || 'Friend'}!
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Here is a quick summary of your Daily Habits configuration.
                </p>
              </div>

              <div className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200/70 dark:border-white/10">
                  <span className="text-zinc-500 dark:text-zinc-400">Account</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{displayName}</span>
                </div>
                {dateOfBirth && (
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200/70 dark:border-white/10">
                    <span className="text-zinc-500 dark:text-zinc-400">Age</span>
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {age !== null ? `${age} years old` : dateOfBirth}
                    </span>
                  </div>
                )}
                {(heightInput || weightInput) && (
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200/70 dark:border-white/10">
                    <span className="text-zinc-500 dark:text-zinc-400">Metrics</span>
                    <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {heightInput ? `${heightInput} ${heightUnit}` : ''}
                      {heightInput && weightInput ? ' • ' : ''}
                      {weightInput ? `${weightInput} ${weightUnit}` : ''}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Daily Routines</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeHabits.length} selected
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleFinishOnboarding}
                  className="px-6 py-3 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 dark:border-zinc-900/30 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Daily Habits</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Habit Modal */}
      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => {
          setIsHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={async (data) => {
          handleSaveHabit(data);
        }}
        onDelete={async (habitId) => {
          handleDeleteHabit(habitId);
        }}
        initialHabit={editingHabit}
      />
    </div>
  );
};
