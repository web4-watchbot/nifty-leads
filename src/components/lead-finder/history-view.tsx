"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Trash2, RefreshCw, Clock, Search as SearchIcon, Layers, Mail, Phone, Globe } from "lucide-react";
import { toast } from "sonner";
import { useLeadFinder } from "@/lib/store/lead-finder";

interface HistoryJob {
  id: string;
  query: string;
  sources: string;
  status: string;
  totalResults: number;
  uniqueLeads: number;
  withEmails: number;
  withPhones: number;
  withWebsites: number;
  durationMs: number;
  createdAt: string;
  isBulk: boolean;
  _count?: { leads: number; results: number };
}

export function HistoryView() {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const setView = useLeadFinder((s) => s.setView);
  const setQuery = useLeadFinder((s) => s.setQuery);
  const setSelectedSources = useLeadFinder((s) => s.setSelectedSources);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onClearAll = async () => {
    if (!confirm("Delete all search history? Saved leads are not affected.")) return;
    await fetch("/api/history", { method: "DELETE" });
    load();
    toast.success("History cleared");
  };

  const onReuse = (job: HistoryJob) => {
    setQuery(job.query);
    setSelectedSources(job.sources.split(",") as any);
    setView("search");
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="size-5 text-primary" /> Search History
          </h2>
          <p className="text-sm text-muted-foreground">Revisit and rerun earlier searches</p>
        </div>
        {jobs.length > 0 && (
          <Button variant="outline" onClick={onClearAll}><Trash2 className="size-4 mr-1" /> Clear all</Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <History className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No search history yet.</p>
            <Button onClick={() => setView("search")}>Start your first search</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <SearchIcon className="size-3.5 text-muted-foreground" />
                      <code className="text-sm font-mono break-all">{job.query}</code>
                      {job.isBulk && <Badge variant="outline" className="text-[9px]"><Layers className="size-2.5 mr-1" />Bulk</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="size-3" />{new Date(job.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span>{job.sources.split(",").length} sources</span>
                      <span>•</span>
                      <span>{(job.durationMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "outline"} className="text-[10px]">
                        {job.status}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => onReuse(job)}>
                        <RefreshCw className="size-3 mr-1" /> Reuse
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1"><SearchIcon className="size-3" />{job.uniqueLeads} leads</span>
                      <span className="flex items-center gap-1"><Mail className="size-3" />{job.withEmails}</span>
                      <span className="flex items-center gap-1"><Phone className="size-3" />{job.withPhones}</span>
                      <span className="flex items-center gap-1"><Globe className="size-3" />{job.withWebsites}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
