'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bus,
  Route,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Store,
  Bell,
  BookOpen,
  Palette,
  ShieldCheck,
  ChevronLeft,
  Monitor,
  Megaphone,
  MapPin,
  X,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard, roles: ['SUPERADMIN', 'STATION_MANAGER', 'TRANSPORTER'], section: 'Gestion' },
  { id: 'lines', label: 'Lignes', icon: Route, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  { id: 'platforms', label: 'Quais', icon: MapPin, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  { id: 'schedules', label: 'Horaires', icon: Bus, roles: ['STATION_MANAGER', 'TRANSPORTER'], section: 'Gestion' },
  { id: 'ticker', label: 'Messages', icon: Megaphone, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  { id: 'partners', label: 'Partenaires', icon: Store, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  { id: 'settings', label: 'Paramètres', icon: Settings, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  { id: 'monetization', label: 'Monétisation', icon: BarChart3, roles: ['SUPERADMIN'], section: 'Business' },
  { id: 'push', label: 'Push Alerts', icon: Bell, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Business' },
  { id: 'billing', label: 'Abonnements', icon: Store, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Business' },
  { id: 'api-docs', label: 'Documentation API', icon: BookOpen, roles: ['SUPERADMIN'], section: 'Outils' },
  { id: 'whitelist', label: 'White Label', icon: Palette, roles: ['SUPERADMIN'], section: 'Outils' },
  { id: 'privacy', label: 'RGPD', icon: ShieldCheck, roles: ['SUPERADMIN'], section: 'Outils' },
];

const roleColors: Record<string, string> = {
  SUPERADMIN: 'text-red-400',
  STATION_MANAGER: 'text-emerald-400',
  TRANSPORTER: 'text-sky-400',
  MERCHANT: 'text-amber-400',
  TRAVELER: 'text-zinc-400',
};

const roleLabels: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  STATION_MANAGER: 'Gestionnaire Gare',
  TRANSPORTER: 'Transporteur',
  MERCHANT: 'Commerçant',
  TRAVELER: 'Voyageur',
};

const roleBadgeBg: Record<string, string> = {
  SUPERADMIN: 'bg-red-500/10',
  STATION_MANAGER: 'bg-emerald-500/10',
  TRANSPORTER: 'bg-sky-500/10',
  MERCHANT: 'bg-amber-500/10',
  TRAVELER: 'bg-zinc-500/10',
};

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user: {
    role: string;
    name: string;
    email: string;
    tenant: { name: string } | null;
  };
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  onBack: () => void;
}

export function MobileDrawer({
  open,
  onClose,
  user,
  activeTab,
  onTabChange,
  onLogout,
  onBack,
}: MobileDrawerProps) {
  const [scrolled, setScrolled] = useState(false);

  const role = user.role;
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const sections = filteredItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const section = item.section || 'Autre';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Dark backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel sliding from right */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                  <Shield className={`w-5 h-5 ${roleColors[role] || 'text-slate-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${roleColors[role] || 'text-slate-400'} ${roleBadgeBg[role] || 'bg-slate-500/10'}`}
                  >
                    {roleLabels[role] || role}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Brand */}
            <div className="px-4 py-3 border-b border-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-cyan-400 tracking-tight">TerangaFlow</h2>
                  <p className="text-[10px] text-slate-500">Admin Dashboard</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav
              className="flex-1 overflow-y-auto display-scroll"
              onScroll={() => setScrolled(true)}
            >
              {Object.entries(sections).map(([section, items]) => (
                <div key={section} className="mb-2">
                  <p className="px-4 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    {section}
                  </p>
                  {items.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onTabChange(item.id);
                          onClose();
                        }}
                        className={`w-full flex items-center gap-3 transition-all duration-150 px-4 py-3 min-h-[44px]
                          ${
                            isActive
                              ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
                          }`}
                      >
                        <Icon
                          className={`w-5 h-5 shrink-0 ${
                            isActive ? 'text-cyan-400' : 'text-slate-500'
                          }`}
                        />
                        <span
                          className={`text-sm font-medium truncate ${
                            isActive ? 'text-cyan-300' : ''
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-3 border-t border-slate-800 space-y-1">
              <button
                onClick={() => {
                  onBack();
                  onClose();
                }}
                className="w-full flex items-center gap-3 text-slate-500 hover:bg-slate-800 hover:text-white rounded-lg transition-colors px-4 py-3 min-h-[44px]"
              >
                <ChevronLeft className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Retour</span>
              </button>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors px-4 py-3 min-h-[44px]"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
