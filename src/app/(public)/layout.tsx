'use client';

import { useEffect } from 'react';

/**
 * Public layout — overrides the root dark theme to light for public-facing pages
 * (registration, merchant public pages, etc.)
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.style.setProperty('--theme-color', '#ffffff');
    return () => {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--theme-color', '#0B0F19');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-slate-900">
      {children}
    </div>
  );
}
