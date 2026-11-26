import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import {
  BookOpen, ClipboardList, Home, LogOut, Settings, Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/data";
import { getRegionName } from "@/lib/app.functions";
import { cn } from "@/lib/utils";

export function useRegionName() {
  return useQuery({ queryKey: ["region-name"], queryFn: () => getRegionName(), staleTime: 300_000 }).data;
}

export function AppShell({ children, title, actions }: { children: ReactNode; title?: string; actions?: ReactNode }) {
  const { data: me } = useMe();
  const region = useRegionName();
  const navigate = useNavigate();

  const items = me?.isAdmin
    ? [
        { to: "/panel", label: "Ana Sayfa", icon: Home },
        { to: "/kurslar", label: "Kurslar", icon: BookOpen },
        { to: "/imtihanlar", label: "İmtihanlar", icon: ClipboardList },
        { to: "/siralama", label: "Sıralama", icon: Trophy },
        { to: "/ayarlar", label: "Ayarlar", icon: Settings },
      ] as const
    : [
        { to: "/panel", label: "Ana Sayfa", icon: Home },
        { to: "/siralama", label: "Sıralama", icon: Trophy },
        { to: "/analiz", label: "Analiz", icon: BarChart3 },
        { to: "/pdf", label: "PDF", icon: FileDown },
      ] as const;

  return (
    <div className="min-h-screen">
      <header className="bg-hero text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pb-3 pt-5 sm:px-6">
          <Link to="/panel" className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-gold">{region ?? "Mıntıka"}</p>
            <p className="font-display text-xl font-semibold leading-tight sm:text-2xl">İmtihan ve Sıralama</p>
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary-foreground/25 px-3 py-1.5 text-sm font-medium transition hover:bg-primary-foreground/10"
          >
            <LogOut className="size-4" /> <span className="hidden sm:inline">Çıkış</span>
          </button>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-2 sm:px-4">
          <ul className="flex gap-1 pb-2">
            {items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium text-primary-foreground/80 transition hover:bg-primary-foreground/10 hover:text-primary-foreground",
                    me?.isAdmin ? "px-4 py-2 text-base" : "px-3 py-1.5",
                  )}
                  activeProps={{ className: "bg-primary-foreground/15 !text-primary-foreground" }}
                >
                  <Icon className={me?.isAdmin ? "size-5" : "size-4"} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {(title || actions) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            {title && <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>}
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        rank === 1 && "bg-gold text-accent-foreground",
        rank === 2 && "bg-silver text-primary-foreground",
        rank === 3 && "bg-bronze text-primary-foreground",
        rank > 3 && "bg-muted text-muted-foreground",
      )}
    >
      {rank}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center text-muted-foreground">{children}</div>
  );
}

export function Card({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cn("rounded-2xl border bg-card shadow-card", className)} style={style}>
      {children}
    </div>
  );
}
