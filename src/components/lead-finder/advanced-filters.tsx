"use client";

import { useLeadFinder } from "@/lib/store/lead-finder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Globe, Briefcase, User, Mail, Filter } from "lucide-react";

const COUNTRIES = [
  { value: "", label: "Worldwide" },
  { value: "United States", label: "United States" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "India", label: "India" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "Singapore", label: "Singapore" },
];

const INDUSTRIES = [
  { value: "", label: "Any industry" },
  { value: "Technology", label: "Technology" },
  { value: "Finance", label: "Finance" },
  { value: "Accounting", label: "Accounting" },
  { value: "Healthcare", label: "Healthcare" },
  { value: "Education", label: "Education" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Manufacturing", label: "Manufacturing" },
  { value: "Retail", label: "Retail" },
  { value: "E-commerce", label: "E-commerce" },
  { value: "Hospitality", label: "Hospitality" },
  { value: "Marketing", label: "Marketing" },
  { value: "Media", label: "Media" },
  { value: "Recruitment", label: "Recruitment" },
  { value: "Legal", label: "Legal" },
  { value: "Professional Services", label: "Professional Services" },
];

const LEAD_TYPES = [
  { value: "", label: "Any lead type" },
  { value: "business", label: "Business" },
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual professional" },
  { value: "freelancer", label: "Freelancer" },
  { value: "creator", label: "Creator" },
  { value: "agency", label: "Agency" },
  { value: "decision_maker", label: "Decision-maker" },
  { value: "local_service", label: "Local service provider" },
];

export function AdvancedFilters() {
  const {
    location, setLocation,
    industry, setIndustry,
    leadType, setLeadType,
    maxResults, setMaxResults,
    enrichWebsites, setEnrichWebsites,
  } = useLeadFinder();

  return (
    <div className="mt-3 glass-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Filter className="size-3.5" />
        Advanced Filters
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs flex items-center gap-1.5 mb-1">
            <Globe className="size-3" /> Location
          </Label>
          <Select value={location || "worldwide"} onValueChange={(v) => setLocation(v === "worldwide" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Worldwide" /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.value || "worldwide"} value={c.value || "worldwide"}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1.5 mb-1">
            <Briefcase className="size-3" /> Industry
          </Label>
          <Select value={industry || "any"} onValueChange={(v) => setIndustry(v === "any" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Any industry" /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((c) => (
                <SelectItem key={c.value || "any"} value={c.value || "any"}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs flex items-center gap-1.5 mb-1">
            <User className="size-3" /> Lead Type
          </Label>
          <Select value={leadType || "any"} onValueChange={(v) => setLeadType(v === "any" ? "" : v)}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Any lead type" /></SelectTrigger>
            <SelectContent>
              {LEAD_TYPES.map((c) => (
                <SelectItem key={c.value || "any"} value={c.value || "any"}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs flex items-center justify-between mb-1">
            <span>Maximum results</span>
            <span className="text-primary font-mono">{maxResults}</span>
          </Label>
          <Slider
            value={[maxResults]}
            min={5}
            max={100}
            step={5}
            onValueChange={(v) => setMaxResults(v[0])}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-card/40 border border-border/60">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            <div>
              <div className="text-sm font-medium">Website enrichment</div>
              <div className="text-[11px] text-muted-foreground">Crawl top sites for emails & schema.org data</div>
            </div>
          </div>
          <Switch checked={enrichWebsites} onCheckedChange={setEnrichWebsites} />
        </div>
      </div>
    </div>
  );
}
