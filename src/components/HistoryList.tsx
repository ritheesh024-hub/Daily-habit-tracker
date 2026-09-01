import React from 'react';
import { formatHistoryDate } from '../lib/dateUtils';
import { DayHistorySummary } from '../types';

interface HistoryListProps {
  history: DayHistorySummary[];
  currentSelectedDate: string;
  todayDate: string;
  onSelectDate: (date: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  currentSelectedDate,
  todayDate,
  onSelectDate,
}) => {
  return (
    <section id="seven-day-history-section" className="pt-2 transition-colors">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <h2 id="history-title" className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Last 7 Days
        </h2>
        <span className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 font-mono">
          Click any day to view
        </span>
      </div>

      {history.length === 0 ? (
        <div id="history-empty" className="py-5 text-center text-xs text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl glass-card">
          No completed days yet.
        </div>
      ) : (
        <div id="seven-day-history-list" className="divide-y divide-zinc-200/50 dark:divide-white/5 rounded-xl overflow-hidden glass-card shadow-sm">
          {history.map((item) => {
            const isSelected = item.date === currentSelectedDate;
            const isToday = item.date === todayDate;
            const isFull = item.isCompleted;

            return (
              <button
                key={item.date}
                type="button"
                id={`history-row-${item.date}`}
                onClick={() => onSelectDate(item.date)}
                aria-label={`View history for ${item.weekday}, ${formatHistoryDate(item.date)}: ${item.completedCount} of ${item.totalCount} completed`}
                className={`w-full flex items-center justify-between min-h-[44px] sm:min-h-[48px] px-3.5 sm:px-4 py-2.5 sm:py-3 text-left transition-all duration-150 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:outline-none ${
                  isSelected
                    ? 'bg-zinc-200/50 dark:bg-zinc-800/60 font-medium'
                    : 'hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 active:bg-zinc-200/40 dark:active:bg-zinc-800/50'
                }`}
              >
                {/* Left: Weekday + Date + (Today/Viewing badge) */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span
                    id={`history-weekday-${item.date}`}
                    className="text-xs sm:text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 w-9 sm:w-10 shrink-0"
                  >
                    {item.weekday}
                  </span>
                  <span
                    id={`history-date-${item.date}`}
                    className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate hidden xs:inline"
                  >
                    {formatHistoryDate(item.date)}
                  </span>
                  {isToday && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-mono font-medium shrink-0 shadow-2xs">
                      Today
                    </span>
                  )}
                  {isSelected && !isToday && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-mono font-medium shrink-0">
                      Viewing
                    </span>
                  )}
                </div>

                {/* Right: completed / total count and percentage */}
                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                  <span
                    id={`history-score-${item.date}`}
                    className={`text-xs sm:text-sm font-mono ${
                      isFull
                        ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                        : item.completedCount > 0
                        ? 'text-zinc-800 dark:text-zinc-200 font-medium'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {item.completedCount}/{item.totalCount}
                  </span>
                  <span
                    id={`history-percentage-${item.date}`}
                    className={`text-[11px] sm:text-xs font-mono w-9 sm:w-10 text-right ${
                      isFull ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-400 dark:text-zinc-500 font-medium'
                    }`}
                  >
                    {item.percentage}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
