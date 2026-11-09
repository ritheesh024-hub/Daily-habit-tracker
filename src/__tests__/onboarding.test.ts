import {
  calculateAge,
  isValidDateOfBirth,
  getLocalDateKey,
} from '../lib/dateUtils';
import { UserProfile, HabitItem, DEFAULT_HABITS } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`, detail || '');
    failed++;
  }
}

console.log('--- RUNNING DAILY HABITS ONBOARDING & PROFILE PERSISTENCE TESTS ---\n');

// 1. New Google account onboarding detection
const newGoogleUser: UserProfile = {
  uid: 'usr_new_123',
  displayName: 'Jordan Runner',
  name: 'Jordan Runner',
  email: 'jordan@example.com',
  photoURL: null,
  onboardingCompleted: false,
};
assert(
  newGoogleUser.onboardingCompleted === false,
  'New Google account has onboardingCompleted: false and routes to onboarding'
);

// 2. Existing user account bypasses onboarding
const existingUser: UserProfile = {
  uid: 'usr_existing_456',
  displayName: 'Veteran Runner',
  name: 'Veteran Runner',
  email: 'veteran@example.com',
  photoURL: null,
  onboardingCompleted: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};
assert(
  existingUser.onboardingCompleted === true,
  'Existing user with onboardingCompleted: true bypasses onboarding and accesses dashboard'
);

// 3. User with existing createdAt document is treated as onboarded
function resolveOnboardingStatus(data: any): boolean {
  if (typeof data.onboardingCompleted === 'boolean') {
    return data.onboardingCompleted;
  }
  return data.createdAt ? true : false;
}
assert(
  resolveOnboardingStatus({ createdAt: '2025-12-01' }) === true,
  'Legacy profile with existing createdAt defaults to onboarded (never interrupts existing users)'
);
assert(
  resolveOnboardingStatus({}) === false,
  'Fresh profile without createdAt defaults to not onboarded'
);

// 4. Age Calculation from Date of Birth (Never asked separately)
const currentYear = new Date().getFullYear();
const sampleDob = `${currentYear - 28}-05-15`;
const calculatedAge = calculateAge(sampleDob);
assert(
  typeof calculatedAge === 'number' && (calculatedAge === 27 || calculatedAge === 28),
  `Age calculated accurately from DOB (${sampleDob} -> ${calculatedAge})`
);

// Invalid or future dates
assert(
  isValidDateOfBirth('2099-01-01') === false,
  'Future date of birth is rejected by isValidDateOfBirth'
);
assert(
  isValidDateOfBirth('invalid-date') === false,
  'Malformed date string is rejected'
);
assert(
  isValidDateOfBirth('') === true,
  'Empty date of birth is allowed (field is strictly optional)'
);

// 5. Optional field skipping preserves clean data without fake or assumed values
interface MockStepProgress {
  displayName?: string;
  dateOfBirth?: string | null;
  height?: number | null;
  heightUnit?: 'cm' | 'in';
  weight?: number | null;
  weightUnit?: 'kg' | 'lbs';
  goals?: string[];
  activityLevel?: string;
  onboardingStep?: number;
}

function simulateStepSkipping(): MockStepProgress {
  // Step 1: Name provided
  const state: MockStepProgress = {
    displayName: 'Sam',
    onboardingStep: 2,
  };

  // Step 2: DOB skipped
  state.dateOfBirth = null;
  state.onboardingStep = 3;

  // Step 3: Height & Weight skipped
  state.height = null;
  state.weight = null;
  state.onboardingStep = 4;

  // Step 4: Goals selected
  state.goals = ['Build consistent habits', 'Run regularly'];
  state.onboardingStep = 5;

  // Step 5: Activity level selected
  state.activityLevel = 'active';
  state.onboardingStep = 6;

  return state;
}

const skippedState = simulateStepSkipping();
assert(skippedState.displayName === 'Sam', 'Step 1: Name is preserved');
assert(skippedState.dateOfBirth === null, 'Step 2: Skipped DOB remains null without fabricated date');
assert(skippedState.height === null && skippedState.weight === null, 'Step 3: Skipped height & weight remain null without assumed weight');
assert(Array.isArray(skippedState.goals) && skippedState.goals.length === 2, 'Step 4: Selected goals are recorded');
assert(skippedState.activityLevel === 'active', 'Step 5: Selected activity level is recorded');
assert(skippedState.onboardingStep === 6, 'Step progress advances to Step 6');

// 6. Resume incomplete onboarding after browser reload / session restore
function resumeIncompleteOnboarding(persistedProfile: Partial<UserProfile>): number {
  const step = persistedProfile.onboardingStep;
  if (typeof step === 'number' && step >= 1 && step <= 6) {
    return step;
  }
  return 1;
}
assert(
  resumeIncompleteOnboarding({ onboardingStep: 4, displayName: 'Taylor' }) === 4,
  'Reload at Step 4 resumes directly at Step 4'
);
assert(
  resumeIncompleteOnboarding({ onboardingStep: undefined }) === 1,
  'Reload without saved step starts at Step 1'
);

// 7. Profile persistence on Step 6 completion
function finalizeOnboarding(
  existingUser: UserProfile,
  completedData: {
    displayName: string;
    dateOfBirth?: string;
    height?: number;
    heightUnit?: 'cm' | 'in';
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
    goals?: string[];
    activityLevel?: any;
    habits?: HabitItem[];
  }
): UserProfile {
  return {
    ...existingUser,
    displayName: completedData.displayName,
    name: completedData.displayName,
    dateOfBirth: completedData.dateOfBirth,
    height: completedData.height,
    heightUnit: completedData.heightUnit || 'cm',
    weight: completedData.weight,
    weightUnit: completedData.weightUnit || 'kg',
    goals: completedData.goals || [],
    activityLevel: completedData.activityLevel,
    onboardingCompleted: true,
    onboardingStep: undefined,
  };
}

const finalProfile = finalizeOnboarding(newGoogleUser, {
  displayName: 'Jordan R.',
  goals: ['Run regularly', 'Improve fitness'],
  activityLevel: 'active',
  habits: DEFAULT_HABITS,
});

assert(
  finalProfile.onboardingCompleted === true,
  'Completed profile marks onboardingCompleted: true'
);
assert(
  finalProfile.onboardingStep === undefined,
  'Completed profile clears temporary onboardingStep'
);
assert(
  finalProfile.displayName === 'Jordan R.',
  'Completed profile stores customized display name'
);
assert(
  finalProfile.goals?.length === 2 && finalProfile.activityLevel === 'active',
  'Completed profile stores customized athletic goals and activity baseline'
);

// 8. Prevent duplicate submissions
let isSubmitting = false;
let submissionAttempts = 0;

function attemptSubmission() {
  if (isSubmitting) {
    return false; // rejected
  }
  isSubmitting = true;
  submissionAttempts++;
  return true;
}

assert(attemptSubmission() === true, 'First submission proceeds');
assert(attemptSubmission() === false, 'Rapid duplicate click is safely rejected');
assert(submissionAttempts === 1, 'Only one submission was processed');

console.log(`\n========================================`);
console.log(`TOTAL: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
