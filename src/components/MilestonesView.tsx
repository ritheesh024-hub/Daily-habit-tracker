import React from 'react';
import {
  Check,
  Circle,
  Flame,
  CheckCircle2,
  BookOpen,
  Target,
  Award,
} from 'lucide-react';
import { Milestone } from '../types';

interface MilestonesViewProps {
  milestones: Milestone[];
}

export const MilestonesView: React.FC<MilestonesViewProps> = ({ milestones }) => {
  const unlockedList = milestones.filter((m) => m.isUnlocked);
  const lockedList = milestones.filter((m) => !m.isUnlocked);

  const getMilestoneIcon = (iconName: string, isUnlocked: boolean) => {
    const iconClass = isUnlocked ? 'w-4 h-4 text-emerald-600 dark:text-emerald-400' : 'w-4 h-4 text-zinc-400 dark:text-zinc-500';
    switch (iconName) {
      case 'flame':
        return <Flame className={iconClass} />;
      case 'check':
        return <CheckCircle2 className={iconClass} />;
      case 'book':
        return <BookOpen className={iconClass} />;
      case 'target':
        return <Target className={iconClass} />;
      default:
        return <Award className={iconClass} />;
    }
  };

  return (
    <div id="milestones-panel" className="space-y-4">
      {/* Header Summary */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h3 id="milestones-heading" className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            Milestones
          </h3>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Track key milestones earned through your daily habit consistency.
          </p>
        </div>
        <div
          id="milestones-progress-badge"
          className="inline-flex items-center gap-1 text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
        >
          <span>{unlockedList.length} of {milestones.length} unlocked</span>
        </div>
      </div>

      {/* SECTION 1: UNLOCKED MILESTONES */}
      {unlockedList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              Unlocked ({unlockedList.length})
            </span>
          </div>

          <div id="unlocked-milestones-list" className="space-y-2">
            {unlockedList.map((m) => (
              <div
                key={m.id}
                id={`milestone-unlocked-${m.id}`}
                className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3 flex items-start gap-3 shadow-2xs transition-colors"
              >
                {/* Status Checkmark */}
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>

                {/* Milestone Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getMilestoneIcon(m.icon, true)}
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{m.title}</h4>
                    </div>
                    {m.unlockedAt && (
                      <span className="text-[10px] font-mono font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded shrink-0">
                        {m.unlockedAt.includes('Completed') ? m.unlockedAt : `Completed on ${m.unlockedAt}`}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{m.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: LOCKED / IN PROGRESS MILESTONES */}
      {lockedList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Locked ({lockedList.length})
            </span>
          </div>

          <div id="locked-milestones-list" className="space-y-2">
            {lockedList.map((m) => {
              const progressPercentage = Math.min(
                100,
                Math.max(0, Math.round((m.currentValue / m.targetValue) * 100))
              );

              return (
                <div
                  key={m.id}
                  id={`milestone-locked-${m.id}`}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex items-start gap-3 shadow-2xs"
                >
                  {/* Status Circle */}
                  <div className="w-6 h-6 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5">
                    <Circle className="w-3.5 h-3.5 stroke-[1.5]" />
                  </div>

                  {/* Milestone Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getMilestoneIcon(m.icon, false)}
                        <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{m.title}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                        {m.progressText}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{m.description}</p>

                    {/* Progress Bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                        {progressPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
