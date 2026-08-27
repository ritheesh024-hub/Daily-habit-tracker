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
    <section id="seven-day-history-section" className="pt-3.5 sm:pt-4 border-t border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h2 id="history-title" className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
          Last 7 Days
        </h2>
        <span className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-500 font-mono">
          Click any day to view
        </span>
      </div>

      {history.length === 0 ? (
        <div id="history-empty" className="py-4 text-center text-xs text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
          No completed days yet.
        </div>
      ) : (
        <div id="seven-day-history-list" className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
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
                className={`w-full flex items-center justify-between min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 text-left transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:outline-none ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800 font-medium'
                    : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 bg-white dark:bg-zinc-900'
                }`}
              >
                {/* Left: Weekday + Date + (Today/Viewing badge) */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span
                    id={`history-weekday-${item.date}`}
                    className="text-xs sm:text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100 w-9 sm:w-10 shrink-0"
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
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-mono shrink-0">
                      Today
                    </span>
                  )}
                  {isSelected && !isToday && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-mono shrink-0">
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
                        ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                        : item.completedCount > 0
                        ? 'text-zinc-800 dark:text-zinc-200'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {item.completedCount}/{item.totalCount}
                  </span>
                  <span
                    id={`history-percentage-${item.date}`}
                    className={`text-[11px] sm:text-xs font-mono w-9 sm:w-10 text-right ${
                      isFull ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-400 dark:text-zinc-500'
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
