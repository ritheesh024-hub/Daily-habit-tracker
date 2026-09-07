import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from './firebase';
import { HabitItem, CalendarSyncResult } from '../types';
import { getTodayDateString } from './dateUtils';

export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const SCOPES = [CALENDAR_SCOPE];

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// In-memory OAuth access token cache
let cachedAccessToken: string | null = null;

// Concurrency lock to prevent simultaneous duplicate sync operations
let isSyncInProgress = false;

export function getCachedCalendarToken(): string | null {
  return cachedAccessToken;
}

export function setCachedCalendarToken(token: string | null): void {
  cachedAccessToken = token;
}

/**
 * Converts 24-hour time "HH:mm" to human-readable "h:mm AM/PM".
 */
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
 * Formats a Date object as an ISO 8601 string with local timezone offset.
 * Example: 2026-09-07T18:00:00-07:00
 */
export function formatLocalDateTimeWithOffset(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

/**
 * Maps app habit frequency to standard RFC5545 RRULE recurrence rules.
 * Supports Daily, Weekdays, Weekends, and 3x a week.
 */
export function getRRuleForFrequency(frequency?: string): string[] {
  const norm = (frequency || 'Every day').toLowerCase().trim();
  if (norm === 'weekdays') {
    return ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'];
  }
  if (norm === 'weekends') {
    return ['RRULE:FREQ=WEEKLY;BYDAY=SA,SU'];
  }
  if (norm.includes('3x') || norm === '3x a week') {
    return ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'];
  }
  // Default is daily
  return ['RRULE:FREQ=DAILY'];
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
    // Search by both q and max results to locate existing Daily Habits events
    const url = `${CALENDAR_API_BASE}/calendars/primary/events?q=Daily+Habit&maxResults=250&singleEvents=false`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google Calendar authorization expired. Please reconnect Google Calendar.');
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Google Calendar API error (${res.status})`);
    }

    const data = await res.json();
    const items: any[] = data.items || [];
    
    // Filter to events genuinely created by Daily Habits
    return items.filter((ev) => {
      const isDailyHabitsApp = ev.extendedProperties?.private?.app === 'daily-habits';
      const isDailyHabitTitle = typeof ev.summary === 'string' && ev.summary.toLowerCase().startsWith('daily habit');
      return isDailyHabitsApp || isDailyHabitTitle;
    });
  } catch (err: any) {
    console.warn('Error querying Google Calendar events:', err);
    throw err;
  }
}

/**
 * Checks if a specific Google Calendar event exists and returns it, or null if deleted/not found.
 */
export async function getGoogleCalendarEvent(eventId: string, token: string): Promise<any | null> {
  if (!eventId || !token) return null;
  try {
    const url = `${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 404 || res.status === 410) {
      return null;
    }
    if (res.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google Calendar authorization expired. Please reconnect.');
    }
    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch (err) {
    console.warn(`Could not verify event ${eventId}:`, err);
    return null;
  }
}

/**
 * Synchronizes a single habit with Google Calendar:
 * - If habit has no scheduled time: removes any existing calendar event for this habit.
 * - If habit has a scheduled time: creates or updates ONE recurring event with exact metadata.
 * - Strict duplicate prevention: checks stored googleCalendarEventId first, then queries by private habitId tag.
 */
export async function syncHabitToGoogleCalendar(
  habit: HabitItem,
  token: string,
  existingEvents?: any[]
): Promise<{ habit: HabitItem; eventId: string }> {
  const scheduledTime = (typeof habit.time === 'string' && habit.time.trim()) || (typeof habit.reminderTime === 'string' && habit.reminderTime.trim());

  // 1. Unscheduled habit handling: If no time, remove existing event if one was linked
  if (!scheduledTime) {
    if (habit.googleCalendarEventId) {
      try {
        await deleteHabitFromGoogleCalendar(habit.googleCalendarEventId, token);
      } catch (err) {
        console.warn('Notice removing unscheduled habit event:', err);
      }
    }
    return {
      habit: {
        ...habit,
        googleCalendarEventId: undefined,
        googleCalendarSynced: false,
        lastSyncedAt: new Date().toISOString(),
      },
      eventId: '',
    };
  }

  // 2. Parse scheduled time and compute local start & end ISO strings
  const [hoursStr, minutesStr] = scheduledTime.split(':');
  const hours = parseInt(hoursStr || '8', 10);
  const minutes = parseInt(minutesStr || '0', 10);

  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // Construct start date for today in user's local timezone
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  // Duration: 30 minutes
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const startIso = formatLocalDateTimeWithOffset(startDate);
  const endIso = formatLocalDateTimeWithOffset(endDate);

  // Recurrence rule based on frequency
  const recurrence = getRRuleForFrequency(habit.frequency);

  // Exact event title format required: "Daily Habit: <Name>"
  const summary = `Daily Habit: ${habit.name}`;

  const eventPayload = {
    summary,
    description: `Daily habit scheduled via Daily Habits.\nHabit: ${habit.name}\nTarget: ${habit.target || 'Daily Consistency'}\nFrequency: ${habit.frequency || 'Every day'}\nScheduled Time: ${formatTime12Hour(scheduledTime)}`,
    start: {
      dateTime: startIso,
      timeZone: userTimeZone,
    },
    end: {
      dateTime: endIso,
      timeZone: userTimeZone,
    },
    recurrence,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
      ],
    },
    extendedProperties: {
      private: {
        app: 'daily-habits',
        source: 'Daily Habits',
        habitId: habit.id,
      },
    },
  };

  // 3. Strict Duplicate Prevention & Identification
  let targetEventId: string | null = habit.googleCalendarEventId || null;

  // If no eventId stored on habit, check existing events passed or search for matched event
  if (!targetEventId) {
    if (existingEvents && existingEvents.length > 0) {
      const matched = existingEvents.find(
        (ev) =>
          ev.extendedProperties?.private?.habitId === habit.id ||
          (ev.summary && ev.summary.trim().toLowerCase() === summary.toLowerCase())
      );
      if (matched && matched.id) {
        targetEventId = matched.id;
      }
    }
  }

  let finalEventId = '';

  // Try updating the existing event if we have an ID
  if (targetEventId) {
    const patchUrl = `${CALENDAR_API_BASE}/calendars/primary/events/${targetEventId}`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (patchRes.ok) {
      const updatedData = await patchRes.json();
      finalEventId = updatedData.id;
    } else if (patchRes.status === 404 || patchRes.status === 410) {
      // Event no longer exists in Google Calendar (user deleted manually in Google Calendar)
      // We will create a replacement event below
      targetEventId = null;
    } else if (patchRes.status === 401) {
      cachedAccessToken = null;
      throw new Error('Google Calendar access token has expired. Please reconnect.');
    } else {
      const errJson = await patchRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Failed to update calendar event (${patchRes.status})`);
    }
  }

  // If no valid existing event was found or updated, create a single new event
  if (!targetEventId) {
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
 * Duplicate-free, non-blocking, with error resilience.
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

  if (isSyncInProgress) {
    console.warn('Sync already in progress, skipping overlapping call.');
    return {
      success: true,
      syncedCount: 0,
      totalScheduled: habits.filter((h) => !!(h.time || h.reminderTime)).length,
      updatedHabits: habits,
    };
  }

  isSyncInProgress = true;

  try {
    // 1. Fetch existing Daily Habits events to prevent creating duplicates if habit lacked eventId
    let existingEvents: any[] = [];
    try {
      existingEvents = await fetchDailyHabitCalendarEvents(token);
    } catch (e: any) {
      if (e?.message?.includes('expired') || e?.message?.includes('authorization')) {
        throw e;
      }
      console.warn('Could not list existing calendar events; proceeding with individual checks:', e);
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

    // Sync sequentially to adhere to Google Calendar rate limits
    for (const habit of scheduledHabits) {
      try {
        const { habit: syncedHabit } = await syncHabitToGoogleCalendar(habit, token, existingEvents);
        updatedHabitsMap[habit.id] = syncedHabit;
        syncedCount++;
      } catch (err: any) {
        console.error(`Failed to sync habit "${habit.name}":`, err);
        errors.push(`${habit.name}: ${err.message || 'Sync failed'}`);
        // Keep habit with synced=false
        updatedHabitsMap[habit.id] = {
          ...habit,
          googleCalendarSynced: false,
        };
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
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Deletes a synchronized habit event from Google Calendar.
 * Safe against 404/410 (already deleted).
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
      // Event was already deleted
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

/**
 * Deletes ONLY calendar events created by Daily Habits when the user disconnects
 * and selects the option to remove events. Never deletes unrelated user events.
 */
export async function deleteAllDailyHabitCalendarEvents(
  token: string,
  habits?: HabitItem[]
): Promise<{ deletedCount: number }> {
  if (!token) return { deletedCount: 0 };

  const eventIdsToDelete = new Set<string>();

  // 1. Gather all event IDs stored on current habits
  if (habits && habits.length > 0) {
    for (const h of habits) {
      if (h.googleCalendarEventId) {
        eventIdsToDelete.add(h.googleCalendarEventId);
      }
    }
  }

  // 2. Query calendar specifically for Daily Habits events
  try {
    const events = await fetchDailyHabitCalendarEvents(token);
    for (const ev of events) {
      if (
        ev.id &&
        (ev.extendedProperties?.private?.app === 'daily-habits' ||
          (typeof ev.summary === 'string' && ev.summary.toLowerCase().startsWith('daily habit')))
      ) {
        eventIdsToDelete.add(ev.id);
      }
    }
  } catch (e) {
    console.warn('Notice querying events for bulk disconnect cleanup:', e);
  }

  let deletedCount = 0;
  for (const eventId of eventIdsToDelete) {
    try {
      const ok = await deleteHabitFromGoogleCalendar(eventId, token);
      if (ok) deletedCount++;
    } catch (err) {
      console.warn(`Could not delete event ${eventId} during disconnect:`, err);
    }
  }

  return { deletedCount };
}
