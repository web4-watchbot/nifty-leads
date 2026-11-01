"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Search, Users, Mail, Phone, Globe, Building2, Star, CheckCircle2,
  TrendingUp, Layers, Activity,
} from "lucide-react";
import { useLeadFinder } from "@/lib/store/lead-finder";

const PIE_COLORS = ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#3b82f6", "#ec4899"];

export function DashboardView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const dashboardVersion = useLeadFinder((s) => s.dashboardVersion);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [dashboardVersion]);

  if (loading || !data) {
    return (
      <div className="px-4 py-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const t = data.totals;
  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="size-5 text-primary" /> Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">All values calculated from your actual search history</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI icon={<Search />} label="Total Searches" value={t.totalSearches} color="text-cyan-500" />
        <KPI icon={<Layers />} label="Total Results" value={t.totalResults} color="text-blue-500" />
        <KPI icon={<Users />} label="Total Leads" value={t.totalLeads} color="text-violet-500" />
        <KPI icon={<Star />} label="Saved Leads" value={t.savedLeads} color="text-amber-500" />
        <KPI icon={<Mail />} label="Emails Discovered" value={t.emailsDiscovered} color="text-emerald-500" />
        <KPI icon={<CheckCircle2 />} label="Verified Emails" value={t.verifiedEmails} color="text-emerald-600" />
        <KPI icon={<Phone />} label="Phone Numbers" value={t.phonesFound} color="text-rose-500" />
        <KPI icon={<Globe />} label="Websites" value={t.websitesDiscovered} color="text-sky-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="size-4" /> Leads discovered over time</CardTitle></CardHeader>
          <CardContent>
            {data.charts.leadsTimeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.charts.leadsTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Leads by source</CardTitle></CardHeader>
          <CardContent>
            {data.charts.leadsBySource.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.charts.leadsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label>
                    {data.charts.leadsBySource.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Leads by country</CardTitle></CardHeader>
          <CardContent>
            {data.charts.leadsByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.charts.leadsByCountry} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis dataKey="country" type="category" width={80} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Leads by industry</CardTitle></CardHeader>
          <CardContent>
            {data.charts.leadsByIndustry.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.charts.leadsByIndustry} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis dataKey="industry" type="category" width={100} tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Contact completeness</CardTitle></CardHeader>
          <CardContent>
            {data.charts.contactCompleteness.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.charts.contactCompleteness}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="field" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Empty />}
          </CardContent>
        </Card>
      </div>

      {/* Recent searches */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Recent search activity</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-72">
            {data.recentSearches.length === 0 ? <Empty /> : (
              <div className="space-y-2">
                {data.recentSearches.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/40">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.query}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(s.createdAt).toLocaleString()} • {s.sources.split(",").length} source(s)
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{s.uniqueLeads} leads</span>
                      <span className={`px-1.5 py-0.5 rounded ${s.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : s.status === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className={`size-8 rounded-lg bg-muted/40 flex items-center justify-center mb-2 ${color}`}>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return <div className="text-center text-xs text-muted-foreground py-12">No data yet. Run a search to populate this chart.</div>;
}

// Suppress unused import
void Building2;
