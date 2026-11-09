import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  ShieldCheck,
  Sparkles,
  Activity,
  Footprints,
  Target,
  Heart,
  TrendingUp,
  Scale,
  Ruler,
  AlertCircle,
  LogOut,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { UserProfile, HabitItem, DEFAULT_HABITS } from '../types';
import { calculateAge, isValidDateOfBirth, getLocalDateKey } from '../lib/dateUtils';
import { DailyHabitsLogo, DailyHabitsMark } from './DailyHabitsLogo';
import { saveOnboardingStepProgress } from '../lib/habitService';

export interface OnboardingCompleteData {
  displayName: string;
  dateOfBirth?: string;
  height?: number;
  heightUnit?: 'cm' | 'in';
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  goals?: string[];
  activityLevel?: 'beginner' | 'moderately_active' | 'active' | 'highly_active';
  habits?: HabitItem[];
}

interface OnboardingModalProps {
  isOpen?: boolean;
  user: UserProfile;
  onComplete: (data: OnboardingCompleteData) => Promise<void>;
  isLoading?: boolean;
  onSignOut?: () => void | Promise<void>;
}

export type OnboardingGoalId =
  | 'habits'
  | 'fitness'
  | 'running'
  | 'discipline'
  | 'lifestyle'
  | 'performance';

interface GoalOption {
  id: OnboardingGoalId;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'habits',
    label: 'Build consistent habits',
    description: 'Stack daily routines and maintain unbroken streaks.',
    icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: 'fitness',
    label: 'Improve fitness',
    description: 'Build stamina, functional strength, and vitality.',
    icon: <Activity className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: 'running',
    label: 'Run regularly',
    description: 'Track outdoor runs, kilometer splits, and routes.',
    icon: <Footprints className="w-4 h-4 text-orange-500" />,
  },
  {
    id: 'discipline',
    label: 'Improve daily discipline',
    description: 'Stay accountable with morning and evening routines.',
    icon: <Target className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: 'lifestyle',
    label: 'Maintain a healthier lifestyle',
    description: 'Balance nutrition, mindful sleep, and daily movement.',
    icon: <Heart className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: 'performance',
    label: 'Improve personal performance',
    description: 'Level up training volume and personal records.',
    icon: <TrendingUp className="w-4 h-4 text-orange-500" />,
  },
];

interface ActivityOption {
  id: 'beginner' | 'moderately_active' | 'active' | 'highly_active';
  title: string;
  description: string;
  cadence: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'beginner',
    title: 'Beginner',
    description: 'Starting a fresh routine or returning after a break.',
    cadence: '0–1 workouts / week',
  },
  {
    id: 'moderately_active',
    title: 'Moderately active',
    description: 'Moving 1–2 times a week, building consistency.',
    cadence: '1–2 workouts / week',
  },
  {
    id: 'active',
    title: 'Active',
    description: 'Training or running 3–4 times a week regularly.',
    cadence: '3–4 workouts / week',
  },
  {
    id: 'highly_active',
    title: 'Highly active',
    description: 'Training 5+ times a week with structured workouts.',
    cadence: '5+ workouts / week',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen = true,
  user,
  onComplete,
  isLoading = false,
  onSignOut,
}) => {
  if (!isOpen) return null;

  // Initialize step from user's persisted progress if available (1-6)
  const initialStep = useMemo(() => {
    const s = user.onboardingStep;
    if (typeof s === 'number' && s >= 1 && s <= 6) {
      return s;
    }
    return 1;
  }, [user.onboardingStep]);

  const [step, setStep] = useState<number>(initialStep);

  // STEP 01 — Name
  const [displayName, setDisplayName] = useState<string>(() => {
    return user.displayName || user.name || '';
  });
  const [nameError, setNameError] = useState<string | null>(null);

  // STEP 02 — Date of Birth (Optional)
  const [dateOfBirth, setDateOfBirth] = useState<string>(user.dateOfBirth || '');
  const [dobError, setDobError] = useState<string | null>(null);

  // STEP 03 — Height & Weight (Optional)
  const [heightInput, setHeightInput] = useState<string>(user.height ? String(user.height) : '');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'in'>(user.heightUnit || 'cm');
  const [weightInput, setWeightInput] = useState<string>(user.weight ? String(user.weight) : '');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>(user.weightUnit || 'kg');
  const [profileMetricsError, setProfileMetricsError] = useState<string | null>(null);

  // STEP 04 — Goals (Multiple selection)
  const [selectedGoals, setSelectedGoals] = useState<string[]>(() => {
    if (Array.isArray(user.goals) && user.goals.length > 0) {
      return user.goals;
    }
    return ['Build consistent habits', 'Improve fitness'];
  });

  // STEP 05 — Activity Level (Single selection)
  const [activityLevel, setActivityLevel] = useState<
    'beginner' | 'moderately_active' | 'active' | 'highly_active' | undefined
  >(user.activityLevel || 'moderately_active');

  // STEP 06 — Submission & Error State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Computed values
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const computedAge = useMemo(() => calculateAge(dateOfBirth), [dateOfBirth]);

  // Persist step progress to Firestore in background
  const persistProgress = (nextStep: number, customFields?: Partial<UserProfile>) => {
    if (!user.uid) return;
    const cleanName = displayName.trim() || user.displayName || 'User';
    const numHeight = heightInput ? parseFloat(heightInput) : undefined;
    const numWeight = weightInput ? parseFloat(weightInput) : undefined;

    saveOnboardingStepProgress(user.uid, nextStep, {
      displayName: cleanName,
      name: cleanName,
      dateOfBirth: dateOfBirth || null,
      height: numHeight && !isNaN(numHeight) ? numHeight : null,
      heightUnit,
      weight: numWeight && !isNaN(numWeight) ? numWeight : null,
      weightUnit,
      goals: selectedGoals,
      activityLevel,
      ...customFields,
    }).catch((err) => {
      console.warn('Background onboarding progress sync notice:', err);
    });
  };

  // STEP 1 HANDLER
  const handleContinueStep1 = () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError('Please enter what we should call you.');
      return;
    }
    setNameError(null);
    setStep(2);
    persistProgress(2, { displayName: trimmed, name: trimmed });
  };

  // STEP 2 HANDLER
  const handleContinueStep2 = (skip = false) => {
    if (skip) {
      setDateOfBirth('');
      setDobError(null);
      setStep(3);
      persistProgress(3, { dateOfBirth: null });
      return;
    }

    if (dateOfBirth) {
      if (!isValidDateOfBirth(dateOfBirth)) {
        setDobError('Please select a valid date in the past.');
        return;
      }
    }
    setDobError(null);
    setStep(3);
    persistProgress(3, { dateOfBirth: dateOfBirth || null });
  };

  // STEP 3 HANDLER
  const handleContinueStep3 = (skip = false) => {
    if (skip) {
      setHeightInput('');
      setWeightInput('');
      setProfileMetricsError(null);
      setStep(4);
      persistProgress(4, { height: null, weight: null });
      return;
    }

    const numHeight = heightInput ? parseFloat(heightInput) : undefined;
    const numWeight = weightInput ? parseFloat(weightInput) : undefined;

    if (heightInput && (isNaN(numHeight!) || numHeight! <= 0 || numHeight! > 300)) {
      setProfileMetricsError('Please enter a valid height.');
      return;
    }
    if (weightInput && (isNaN(numWeight!) || numWeight! <= 0 || numWeight! > 400)) {
      setProfileMetricsError('Please enter a valid weight.');
      return;
    }

    setProfileMetricsError(null);
    setStep(4);
    persistProgress(4, {
      height: numHeight && !isNaN(numHeight) ? numHeight : null,
      heightUnit,
      weight: numWeight && !isNaN(numWeight) ? numWeight : null,
      weightUnit,
    });
  };

  // STEP 4 HANDLER
  const toggleGoal = (label: string) => {
    setSelectedGoals((prev) => {
      if (prev.includes(label)) {
        return prev.filter((g) => g !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  const handleContinueStep4 = (skip = false) => {
    const finalGoals = skip ? [] : selectedGoals;
    setStep(5);
    persistProgress(5, { goals: finalGoals });
  };

  // STEP 5 HANDLER
  const handleContinueStep5 = (skip = false) => {
    const finalActivity = skip ? undefined : activityLevel;
    setStep(6);
    persistProgress(6, { activityLevel: finalActivity });
  };

  // STEP 6 FINALIZE HANDLER
  const handleFinalizeOnboarding = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const cleanName = displayName.trim() || user.displayName || user.name || 'User';
    const numHeight = heightInput ? parseFloat(heightInput) : undefined;
    const numWeight = weightInput ? parseFloat(weightInput) : undefined;

    const completePayload: OnboardingCompleteData = {
      displayName: cleanName,
      dateOfBirth: dateOfBirth || undefined,
      height: numHeight && !isNaN(numHeight) ? numHeight : undefined,
      heightUnit,
      weight: numWeight && !isNaN(numWeight) ? numWeight : undefined,
      weightUnit,
      goals: selectedGoals,
      activityLevel,
      habits: DEFAULT_HABITS,
    };

    try {
      await onComplete(completePayload);
    } catch (err: any) {
      console.error('Failed to complete onboarding:', err);
      setSubmissionError(
        err?.message || 'Could not save your profile. Please check your connection and try again.'
      );
      setIsSubmitting(false);
    }
  };

  // Step indicator string e.g. "01 / 06"
  const stepNumberString = `0${step} / 06`;
  const progressPercent = Math.round((step / 6) * 100);

  // Personalized message for Step 6
  const personalizedMessage = useMemo(() => {
    const hasRunning = selectedGoals.some((g) => g.toLowerCase().includes('run'));
    const hasDiscipline = selectedGoals.some(
      (g) => g.toLowerCase().includes('discipline') || g.toLowerCase().includes('habit')
    );
    const hasFitness = selectedGoals.some((g) => g.toLowerCase().includes('fitness'));

    if (hasRunning && hasFitness) {
      return 'Your personal space is prepared. Build unbroken streaks, track outdoor runs with real GPS accuracy, and measure your stamina over time.';
    }
    if (hasRunning) {
      return 'Your personal space is prepared. Discover circular loop routes, track your pace splits in real-time, and log your progress.';
    }
    if (hasDiscipline) {
      return 'Your personal space is prepared. Stack daily morning and evening habits, maintain your momentum, and build reliable consistency.';
    }
    return 'Your personal space is prepared. Stack daily habits, monitor your progress, and improve a little more every day.';
  }, [selectedGoals]);

  return (
    <div
      id="onboarding-container"
      className="w-full max-w-xl mx-auto flex flex-col justify-between py-4 sm:py-8 px-4 sm:px-6 min-h-[calc(100vh-2rem)] sm:min-h-0 animate-fadeIn"
    >
      {/* Top Header: Brand & Progress Indicator */}
      <header className="w-full flex items-center justify-between pb-4 sm:pb-6 border-b border-zinc-200/80 dark:border-white/10">
        <div className="flex items-center gap-2.5">
          <DailyHabitsMark className="w-7 h-7" id="onboarding-brand-mark" />
          <span className="font-bold tracking-tight text-sm text-zinc-900 dark:text-zinc-50">
            Daily Habits
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Step Progress Number (Clean unboxed typography) */}
          <span
            id="onboarding-step-counter"
            className="text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider"
          >
            {stepNumberString}
          </span>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              id="onboarding-signout-btn"
              className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-200/70 dark:bg-zinc-800 rounded-full overflow-hidden mt-3 mb-6 sm:mb-8">
        <div
          id="onboarding-progress-bar"
          className="h-full bg-emerald-500 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Step Content Card */}
      <main className="flex-1 flex flex-col justify-center py-2 sm:py-4">
        {/* ======================================================== */}
        {/* STEP 01 — PERSONAL INTRODUCTION                          */}
        {/* ======================================================== */}
        {step === 1 && (
          <div id="onboarding-step-1" className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Step 01 · Personal Introduction
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                Let's make this personal.
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                What should we call you?
              </p>
            </div>

            <div className="space-y-3">
              <label
                htmlFor="onboarding-name-input"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Preferred Name
              </label>
              <div className="relative">
                <input
                  id="onboarding-name-input"
                  type="text"
                  autoFocus
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleContinueStep1();
                    }
                  }}
                  placeholder="e.g. Alex"
                  className={`w-full min-h-[54px] sm:min-h-[60px] px-4 sm:px-5 rounded-2xl glass-input text-lg sm:text-xl font-semibold text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:outline-none transition-all ${
                    nameError
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'focus:border-emerald-500'
                  }`}
                />
              </div>

              {nameError ? (
                <p id="onboarding-name-error" className="text-xs text-rose-500 font-medium flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{nameError}</span>
                </p>
              ) : (
                <p className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500">
                  Prefilled from your Google Account. Feel free to use your first name or a nickname.
                </p>
              )}

              {/* Read-only connected Google Email */}
              {user.email && (
                <div className="pt-2 text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Connected Account: {user.email}</span>
                </div>
              )}
            </div>

            <div className="pt-4">
              <button
                id="onboarding-step1-continue"
                type="button"
                onClick={handleContinueStep1}
                className="w-full min-h-[52px] sm:min-h-[58px] px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm sm:text-base tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 02 — ABOUT YOU (Date of Birth)                      */}
        {/* ======================================================== */}
        {step === 2 && (
          <div id="onboarding-step-2" className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Step 02 · About You
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                A little about you.
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                When were you born?
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="onboarding-dob-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                >
                  Date of Birth <span className="lowercase text-zinc-400">(optional)</span>
                </label>
                {computedAge !== null && (
                  <span
                    id="onboarding-computed-age"
                    className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400"
                  >
                    Age: {computedAge} years
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="onboarding-dob-input"
                  type="date"
                  max={todayKey}
                  min="1920-01-01"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    if (dobError) setDobError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleContinueStep2(false);
                    }
                  }}
                  className={`w-full min-h-[54px] sm:min-h-[60px] px-4 sm:px-5 rounded-2xl glass-input text-base sm:text-lg font-mono text-zinc-900 dark:text-zinc-50 focus:outline-none transition-all ${
                    dobError
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'focus:border-emerald-500'
                  }`}
                />
              </div>

              {dobError && (
                <p id="onboarding-dob-error" className="text-xs text-rose-500 font-medium flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{dobError}</span>
                </p>
              )}

              {/* Privacy Explanation */}
              <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-white/5 flex items-start gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Used only to calculate your age and tailor training zones and recovery metrics. Kept strictly private and never shared.
                </p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="onboarding-step2-back"
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl glass-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  id="onboarding-step2-continue"
                  type="button"
                  onClick={() => handleContinueStep2(false)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                id="onboarding-step2-skip"
                type="button"
                onClick={() => handleContinueStep2(true)}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer text-center"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 03 — YOUR PROFILE (Height & Weight)                  */}
        {/* ======================================================== */}
        {step === 3 && (
          <div id="onboarding-step-3" className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Step 03 · Your Profile
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                Know your starting point.
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Height and weight allow Daily Habits to calculate realistic stride lengths and accurate GPS running calories.
              </p>
            </div>

            <div className="space-y-4">
              {/* Height Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="onboarding-height-input"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Height</span>
                  </label>

                  <div className="flex items-center p-0.5 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setHeightUnit('cm')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        heightUnit === 'cm'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeightUnit('in')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        heightUnit === 'in'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      in
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    id="onboarding-height-input"
                    type="number"
                    step="0.1"
                    min="1"
                    max="300"
                    value={heightInput}
                    onChange={(e) => {
                      setHeightInput(e.target.value);
                      if (profileMetricsError) setProfileMetricsError(null);
                    }}
                    placeholder={heightUnit === 'cm' ? 'e.g. 178' : 'e.g. 70'}
                    className="w-full min-h-[54px] sm:min-h-[58px] px-4 sm:px-5 rounded-2xl glass-input text-base sm:text-lg font-mono text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                    {heightUnit}
                  </span>
                </div>
              </div>

              {/* Weight Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="onboarding-weight-input"
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Weight</span>
                  </label>

                  <div className="flex items-center p-0.5 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setWeightUnit('kg')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        weightUnit === 'kg'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeightUnit('lbs')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        weightUnit === 'lbs'
                          ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                      }`}
                    >
                      lbs
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    id="onboarding-weight-input"
                    type="number"
                    step="0.1"
                    min="1"
                    max="400"
                    value={weightInput}
                    onChange={(e) => {
                      setWeightInput(e.target.value);
                      if (profileMetricsError) setProfileMetricsError(null);
                    }}
                    placeholder={weightUnit === 'kg' ? 'e.g. 72' : 'e.g. 158'}
                    className="w-full min-h-[54px] sm:min-h-[58px] px-4 sm:px-5 rounded-2xl glass-input text-base sm:text-lg font-mono text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                    {weightUnit}
                  </span>
                </div>
              </div>

              {profileMetricsError && (
                <p id="onboarding-metrics-error" className="text-xs text-rose-500 font-medium flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{profileMetricsError}</span>
                </p>
              )}

              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
                Optional. If skipped, calorie estimation will remain disabled until you set your weight in Profile.
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="onboarding-step3-back"
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl glass-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  id="onboarding-step3-continue"
                  type="button"
                  onClick={() => handleContinueStep3(false)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                id="onboarding-step3-skip"
                type="button"
                onClick={() => handleContinueStep3(true)}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer text-center"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 04 — YOUR GOALS (Multi-select)                      */}
        {/* ======================================================== */}
        {step === 4 && (
          <div id="onboarding-step-4" className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Step 04 · Your Goals
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                What would you like to achieve?
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Select one or more areas you want to focus on. You can adjust these anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {GOAL_OPTIONS.map((goal) => {
                const isSelected = selectedGoals.includes(goal.label);
                return (
                  <button
                    key={goal.id}
                    id={`onboarding-goal-${goal.id}`}
                    type="button"
                    onClick={() => toggleGoal(goal.label)}
                    className={`p-3.5 sm:p-4 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border-emerald-500/40 dark:border-emerald-500/30 shadow-xs'
                        : 'glass-card border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : goal.icon}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                        {goal.label}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                        {goal.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="onboarding-step4-back"
                  type="button"
                  onClick={() => setStep(3)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl glass-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  id="onboarding-step4-continue"
                  type="button"
                  onClick={() => handleContinueStep4(false)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                id="onboarding-step4-skip"
                type="button"
                onClick={() => handleContinueStep4(true)}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer text-center"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 05 — YOUR ACTIVITY LEVEL                            */}
        {/* ======================================================== */}
        {step === 5 && (
          <div id="onboarding-step-5" className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Step 05 · Activity Baseline
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                Where are you starting from?
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Help us calibrate your initial daily pace and targets.
              </p>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {ACTIVITY_OPTIONS.map((opt) => {
                const isSelected = activityLevel === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`onboarding-activity-${opt.id}`}
                    type="button"
                    onClick={() => setActivityLevel(opt.id)}
                    className={`w-full p-4 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3 border ${
                      isSelected
                        ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border-emerald-500/40 dark:border-emerald-500/30 shadow-xs'
                        : 'glass-card border-zinc-200/80 dark:border-white/10 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                          {opt.title}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                          · {opt.cadence}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {opt.description}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-zinc-300 dark:border-zinc-700 bg-transparent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="onboarding-step5-back"
                  type="button"
                  onClick={() => setStep(4)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl glass-card hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-[0.99]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  id="onboarding-step5-continue"
                  type="button"
                  onClick={() => handleContinueStep5(false)}
                  className="min-h-[52px] sm:min-h-[58px] px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button
                id="onboarding-step5-skip"
                type="button"
                onClick={() => handleContinueStep5(true)}
                className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer text-center"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* STEP 06 — PERSONALIZED WELCOME                           */}
        {/* ======================================================== */}
        {step === 6 && (
          <div id="onboarding-step-6" className="space-y-6 sm:space-y-8 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Step 06 · Ready to Launch
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                Your next chapter starts now.
              </h1>
              <p className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                Welcome, <strong className="text-zinc-900 dark:text-zinc-100">{displayName || 'Runner'}</strong>.
              </p>
            </div>

            {/* Personalized Summary Card */}
            <div className="p-4 sm:p-5 rounded-3xl glass-card border-zinc-200/80 dark:border-white/10 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Your Focus Areas
                </p>
                {selectedGoals.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedGoals.map((g) => (
                      <span
                        key={g}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Balanced daily consistency & personal routine
                  </p>
                )}
              </div>

              {activityLevel && (
                <div className="pt-2 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 dark:text-zinc-400">Starting Baseline</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                    {activityLevel.replace('_', ' ')}
                  </span>
                </div>
              )}

              <p className="pt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed border-t border-zinc-200/60 dark:border-white/5">
                {personalizedMessage}
              </p>
            </div>

            {/* Error state if submission fails */}
            {submissionError && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="truncate">{submissionError}</span>
                </div>
                <button
                  type="button"
                  onClick={handleFinalizeOnboarding}
                  className="px-3 py-1 rounded-xl bg-rose-600 text-white font-semibold text-xs shrink-0 cursor-pointer hover:bg-rose-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Launch Action Button */}
            <div className="pt-4 space-y-2.5">
              <button
                id="onboarding-enter-dashboard-btn"
                type="button"
                disabled={isSubmitting || isLoading}
                onClick={handleFinalizeOnboarding}
                className="w-full min-h-[54px] sm:min-h-[60px] px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base tracking-wide flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Preparing Your Space...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Enter Daily Habits</span>
                  </>
                )}
              </button>

              <button
                id="onboarding-step6-back"
                type="button"
                disabled={isSubmitting || isLoading}
                onClick={() => setStep(5)}
                className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors cursor-pointer text-center disabled:opacity-40"
              >
                Back to Activity Level
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Privacy Guarantee */}
      <footer className="pt-4 sm:pt-6 border-t border-zinc-200/60 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted profile storage</span>
        </div>
        <span>Daily Habits · Private by design</span>
      </footer>
    </div>
  );
};
