/**
 * Canonical date formatting helper for local calendar date keys (YYYY-MM-DD).
 * Ensures zero UTC offset shifting and strict local calendar date alignment.
 */
export function getLocalDateKey(input?: Date | string | number): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const dateObj = input instanceof Date
    ? input
    : typeof input === 'number'
    ? new Date(input)
    : typeof input === 'string' && input.includes('T')
    ? new Date(input)
    : new Date();

  if (isNaN(dateObj.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const d = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return getLocalDateKey();
}

export function getPreviousDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() - 1);
  return getLocalDateKey(date);
}

export function formatHeaderDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatWeekday(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } catch {
    return dateString;
  }
}

export function formatHistoryDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayNum = date.getDate();
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    return `${dayNum} ${monthName}`;
  } catch {
    return dateString;
  }
}

export function getLast7Days(todayDateString?: string): string[] {
  return getLastNDays(7, todayDateString);
}

export function getLastNDays(count: number, todayDateString?: string): string[] {
  const baseDate = todayDateString ? getLocalDateKey(todayDateString) : getLocalDateKey();
  const [year, month, day] = baseDate.split('-').map(Number);
  const dates: string[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - i);
    dates.push(getLocalDateKey(d));
  }
  return dates;
}

export function getPreviousDates(count: number = 7, fromDate?: string): string[] {
  const dates: string[] = [];
  const baseStr = fromDate ? getLocalDateKey(fromDate) : getLocalDateKey();
  const [year, month, day] = baseStr.split('-').map(Number);

  for (let i = 1; i <= count; i++) {
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - i);
    dates.push(getLocalDateKey(d));
  }
  return dates;
}

export interface MonthCalendarDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export function getMonthCalendarDays(year: number, monthIndex: number, todayStr: string): MonthCalendarDay[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...

  const days: MonthCalendarDay[] = [];
  const currentTodayKey = getLocalDateKey(todayStr);

  // Padding days from previous month
  const prevMonthDaysCount = new Date(year, monthIndex, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthDaysCount - i;
    const prevDate = new Date(year, monthIndex - 1, dayNum);
    const dateStr = getLocalDateKey(prevDate);
    days.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === currentTodayKey,
      isFuture: dateStr > currentTodayKey,
    });
  }

  // Days of current month
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const currDate = new Date(year, monthIndex, dayNum);
    const dateStr = getLocalDateKey(currDate);
    days.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateStr === currentTodayKey,
      isFuture: dateStr > currentTodayKey,
    });
  }

  // Padding days to fill out the 6-row (or 5-row) grid so total is a multiple of 7
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let dayNum = 1; dayNum <= remainingDays; dayNum++) {
      const nextDate = new Date(year, monthIndex + 1, dayNum);
      const dateStr = getLocalDateKey(nextDate);
      days.push({
        date: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: dateStr === currentTodayKey,
        isFuture: dateStr > currentTodayKey,
      });
    }
  }

  return days;
}

export function formatMonthYear(year: number, monthIndex: number): string {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
