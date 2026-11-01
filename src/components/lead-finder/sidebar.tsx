"use client";

import Link from "next/link";
import { useLeadFinder } from "@/lib/store/lead-finder";
import { cn } from "@/lib/utils";
import {
  Search,
  Users,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Library,
  Layers,
  History,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const NAV = [
  { id: "search", label: "Search", icon: Search },
  { id: "results", label: "Results", icon: Sparkles },
  { id: "leads", label: "Saved Leads", icon: Users },
  { id: "lists", label: "Lists", icon: FolderKanban },
  { id: "templates", label: "Templates", icon: Library },
  { id: "bulk", label: "Bulk Discovery", icon: Layers },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "history", label: "History", icon: History },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const view = useLeadFinder((s) => s.view);
  const setView = useLeadFinder((s) => s.setView);
  const resultsCount = useLeadFinder((s) => s.results.length);

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-border/60 bg-sidebar/40 backdrop-blur-md">
      <div className="p-5 border-b border-border/60">
        <Link href="https://niftytechfinds.com" className="block" target="_blank">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Search className="size-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">Nifty Lead Finder</div>
              <div className="text-[10px] text-muted-foreground leading-tight">by NiftyTechFinds</div>
            </div>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "results" && resultsCount > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-mono",
                  active ? "bg-primary-foreground/20" : "bg-muted"
                )}>{resultsCount}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border/60">
        <Link
          href="https://niftytechfinds.com"
          target="_blank"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
        >
          <ExternalLink className="size-3" />
          Visit NiftyTechFinds.com
        </Link>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const view = useLeadFinder((s) => s.view);
  const setView = useLeadFinder((s) => s.setView);
  return (
    <div className="lg:hidden sticky top-0 z-30 -mx-4 px-4 py-2 bg-background/80 backdrop-blur-md border-b border-border/60 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/60"
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
