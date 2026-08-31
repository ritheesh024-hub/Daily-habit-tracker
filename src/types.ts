export interface HabitItem {
  id: string;
  name: string;
  target?: string;
  icon?: string;
  order: number;
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:mm format e.g. "06:30", "20:30"
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_HABITS: HabitItem[] = [
  { id: 'wakeUp', name: 'Wake Up At', target: '6:30 AM', icon: 'sun', order: 0, reminderEnabled: true, reminderTime: '06:30' },
  { id: 'water', name: 'Water', target: '8 glasses', icon: 'droplet', order: 1, reminderEnabled: true, reminderTime: '08:00' },
  { id: 'gym', name: 'Gym', target: '1 hour', icon: 'dumbbell', order: 2, reminderEnabled: false, reminderTime: '18:00' },
  { id: 'breakfast', name: 'Breakfast', icon: 'utensils', order: 3, reminderEnabled: false, reminderTime: '08:30' },
  { id: 'lunch', name: 'Lunch', icon: 'utensils', order: 4, reminderEnabled: false, reminderTime: '12:30' },
  { id: 'dinner', name: 'Dinner', icon: 'utensils', order: 5, reminderEnabled: false, reminderTime: '19:30' },
  { id: 'reading', name: 'Reading', target: '1 hour', icon: 'book', order: 6, reminderEnabled: true, reminderTime: '20:30' },
  { id: 'sleep', name: 'Sleep', target: '10:30 PM', icon: 'moon', order: 7, reminderEnabled: true, reminderTime: '22:30' },
];

export interface DailyLogData {
  date: string; // YYYY-MM-DD
  completedHabits: Record<string, boolean>;
  completedCount: number;
  totalActiveCount: number;
  note?: string;
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  name?: string;
  email: string | null;
  photoURL: string | null;
  dateOfBirth?: string; // YYYY-MM-DD format
  height?: number;
  heightUnit?: 'cm' | 'in';
  weight?: number;
  weightUnit?: 'kg' | 'lbs';
  onboardingCompleted?: boolean;
  lastWeightCheckInDate?: string; // YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface WeightHistoryEntry {
  id: string;
  userId: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface DayHistorySummary {
  date: string; // YYYY-MM-DD
  weekday: string; // e.g. Mon, Tue
  completedCount: number;
  totalCount: number;
  percentage: number;
  isCompleted: boolean;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
}

export interface HabitConsistency {
  habitId: string;
  name: string;
  target?: string;
  icon?: string;
  completedDays: number;
  totalLoggedDays: number;
  percentage: number;
}

export interface SevenDayItem {
  date: string;
  weekday: string;
  percentage: number;
  completedCount: number;
  totalCount: number;
}

export interface ThirtyDaySummary {
  averagePercentage: number;
  completedDays: number;
  partialDays: number;
  noActivityDays: number;
  totalCompletedHabits: number;
  totalIncompleteHabits: number;
}

export interface WeeklyComparison {
  thisWeekPercentage: number;
  lastWeekPercentage: number;
  improvement: number;
}

export interface AnalyticsStats {
  currentStreak: number;
  bestStreak: number;
  todayPercentage: number;
  last7DaysPercentage: number;
  last30DaysPercentage: number;
  sevenDayBreakdown: SevenDayItem[];
  thirtyDaySummary: ThirtyDaySummary;
  weeklyComparison: WeeklyComparison;
  totalCompletedHabits: number;
  mostConsistentHabit: HabitConsistency | null;
  leastCompletedHabit: HabitConsistency | null;
  habitBreakdown: HabitConsistency[];
  totalLoggedDays: number;
  hasEnoughData: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string; // 'flame' | 'check' | 'book' | 'target'
  category: 'streak' | 'perfect_days' | 'completions' | 'consistency';
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
  unlockedAt?: string; // e.g. "Aug 20" or ISO date
  progressText: string; // e.g. "7 / 7 days", "10 / 10 perfect days"
}

export interface UnlockedMilestoneRecord {
  id: string;
  unlockedAt: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface UserReminderSettings {
  remindersEnabled: boolean;
  reminderTime: string; // HH:mm format e.g. "20:00"
  updatedAt?: string;
}

export const DEFAULT_REMINDER_SETTINGS: UserReminderSettings = {
  remindersEnabled: true,
  reminderTime: '20:00',
};

export interface ActiveSmartReminderNotice {
  id: string;
  title: string;
  body: string;
  incompleteHabits: HabitItem[];
  timestamp: number;
}

