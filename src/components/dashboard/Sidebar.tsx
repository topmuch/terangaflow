'use client';

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Bus,
  Route,
  Clock,
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
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Section: Gestion
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard, roles: ['SUPERADMIN', 'STATION_MANAGER', 'TRANSPORTER'], section: 'Gestion' },
  { id: 'lines', label: 'Lignes', icon: Route, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  { id: 'trips', label: 'Départs / Arrivées', icon: Bus, roles: ['STATION_MANAGER', 'TRANSPORTER'], section: 'Gestion' },
  { id: 'schedules', label: 'Horaires', icon: Clock, roles: ['STATION_MANAGER', 'TRANSPORTER'], section: 'Gestion' },
  { id: 'settings', label: 'Paramètres', icon: Settings, roles: ['STATION_MANAGER', 'SUPERADMIN'], section: 'Gestion' },
  // Section: Monétisation
  { id: 'monetization', label: 'Monétisation', icon: BarChart3, roles: ['SUPERADMIN'], section: 'Business' },
  { id: 'marketplace', label: 'Marketplace', icon: Store, roles: ['SUPERADMIN'], section: 'Business' },
  { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['SUPERADMIN'], section: 'Business' },
  // Section: Outils
  { id: 'api-docs', label: 'Documentation API', icon: BookOpen, roles: ['SUPERADMIN'], section: 'Outils' },
  { id: 'whitelist', label: 'White Label', icon: Palette, roles: ['SUPERADMIN'], section: 'Outils' },
  { id: 'privacy', label: 'RGPD', icon: ShieldCheck, roles: ['SUPERADMIN'], section: 'Outils' },
];

interface SidebarProps {
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
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  user,
  activeTab,
  onTabChange,
  onLogout,
  onBack,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const role = user.role;
  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const sections = filteredItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const section = item.section || 'Autre';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {});

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

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-blue-400 tracking-tight truncate">SmartTicketQR</h1>
              <p className="text-[10px] text-slate-500 truncate">Admin Dashboard</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mx-auto">
            <Monitor className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
        >
          <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </button>
      </div>

      {/* User Info */}
      <div className={`p-3 border-b border-slate-800/50 ${collapsed ? 'px-2' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <Shield className={`w-4 h-4 ${roleColors[role] || 'text-slate-400'}`} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${roleColors[role] || 'text-slate-400'}`}>
                {roleLabels[role] || role}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="mb-1">
            {!collapsed && (
              <p className="px-4 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                {section}
              </p>
            )}
            {items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 transition-all duration-150 group
                    ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-4 py-2.5'}
                    ${isActive
                      ? 'bg-blue-600/15 text-blue-400 border-r-2 border-blue-500'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border-r-2 border-transparent'
                    }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />
                  {!collapsed && (
                    <span className={`text-sm font-medium truncate ${isActive ? 'text-blue-300' : ''}`}>
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-2 border-t border-slate-800 space-y-1">
        <button
          onClick={onBack}
          className={`w-full flex items-center gap-3 text-slate-500 hover:bg-slate-800 hover:text-white rounded-md transition-colors ${collapsed ? 'px-2 py-2 justify-center' : 'px-4 py-2'}`}
          title={collapsed ? 'Retour' : undefined}
        >
          <ChevronLeft className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Retour</span>}
        </button>
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-colors ${collapsed ? 'px-2 py-2 justify-center' : 'px-4 py-2'}`}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Déconnexion</span>}
        </button>
      </div>
    </motion.aside>
  );
}
