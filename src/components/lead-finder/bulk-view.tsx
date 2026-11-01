"use client";

import { useState } from "react";
import { useLeadFinder } from "@/lib/store/lead-finder";
import { useRunSearch } from "@/lib/store/use-run-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Layers, Play, Pause, Square, RefreshCw, CheckCircle2, XCircle,
  Loader2, Sparkles, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { expandQuery } from "@/lib/extraction/query-parser";
import type { LeadRow } from "@/lib/store/lead-finder";

interface BulkQuery {
  id: string;
  query: string;
  status: "queued" | "running" | "completed" | "failed";
  resultCount?: number;
  error?: string;
}

export function BulkView() {
  const {
    query, setQuery, selectedSources, setSelectedSources,
    location, setLocation, industry, setIndustry,
    maxResults, setMaxResults, setResults, setSearchStats,
    setView,
  } = useLeadFinder();
  const runSearch = useRunSearch();
  const [seedQuery, setSeedQuery] = useState("");
  const [queries, setQueries] = useState<BulkQuery[]>([]);
  const [running, setRunning] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [allLeads, setAllLeads] = useState<LeadRow[]>([]);

  const generateQueries = () => {
    if (!seedQuery.trim()) {
      toast.error("Enter a seed query first");
      return;
    }
    const expanded = expandQuery(seedQuery, { location, industry });
    setQueries(expanded.map((q, i) => ({ id: `q${i}_${Date.now()}`, query: q, status: "queued" })));
    toast.success(`Generated ${expanded.length} query variations`);
  };

  const start = async () => {
    if (queries.length === 0) {
      toast.error("Generate queries first");
      return;
    }
    setRunning(true);
    setCompletedCount(0);
    setTotalLeads(0);
    setAllLeads([]);
    let all: LeadRow[] = [];
    let done = 0;
    for (const q of queries) {
      setQueries((prev) => prev.map((x) => x.id === q.id ? { ...x, status: "running" } : x));
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: q.query,
            sources: selectedSources,
            location, industry,
            maxResults: Math.min(maxResults, 20),
            enrichWebsites: false,
            isBulk: true,
          }),
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        all = [...all, ...data.leads];
        setAllLeads(all);
        setTotalLeads(all.length);
        done++;
        setCompletedCount(done);
        setQueries((prev) => prev.map((x) => x.id === q.id ? { ...x, status: "completed", resultCount: data.leads.length } : x));
      } catch (e) {
        setQueries((prev) => prev.map((x) => x.id === q.id ? { ...x, status: "failed", error: (e as Error).message } : x));
      }
    }
    setRunning(false);
    // Deduplicate across all results
    const seen = new Set<string>();
    const deduped: LeadRow[] = [];
    for (const lead of all) {
      const key = (lead.businessName || "") + (lead.email || "") + (lead.website || "");
      if (key && seen.has(key)) continue;
      seen.add(key);
      deduped.push(lead);
    }
    setResults(deduped);
    setSearchStats({
      jobId: "bulk",
      totalResults: all.length,
      uniqueLeads: deduped.length,
      withEmails: deduped.filter((l) => l.email).length,
      withPhones: deduped.filter((l) => l.phone).length,
      withWebsites: deduped.filter((l) => l.website).length,
      durationMs: 0,
      rawCounts: {},
      errors: {},
      dedupedCount: all.length - deduped.length,
      generatedQueries: queries.map((q) => q.query),
    });
    useLeadFinder.getState().bumpSavedLeads();
    useLeadFinder.getState().bumpDashboard();
    toast.success(`Bulk search complete: ${deduped.length} unique leads from ${all.length} total`);
  };

  const pause = () => setRunning(false);
  const cancel = () => { setRunning(false); setQueries([]); };
  const retryFailed = () => {
    setQueries((prev) => prev.map((q) => q.status === "failed" ? { ...q, status: "queued", error: undefined } : q));
  };

  const removeQuery = (id: string) => setQueries((prev) => prev.filter((q) => q.id !== id));
  const addCustomQuery = () => {
    setQueries((prev) => [...prev, { id: `manual_${Date.now()}`, query: "", status: "queued" }]);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="size-5 text-primary" /> Bulk Lead Discovery
        </h2>
        <p className="text-sm text-muted-foreground">Generate multiple query variations and run them in sequence to discover hundreds of leads</p>
      </div>

      {/* Seed query */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Seed query</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="seed">Enter your goal in plain English</Label>
            <Input id="seed" value={seedQuery} onChange={(e) => setSeedQuery(e.target.value)} placeholder="e.g. Find podcast producers in the USA" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. USA" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Industry</Label>
              <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Media" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Max per query</Label>
              <Input type="number" value={maxResults} onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)} min={5} max={50} className="h-9" />
            </div>
          </div>
          <Button onClick={generateQueries} variant="outline">
            <Sparkles className="size-4 mr-1" /> Generate query variations
          </Button>
        </CardContent>
      </Card>

      {/* Generated queries */}
      {queries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Query queue ({queries.length})</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={addCustomQuery}><Plus className="size-3 mr-1" /> Add</Button>
                {queries.some((q) => q.status === "failed") && (
                  <Button size="sm" variant="ghost" onClick={retryFailed}><RefreshCw className="size-3 mr-1" /> Retry failed</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setQueries([])}><Trash2 className="size-3 mr-1" /> Clear</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {queries.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2 p-2 rounded-lg bg-card/40 border border-border/40">
                    <div className="text-[10px] font-mono text-muted-foreground w-6">{i + 1}.</div>
                    <StatusIcon status={q.status} />
                    <Input
                      value={q.query}
                      onChange={(e) => setQueries((prev) => prev.map((x) => x.id === q.id ? { ...x, query: e.target.value } : x))}
                      disabled={q.status === "running" || q.status === "completed"}
                      className="h-8 flex-1 font-mono text-xs"
                    />
                    {q.resultCount !== undefined && <Badge variant="outline" className="text-[10px]">{q.resultCount} leads</Badge>}
                    {q.error && <span className="text-[10px] text-destructive truncate max-w-32" title={q.error}>{q.error}</span>}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeQuery(q.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Progress */}
            {running && (
              <div className="mt-3">
                <Progress value={(completedCount / queries.length) * 100} />
                <div className="text-xs text-muted-foreground mt-1">
                  {completedCount} / {queries.length} queries complete • {totalLeads} leads discovered
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              {!running ? (
                <Button onClick={start} disabled={queries.length === 0}>
                  <Play className="size-4 mr-1" /> Start bulk search
                </Button>
              ) : (
                <>
                  <Button onClick={pause} variant="outline">
                    <Pause className="size-4 mr-1" /> Pause
                  </Button>
                  <Button onClick={cancel} variant="outline">
                    <Square className="size-4 mr-1" /> Cancel
                  </Button>
                </>
              )}
              {totalLeads > 0 && !running && (
                <Button variant="outline" onClick={() => setView("results")}>
                  View {totalLeads} results
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notice */}
      <Card className="bg-accent/20 border-accent/40">
        <CardContent className="p-4 text-xs text-muted-foreground">
          <strong>Note:</strong> Bulk search uses sensible rate limits to respect free data providers.
          Each query runs sequentially with a small delay. Real numbers are shown — never promised.
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: BulkQuery["status"] }) {
  if (status === "running") return <Loader2 className="size-4 text-primary animate-spin shrink-0" />;
  if (status === "completed") return <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />;
  if (status === "failed") return <XCircle className="size-4 text-destructive shrink-0" />;
  return <div className="size-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />;
}

// Suppress unused imports
void cn;
