"use client";

import { useEffect, useState } from "react";
import { useLeadFinder, type LeadRow } from "@/lib/store/lead-finder";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Mail, Phone, Globe, MapPin, Building2, User, Briefcase,
  ExternalLink, Save, RefreshCw, Sparkles, ShieldCheck, ShieldAlert,
  Linkedin, Youtube, Instagram, Facebook, Twitter, Github, Clock, Database,
  AlertTriangle, Tag, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "qualified", label: "Qualified" },
  { value: "contacted", label: "Contacted" },
  { value: "follow_up", label: "Follow-up Required" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
  { value: "archived", label: "Archived" },
];

export function LeadDetailDrawer() {
  const activeLeadId = useLeadFinder((s) => s.activeLeadId);
  const setActiveLeadId = useLeadFinder((s) => s.setActiveLeadId);
  const results = useLeadFinder((s) => s.results);
  const bumpSavedLeads = useLeadFinder((s) => s.bumpSavedLeads);
  const [lead, setLead] = useState<LeadRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("new");

  useEffect(() => {
    if (!activeLeadId) {
      setLead(null);
      return;
    }
    // Find in current results first
    const fromResults = results.find((r) => r.id === activeLeadId);
    if (fromResults) {
      setLead(fromResults);
      setNotes(fromResults.notes || "");
      setTags(fromResults.tags || "");
      setStatus(fromResults.status || "new");
      return;
    }
    // Otherwise fetch from API
    setLoading(true);
    fetch(`/api/leads/${activeLeadId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.lead) {
          setLead(data.lead);
          setNotes(data.lead.notes || "");
          setTags(data.lead.tags || "");
          setStatus(data.lead.status || "new");
        }
      })
      .finally(() => setLoading(false));
  }, [activeLeadId, results]);

  const onEnrich = async () => {
    if (!lead) return;
    setEnriching(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/enrich`, { method: "POST" });
      if (!res.ok) throw new Error("Enrichment failed");
      const data = await res.json();
      setLead(data.lead);
      // Update in results array too
      const updated = useLeadFinder.getState().results.map((r) => r.id === data.lead.id ? data.lead : r);
      useLeadFinder.getState().setResults(updated);
      toast.success(`Enriched: ${data.crawled.emailsFound} emails, ${data.crawled.phonesFound} phones found`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnriching(false);
    }
  };

  const onSave = async () => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSaved: true, notes, tags, status }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setLead(data.lead);
      bumpSavedLeads();
      // Update results array
      const updated = useLeadFinder.getState().results.map((r) => r.id === data.lead.id ? data.lead : r);
      useLeadFinder.getState().setResults(updated);
      toast.success("Lead saved & updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Sheet open={!!activeLeadId} onOpenChange={(o) => !o && setActiveLeadId(null)}>
      <SheetContent className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-4 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 text-base">
            {loading ? "Loading..." : (lead?.businessName || lead?.contactPerson || "Lead detail")}
            {lead?.verificationStatus === "verified" && (
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                <ShieldCheck className="size-3 mr-1" /> Verified
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {lead && <span className="flex items-center gap-1.5"><Database className="size-3" /> Source: <span className="capitalize font-medium">{lead.sourceProvider}</span></span>}
          </SheetDescription>
        </SheetHeader>

        {lead && (
          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 grid grid-cols-4 h-9">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
              <TabsTrigger value="sources" className="text-xs">Sources</TabsTrigger>
              <TabsTrigger value="manage" className="text-xs">Manage</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <div className="p-4 pb-8">
                <TabsContent value="overview" className="mt-0 space-y-3">
                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-2">
                    <ScoreCard label="Relevance" score={lead.relevanceScore} icon={<Sparkles className="size-3.5" />} />
                    <ScoreCard label="Completeness" score={lead.completenessScore} icon={<Database className="size-3.5" />} />
                  </div>

                  {/* AI summary */}
                  {lead.aiSummary && (
                    <div className="p-3 rounded-lg bg-accent/30 border border-border/60">
                      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-primary" /> AI Summary
                      </div>
                      <p className="text-sm">{lead.aiSummary}</p>
                    </div>
                  )}

                  {/* Relevance reason */}
                  {lead.relevanceReason && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Why this matches:</strong> {lead.relevanceReason}
                    </div>
                  )}

                  <Separator />

                  {/* Identity */}
                  <Section title="Identity">
                    <Field icon={<Building2 className="size-3.5" />} label="Business" value={lead.businessName} />
                    <Field icon={<User className="size-3.5" />} label="Contact Person" value={lead.contactPerson} />
                    <Field icon={<Briefcase className="size-3.5" />} label="Position" value={lead.position} />
                    <Field icon={<Briefcase className="size-3.5" />} label="Industry" value={lead.industry} />
                    {lead.leadType && <Field icon={<Tag className="size-3.5" />} label="Type" value={lead.leadType} />}
                  </Section>

                  {/* Description */}
                  {lead.description && (
                    <Section title="Description">
                      <p className="text-sm text-muted-foreground">{lead.description}</p>
                    </Section>
                  )}

                  {/* Location */}
                  {(lead.address || lead.city || lead.country) && (
                    <Section title="Location">
                      <Field icon={<MapPin className="size-3.5" />} label="Address" value={lead.address} />
                      <Field icon={<MapPin className="size-3.5" />} label="City" value={lead.city} />
                      <Field icon={<MapPin className="size-3.5" />} label="State" value={lead.state} />
                      <Field icon={<MapPin className="size-3.5" />} label="Country" value={lead.country} />
                      <Field icon={<MapPin className="size-3.5" />} label="Postal Code" value={lead.postalCode} />
                      {lead.latitude && lead.longitude && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${lead.latitude}&mlon=${lead.longitude}#map=15/${lead.latitude}/${lead.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <MapPin className="size-3" /> View on OpenStreetMap
                        </a>
                      )}
                    </Section>
                  )}
                </TabsContent>

                <TabsContent value="contact" className="mt-0 space-y-3">
                  {/* Email */}
                  <Section title="Email">
                    {lead.email ? (
                      <>
                        <Field icon={<Mail className="size-3.5" />} label="Primary Email" value={lead.email} />
                        <EmailStatusBadge status={lead.emailStatus} />
                        {lead.emailExtra && (
                          <Field icon={<Mail className="size-3.5" />} label="Additional Emails" value={lead.emailExtra} />
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button asChild size="sm" variant="outline">
                            <a href={`mailto:${lead.email}`}><Mail className="size-3.5 mr-1" /> Compose</a>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(lead.email!); toast.success("Email copied"); }}>
                            Copy
                          </Button>
                        </div>
                      </>
                    ) : (
                      <EmptyField label="No email found in public sources" />
                    )}
                  </Section>

                  {/* Phone */}
                  <Section title="Phone">
                    {lead.phone ? (
                      <>
                        <Field icon={<Phone className="size-3.5" />} label="Primary Phone" value={lead.phone} />
                        {lead.phoneExtra && <Field icon={<Phone className="size-3.5" />} label="Additional Phones" value={lead.phoneExtra} />}
                        <Button asChild size="sm" variant="outline" className="mt-2">
                          <a href={`tel:${lead.phone}`}><Phone className="size-3.5 mr-1" /> Call</a>
                        </Button>
                      </>
                    ) : (
                      <EmptyField label="No phone found in public sources" />
                    )}
                  </Section>

                  {/* Website */}
                  <Section title="Website">
                    {lead.website ? (
                      <div className="space-y-1">
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                          <Globe className="size-3.5" /> {prettyDomain(lead.website)}
                          <ExternalLink className="size-3" />
                        </a>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={onEnrich} disabled={enriching}>
                            {enriching ? <RefreshCw className="size-3.5 mr-1 animate-spin" /> : <RefreshCw className="size-3.5 mr-1" />}
                            Enrich This Lead
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <EmptyField label="No website found" />
                    )}
                  </Section>

                  {/* Social */}
                  <Section title="Social Profiles">
                    <div className="flex flex-wrap gap-2">
                      {lead.linkedinUrl && <SocialButton href={lead.linkedinUrl} icon={<Linkedin className="size-3.5" />} label="LinkedIn" />}
                      {lead.youtubeUrl && <SocialButton href={lead.youtubeUrl} icon={<Youtube className="size-3.5" />} label="YouTube" />}
                      {lead.instagramUrl && <SocialButton href={lead.instagramUrl} icon={<Instagram className="size-3.5" />} label="Instagram" />}
                      {lead.facebookUrl && <SocialButton href={lead.facebookUrl} icon={<Facebook className="size-3.5" />} label="Facebook" />}
                      {lead.xUrl && <SocialButton href={lead.xUrl} icon={<Twitter className="size-3.5" />} label="X" />}
                      {lead.githubUrl && <SocialButton href={lead.githubUrl} icon={<Github className="size-3.5" />} label="GitHub" />}
                      {!lead.linkedinUrl && !lead.youtubeUrl && !lead.instagramUrl && !lead.facebookUrl && !lead.xUrl && !lead.githubUrl && (
                        <EmptyField label="No public social profiles found" />
                      )}
                    </div>
                  </Section>

                  {/* Compliance notice */}
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs flex gap-2">
                    <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong>Responsible use notice:</strong> Finding a publicly listed email does not automatically grant permission to send marketing communications.
                      Always comply with GDPR, CCPA, CAN-SPAM, CASL, India&apos;s DPDP Act and other applicable laws.
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="sources" className="mt-0 space-y-2">
                  <div className="text-xs text-muted-foreground mb-2">
                    Every field is traceable to its original source. Click a source to verify.
                  </div>
                  {lead.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-card/40 border border-border/60 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Database className="size-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{src.title || prettyDomain(src.url)}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{src.url}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] capitalize">{src.provider}</Badge>
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="size-3" /> {new Date(src.date).toLocaleString()}
                      </div>
                    </a>
                  ))}
                </TabsContent>

                <TabsContent value="manage" className="mt-0 space-y-3">
                  <Section title="Status">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Section>

                  <Section title="Tags (comma-separated)">
                    <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. hot-lead, enterprise, q4" />
                  </Section>

                  <Section title="Private notes">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add internal notes (separate from publicly discovered source data)..."
                      rows={4}
                    />
                  </Section>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={onSave} className="flex-1">
                      <Save className="size-4 mr-1" /> Save Lead
                    </Button>
                    <Button variant="outline" onClick={onEnrich} disabled={enriching}>
                      {enriching ? <RefreshCw className="size-4 mr-1 animate-spin" /> : <RefreshCw className="size-4 mr-1" />}
                      Re-enrich
                    </Button>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-muted-foreground mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider block">{label}</span>
        <span className="break-words">{value}</span>
      </div>
    </div>
  );
}

function EmptyField({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground italic">{label}</div>;
}

function ScoreCard({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color = score >= 70 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
    : score >= 40 ? "text-amber-500 bg-amber-500/10 border-amber-500/30"
    : "text-muted-foreground bg-muted/40 border-border/40";
  return (
    <div className={cn("p-3 rounded-lg border", color)}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <div className="text-2xl font-bold">{score}<span className="text-xs opacity-60">/100</span></div>
    </div>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    verified: { label: "Verified", color: "text-emerald-500 border-emerald-500/30" },
    publicly_listed: { label: "Publicly listed", color: "text-cyan-500 border-cyan-500/30" },
    inferred: { label: "Inferred (unverified)", color: "text-amber-500 border-amber-500/30" },
    invalid: { label: "Invalid", color: "text-destructive border-destructive/30" },
    not_found: { label: "Not found", color: "text-muted-foreground border-border/40" },
  };
  const cfg = map[status] || map.not_found;
  return (
    <Badge variant="outline" className={cn("text-[10px]", cfg.color)}>
      {cfg.label}
    </Badge>
  );
}

function SocialButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border/60 hover:border-primary/40 text-xs font-medium transition-colors">
      {icon} {label}
      <ExternalLink className="size-3 opacity-50" />
    </a>
  );
}

function prettyDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

// Suppress unused import warning
void ShieldAlert;
void ChevronRight;
