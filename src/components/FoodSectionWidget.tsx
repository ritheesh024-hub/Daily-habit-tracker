import React from 'react';
import { Sparkles, Utensils, ChevronRight, Camera } from 'lucide-react';
import { FoodLog } from '../types';
import { formatHeaderDate } from '../lib/dateUtils';

interface FoodSectionWidgetProps {
  selectedDate: string;
  isToday: boolean;
  foodLogs: FoodLog[];
  onOpenScanFood: () => void;
}

export const FoodSectionWidget: React.FC<FoodSectionWidgetProps> = ({
  selectedDate,
  isToday,
  foodLogs,
  onOpenScanFood,
}) => {
  const logsForDate = foodLogs.filter((log) => log.date === selectedDate);
  const totalCalories = logsForDate.reduce((sum, log) => sum + (log.total?.calories || 0), 0);

  return (
    <section
      id="food-scan-widget-section"
      className="p-3 sm:p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-sm shrink-0">
            🍽️
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                Scan Food with AI
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                OpenAI
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {logsForDate.length > 0
                ? `${logsForDate.length} meal${logsForDate.length === 1 ? '' : 's'} logged • ~${totalCalories} kcal`
                : 'Take or upload a photo to estimate nutrition'}
            </p>
          </div>
        </div>

        <button
          id="open-scan-food-btn"
          type="button"
          onClick={onOpenScanFood}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold shadow-2xs transition-colors shrink-0 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{logsForDate.length > 0 ? 'Log Food' : 'Scan Food'}</span>
        </button>
      </div>
    </section>
  );
};
