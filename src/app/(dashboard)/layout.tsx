"use client";

import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Bus,
  Megaphone,
  CreditCard,
  Monitor,
  LogOut,
  ChevronDown,
  Building2,
  Route,
  Clock,
  MessageSquare,
  Upload,
  Volume2,
  Store,
  Tv,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// ─── Navigation items ────────────────────────────────────────────────────────

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const PRINCIPAL_NAV: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["SUPERADMIN", "STATION_MANAGER", "TRANSPORTER", "MERCHANT"],
  },
  {
    title: "Kiosque",
    href: "/display/_SID_",
    icon: Monitor,
    roles: ["SUPERADMIN", "STATION_MANAGER"],
  },
];

const STATION_NAV: NavItem[] = [
  {
    title: "Lignes",
    href: "/station/_SID_/lines",
    icon: Route,
    roles: ["SUPERADMIN", "STATION_MANAGER", "TRANSPORTER"],
  },
  {
    title: "Trajets",
    href: "/station/_SID_/trips",
    icon: Clock,
    roles: ["SUPERADMIN", "STATION_MANAGER", "TRANSPORTER"],
  },
  {
    title: "Messages Ticker",
    href: "/station/_SID_/tickers",
    icon: MessageSquare,
    roles: ["SUPERADMIN", "STATION_MANAGER"],
  },
  {
    title: "Import CSV",
    href: "/station/_SID_/trips/import",
    icon: Upload,
    roles: ["SUPERADMIN", "STATION_MANAGER", "TRANSPORTER"],
  },
  {
    title: "Notifications",
    href: "/station/_SID_/notifications",
    icon: Volume2,
    roles: ["SUPERADMIN", "STATION_MANAGER"],
  },
  {
    title: "Partenaires",
    href: "/station/_SID_/partners",
    icon: Store,
    roles: ["SUPERADMIN", "STATION_MANAGER"],
  },
  {
    title: "Campagnes pub",
    href: "/station/_SID_/campaigns",
    icon: Megaphone,
    roles: ["SUPERADMIN", "STATION_MANAGER"],
  },
  {
    title: "Pubs Kiosk",
    href: "/station/_SID_/kiosk-ads",
    icon: Tv,
    roles: ["SUPERADMIN", "STATION_MANAGER"],
  },
  {
    title: "Facturation",
    href: "/station/_SID_/billing",
    icon: CreditCard,
    roles: ["SUPERADMIN", "STATION_MANAGER"],
  },
];

// ADMIN_NAV removed — billing merged into STATION_NAV, settings removed

// ─── Sidebar Brand ────────────────────────────────────────────────────────────

function SidebarBrand() {
  return (
    <SidebarHeader className="border-b border-sidebar-border">
      <div className="flex items-center gap-3 px-2 py-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white shadow-sm">
          <Bus className="h-5 w-5" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground truncate">
            TerangaFlow
          </span>
          <span className="text-[10px] text-sidebar-foreground/70 truncate">
            Intelligence des gares
          </span>
        </div>
      </div>
    </SidebarHeader>
  );
}

// ─── Sidebar Nav Menu ────────────────────────────────────────────────────────

function SidebarNav({ role, stationId }: { role: string; stationId: string | null }) {
  const pathname = usePathname();

  function filterByRole(items: NavItem[]): NavItem[] {
    return items.filter((item) => item.roles.includes(role));
  }

  // Replace _SID_ placeholder with actual stationId
  function resolveHref(href: string): string {
    return stationId ? href.replace("_SID_", stationId) : "/dashboard";
  }

  function isActive(href: string): boolean {
    const resolved = resolveHref(href);
    if (resolved === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(resolved);
  }

  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Principal</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filterByRole(PRINCIPAL_NAV).map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={item.title}
                >
                  <a href={resolveHref(item.href)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Ma Gare</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filterByRole(STATION_NAV).map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.href)}
                  tooltip={item.title}
                >
                  <a href={resolveHref(item.href)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

// ─── Sidebar User Footer ──────────────────────────────────────────────────────

function SidebarUserFooter() {
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <SidebarFooter className="border-t border-sidebar-border">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="w-full">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    src={(session?.user as Record<string, unknown> | undefined)?.avatar as string | undefined}
                    alt={session?.user?.name ?? "Avatar"}
                  />
                  <AvatarFallback className="rounded-lg text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-sm font-medium truncate">
                    {session?.user?.name ?? "Utilisateur"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate capitalize">
                    {session?.user?.role?.replace("_", " ").toLowerCase() ??
                      "—"}
                  </span>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[--radix-dropdown-menu-trigger-width]"
            >
              <DropdownMenuItem>
                <Building2 className="mr-2 h-4 w-4" />
                Mon organisation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

// ─── Top Header Bar ────────────────────────────────────────────────────────────

function TopHeader({ title }: { title: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 bg-background">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-sm font-medium truncate">{title}</h1>
      <div className="ml-auto">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Basculer le thème"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
        </button>
      </div>
    </header>
  );
}

// ─── Main Dashboard Layout ────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Session loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-[#FF1D8D]" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </div>
    );
  }

  const role = session?.user?.role ?? "STATION_MANAGER";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="sidebar" className="sidebar-rose">
        <SidebarBrand />
        <SidebarNav role={role} stationId={session?.user?.stationId ?? null} />
        <SidebarUserFooter />
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <TopHeader title="TerangaFlow" />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
