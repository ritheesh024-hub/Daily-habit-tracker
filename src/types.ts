export type HabitPriority = 'high' | 'medium' | 'low';

export interface HabitCategoryOption {
  id: string;
  label: string;
  emoji: string;
}

export const HABIT_CATEGORIES: HabitCategoryOption[] = [
  { id: 'fitness', label: 'Fitness', emoji: '🏃' },
  { id: 'study', label: 'Study', emoji: '📚' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'health', label: 'Health', emoji: '🧘' },
  { id: 'wellness', label: 'Wellness', emoji: '💧' },
  { id: 'personal', label: 'Personal', emoji: '🎯' },
  { id: 'other', label: 'Other', emoji: '📝' },
];

export const HABIT_ACCENTS = [
  { id: 'indigo', name: 'Indigo', dotClass: 'bg-indigo-500', tintBg: 'bg-indigo-500/10 dark:bg-indigo-500/15', tintBorder: 'border-indigo-500/30', tintText: 'text-indigo-600 dark:text-indigo-400', hex: '#6366f1' },
  { id: 'emerald', name: 'Emerald', dotClass: 'bg-emerald-500', tintBg: 'bg-emerald-500/10 dark:bg-emerald-500/15', tintBorder: 'border-emerald-500/30', tintText: 'text-emerald-600 dark:text-emerald-400', hex: '#10b981' },
  { id: 'amber', name: 'Amber', dotClass: 'bg-amber-500', tintBg: 'bg-amber-500/10 dark:bg-amber-500/15', tintBorder: 'border-amber-500/30', tintText: 'text-amber-600 dark:text-amber-400', hex: '#f59e0b' },
  { id: 'rose', name: 'Rose', dotClass: 'bg-rose-500', tintBg: 'bg-rose-500/10 dark:bg-rose-500/15', tintBorder: 'border-rose-500/30', tintText: 'text-rose-600 dark:text-rose-400', hex: '#f43f5e' },
  { id: 'cyan', name: 'Cyan', dotClass: 'bg-cyan-500', tintBg: 'bg-cyan-500/10 dark:bg-cyan-500/15', tintBorder: 'border-cyan-500/30', tintText: 'text-cyan-600 dark:text-cyan-400', hex: '#06b6d4' },
  { id: 'violet', name: 'Violet', dotClass: 'bg-violet-500', tintBg: 'bg-violet-500/10 dark:bg-violet-500/15', tintBorder: 'border-violet-500/30', tintText: 'text-violet-600 dark:text-violet-400', hex: '#8b5cf6' },
  { id: 'blue', name: 'Blue', dotClass: 'bg-blue-500', tintBg: 'bg-blue-500/10 dark:bg-blue-500/15', tintBorder: 'border-blue-500/30', tintText: 'text-blue-600 dark:text-blue-400', hex: '#3b82f6' },
  { id: 'slate', name: 'Slate', dotClass: 'bg-slate-500', tintBg: 'bg-slate-500/10 dark:bg-slate-500/15', tintBorder: 'border-slate-500/30', tintText: 'text-slate-600 dark:text-slate-400', hex: '#64748b' },
];

export interface HabitItem {
  id: string;
  name: string;
  target?: string;
  goal?: string; // e.g. "30 minutes", "8 glasses", "3 km"
  description?: string; // short description
  category?: string; // Fitness, Study, Work, Health, Wellness, Personal, Other
  priority?: HabitPriority; // 'high' | 'medium' | 'low'
  accent?: string; // e.g. 'indigo', 'emerald', 'amber', 'rose'
  color?: string; // alias for accent
  icon?: string;
  order: number;
  time?: string; // HH:mm format e.g. "06:30", "20:30"
  frequency?: string; // "Every day", "Weekdays", "Weekends", "Selected days"
  scheduleDays?: string[]; // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  archived?: boolean; // Archived habits do not show on active task list
  archivedAt?: string;
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

export type GoalPeriodType = 'this_week' | 'this_month' | 'custom';
export type GoalStatus = 'active' | 'completed' | 'expired';

export interface HabitGoal {
  id: string;
  userId: string;
  habitId: string; // Habit ID or 'all'
  habitName: string;
  habitIcon?: string;
  habitAccent?: string;
  targetCount: number; // e.g. 20
  periodType: GoalPeriodType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  title?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  celebrated?: boolean;
}

export interface GoalWithProgress extends HabitGoal {
  currentCount: number;
  progressPercentage: number;
  status: GoalStatus;
  daysRemaining: number;
}

export type AchievementCategory = 'streak' | 'perfect_days' | 'completions' | 'consistency' | 'personal_best';

export interface Milestone {
  id: string;
  title: string;
  name?: string; // alias for title
  description: string;
  icon: string;
  category: AchievementCategory;
  currentValue: number;
  targetValue: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressText: string;
}

export type MilestoneItem = Milestone;

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

export interface MonthlyHabitPerformance {
  id: string;
  name: string;
  icon?: string;
  target?: string;
  completedCount: number;
  eligibleDays: number;
  percentage: number;
}

export interface MonthlyRecapData {
  year: number;
  monthIndex: number; // 0 to 11
  monthName: string; // e.g. "September 2026"
  completionPercentage: number;
  totalCompletedHabits: number;
  totalPossibleHabits: number;
  daysActive: number;
  perfectDays: number;
  bestStreakDuringMonth: number;
  mostCompletedHabit: MonthlyHabitPerformance | null;
  leastCompletedHabit: MonthlyHabitPerformance | null;
  habitPerformanceList: MonthlyHabitPerformance[];
  previousMonthComparison?: {
    prevMonthName: string;
    prevPercentage: number;
    difference: number; // e.g. +8
  };
  insights: string[];
  hasEnoughData: boolean;
}

export type SyncOperationType =
  | 'COMPLETE_HABIT'
  | 'SAVE_NOTE'
  | 'CREATE_HABIT'
  | 'UPDATE_HABIT'
  | 'DELETE_HABIT'
  | 'SYNC_CALENDAR'
  | 'SAVE_WEIGHT';

export interface PendingSyncItem {
  id: string; // unique operation id
  type: SyncOperationType;
  userId: string;
  timestamp: number;
  // Payload fields
  habitId?: string;
  date?: string; // YYYY-MM-DD
  completed?: boolean;
  note?: string;
  habit?: HabitItem;
  googleCalendarEventId?: string;
  weightEntry?: WeightHistoryEntry;
}

export type ConnectionStatus = 'online' | 'offline' | 'syncing';


