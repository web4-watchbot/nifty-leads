"use client";

import { useCallback } from "react";
import { useLeadFinder } from "./lead-finder";
import { toast } from "sonner";
import { getProfession, buildProfessionQuery } from "@/lib/professions";
import type { LeadRow, SearchStats } from "./lead-finder";

interface SearchResponse {
  jobId: string;
  leads: LeadRow[];
  stats: SearchStats;
}

export function useRunSearch() {
  const query = useLeadFinder((s) => s.query);
  const selectedSources = useLeadFinder((s) => s.selectedSources);
  const location = useLeadFinder((s) => s.location);
  const industry = useLeadFinder((s) => s.industry);
  const leadType = useLeadFinder((s) => s.leadType);
  const professionId = useLeadFinder((s) => s.professionId);
  const maxResults = useLeadFinder((s) => s.maxResults);
  const enrichWebsites = useLeadFinder((s) => s.enrichWebsites);
  const setResults = useLeadFinder((s) => s.setResults);
  const setSearchStats = useLeadFinder((s) => s.setSearchStats);
  const setSearching = useLeadFinder((s) => s.setSearching);
  const setSearchError = useLeadFinder((s) => s.setSearchError);
  const clearSelection = useLeadFinder((s) => s.clearSelection);
  const bumpSavedLeads = useLeadFinder((s) => s.bumpSavedLeads);
  const bumpDashboard = useLeadFinder((s) => s.bumpDashboard);

  return useCallback(async () => {
    setSearching(true);
    setSearchError(null);
    clearSelection();
    try {
      // If a profession template is selected, use its curated query + sources.
      // The user can still override via the source dropdown — we union the two
      // so the profession's recommended sources are always included.
      const prof = professionId ? getProfession(professionId) : undefined;
      const finalQuery = prof ? buildProfessionQuery(prof, location) : query;
      const finalSources = prof
        ? [...new Set([...selectedSources, ...prof.sources] as any)]
        : selectedSources;
      const finalLeadType = prof ? prof.leadType : leadType;

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: finalQuery,
          sources: finalSources,
          location,
          industry,
          leadType: finalLeadType,
          professionId,
          maxResults,
          enrichWebsites,
          maxSitesToCrawl: Math.min(8, Math.max(3, Math.floor(maxResults / 5))),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Search failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as SearchResponse;
      setResults(data.leads);
      setSearchStats(data.stats);
      bumpSavedLeads();
      bumpDashboard();
      if (data.leads.length === 0) {
        toast.info("No leads found. Try a different query, add more sources, or pick a profession template.");
      } else {
        const sources = Object.entries(data.stats.rawCounts)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${k}:${n}`)
          .join("  ");
        toast.success(`Found ${data.leads.length} leads (${data.stats.dedupedCount} duplicates removed)`, {
          description: sources || undefined,
        });
      }
    } catch (e) {
      const msg = (e as Error).message || "Search failed";
      setSearchError(msg);
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  }, [query, selectedSources, location, industry, leadType, professionId, maxResults, enrichWebsites, setResults, setSearchStats, setSearching, setSearchError, clearSelection, bumpSavedLeads, bumpDashboard]);
}
