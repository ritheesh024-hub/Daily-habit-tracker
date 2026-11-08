import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Footprints,
  Clock,
  Navigation,
  Gauge,
  ArrowRight,
} from 'lucide-react';
import { LocalRunRecord, FirestoreRunDocument } from '../types';
import { getLocalDateString } from '../utils/runAnalytics';
import {
  formatRunDistance,
  formatRunDuration,
  formatRunPace,
} from '../utils/formatters';

interface RunCalendarProps {
  runs: (FirestoreRunDocument | LocalRunRecord)[];
  onSelectRun: (run: FirestoreRunDocument | LocalRunRecord) => void;
}

export const RunCalendar: React.FC<RunCalendarProps> = ({ runs, onSelectRun }) => {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString(new Date()));

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthName = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Group completed runs by local YYYY-MM-DD
  const runsByDate = React.useMemo(() => {
    const map = new Map<string, (FirestoreRunDocument | LocalRunRecord)[]>();
    for (const r of runs) {
      if (r && r.status === 'completed') {
        const dStr = getLocalDateString(r.startedAt || r.createdAt);
        if (dStr) {
          const list = map.get(dStr) || [];
          list.push(r);
          map.set(dStr, list);
        }
      }
    }
    return map;
  }, [runs]);

  // Compute calendar grid cells
  const calendarDays = React.useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = firstDayOfMonth.getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dNum);
      days.push({
        dateStr: getLocalDateString(prevDate),
        dayNumber: dNum,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      days.push({
        dateStr: getLocalDateString(currDate),
        dayNumber: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(year, month + 1, n);
      days.push({
        dateStr: getLocalDateString(nextDate),
        dayNumber: n,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getLocalDateString(now));
  };

  const todayStr = getLocalDateString(new Date());
  const selectedRuns = runsByDate.get(selectedDate) || [];

  return (
    <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-zinc-200/80 dark:border-white/10 space-y-4">
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
              {monthName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-2.5 py-1 rounded-lg glass-surface hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
            className="w-7 h-7 rounded-lg glass-surface flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next Month"
            className="w-7 h-7 rounded-lg glass-surface flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels (Sun to Sat) */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
          <div
            key={wd}
            className="text-[10px] uppercase font-semibold text-zinc-400 dark:text-zinc-500 py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((cell) => {
          const dayRuns = runsByDate.get(cell.dateStr) || [];
          const hasRuns = dayRuns.length > 0;
          const isSelected = selectedDate === cell.dateStr;
          const isToday = todayStr === cell.dateStr;

          const totalDayKm = hasRuns
            ? dayRuns.reduce((sum, r) => sum + (r.distanceMeters || 0) / 1000, 0)
            : 0;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => setSelectedDate(cell.dateStr)}
              className={`min-h-[46px] sm:min-h-[54px] p-1 rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer text-left relative ${
                isSelected
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-2 ring-orange-400/50'
                  : hasRuns
                  ? 'bg-orange-500/10 text-orange-950 dark:text-orange-200 border border-orange-500/30 hover:border-orange-500'
                  : cell.isCurrentMonth
                  ? 'glass-surface text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/40 dark:hover:bg-zinc-800/60'
                  : 'opacity-35 text-zinc-400 hover:opacity-60'
              }`}
            >
              <div className="w-full flex items-center justify-between text-[11px] font-mono leading-none">
                <span className={`font-semibold ${isToday && !isSelected ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}`}>
                  {cell.dayNumber}
                </span>
                {isToday && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-orange-500'
                    }`}
                  />
                )}
              </div>

              {hasRuns && (
                <div className="w-full mt-1 flex flex-col items-center">
                  <span
                    className={`text-[9px] font-mono font-bold leading-tight ${
                      isSelected ? 'text-white' : 'text-orange-600 dark:text-orange-400'
                    }`}
                  >
                    {totalDayKm.toFixed(1)}k
                  </span>
                  {dayRuns.length > 1 && (
                    <span
                      className={`text-[8px] font-medium leading-none ${
                        isSelected ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {dayRuns.length} runs
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Run Details Drawer */}
      <div className="pt-2 border-t border-zinc-200/60 dark:border-white/5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-orange-500" />
            Runs on{' '}
            <span className="font-mono text-zinc-900 dark:text-zinc-100">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            {selectedRuns.length} run{selectedRuns.length === 1 ? '' : 's'}
          </span>
        </div>

        {selectedRuns.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic py-2 text-center">
            No completed runs recorded on this date.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedRuns.map((r) => {
              const km = (r.distanceMeters || 0) / 1000;
              const pace = r.averagePaceSecondsPerKm ? r.averagePaceSecondsPerKm / 60 : null;

              return (
                <div
                  key={r.runId}
                  onClick={() => onSelectRun(r)}
                  className="glass-card rounded-xl p-3 hover:border-orange-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group border-zinc-200/70 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {r.title || 'Daily Run'}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-orange-500" />
                        {formatRunDistance(km)} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRunDuration(r.durationSeconds)}
                      </span>
                      {pace && (
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3 h-3" />
                          {formatRunPace(pace)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400 group-hover:text-orange-500 transition-colors shrink-0">
                    <span className="text-[11px] font-medium hidden sm:inline">Details</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
