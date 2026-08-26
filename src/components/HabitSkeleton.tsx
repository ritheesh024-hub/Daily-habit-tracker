import React from 'react';

interface HabitSkeletonProps {
  count?: number;
}

const SKELETON_ITEMS = [
  { textWidth: 'w-28', targetWidth: 'w-16' },
  { textWidth: 'w-20', targetWidth: 'w-20' },
  { textWidth: 'w-16', targetWidth: 'w-14' },
  { textWidth: 'w-24', targetWidth: undefined },
  { textWidth: 'w-20', targetWidth: undefined },
  { textWidth: 'w-20', targetWidth: undefined },
  { textWidth: 'w-24', targetWidth: 'w-16' },
  { textWidth: 'w-16', targetWidth: 'w-20' },
];

export const HabitSkeleton: React.FC<HabitSkeletonProps> = ({ count = 8 }) => {
  const items = SKELETON_ITEMS.slice(0, count);

  return (
    <div
      id="habit-list-skeleton"
      role="status"
      aria-label="Loading habit checklist"
      className="space-y-2 animate-pulse"
    >
      {items.map((item, index) => (
        <div
          key={index}
          id={`habit-skeleton-row-${index}`}
          className="flex items-center justify-between min-h-[48px] py-2.5 px-3.5 sm:px-4 rounded-lg border border-zinc-200/80 bg-white shadow-2xs select-none"
        >
          {/* Left: Checkbox + Number + Icon + Title Placeholder */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Checkbox placeholder */}
            <div className="w-5 h-5 rounded border border-zinc-200 bg-zinc-100 shrink-0" />

            {/* Index, Icon & Text placeholder */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-3.5 h-3.5 rounded bg-zinc-100 shrink-0" />
              <div className="w-3.5 h-3.5 rounded-full bg-zinc-100 shrink-0" />
              <div className={`h-3.5 rounded bg-zinc-200/80 ${item.textWidth}`} />
            </div>
          </div>

          {/* Right: Target Tag placeholder */}
          {item.targetWidth && (
            <div className="shrink-0 ml-2">
              <div className={`h-5 rounded bg-zinc-100 border border-zinc-200/60 ${item.targetWidth}`} />
            </div>
          )}
        </div>
      ))}
      <span className="sr-only">Loading habits...</span>
    </div>
  );
};
