"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  Bell,
  Store,
  UserCircle,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Bottom Nav Items ─────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/pwa", label: "Accueil", icon: Bus },
  { href: "/pwa/alerts", label: "Alertes", icon: Bell },
  { href: "/pwa/services", label: "Services", icon: Store },
  { href: "/pwa/profile", label: "Profil", icon: UserCircle },
];

// ─── Offline indicator (useSyncExternalStore for online status) ────────────────

const onlineSubscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

function OfflineIndicator() {
  const isOnline = useSyncExternalStore(
    onlineSubscribe,
    () => navigator.onLine,
    () => true // SSR fallback
  );

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-1.5 text-xs font-medium flex items-center gap-2">
      <WifiOff className="h-3.5 w-3.5" />
      Mode hors ligne — Données mises en cache
    </div>
  );
}

// ─── PWA Layout ──────────────────────────────────────────────────────────────

export default function PwaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Register service worker on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] Service Worker registered:", registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Every hour
        })
        .catch((error) => {
          console.error("[PWA] SW registration failed:", error);
        });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <OfflineIndicator />

      {/* Main content area with safe area and bottom nav offset */}
      <main className="flex-1 pb-20 pt-12 overflow-y-auto">
        {children}
      </main>

      {/* ─── Bottom Navigation ──────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/pwa"
                ? pathname === "/pwa"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors relative min-w-[64px]",
                  "touch-manipulation active:scale-95",
                  isActive
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-amber-500" />
                )}
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
