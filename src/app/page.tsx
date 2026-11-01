"use client";

import { useLeadFinder } from "@/lib/store/lead-finder";
import { Sidebar, MobileNav } from "@/components/lead-finder/sidebar";
import { SearchView } from "@/components/lead-finder/search-view";
import { ResultsView } from "@/components/lead-finder/results-view";
import { LeadDetailDrawer } from "@/components/lead-finder/lead-detail-drawer";
import { SavedLeadsView } from "@/components/lead-finder/saved-leads-view";
import { ListsView } from "@/components/lead-finder/lists-view";
import { DashboardView } from "@/components/lead-finder/dashboard-view";
import { TemplatesView } from "@/components/lead-finder/templates-view";
import { BulkView } from "@/components/lead-finder/bulk-view";
import { HistoryView } from "@/components/lead-finder/history-view";
import { SettingsView } from "@/components/lead-finder/settings-view";
import { Footer } from "@/components/lead-finder/footer";

export default function Home() {
  const view = useLeadFinder((s) => s.view);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <MobileNav />
          <div className="flex-1">
            {view === "search" && <SearchView />}
            {view === "results" && <ResultsView />}
            {view === "leads" && <SavedLeadsView />}
            {view === "lists" && <ListsView />}
            {view === "dashboard" && <DashboardView />}
            {view === "templates" && <TemplatesView />}
            {view === "bulk" && <BulkView />}
            {view === "history" && <HistoryView />}
            {view === "settings" && <SettingsView />}
          </div>
          <Footer />
        </main>
      </div>
      <LeadDetailDrawer />
    </div>
  );
}
