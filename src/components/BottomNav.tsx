import React from 'react';
import { CheckSquare, PlusCircle, BarChart3, Sparkles, User } from 'lucide-react';

export type MainNavTab = 'task' | 'new_habit' | 'analytics' | 'future' | 'profile';

interface BottomNavProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
}

interface NavItemConfig {
  id: MainNavTab;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'task', label: 'Task', icon: CheckSquare },
  { id: 'new_habit', label: 'New Habit', icon: PlusCircle },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'future', label: 'Future', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav
      id="main-bottom-navigation"
      aria-label="Main Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)] transition-colors pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-xl mx-auto flex items-center justify-around px-2 py-1.5 sm:py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isNewHabit = item.id === 'new_habit';

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 min-w-0 min-h-[48px] py-1 px-1 sm:px-2 flex flex-col items-center justify-center rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-95 group ${
                isActive
                  ? 'text-zinc-900 dark:text-zinc-50 font-semibold bg-zinc-200/60 dark:bg-zinc-800/70 shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-zinc-900 dark:text-white' : 'group-hover:scale-105'
                  } ${isNewHabit && !isActive ? 'text-zinc-700 dark:text-zinc-300' : ''}`}
                />
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100"
                  />
                )}
              </div>
              <span
                className={`text-[11px] sm:text-xs leading-none mt-1 tracking-tight truncate max-w-full ${
                  isActive ? 'font-semibold text-zinc-950 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
