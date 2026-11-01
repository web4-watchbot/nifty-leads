"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderId } from "@/lib/providers";

export type LeadView = "search" | "results" | "leads" | "lists" | "dashboard" | "settings" | "templates" | "bulk" | "history";

export interface LeadRow {
  id: string;
  businessName: string | null;
  contactPerson: string | null;
  position: string | null;
  description: string | null;
  email: string | null;
  emailExtra: string | null;
  phone: string | null;
  phoneExtra: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  industry: string | null;
  leadType: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
  tiktokUrl: string | null;
  githubUrl: string | null;
  otherProfiles: string | null;
  relevanceScore: number;
  completenessScore: number;
  emailStatus: string;
  phoneStatus: string;
  verificationStatus: string;
  sourceProvider: string;
  sourceUrl: string;
  sources: Array<{ provider: string; url: string; title: string; date: string }>;
  aiSummary: string | null;
  relevanceReason: string | null;
  status: string;
  notes: string;
  tags: string;
  isSaved: boolean;
  createdAt: string;
}

export interface SearchStats {
  jobId: string;
  totalResults: number;
  uniqueLeads: number;
  withEmails: number;
  withPhones: number;
  withWebsites: number;
  durationMs: number;
  rawCounts: Record<string, number>;
  errors: Record<string, string>;
  dedupedCount: number;
  generatedQueries: string[];
}

interface LeadFinderState {
  // Navigation
  view: LeadView;
  setView: (v: LeadView) => void;

  // Search form
  query: string;
  setQuery: (q: string) => void;
  selectedSources: ProviderId[];
  setSelectedSources: (s: ProviderId[]) => void;
  location: string;
  setLocation: (l: string) => void;
  industry: string;
  setIndustry: (i: string) => void;
  leadType: string;
  setLeadType: (l: string) => void;
  professionId: string;        // selected profession template ID ("" = none)
  setProfessionId: (p: string) => void;
  maxResults: number;
  setMaxResults: (n: number) => void;
  enrichWebsites: boolean;
  setEnrichWebsites: (b: boolean) => void;
  showAdvanced: boolean;
  setShowAdvanced: (b: boolean) => void;

  // Search state
  isSearching: boolean;
  setSearching: (b: boolean) => void;
  searchStats: SearchStats | null;
  setSearchStats: (s: SearchStats | null) => void;
  searchError: string | null;
  setSearchError: (e: string | null) => void;
  results: LeadRow[];
  setResults: (r: LeadRow[]) => void;
  selectedLeadIds: Set<string>;
  toggleLeadSelection: (id: string) => void;
  selectAllLeads: (ids: string[]) => void;
  clearSelection: () => void;
  activeLeadId: string | null;
  setActiveLeadId: (id: string | null) => void;

  // View mode for results
  resultsViewMode: "cards" | "table";
  setResultsViewMode: (m: "cards" | "table") => void;

  // Saved leads cache (refreshed when entering Leads view)
  savedLeadsVersion: number;
  bumpSavedLeads: () => void;
  listsVersion: number;
  bumpLists: () => void;
  dashboardVersion: number;
  bumpDashboard: () => void;
}

export const useLeadFinder = create<LeadFinderState>()(
  persist(
    (set) => ({
      view: "search",
      setView: (v) => set({ view: v }),

      query: "",
      setQuery: (q) => set({ query: q }),
      selectedSources: ["web", "linkedin", "crunchbase", "github", "wikipedia"],
      setSelectedSources: (s) => set({ selectedSources: s }),
      location: "",
      setLocation: (l) => set({ location: l }),
      industry: "",
      setIndustry: (i) => set({ industry: i }),
      leadType: "",
      setLeadType: (l) => set({ leadType: l }),
      professionId: "",
      setProfessionId: (p) => set({ professionId: p }),
      maxResults: 30,
      setMaxResults: (n) => set({ maxResults: n }),
      enrichWebsites: true,
      setEnrichWebsites: (b) => set({ enrichWebsites: b }),
      showAdvanced: false,
      setShowAdvanced: (b) => set({ showAdvanced: b }),

      isSearching: false,
      setSearching: (b) => set({ isSearching: b }),
      searchStats: null,
      setSearchStats: (s) => set({ searchStats: s }),
      searchError: null,
      setSearchError: (e) => set({ searchError: e }),
      results: [],
      setResults: (r) => set({ results: r }),
      selectedLeadIds: new Set<string>(),
      toggleLeadSelection: (id) =>
        set((state) => {
          const next = new Set(state.selectedLeadIds);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { selectedLeadIds: next };
        }),
      selectAllLeads: (ids) => set({ selectedLeadIds: new Set(ids) }),
      clearSelection: () => set({ selectedLeadIds: new Set() }),
      activeLeadId: null,
      setActiveLeadId: (id) => set({ activeLeadId: id }),

      resultsViewMode: "cards",
      setResultsViewMode: (m) => set({ resultsViewMode: m }),

      savedLeadsVersion: 0,
      bumpSavedLeads: () => set((s) => ({ savedLeadsVersion: s.savedLeadsVersion + 1 })),
      listsVersion: 0,
      bumpLists: () => set((s) => ({ listsVersion: s.listsVersion + 1 })),
      dashboardVersion: 0,
      bumpDashboard: () => set((s) => ({ dashboardVersion: s.dashboardVersion + 1 })),
    }),
    {
      name: "nifty-lead-finder",
      partialize: (s) => ({
        query: s.query,
        selectedSources: s.selectedSources,
        location: s.location,
        industry: s.industry,
        leadType: s.leadType,
        professionId: s.professionId,
        maxResults: s.maxResults,
        enrichWebsites: s.enrichWebsites,
        resultsViewMode: s.resultsViewMode,
      }),
    }
  )
);
