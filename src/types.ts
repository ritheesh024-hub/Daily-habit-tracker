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
  updatedAt?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  lastLoginAt?: string;
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
