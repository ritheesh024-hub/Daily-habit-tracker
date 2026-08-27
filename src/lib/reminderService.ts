import { HabitItem } from '../types';

export type NotificationSupportStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function getHabitEmoji(iconName?: string): string {
  switch (iconName) {
    case 'sun':
      return '☀️';
    case 'droplet':
      return '💧';
    case 'dumbbell':
      return '🏋️';
    case 'utensils':
      return '🍽️';
    case 'book':
      return '📚';
    case 'moon':
      return '🌙';
    case 'activity':
      return '🏃';
    case 'footprints':
      return '👟';
    case 'brain':
      return '🧠';
    case 'heart':
      return '❤️';
    case 'coffee':
      return '☕';
    case 'smile':
      return '✨';
    default:
      return '⏰';
  }
}

export function formatTime12Hour(time24?: string): string {
  if (!time24) return '8:00 AM';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1].padStart(2, '0');
  if (isNaN(hour)) return time24;

  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${ampm}`;
}

export function getNotificationPermissionStatus(): NotificationSupportStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationSupportStatus;
}

export async function requestNotificationPermission(): Promise<NotificationSupportStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  // If already decided, return current state to avoid repeat popups
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission as NotificationSupportStatus;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationSupportStatus;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return Notification.permission as NotificationSupportStatus;
  }
}

export function getIncompleteHabits(
  habits: HabitItem[],
  completedHabits: Record<string, boolean> = {}
): HabitItem[] {
  return habits.filter((habit) => !completedHabits[habit.id]);
}

export function generateSmartReminderMessage(
  incompleteHabits: HabitItem[]
): { title: string; body: string } | null {
  if (!incompleteHabits || incompleteHabits.length === 0) {
    return null;
  }

  const count = incompleteHabits.length;
  if (count === 1) {
    const singleHabit = incompleteHabits[0];
    return {
      title: 'Daily Habits Reminder',
      body: `Don't forget to complete ${singleHabit.name} today.`,
    };
  }

  const habitNames = incompleteHabits.map((h) => h.name).join(', ');
  return {
    title: 'Daily Habits Reminder',
    body: `${count} habits are still incomplete today: ${habitNames}.`,
  };
}

export function triggerSmartBrowserNotification(
  title: string,
  body: string,
  tag = 'daily-smart-reminder'
): boolean {
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title, {
        body,
        icon: '/icon.png',
        tag,
      });
      return true;
    } catch (e) {
      console.warn('Native notification failed (possibly iframe restricted):', e);
    }
  }
  return false;
}

export function triggerBrowserNotification(habit: HabitItem): boolean {
  const emoji = getHabitEmoji(habit.icon);
  const title = `Time for ${habit.name} ${emoji}`;
  const body = habit.target
    ? `Goal: ${habit.target}. Keep your streak alive today!`
    : `Time to complete your habit!`;

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/icon.png',
        tag: `habit-reminder-${habit.id}`,
      });
      return true;
    } catch (e) {
      console.warn('Native notification failed (possibly iframe restricted):', e);
    }
  }
  return false;
}
