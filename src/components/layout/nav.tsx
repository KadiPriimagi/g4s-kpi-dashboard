"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Filter,
  LayoutDashboard,
  LogOut,
  PieChart,
  Receipt,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FILTER_KEYS } from "@/lib/filters";

export const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/channels", label: "Channels", icon: BarChart3 },
  { href: "/funnel", label: "Funnel", icon: Filter },
  { href: "/traffic-sources", label: "Traffic Sources", icon: PieChart },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/costs", label: "Costs", icon: Receipt },
  { href: "/ai-summary", label: "AI Summary", icon: Sparkles },
];

export function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <ShieldCheck className="size-5" />
      </div>
      <div className="leading-tight">
        <div className="font-semibold text-white">G4S Eesti</div>
        <div className="text-xs text-sidebar-foreground/70">Marketing KPIs</div>
      </div>
    </div>
  );
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();

  // Keep the global filters when moving between pages.
  const kept = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const v = params.get(key);
    if (v) kept.set(key, v);
  }
  const qs = kept.toString();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={qs ? `${href}?${qs}` : href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LogoutButton() {
  async function logout() {
    await fetch("/api/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <LogOut className="size-4" />
      Log out
    </button>
  );
}
