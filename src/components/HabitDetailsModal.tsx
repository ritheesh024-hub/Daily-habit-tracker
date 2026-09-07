import React, { useState, useMemo } from 'react';
import {
  X,
  Edit3,
  Archive,
  ArchiveRestore,
  Trash2,
  Flame,
  Trophy,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Target,
} from 'lucide-react';
import { HabitItem, HABIT_CATEGORIES, HABIT_ACCENTS, DailyLogData } from '../types';
import { HabitIcon } from './HabitIcon';
import { calculateHabitSpecificStats } from '../lib/habitService';
import { formatTime12Hour } from '../lib/googleCalendarService';

interface HabitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitItem | null;
  rawLogsMap: Record<string, DailyLogData>;
  todayDate: string;
  onEdit: (habit: HabitItem) => void;
  onArchiveToggle: (habit: HabitItem) => void;
  onDelete: (habitId: string) => void;
  onSetGoal?: (habit: HabitItem) => void;
}

export const HabitDetailsModal: React.FC<HabitDetailsModalProps> = ({
  isOpen,
  onClose,
  habit,
  rawLogsMap,
  todayDate,
  onEdit,
  onArchiveToggle,
  onDelete,
  onSetGoal,
}) => {
  const [graphPeriod, setGraphPeriod] = useState<'7days' | '30days'>('7days');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Derive stats dynamically from actual user daily logs
  const stats = useMemo(() => {
    if (!habit) return null;
    return calculateHabitSpecificStats(habit, rawLogsMap, todayDate);
  }, [habit, rawLogsMap, todayDate]);

  if (!isOpen || !habit) return null;

  // Find accent color definition
  const accentDef = HABIT_ACCENTS.find(
    (a) => a.id === habit.accent || a.id === habit.color
  ) || HABIT_ACCENTS[0];

  // Category info
  const categoryDef = HABIT_CATEGORIES.find(
    (c) => c.id === habit.category?.toLowerCase() || c.label.toLowerCase() === habit.category?.toLowerCase()
  );

  // Priority indicator
  const priorityColor =
    habit.priority === 'high'
      ? 'bg-rose-500 text-rose-700 dark:text-rose-300 border-rose-500/30'
      : habit.priority === 'medium'
      ? 'bg-amber-500 text-amber-700 dark:text-amber-300 border-amber-500/30'
      : habit.priority === 'low'
      ? 'bg-zinc-400 text-zinc-700 dark:text-zinc-300 border-zinc-400/30'
      : null;

  const priorityLabel =
    habit.priority === 'high'
      ? 'High Priority'
      : habit.priority === 'medium'
      ? 'Medium Priority'
      : habit.priority === 'low'
      ? 'Low Priority'
      : null;

  // Chart data: smooth SVG curve generator
  const trendData = graphPeriod === '7days' ? stats?.weeklyTrend || [] : stats?.monthlyTrend || [];

  // Generate SVG path points for smooth line graph (no bar charts)
  const svgWidth = 460;
  const svgHeight = 160;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 30;

  const points = trendData.map((d, i) => {
    const x =
      paddingX +
      (trendData.length > 1
        ? (i / (trendData.length - 1)) * (svgWidth - paddingX * 2)
        : (svgWidth - paddingX * 2) / 2);
    const yVal = typeof d.rate === 'number' ? Math.max(0, Math.min(100, d.rate)) : 0;
    const y = svgHeight - paddingBottom - (yVal / 100) * (svgHeight - paddingTop - paddingBottom);
    return { x, y, rate: yVal, label: d.dayLabel };
  });

  // Calculate cubic bezier SVG path string
  let pathD = '';
  let areaD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    const baseY = svgHeight - paddingBottom;
    areaD = `${pathD} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`;
  }

  return (
    <div
      id="habit-details-backdrop"
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="habit-details-card"
        className="w-full max-w-lg glass-modal rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-zinc-200/70 dark:border-white/10">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${accentDef.tintBg} ${accentDef.tintBorder} ${accentDef.tintText}`}
            >
              <HabitIcon name={habit.icon} className="w-6 h-6" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="habit-details-title"
                  className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate"
                >
                  {habit.name}
                </h2>
                {habit.archived && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Archived
                  </span>
                )}
              </div>

              {/* Category and priority badges */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {categoryDef && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-white/10">
                    <span>{categoryDef.emoji}</span>
                    <span>{categoryDef.label}</span>
                  </span>
                )}

                {priorityLabel && priorityColor && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-200/50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border border-zinc-300/60 dark:border-white/10">
                    <span className={`w-2 h-2 rounded-full ${priorityColor}`} />
                    <span>{priorityLabel}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            id="habit-details-close-btn"
            type="button"
            onClick={onClose}
            className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Delete Confirmation View */}
          {showDeleteConfirm ? (
            <div id="delete-confirm-box" className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
              <div className="flex items-start gap-3 text-red-900 dark:text-red-200">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-red-950 dark:text-red-100">Delete this habit?</p>
                  <p className="text-red-800/90 dark:text-red-300">
                    This will remove the habit and its associated active data. If connected to Google Calendar, its calendar event will be deleted.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-200/60 dark:bg-zinc-800/80 hover:bg-zinc-300/60 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(habit.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : null}

          {/* Description (if present) */}
          {habit.description && (
            <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-400 italic">
              "{habit.description}"
            </div>
          )}

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Flame className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Current</span>
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {stats?.currentStreak ?? 0}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">days</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Trophy className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Best</span>
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {stats?.bestStreak ?? 0}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">days</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Rate (30d)</span>
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {stats?.completionRate ?? 0}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
              </div>
              <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {stats?.totalCompletions ?? 0}
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">done</span>
              </div>
            </div>
          </div>

          {/* Habit-Specific Smooth Line Graph Section (No Bar Charts) */}
          <div className="p-4 rounded-2xl glass-card border border-zinc-200/80 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Consistency Trend</span>
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Real completion velocity over time
                </p>
              </div>

              {/* Period toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-300/60 dark:border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setGraphPeriod('7days')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    graphPeriod === '7days'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setGraphPeriod('30days')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    graphPeriod === '30days'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>

            {/* Smooth SVG Line Chart */}
            <div className="relative w-full overflow-hidden pt-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-36 overflow-visible"
              >
                <defs>
                  <linearGradient id={`grad-${habit.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accentDef.hex} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={accentDef.hex} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal grid lines */}
                <line
                  x1={paddingX}
                  y1={paddingTop}
                  x2={svgWidth - paddingX}
                  y2={paddingTop}
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800/80"
                  strokeDasharray="3 3"
                />
                <line
                  x1={paddingX}
                  y1={(paddingTop + svgHeight - paddingBottom) / 2}
                  x2={svgWidth - paddingX}
                  y2={(paddingTop + svgHeight - paddingBottom) / 2}
                  stroke="currentColor"
                  className="text-zinc-200 dark:text-zinc-800/80"
                  strokeDasharray="3 3"
                />
                <line
                  x1={paddingX}
                  y1={svgHeight - paddingBottom}
                  x2={svgWidth - paddingX}
                  y2={svgHeight - paddingBottom}
                  stroke="currentColor"
                  className="text-zinc-300 dark:text-zinc-700"
                />

                {/* Area under curve */}
                {areaD && (
                  <path d={areaD} fill={`url(#grad-${habit.id})`} />
                )}

                {/* Main smooth curve */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={accentDef.hex}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data point dots */}
                {points.map((p, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill={accentDef.hex}
                      className="transition-transform group-hover:scale-150"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="7"
                      fill={accentDef.hex}
                      fillOpacity="0.2"
                    />
                    {/* X-axis label */}
                    <text
                      x={p.x}
                      y={svgHeight - 10}
                      textAnchor="middle"
                      className="text-[10px] fill-zinc-400 dark:fill-zinc-500 font-mono"
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Schedule & Routine Specifications */}
          <div className="p-4 rounded-2xl glass-card space-y-3 text-xs">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Routine Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Target / Goal */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50">
                <Sparkles className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">
                    Goal / Target
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {habit.target || habit.goal || 'Daily completion'}
                  </span>
                </div>
              </div>

              {/* Schedule Frequency */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50">
                <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">
                    Schedule
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {habit.frequency || 'Every day'}
                    {habit.scheduleDays && habit.scheduleDays.length > 0 && (
                      <span className="font-normal text-zinc-500 ml-1">
                        ({habit.scheduleDays.join(', ')})
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Scheduled Time */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50">
                <Clock className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">
                    Scheduled Time
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                    {habit.time ? formatTime12Hour(habit.time) : 'Any time today'}
                  </span>
                </div>
              </div>

              {/* Google Calendar status */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50">
                <CheckCircle2 className="w-4 h-4 text-zinc-500 shrink-0" />
                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-medium">
                    Google Calendar
                  </span>
                  <span
                    className={`font-semibold ${
                      habit.googleCalendarSynced
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {habit.googleCalendarSynced ? 'Synced & Recurring' : 'Not synced'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-200/70 dark:border-white/10 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Archive / Unarchive Action */}
            <button
              id="habit-archive-btn"
              type="button"
              onClick={() => onArchiveToggle(habit)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300/70 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              {habit.archived ? (
                <>
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive</span>
                </>
              )}
            </button>

            {/* Delete Trigger */}
            <button
              id="habit-delete-trigger-btn"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onSetGoal && (
              <button
                id="habit-details-set-goal-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onSetGoal(habit);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Set Goal</span>
              </button>
            )}

            <button
              id="habit-details-edit-btn"
              type="button"
              onClick={() => {
                onClose();
                onEdit(habit);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-xs font-semibold hover:bg-black dark:hover:bg-white transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Habit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
