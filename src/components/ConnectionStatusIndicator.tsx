import React from 'react';
import { Check, RefreshCw, WifiOff } from 'lucide-react';
import { ConnectionStatus } from '../types';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  pendingCount: number;
  onSyncNow?: () => void;
  className?: string;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  pendingCount,
  onSyncNow,
  className = '',
}) => {
  if (status === 'offline') {
    return (
      <div
        id="offline-status-indicator"
        role="status"
        aria-live="polite"
        title={
          pendingCount > 0
            ? `${pendingCount} change${pendingCount > 1 ? 's' : ''} saved locally. Offline — will sync when connected.`
            : 'Offline — changes will sync when connected.'
        }
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-amber-500/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 backdrop-blur-xs select-none transition-all duration-200 ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        <WifiOff className="w-3 h-3 stroke-[2.5]" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="ml-0.5 px-1 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div
        id="syncing-status-indicator"
        role="status"
        aria-live="polite"
        title="Synchronizing changes with server..."
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10 backdrop-blur-xs select-none transition-all duration-200 ${className}`}
      >
        <RefreshCw className="w-3 h-3 stroke-[2.5] animate-spin text-zinc-600 dark:text-zinc-400" />
        <span>Syncing...</span>
      </div>
    );
  }

  // Online & Synced
  return (
    <div
      id="synced-status-indicator"
      role="status"
      title="All changes synchronized"
      onClick={onSyncNow}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-xs select-none transition-all duration-200 ${className}`}
    >
      <Check className="w-3 h-3 stroke-[3]" />
      <span>Synced</span>
    </div>
  );
};
