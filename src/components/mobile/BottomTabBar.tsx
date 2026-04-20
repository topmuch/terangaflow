'use client';

import { motion } from 'framer-motion';
import { Home, Bell, Store, User } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'services', label: 'Services', icon: Store },
  { id: 'profile', label: 'Profil', icon: User },
];

interface BottomTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-strong border-t border-white/10"
      role="tablist"
      aria-label="Navigation principale"
    >
      <div className="flex items-stretch justify-around">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] py-2 transition-colors duration-200 ${
                isActive ? 'text-cyan-400' : 'text-slate-500 active:text-slate-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-tight">
                {tab.label}
              </span>
              {/* Animated active dot indicator */}
              {isActive && (
                <motion.span
                  layoutId="bottom-tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
