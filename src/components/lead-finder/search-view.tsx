"use client";

import { useLeadFinder } from "@/lib/store/lead-finder";
import { useRunSearch } from "@/lib/store/use-run-search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, Sparkles, Loader2, X, Briefcase } from "lucide-react";
import { SourceDropdown } from "./source-dropdown";
import { AdvancedFilters } from "./advanced-filters";
import { ProfessionDropdown } from "./profession-dropdown";
import { useState } from "react";
import { toast } from "sonner";
import { TEMPLATES } from "@/lib/templates";

const QUICK_CATEGORIES = [
  { label: "Find Businesses", query: "small business local services", sources: ["business", "web"] as const },
  { label: "Find People", query: "professionals experts contact", sources: ["linkedin", "web"] as const },
  { label: "Find YouTube Channels", query: "site:youtube.com creator", sources: ["youtube"] as const },
  { label: "Find Companies", query: "company corporation enterprise", sources: ["web", "crunchbase", "wikipedia"] as const },
  { label: "Find Agencies", query: "agency services firm", sources: ["business", "web", "crunchbase"] as const },
  { label: "Find Freelancers", query: "freelancer contractor independent", sources: ["github", "linkedin", "web"] as const },
  { label: "Find Emails", query: "contact email business enquiries", sources: ["web"] as const },
  { label: "Find LinkedIn Prospects", query: '"marketing manager" Berlin', sources: ["linkedin", "web"] as const },
  { label: "Find Startups", query: "startup SaaS company", sources: ["crunchbase", "producthunt", "web"] as const },
  { label: "Find Makers", query: "indie maker product launch", sources: ["producthunt", "social", "web"] as const },
];

const EXAMPLE_QUERIES = [
  'site:linkedin.com/in "Marketing Manager" "Berlin"',
  'site:crunchbase.com SaaS startups Berlin',
  '"CTO" "SaaS" "London"',
  '"Podcast Host" OR "Podcast Producer" "London"',
  'restaurants in Sydney',
  'marketing agencies in Berlin',
  'site:producthunt.com AI marketing tool',
  '"hiring developers" "San Francisco"',
];

export function SearchView() {
  const {
    query, setQuery,
    selectedSources, setSelectedSources,
    isSearching, setView,
  } = useLeadFinder();
  const runSearch = useRunSearch();
  const [showFilters, setShowFilters] = useState(false);
  const [exampleIdx, setExampleIdx] = useState(0);

  const onSearch = async () => {
    if (!query.trim()) {
      toast.error("Please enter a search query");
      return;
    }
    if (selectedSources.length === 0) {
      toast.error("Please select at least one search source");
      return;
    }
    setView("results");
    await runSearch();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSearch();
    }
  };

  const onQuickCat = (cat: typeof QUICK_CATEGORIES[number]) => {
    setQuery(cat.query);
    setSelectedSources([...cat.sources] as any);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/40 text-xs font-medium text-accent-foreground mb-4 border border-border/60">
          <Sparkles className="size-3.5 text-primary" />
          <span>Free • No API key required • Real data</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-3">
          <span className="gradient-text">Nifty Lead Finder</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Find. Discover. Enrich. Export. Turn ordinary search queries into organised, enriched and
          exportable business lead databases.
        </p>
      </div>

      {/* Search box */}
      <div className="glass-card rounded-2xl p-2 shadow-2xl shadow-primary/10">
        <div className="flex flex-col sm:flex-row items-stretch gap-2">
          <div className="flex-1 flex items-center gap-2 px-3">
            <Search className="size-5 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search for businesses, professionals, creators, companies, contacts..."
              className="flex-1 h-12 bg-transparent border-0 focus-visible:ring-0 text-base"
              disabled={isSearching}
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <ProfessionDropdown />
            <SourceDropdown />
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="icon"
              className="h-12 w-12"
              title="Advanced filters"
            >
              <SlidersHorizontal className="size-5" />
            </Button>
            <Button onClick={onSearch} disabled={isSearching} size="lg" className="h-12 px-6">
              {isSearching ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
              <span className="ml-1 hidden sm:inline">{isSearching ? "Searching..." : "Search Leads"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced filters */}
      {showFilters && <AdvancedFilters />}

      {/* Quick categories */}
      <div className="mt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 text-center">
          Quick search categories
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => onQuickCat(cat)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/60 hover:bg-secondary text-secondary-foreground transition-colors border border-border/60"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Example queries */}
      <div className="mt-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 text-center">
          Try a sample query
        </div>
        <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto">
          {EXAMPLE_QUERIES.map((ex, i) => (
            <button
              key={ex}
              onClick={() => { setQuery(ex); setExampleIdx(i); }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40"
              title={ex}
            >
              {ex.length > 40 ? ex.slice(0, 40) + "…" : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Featured templates */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Featured templates</h3>
          <Button variant="ghost" size="sm" onClick={() => setView("templates")}>
            View all
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {TEMPLATES.slice(0, 8).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setQuery(t.query);
                setSelectedSources(t.sources as any);
                if (t.industry) useLeadFinder.getState().setIndustry(t.industry);
                if (t.leadType) useLeadFinder.getState().setLeadType(t.leadType);
              }}
              className="text-left p-3 rounded-lg bg-card/60 hover:bg-card border border-border/60 transition-colors"
            >
              <div className="text-xs text-muted-foreground mb-1">{t.category}</div>
              <div className="text-sm font-medium">{t.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
        <TrustBadge title="100% Free" subtitle="No credit card" />
        <TrustBadge title="No API Keys" subtitle="Works out of the box" />
        <TrustBadge title="Real Data" subtitle="From public sources" />
        <TrustBadge title="CSV / XLSX" subtitle="Export-ready" />
      </div>
    </div>
  );
}

function TrustBadge({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-card/40 border border-border/40">
      <div className="text-sm font-semibold gradient-text">{title}</div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
    </div>
  );
}
