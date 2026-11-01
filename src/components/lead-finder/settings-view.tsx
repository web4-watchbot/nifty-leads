"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings, Database, ShieldCheck, KeyRound, CheckCircle2, XCircle,
  ExternalLink, Plus, Trash2, AlertTriangle, FileText, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ProviderInfo {
  freeProviders: any[];
  optionalProviders: any[];
  apiChecklist: any[];
}

interface SuppressionRecord {
  id: string;
  value: string;
  kind: string;
  reason: string;
  createdAt: string;
}

export function SettingsView() {
  const [info, setInfo] = useState<ProviderInfo | null>(null);
  const [suppression, setSuppression] = useState<SuppressionRecord[]>([]);
  const [newSuppValue, setNewSuppValue] = useState("");
  const [newSuppKind, setNewSuppKind] = useState<"email" | "phone" | "domain">("email");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testKey, setTestKey] = useState("");

  useEffect(() => {
    fetch("/api/providers").then((r) => r.json()).then(setInfo);
    fetch("/api/suppression").then((r) => r.json()).then((d) => setSuppression(d.records || []));
  }, []);

  const onTest = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, apiKey: testKey }),
      });
      const data = await res.json();
      if (data.ok) toast.success(`${providerId}: key format looks valid`);
      else toast.error(`${providerId}: ${data.error || data.message}`);
    } catch {
      toast.error("Test failed");
    } finally {
      setTestingProvider(null);
      setTestKey("");
    }
  };

  const onAddSuppression = async () => {
    if (!newSuppValue.trim()) return;
    await fetch("/api/suppression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newSuppValue, kind: newSuppKind }),
    });
    const data = await fetch("/api/suppression").then((r) => r.json());
    setSuppression(data.records || []);
    setNewSuppValue("");
    toast.success("Added to suppression list");
  };

  const onRemoveSupp = async (id: string) => {
    await fetch(`/api/suppression?id=${id}`, { method: "DELETE" });
    setSuppression((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="size-5 text-primary" /> Settings
        </h2>
        <p className="text-sm text-muted-foreground">Manage search providers, API connections, and compliance</p>
      </div>

      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="checklist">API Checklist</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        {/* Providers */}
        <TabsContent value="providers" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="size-4 text-emerald-500" /> Free providers (active, no API key required)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {info?.freeProviders.map((p) => (
                <div key={p.id} className="flex items-start justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{p.name}</span>
                      <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">FREE</Badge>
                      <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">
                        <CheckCircle2 className="size-2.5 mr-1" /> Connected
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                    {p.rateLimitNote && <p className="text-[10px] text-muted-foreground mt-1">Rate limit: {p.rateLimitNote}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">{p.group}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <KeyRound className="size-4 text-amber-500" /> Optional BYOK providers
              </CardTitle>
              <p className="text-xs text-muted-foreground">Bring your own API keys to unlock richer integrations. The app works fully without any of these.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {info?.optionalProviders.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-card/40 border border-border/60">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{p.name}</span>
                        <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">BYOK</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                      {p.freeTier && <p className="text-[10px] text-emerald-500 mt-1">Free tier: {p.freeTier}</p>}
                    </div>
                    <a href={p.docsUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="password"
                      placeholder={`${p.apiKeyField}=...`}
                      value={testingProvider === p.id ? testKey : ""}
                      onChange={(e) => setTestKey(e.target.value)}
                      className="h-8 text-xs font-mono"
                      onFocus={() => setTestingProvider(p.id)}
                    />
                    <Button size="sm" variant="outline" onClick={() => onTest(p.id)} disabled={testingProvider === p.id && !testKey}>
                      {testingProvider === p.id ? <Loader2 className="size-3 animate-spin" /> : "Test"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API checklist */}
        <TabsContent value="checklist" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">API configuration checklist</CardTitle>
              <p className="text-xs text-muted-foreground">As required by the spec — actual status of every integration.</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left p-2">Provider</th>
                      <th className="text-left p-2">Purpose</th>
                      <th className="text-left p-2">API Key Required</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info?.apiChecklist.map((row) => (
                      <tr key={row.provider} className="border-b border-border/30">
                        <td className="p-2 font-medium">{row.provider}</td>
                        <td className="p-2 text-muted-foreground">{row.purpose}</td>
                        <td className="p-2">
                          {row.apiKeyRequired
                            ? <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">Yes (BYOK)</Badge>
                            : <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">No</Badge>}
                        </td>
                        <td className="p-2">
                          {row.integrationStatus === "free_no_key"
                            ? <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30"><CheckCircle2 className="size-2.5 mr-1" />Active</Badge>
                            : <Badge variant="outline" className="text-[9px] text-amber-500 border-amber-500/30">Available (BYOK)</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" /> Suppression / Do-Not-Contact list
              </CardTitle>
              <p className="text-xs text-muted-foreground">Exclude specific emails, phones, or domains from your exports.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <select
                  value={newSuppKind}
                  onChange={(e) => setNewSuppKind(e.target.value as any)}
                  className="h-9 px-2 rounded-md border border-border bg-background text-sm"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="domain">Domain</option>
                </select>
                <Input
                  value={newSuppValue}
                  onChange={(e) => setNewSuppValue(e.target.value)}
                  placeholder={`Enter ${newSuppKind}...`}
                  className="flex-1 h-9"
                  onKeyDown={(e) => { if (e.key === "Enter") onAddSuppression(); }}
                />
                <Button onClick={onAddSuppression}><Plus className="size-4 mr-1" /> Add</Button>
              </div>
              <Separator />
              {suppression.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No suppression records yet.</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {suppression.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded bg-card/40 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] capitalize">{r.kind}</Badge>
                        <span className="font-mono">{r.value}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRemoveSupp(r.id)}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" /> Privacy & legal compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-muted-foreground">
              <p><strong className="text-foreground">Public data only.</strong> Nifty Lead Finder only accesses publicly available and lawfully accessible information from sources whose terms permit it.</p>
              <p><strong className="text-foreground">No bypassing.</strong> We respect robots.txt, official API restrictions, CAPTCHAs, authentication, paywalls and rate limits.</p>
              <p><strong className="text-foreground">Field-level provenance.</strong> Every contact detail is traceable to its original source URL.</p>
              <p><strong className="text-foreground">No fabrication.</strong> We never invent emails, phones, or addresses. Missing fields are shown as &quot;Not found&quot;.</p>
              <p><strong className="text-foreground">Compliance-ready.</strong> Designed to support GDPR, UK GDPR, CCPA/CPRA, CAN-SPAM, CASL, and India&apos;s DPDP Act.</p>
              <p><strong className="text-foreground">No automated outreach.</strong> The product focuses on discovery and export, not bulk email campaigns.</p>
              <p className="text-amber-600 mt-3"><strong>Important:</strong> Finding a publicly listed email does not automatically grant permission to send marketing communications. Always verify consent and comply with applicable laws.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About */}
        <TabsContent value="about" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">About Nifty Lead Finder</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p><strong className="text-foreground">Nifty Lead Finder</strong> by NiftyTechFinds.com is a global AI-powered lead discovery engine.</p>
              <p>It uses 11 free, no-API-key data sources (Web Search, LinkedIn Profiles, Crunchbase, Product Hunt, Social Profiles — X/Reddit/IndieHackers/Stack Overflow/Mastodon, OpenStreetMap, Wikipedia, GitHub, Hacker News, YouTube oEmbed, and direct website crawling) to discover publicly available business leads.</p>
              <p><strong className="text-foreground">Tagline:</strong> Find. Discover. Enrich. Export.</p>
              <p><strong className="text-foreground">Pricing:</strong> 100% free, no signup required, no API keys.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="size-4" /> Documentation</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <a href="https://niftytechfinds.com" target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">NiftyTechFinds.com →</a>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">OpenStreetMap copyright &amp; ODbL →</a>
              <a href="https://www.wikipedia.org" target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">Wikipedia →</a>
              <a href="https://docs.github.com/en/rest/search" target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline">GitHub Search API docs →</a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
