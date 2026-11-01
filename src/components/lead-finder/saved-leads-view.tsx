"use client";

import { useEffect, useState } from "react";
import { useLeadFinder, type LeadRow } from "@/lib/store/lead-finder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Search, Download, Trash2, Star, Mail, Phone, Globe, MapPin,
  Filter, ChevronDown, Users, Inbox,
} from "lucide-react";
import { ExportDialog } from "./export-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "qualified", label: "Qualified" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-up" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
  { value: "archived", label: "Archived" },
];

export function SavedLeadsView() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showExport, setShowExport] = useState(false);
  const savedLeadsVersion = useLeadFinder((s) => s.savedLeadsVersion);
  const setActiveLeadId = useLeadFinder((s) => s.setActiveLeadId);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ saved: "true", limit: "500" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (e) {
      toast.error("Failed to load saved leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [savedLeadsVersion, statusFilter]);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [l.businessName, l.contactPerson, l.email, l.phone, l.city, l.country, l.industry]
      .filter(Boolean).some((v) => (v as string).toLowerCase().includes(q));
  });

  const onUnsave = async (id: string) => {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSaved: false }),
    });
    useLeadFinder.getState().bumpSavedLeads();
    toast.success("Removed from saved");
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this lead permanently?")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    useLeadFinder.getState().bumpSavedLeads();
    toast.success("Lead deleted");
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="size-5 text-amber-400" /> Saved Leads
          </h2>
          <p className="text-sm text-muted-foreground">{leads.length} saved lead{leads.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowExport(true)} disabled={!leads.length}>
          <Download className="size-4 mr-1" /> Export all
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search saved leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                statusFilter === s.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/60 hover:border-primary/40"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Inbox className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No saved leads yet. Save leads from your search results to see them here.</p>
            <Button onClick={() => useLeadFinder.getState().setView("search")}>Start a search</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ScrollArea className="max-h-[70vh]">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead>Business / Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => (
                  <TableRow key={lead.id} className="cursor-pointer" onClick={() => setActiveLeadId(lead.id)}>
                    <TableCell>
                      <div className="font-medium text-sm">{lead.businessName || lead.contactPerson || "Untitled"}</div>
                      {lead.industry && <div className="text-xs text-muted-foreground">{lead.industry}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      {lead.email ? <span className="flex items-center gap-1"><Mail className="size-3 text-muted-foreground" />{lead.email}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {lead.phone ? <span className="flex items-center gap-1"><Phone className="size-3 text-muted-foreground" />{lead.phone}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{[lead.city, lead.country].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{lead.status?.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{lead.relevanceScore}/{lead.completenessScore}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onUnsave(lead.id)} title="Remove from saved">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDelete(lead.id)} title="Delete">
                          <Trash2 className="size-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {showExport && <ExportDialog scope="enriched" onClose={() => setShowExport(false)} />}
    </div>
  );
}

// Suppress unused import warnings
void Filter; void ChevronDown; void Users; void Globe; void MapPin;
