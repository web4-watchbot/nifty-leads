"use client";

import { useState, useMemo } from "react";
import { useLeadFinder } from "@/lib/store/lead-finder";
import { PROFESSIONS, PROFESSION_CATEGORIES, getProfession } from "@/lib/professions";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Briefcase, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProfessionDropdown() {
  const professionId = useLeadFinder((s) => s.professionId);
  const setProfessionId = useLeadFinder((s) => s.setProfessionId);
  const setSelectedSources = useLeadFinder((s) => s.setSelectedSources);
  const selectedSources = useLeadFinder((s) => s.selectedSources);
  const setQuery = useLeadFinder((s) => s.setQuery);
  const setLocation = useLeadFinder((s) => s.setLocation);
  const setLeadType = useLeadFinder((s) => s.setLeadType);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return PROFESSIONS;
    return PROFESSIONS.filter((p) =>
      p.label.toLowerCase().includes(f) ||
      p.description?.toLowerCase().includes(f) ||
      p.id.toLowerCase().includes(f)
    );
  }, [filter]);

  const prof = professionId ? getProfession(professionId) : undefined;

  const apply = (id: string) => {
    if (id === professionId) {
      // Clicking again toggles it off
      setProfessionId("");
      return;
    }
    const next = getProfession(id);
    setProfessionId(id);
    if (next) {
      // Pre-fill the query with the profession's template (location resolved client-side).
      // The user can still edit it before searching.
      setQuery(next.query.replace(/\{\{location\}\}/g, "").trim());
      setLeadType(next.leadType);
      // Union the profession's recommended sources with the user's current selection
      // so they don't lose a source they explicitly picked.
      setSelectedSources([...new Set([...selectedSources, ...next.sources] as any)] as any);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-12 px-4 gap-2 min-w-[150px] justify-between", professionId && "border-primary/60 text-primary")}
          title="Pick a profession to target specific person leads"
        >
          <Briefcase className="size-4 text-primary" />
          <span className="text-sm font-medium truncate">
            {prof ? prof.label : "Profession"}
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border/60 space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Briefcase className="size-3" />
            Target Profession
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pick a role to auto-build a person-targeted search (uses LinkedIn + recommended sources).
          </p>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter roles..."
            className="w-full h-8 px-2 text-xs rounded-md border border-border/60 bg-background/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <ScrollArea className="h-72">
          <div className="p-2 space-y-3">
            {PROFESSION_CATEGORIES.map((cat) => {
              const items = filtered.filter((p) => p.category === cat.id);
              if (!items.length) return null;
              return (
                <div key={cat.id}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    {cat.label}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((p) => {
                      const checked = p.id === professionId;
                      return (
                        <button
                          key={p.id}
                          onClick={() => apply(p.id)}
                          className={cn(
                            "w-full flex items-start gap-2 p-2 rounded-md hover:bg-accent/50 text-left transition-colors",
                            checked && "bg-primary/10 hover:bg-primary/15"
                          )}
                        >
                          <span className={cn(
                            "mt-0.5 size-4 rounded border flex items-center justify-center shrink-0",
                            checked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          )}>
                            {checked && <Check className="size-3" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium leading-tight">{p.label}</div>
                            {p.description && (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                                {p.description}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.sources.slice(0, 3).map((s) => (
                                <Badge key={s} variant="outline" className="text-[9px] px-1 py-0 font-normal text-muted-foreground">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6 px-3">
                No professions match “{filter}”.
              </div>
            )}
          </div>
        </ScrollArea>
        {professionId && (
          <div className="p-2 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={() => { setProfessionId(""); setOpen(false); }}
            >
              Clear profession filter
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
