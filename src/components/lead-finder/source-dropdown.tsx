"use client";

import { useLeadFinder } from "@/lib/store/lead-finder";
import { PROVIDER_GROUPS, PROVIDERS, type ProviderId } from "@/lib/providers";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, ChevronDown, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function SourceDropdown() {
  const selectedSources = useLeadFinder((s) => s.selectedSources);
  const setSelectedSources = useLeadFinder((s) => s.setSelectedSources);

  const toggle = (id: ProviderId) => {
    if (selectedSources.includes(id)) {
      setSelectedSources(selectedSources.filter((s) => s !== id));
    } else {
      setSelectedSources([...selectedSources, id]);
    }
  };

  const selectGroup = (group: ProviderId[]) => {
    const allIn = group.every((id) => selectedSources.includes(id));
    if (allIn) {
      setSelectedSources(selectedSources.filter((s) => !group.includes(s)));
    } else {
      setSelectedSources([...new Set([...selectedSources, ...group])]);
    }
  };

  const selectAll = () => {
    const all = Object.keys(PROVIDERS) as ProviderId[];
    const allIn = all.every((id) => selectedSources.includes(id));
    setSelectedSources(allIn ? [] : all);
  };

  const label = selectedSources.length === 0
    ? "Search Across"
    : selectedSources.length === 1
    ? PROVIDERS[selectedSources[0]].name
    : `${selectedSources.length} sources selected`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-12 px-4 gap-2 min-w-[140px] justify-between">
          <Database className="size-4 text-primary" />
          <span className="text-sm font-medium truncate">{label}</span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center justify-between p-3 border-b border-border/60">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Search Across
          </div>
          <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
            <CheckCheck className="size-3 mr-1" />
            {selectedSources.length === Object.keys(PROVIDERS).length ? "Deselect all" : "Select all"}
          </Button>
        </div>
        <ScrollArea className="h-80">
          <div className="p-2 space-y-3">
            {PROVIDER_GROUPS.map((group) => {
              const allIn = group.providers.every((id) => selectedSources.includes(id));
              const someIn = group.providers.some((id) => selectedSources.includes(id));
              return (
                <div key={group.id}>
                  <button
                    onClick={() => selectGroup(group.providers)}
                    className="w-full flex items-center justify-between px-2 py-1 hover:bg-accent/40 rounded-md text-left"
                  >
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded",
                      allIn ? "bg-primary/20 text-primary" : someIn ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {selectedSources.filter((s) => group.providers.includes(s)).length}/{group.providers.length}
                    </span>
                  </button>
                  <div className="space-y-1 mt-1">
                    {group.providers.map((id) => {
                      const p = PROVIDERS[id];
                      const checked = selectedSources.includes(id);
                      return (
                        <label
                          key={id}
                          className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/40 cursor-pointer"
                          htmlFor={`src-${id}`}
                        >
                          <Checkbox
                            id={`src-${id}`}
                            checked={checked}
                            onCheckedChange={() => toggle(id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium flex items-center gap-2">
                              {p.name}
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-normal text-emerald-500 border-emerald-500/30">
                                FREE
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                              {p.description}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
