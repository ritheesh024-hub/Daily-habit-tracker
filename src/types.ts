export interface HabitItem {
  id: string;
  name: string;
  target?: string;
  icon?: string;
  order: number;
  time?: string; // HH:mm format e.g. "06:30", "20:30"
  googleCalendarEventId?: string; // Associated Google Calendar recurring event ID
  googleCalendarSynced?: boolean;
  lastSyncedAt?: string;
  // Backward compatibility fields
  reminderEnabled?: boolean;
  reminderTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_HABITS: HabitItem[] = [
  { id: 'wakeUp', name: 'Wake Up At', target: '6:30 AM', time: '06:30', icon: 'sun', order: 0, reminderTime: '06:30', reminderEnabled: true },
  { id: 'water', name: 'Water', target: '8 glasses', time: '08:00', icon: 'droplet', order: 1, reminderTime: '08:00', reminderEnabled: true },
  { id: 'breakfast', name: 'Breakfast', time: '08:30', icon: 'utensils', order: 2, reminderTime: '08:30', reminderEnabled: true },
  { id: 'lunch', name: 'Lunch', time: '12:30', icon: 'utensils', order: 3, reminderTime: '12:30', reminderEnabled: true },
  { id: 'gym', name: 'Gym', target: '1 hour', time: '18:00', icon: 'dumbbell', order: 4, reminderTime: '18:00', reminderEnabled: true },
  { id: 'dinner', name: 'Dinner', time: '19:30', icon: 'utensils', order: 5, reminderTime: '19:30', reminderEnabled: true },
  { id: 'reading', name: 'Reading', target: '1 hour', time: '20:30', icon: 'book', order: 6, reminderTime: '20:30', reminderEnabled: true },
  { id: 'sleep', name: 'Sleep', target: '10:30 PM', time: '22:30', icon: 'moon', order: 7, reminderTime: '22:30', reminderEnabled: true },
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
  googleCalendarConnected?: boolean;
  googleCalendarEmail?: string;
  lastGoogleCalendarSync?: string;
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
  icon: string;
  category: 'streak' | 'perfect_days' | 'completions' | 'consistency';
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressText: string;
}

export interface UnlockedMilestoneRecord {
  id: string;
  unlockedAt: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface CalendarSyncResult {
  success: boolean;
  syncedCount: number;
  totalScheduled: number;
  updatedHabits: HabitItem[];
  error?: string;
}
