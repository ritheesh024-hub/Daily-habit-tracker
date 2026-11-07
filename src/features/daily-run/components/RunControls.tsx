import React from 'react';
import { Play, Pause, Flag } from 'lucide-react';
import { RunStatus } from '../types';

interface RunControlsProps {
  status: RunStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancelAcquiring?: () => void;
}

export const RunControls: React.FC<RunControlsProps> = ({
  status,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancelAcquiring,
}) => {
  return (
    <div
      id="run-controls"
      aria-label="Running Controls"
      className="w-full pt-2"
    >
      {/* STATE 1: BEFORE RUNNING (Idle) */}
      {status === 'idle' && (
        <button
          id="btn-start-run"
          type="button"
          onClick={onStart}
          className="w-full min-h-[58px] sm:min-h-[64px] px-6 py-4 rounded-2xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold text-base sm:text-lg tracking-wide shadow-lg shadow-orange-600/30 flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
          </div>
          <span>Start Run</span>
        </button>
      )}

      {/* STATE 1.5: ACQUIRING GPS */}
      {status === 'acquiring_gps' && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full min-h-[58px] sm:min-h-[64px] px-6 py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-sm sm:text-base flex items-center justify-center gap-3 shadow-xs">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Acquiring GPS Signal...</span>
          </div>

          {onCancelAcquiring && (
            <button
              id="btn-cancel-acquiring"
              type="button"
              onClick={onCancelAcquiring}
              className="w-full sm:w-auto min-h-[50px] sm:min-h-[64px] px-5 py-3 rounded-2xl glass-card hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm cursor-pointer transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* STATE 2: WHILE RUNNING (Active) */}
      {status === 'running' && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            id="btn-pause-run"
            type="button"
            onClick={onPause}
            className="min-h-[58px] sm:min-h-[64px] px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-bold text-sm sm:text-base tracking-wide shadow-md shadow-amber-500/20 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Pause className="w-4 h-4 fill-white text-white" />
            </div>
            <span>Pause</span>
          </button>

          <button
            id="btn-finish-run-running"
            type="button"
            onClick={onFinish}
            className="min-h-[58px] sm:min-h-[64px] px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm sm:text-base tracking-wide shadow-md flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] cursor-pointer select-none border border-zinc-700/50 dark:border-white/20"
          >
            <div className="w-8 h-8 rounded-full bg-white/15 dark:bg-black/10 flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <span>Finish Run</span>
          </button>
        </div>
      )}

      {/* STATE 3: WHILE PAUSED */}
      {status === 'paused' && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            id="btn-resume-run"
            type="button"
            onClick={onResume}
            className="min-h-[58px] sm:min-h-[64px] px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm sm:text-base tracking-wide shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
            </div>
            <span>Resume</span>
          </button>

          <button
            id="btn-finish-run-paused"
            type="button"
            onClick={onFinish}
            className="min-h-[58px] sm:min-h-[64px] px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 active:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-sm sm:text-base tracking-wide shadow-md flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.98] cursor-pointer select-none border border-zinc-700/50 dark:border-white/20"
          >
            <div className="w-8 h-8 rounded-full bg-white/15 dark:bg-black/10 flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4 text-white dark:text-zinc-900" />
            </div>
            <span>Finish Run</span>
          </button>
        </div>
      )}
    </div>
  );
};
