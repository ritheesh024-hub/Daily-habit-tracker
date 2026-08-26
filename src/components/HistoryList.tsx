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
    <section id="seven-day-history-section" className="pt-5 border-t border-zinc-200">
      <div className="flex items-center justify-between mb-3">
        <h2 id="history-title" className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
          Last 7 Days
        </h2>
        <span className="text-xs text-zinc-400 font-mono">
          Click any day to view
        </span>
      </div>

      {history.length === 0 ? (
        <div id="history-empty" className="py-4 text-center text-xs text-zinc-500 border border-dashed border-zinc-200 rounded-lg">
          No completed days yet.
        </div>
      ) : (
        <div id="seven-day-history-list" className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-2xs">
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
                className={`w-full flex items-center justify-between min-h-[44px] px-3.5 sm:px-4 py-2.5 text-left transition-colors cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none ${
                  isSelected
                    ? 'bg-zinc-100 font-medium'
                    : 'hover:bg-zinc-50/80 bg-white'
                }`}
              >
                {/* Left: Weekday + Date + (Today/Viewing badge) */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    id={`history-weekday-${item.date}`}
                    className="text-sm font-mono font-medium text-zinc-900 w-10 shrink-0"
                  >
                    {item.weekday}
                  </span>
                  <span
                    id={`history-date-${item.date}`}
                    className="text-xs text-zinc-500 font-mono truncate hidden xs:inline"
                  >
                    {formatHistoryDate(item.date)}
                  </span>
                  {isToday && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-900 text-white font-mono shrink-0">
                      Today
                    </span>
                  )}
                  {isSelected && !isToday && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-700 font-mono shrink-0">
                      Viewing
                    </span>
                  )}
                </div>

                {/* Right: completed / total count and percentage */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    id={`history-score-${item.date}`}
                    className={`text-sm font-mono ${
                      isFull
                        ? 'text-emerald-700 font-semibold'
                        : item.completedCount > 0
                        ? 'text-zinc-800'
                        : 'text-zinc-400'
                    }`}
                  >
                    {item.completedCount}/{item.totalCount}
                  </span>
                  <span
                    id={`history-percentage-${item.date}`}
                    className={`text-xs font-mono w-10 text-right ${
                      isFull ? 'text-emerald-600 font-medium' : 'text-zinc-400'
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
