"use client";

import { useLeadFinder } from "@/lib/store/lead-finder";
import { useRunSearch } from "@/lib/store/use-run-search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Card, CardContent, CardHeader,
} from "@/components/ui/card";
import {
  LayoutGrid, List, Mail, Phone, Globe, MapPin, ExternalLink,
  Star, Save, Download, Search as SearchIcon, AlertCircle,
  Clock, Layers, Sparkles, RefreshCw, Database, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LeadRow } from "@/lib/store/lead-finder";
import { ExportDialog } from "./export-dialog";

export function ResultsView() {
  const {
    results, isSearching, searchError, searchStats,
    resultsViewMode, setResultsViewMode,
    selectedLeadIds, toggleLeadSelection, selectAllLeads, clearSelection,
    setActiveLeadId, setView,
  } = useLeadFinder();
  const [showExport, setShowExport] = useState(false);

  if (isSearching && results.length === 0) {
    return <LoadingState />;
  }

  if (searchError && results.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="size-12 text-destructive mx-auto mb-3" />
        <h2 className="text-xl font-semibold mb-2">Search failed</h2>
        <p className="text-muted-foreground mb-4">{searchError}</p>
        <Button onClick={() => setView("search")}>Back to search</Button>
      </div>
    );
  }

  if (!isSearching && results.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <SearchIcon className="size-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-xl font-semibold mb-2">No results yet</h2>
        <p className="text-muted-foreground mb-4">Run a search to discover leads.</p>
        <Button onClick={() => setView("search")}>Start a search</Button>
      </div>
    );
  }

  const allSelected = results.length > 0 && selectedLeadIds.size === results.length;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Stats header */}
      {searchStats && <StatsHeader stats={searchStats} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border/60 overflow-hidden">
          <Button
            variant={resultsViewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setResultsViewMode("cards")}
            className="rounded-none"
          >
            <LayoutGrid className="size-4" /> Cards
          </Button>
          <Button
            variant={resultsViewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setResultsViewMode("table")}
            className="rounded-none"
          >
            <List className="size-4" /> Table
          </Button>
        </div>

        {selectedLeadIds.size > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">
            <span className="text-sm font-medium">{selectedLeadIds.size} selected</span>
            <Button size="sm" variant="ghost" onClick={() => saveSelected([...selectedLeadIds])}>
              <Save className="size-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowExport(true)}>
              <Download className="size-3.5 mr-1" /> Export
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear</Button>
          </div>
        )}

        <div className="ml-auto flex gap-2">
          {results.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
              <Download className="size-3.5 mr-1" /> Export All
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setView("search")}>
            <SearchIcon className="size-3.5 mr-1" /> New search
          </Button>
        </div>
      </div>

      {/* Select-all row for table view */}
      {resultsViewMode === "table" && results.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => v ? selectAllLeads(results.map((r) => r.id)) : clearSelection()}
          />
          <span>{allSelected ? "Deselect all" : "Select all"} ({results.length} leads)</span>
        </div>
      )}

      {/* Results */}
      {resultsViewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {results.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selected={selectedLeadIds.has(lead.id)}
              onToggle={() => toggleLeadSelection(lead.id)}
              onOpen={() => setActiveLeadId(lead.id)}
              onSave={() => saveOne(lead.id)}
            />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((lead) => (
                  <LeadTableRow
                    key={lead.id}
                    lead={lead}
                    selected={selectedLeadIds.has(lead.id)}
                    onToggle={() => toggleLeadSelection(lead.id)}
                    onOpen={() => setActiveLeadId(lead.id)}
                    onSave={() => saveOne(lead.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {showExport && <ExportDialog scope="all_results" onClose={() => setShowExport(false)} />}
    </div>
  );
}

function StatsHeader({ stats }: { stats: NonNullable<ReturnType<typeof useLeadFinder.getState>["searchStats"]> }) {
  const providerErrors = Object.entries(stats.errors);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          <StatTile label="Discovered" value={stats.totalResults} icon={<Layers className="size-4" />} />
          <StatTile label="Unique leads" value={stats.uniqueLeads} icon={<Sparkles className="size-4" />} highlight />
          <StatTile label="With emails" value={stats.withEmails} icon={<Mail className="size-4" />} />
          <StatTile label="With phones" value={stats.withPhones} icon={<Phone className="size-4" />} />
          <StatTile label="With websites" value={stats.withWebsites} icon={<Globe className="size-4" />} />
          <StatTile label="Duration" value={`${(stats.durationMs / 1000).toFixed(1)}s`} icon={<Clock className="size-4" />} />
        </div>
        {stats.dedupedCount > 0 && (
          <div className="text-xs text-muted-foreground mb-2">
            Removed {stats.dedupedCount} duplicate{stats.dedupedCount !== 1 ? "s" : ""}.
          </div>
        )}
        {providerErrors.length > 0 && (
          <details className="text-xs">
            <summary className="text-amber-500 cursor-pointer flex items-center gap-1.5">
              <AlertCircle className="size-3.5" />
              {providerErrors.length} provider issue{providerErrors.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-2 space-y-1">
              {providerErrors.map(([p, e]) => (
                <div key={p} className="text-amber-600/80"><strong className="capitalize">{p}:</strong> {e}</div>
              ))}
            </div>
          </details>
        )}
        {stats.generatedQueries.length > 0 && (
          <details className="text-xs mt-2">
            <summary className="text-muted-foreground cursor-pointer">Generated query variations ({stats.generatedQueries.length})</summary>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {stats.generatedQueries.map((q, i) => (
                <div key={i} className="font-mono text-[11px] text-muted-foreground">{q}</div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, icon, highlight }: { label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      highlight ? "bg-primary/10 border-primary/30" : "bg-card/40 border-border/60"
    )}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-3">
            <RefreshCw className="size-7 text-primary animate-spin" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Searching across sources...</h2>
          <p className="text-sm text-muted-foreground">Fetching, deduplicating, and scoring leads</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead, selected, onToggle, onOpen, onSave }: {
  lead: LeadRow;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <Card className={cn("transition-all hover:shadow-md hover:border-primary/40 cursor-pointer", selected && "ring-2 ring-primary")}>
      <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2 space-y-0">
        <Checkbox checked={selected} onCheckedChange={onToggle} onClick={(e) => e.stopPropagation()} className="mt-1" />
        <div className="flex-1 min-w-0" onClick={onOpen}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm leading-tight truncate">
                {lead.businessName || lead.contactPerson || "Untitled lead"}
              </div>
              {(lead.position || lead.industry) && (
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {[lead.position, lead.industry].filter(Boolean).join(" • ")}
                </div>
              )}
            </div>
            <ScoreBadge relevance={lead.relevanceScore} completeness={lead.completenessScore} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0" onClick={onOpen}>
        {lead.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{lead.description}</p>
        )}
        <div className="space-y-1 text-xs">
          {lead.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate">{lead.email}</span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">
                {lead.emailStatus === "verified" ? "Verified" : lead.emailStatus === "publicly_listed" ? "Listed" : lead.emailStatus}
              </Badge>
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-1.5">
              <Globe className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate text-primary">{prettyDomain(lead.website)}</span>
            </div>
          )}
          {(lead.city || lead.country) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3 text-muted-foreground shrink-0" />
              <span className="truncate">{[lead.city, lead.country].filter(Boolean).join(", ")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Database className="size-3" />
            <span className="capitalize">{lead.sourceProvider}</span>
            {lead.verificationStatus === "verified" && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-500 border-emerald-500/30">Verified</Badge>
            )}
          </div>
          <div className="flex gap-1">
            {lead.website && (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); window.open(lead.website!, "_blank"); }}>
                <ExternalLink className="size-3" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={(e) => { e.stopPropagation(); onSave(); }}>
              <Save className={cn("size-3", lead.isSaved && "fill-primary text-primary")} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadTableRow({ lead, selected, onToggle, onOpen, onSave }: {
  lead: LeadRow;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <TableRow className={cn("cursor-pointer", selected && "bg-primary/5")} onClick={onOpen}>
      <TableCell onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        <Checkbox checked={selected} />
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {lead.businessName || lead.contactPerson || "Untitled"}
          {lead.isSaved && <Star className="size-3 fill-amber-400 text-amber-400" />}
        </div>
      </TableCell>
      <TableCell className="text-xs">{lead.contactPerson || lead.position || "—"}</TableCell>
      <TableCell className="text-xs">
        {lead.email ? (
          <span className="flex items-center gap-1">
            <span className="truncate max-w-[160px]">{lead.email}</span>
            {lead.emailStatus === "verified" && <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-500">✓</Badge>}
          </span>
        ) : "—"}
      </TableCell>
      <TableCell className="text-xs">{lead.phone || "—"}</TableCell>
      <TableCell className="text-xs">{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</TableCell>
      <TableCell className="text-xs">{lead.industry || "—"}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px] capitalize">{lead.sourceProvider}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <div className="text-[11px] font-mono">{lead.relevanceScore}<span className="text-muted-foreground">/{lead.completenessScore}</span></div>
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onSave}>
          <Save className={cn("size-3", lead.isSaved && "fill-primary text-primary")} />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ScoreBadge({ relevance, completeness }: { relevance: number; completeness: number }) {
  const total = relevance + completeness;
  const color = total >= 140 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
    : total >= 100 ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
    : "text-muted-foreground bg-muted/40 border-border/40";
  return (
    <div className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0", color)}>
      {relevance}%
    </div>
  );
}

function prettyDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

async function saveOne(id: string) {
  try {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSaved: true }),
    });
    useLeadFinder.getState().bumpSavedLeads();
    toast.success("Lead saved");
    // Update local result state to reflect saved status
    const lead = useLeadFinder.getState().results.find((r) => r.id === id);
    if (lead) {
      lead.isSaved = true;
      useLeadFinder.getState().setResults([...useLeadFinder.getState().results]);
    }
  } catch (e) {
    toast.error("Failed to save lead");
  }
}

async function saveSelected(ids: string[]) {
  try {
    await Promise.all(ids.map((id) =>
      fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved: true }),
      })
    ));
    useLeadFinder.getState().bumpSavedLeads();
    toast.success(`Saved ${ids.length} lead${ids.length !== 1 ? "s" : ""}`);
    useLeadFinder.getState().clearSelection();
    // Refresh results to reflect saved status
    const results = useLeadFinder.getState().results.map((r) => ids.includes(r.id) ? { ...r, isSaved: true } : r);
    useLeadFinder.getState().setResults(results);
  } catch (e) {
    toast.error("Failed to save leads");
  }
}
