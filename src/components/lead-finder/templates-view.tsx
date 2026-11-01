"use client";

import { useState } from "react";
import { useLeadFinder } from "@/lib/store/lead-finder";
import { useRunSearch } from "@/lib/store/use-run-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TEMPLATES, TEMPLATE_CATEGORIES, type SearchTemplate } from "@/lib/templates";
import {
  Library, Sparkles, Search, MapPin, Briefcase, Save, X, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TemplatesView() {
  const {
    query, setQuery,
    selectedSources, setSelectedSources,
    setIndustry, setLeadType, setLocation,
    setView,
  } = useLeadFinder();
  const runSearch = useRunSearch();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [locationInput, setLocationInput] = useState("");
  const [industryInput, setIndustryInput] = useState("");
  const [showSaveCustom, setShowSaveCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  const apply = (t: SearchTemplate) => {
    setQuery(t.query);
    setSelectedSources(t.sources as any);
    if (t.industry) setIndustry(t.industry);
    if (t.leadType) setLeadType(t.leadType);
    if (locationInput) setLocation(locationInput);
    if (industryInput) setIndustry(industryInput);
    toast.success(`Template applied: ${t.name}`);
  };

  const runNow = async (t: SearchTemplate) => {
    apply(t);
    setView("results");
    setTimeout(() => runSearch(), 100);
  };

  const saveCustom = async () => {
    if (!customName.trim() || !query.trim()) {
      toast.error("Name and query are required");
      return;
    }
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: customName, query, sources: selectedSources, category: "Custom" }),
    });
    toast.success("Custom template saved");
    setShowSaveCustom(false);
    setCustomName("");
  };

  const filtered = activeCategory === "All"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === activeCategory);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Library className="size-5 text-primary" /> Search Templates
          </h2>
          <p className="text-sm text-muted-foreground">Pre-built searches for common lead types</p>
        </div>
        <Button variant="outline" onClick={() => setShowSaveCustom(!showSaveCustom)}>
          <Plus className="size-4 mr-1" /> Save current as template
        </Button>
      </div>

      {/* Custom save form */}
      {showSaveCustom && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Save custom template</Label>
              <Button size="sm" variant="ghost" onClick={() => setShowSaveCustom(false)}><X className="size-4" /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cname">Template name</Label>
                <Input id="cname" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. NY SaaS founders" />
              </div>
              <div>
                <Label>Current query</Label>
                <Input value={query} disabled />
              </div>
            </div>
            <Button onClick={saveCustom}><Save className="size-4 mr-1" /> Save</Button>
          </CardContent>
        </Card>
      )}

      {/* Optional overrides */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Apply location/industry override:</div>
          <div className="flex items-center gap-1">
            <MapPin className="size-3.5 text-muted-foreground" />
            <Input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="e.g. Sydney" className="h-8 w-32" />
          </div>
          <div className="flex items-center gap-1">
            <Briefcase className="size-3.5 text-muted-foreground" />
            <Input value={industryInput} onChange={(e) => setIndustryInput(e.target.value)} placeholder="e.g. Marketing" className="h-8 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {["All", ...TEMPLATE_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              activeCategory === cat ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 hover:border-primary/40"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="p-3 pb-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{t.name}</CardTitle>
                {t.leadType && <Badge variant="outline" className="text-[9px] capitalize">{t.leadType.replace("_", " ")}</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground">{t.category}</div>
            </CardHeader>
            <CardContent className="p-3 pt-1">
              <code className="block text-[11px] p-2 rounded bg-muted/40 font-mono mb-2 break-all">{t.query}</code>
              <div className="flex flex-wrap gap-1 mb-2">
                {t.sources.map((s) => (
                  <Badge key={s} variant="outline" className="text-[9px] capitalize">{s}</Badge>
                ))}
              </div>
              {t.expectedFields.length > 0 && (
                <div className="text-[10px] text-muted-foreground mb-2">
                  <strong>Expected:</strong> {t.expectedFields.join(", ")}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => apply(t)}>
                  <Sparkles className="size-3 mr-1" /> Apply
                </Button>
                <Button size="sm" className="flex-1" onClick={() => runNow(t)}>
                  <Search className="size-3 mr-1" /> Run
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
