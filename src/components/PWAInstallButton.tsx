import React, { useState } from 'react';
import { Download, Check } from 'lucide-react';
import { usePWA } from '../lib/usePWA';

interface PWAInstallButtonProps {
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '' }) => {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [justInstalled, setJustInstalled] = useState(false);

  if (isInstalled) return null;
  if (!isInstallable && !justInstalled) return null;

  const handleClick = async () => {
    const success = await installApp();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    }
  };

  if (justInstalled) {
    return (
      <div
        id="pwa-installed-badge"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 ${className}`}
      >
        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Installed</span>
      </div>
    );
  }

  return (
    <button
      id="pwa-install-btn"
      type="button"
      onClick={handleClick}
      aria-label="Install Daily Habits App"
      title="Install Daily Habits on your device for fast offline access"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer ${className}`}
    >
      <Download className="w-3 h-3 stroke-[2.5]" />
      <span>Install App</span>
    </button>
  );
};
