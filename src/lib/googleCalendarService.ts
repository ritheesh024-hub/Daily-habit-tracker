import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import { HabitItem, CalendarSyncResult } from '../types';
import { getTodayDateString } from './dateUtils';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const SCOPES = [CALENDAR_SCOPE];

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// In-memory OAuth access token cache
let cachedAccessToken: string | null = null;

export function getCachedCalendarToken(): string | null {
  return cachedAccessToken;
}

export function setCachedCalendarToken(token: string | null): void {
  cachedAccessToken = token;
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

/**
 * Initiates Google OAuth popup with Calendar scope to obtain an access token.
 */
export async function connectGoogleCalendar(): Promise<{
  accessToken: string;
  email: string | null;
  displayName: string | null;
}> {
  const provider = new GoogleAuthProvider();
  provider.addScope(CALENDAR_SCOPE);
  provider.setCustomParameters({
    prompt: 'consent',
    access_type: 'offline',
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google did not return an OAuth access token. Please ensure popups are allowed.');
    }

    cachedAccessToken = token;

    return {
      accessToken: token,
      email: result.user.email || null,
      displayName: result.user.displayName || null,
    };
  } catch (error: any) {
    console.error('Google Calendar OAuth error:', error);
    if (
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request'
    ) {
      throw new Error('Google sign-in popup was closed before completion.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('The sign-in popup was blocked by your browser. Please allow popups for this site.');
    }
    throw new Error(error.message || 'Failed to connect Google Calendar.');
  }
}

/**
 * Disconnects Google Calendar by clearing the cached in-memory token.
 */
export function disconnectGoogleCalendar(): void {
  cachedAccessToken = null;
}

/**
 * Searches the user's primary Google Calendar for events tagged with Daily Habits.
 */
export async function fetchDailyHabitCalendarEvents(token: string): Promise<any[]> {
  try {
    const url = `${CALENDAR_API_BASE}/calendars/primary/events?q=Daily+Habits&maxResults=100&singleEvents=false`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('OAuth token expired. Please reconnect Google Calendar.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Google Calendar API error (${res.status})`);
    }

    const data = await res.json();
    return data.items || [];
  } catch (err: any) {
    console.warn('Error querying Google Calendar events:', err);
    throw err;
  }
}

/**
 * Creates or updates a recurring daily Google Calendar event for a habit.
 */
export async function syncHabitToGoogleCalendar(
  habit: HabitItem,
  token: string,
  existingEvents?: any[]
): Promise<{ habit: HabitItem; eventId: string }> {
  const scheduledTime = (typeof habit.time === 'string' && habit.time) || (typeof habit.reminderTime === 'string' && habit.reminderTime) || '08:00';
  const [hoursStr, minutesStr] = scheduledTime.split(':');
  const hours = parseInt(hoursStr || '8', 10);
  const minutes = parseInt(minutesStr || '0', 10);

  const todayStr = getTodayDateString(); // YYYY-MM-DD
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Construct start & end ISO strings for today's recurrence base
  const startDateTime = new Date();
  const [y, m, d] = todayStr.split('-').map(Number);
  startDateTime.setFullYear(y, m - 1, d);
  startDateTime.setHours(hours, minutes, 0, 0);

  const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // 30 minutes duration

  // Format ISO with local offset
  const formatIsoLocal = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  };

  const startIso = formatIsoLocal(startDateTime);
  const endIso = formatIsoLocal(endDateTime);

  const eventPayload = {
    summary: `Daily Habits: ${habit.name}`,
    description: `Daily habit scheduled via Daily Habits app.\nTarget: ${habit.target || 'Daily Consistency'}\nScheduled Time: ${formatTime12Hour(scheduledTime)}`,
    start: {
      dateTime: `${startIso}`,
      timeZone: userTimeZone,
    },
    end: {
      dateTime: `${endIso}`,
      timeZone: userTimeZone,
    },
    recurrence: ['RRULE:FREQ=DAILY'],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 0 },
        { method: 'popup', minutes: 10 },
      ],
    },
    extendedProperties: {
      private: {
        app: 'daily-habits',
        habitId: habit.id,
      },
    },
  };

  // 1. Identify if an event already exists
  let targetEventId = habit.googleCalendarEventId || null;

  if (!targetEventId && existingEvents && existingEvents.length > 0) {
    const matched = existingEvents.find(
      (ev) =>
        ev.extendedProperties?.private?.habitId === habit.id ||
        (ev.summary && ev.summary.toLowerCase() === `daily habits: ${habit.name}`.toLowerCase())
    );
    if (matched && matched.id) {
      targetEventId = matched.id;
    }
  }

  let finalEventId = '';

  if (targetEventId) {
    // Update existing event via PATCH
    const patchUrl = `${CALENDAR_API_BASE}/calendars/primary/events/${targetEventId}`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (patchRes.status === 404) {
      // Event was deleted in Google Calendar, create anew
      targetEventId = null;
    } else if (patchRes.ok) {
      const updatedData = await patchRes.json();
      finalEventId = updatedData.id;
    } else if (patchRes.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google Calendar access token has expired. Please reconnect.');
    } else {
      const errJson = await patchRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to update calendar event (${patchRes.status})`);
    }
  }

  if (!targetEventId) {
    // Create new event via POST
    const createUrl = `${CALENDAR_API_BASE}/calendars/primary/events`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (createRes.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google Calendar access token has expired. Please reconnect.');
    }

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to create calendar event (${createRes.status})`);
    }

    const createdData = await createRes.json();
    finalEventId = createdData.id;
  }

  const updatedHabit: HabitItem = {
    ...habit,
    googleCalendarEventId: finalEventId,
    googleCalendarSynced: true,
    lastSyncedAt: new Date().toISOString(),
  };

  return { habit: updatedHabit, eventId: finalEventId };
}

/**
 * Synchronizes all habits with a scheduled time to Google Calendar.
 */
export async function syncAllHabitsToGoogleCalendar(
  habits: HabitItem[],
  token: string
): Promise<CalendarSyncResult> {
  if (!token) {
    return {
      success: false,
      syncedCount: 0,
      totalScheduled: 0,
      updatedHabits: habits,
      error: 'Google Calendar is not connected. Please connect your Google account first.',
    };
  }

  try {
    // 1. Pre-fetch existing events tagged with Daily Habits
    let existingEvents: any[] = [];
    try {
      existingEvents = await fetchDailyHabitCalendarEvents(token);
    } catch (e) {
      console.warn('Could not list existing calendar events, will proceed with individual sync:', e);
    }

    const scheduledHabits = habits.filter((h) => !!(h.time || h.reminderTime));
    const totalScheduled = scheduledHabits.length;

    if (totalScheduled === 0) {
      return {
        success: true,
        syncedCount: 0,
        totalScheduled: 0,
        updatedHabits: habits,
      };
    }

    const updatedHabitsMap: Record<string, HabitItem> = {};
    let syncedCount = 0;
    const errors: string[] = [];

    // Sync sequentially to avoid rate limiting
    for (const habit of scheduledHabits) {
      try {
        const { habit: syncedHabit } = await syncHabitToGoogleCalendar(habit, token, existingEvents);
        updatedHabitsMap[habit.id] = syncedHabit;
        syncedCount++;
      } catch (err: any) {
        console.error(`Failed to sync habit "${habit.name}":`, err);
        errors.push(`${habit.name}: ${err.message || 'Sync failed'}`);
        updatedHabitsMap[habit.id] = habit;
      }
    }

    const safeHabits = Array.isArray(habits) ? habits : [];
    const mergedHabits = safeHabits.map((h) => updatedHabitsMap[h.id] || h);

    return {
      success: syncedCount > 0 || errors.length === 0,
      syncedCount,
      totalScheduled,
      updatedHabits: mergedHabits,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (err: any) {
    const fallbackHabits = Array.isArray(habits) ? habits : [];
    return {
      success: false,
      syncedCount: 0,
      totalScheduled: fallbackHabits.length,
      updatedHabits: fallbackHabits,
      error: err.message || 'An error occurred while syncing with Google Calendar.',
    };
  }
}

/**
 * Deletes a synchronized habit event from Google Calendar.
 */
export async function deleteHabitFromGoogleCalendar(
  eventId: string,
  token: string
): Promise<boolean> {
  if (!eventId || !token) return false;

  try {
    const url = `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 404 || res.status === 410) {
      // Already deleted
      return true;
    }

    if (!res.ok && res.status !== 204) {
      console.warn(`Failed to delete event ${eventId} from Google Calendar (${res.status})`);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`Error deleting calendar event ${eventId}:`, err);
    return false;
  }
}
