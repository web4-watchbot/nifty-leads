"use client";

import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Loader2, FileSpreadsheet, FileText } from "lucide-react";
import { DEFAULT_EXPORT_COLUMNS } from "@/lib/export/csv";
import { toast } from "sonner";
import { useLeadFinder } from "@/lib/store/lead-finder";
import { cn } from "@/lib/utils";

interface ExportDialogProps {
  scope: "all_results" | "selected" | "filtered" | "saved_list" | "enriched" | "email_available" | "phone_available" | "businesses" | "professionals";
  listId?: string;
  onClose: () => void;
}

export function ExportDialog({ scope, listId, onClose }: ExportDialogProps) {
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [columns, setColumns] = useState<string[]>(DEFAULT_EXPORT_COLUMNS.map((c) => c.key));
  const [exporting, setExporting] = useState(false);
  // Subscribe to the Set itself (stable reference) and convert to array in useMemo
  const selectedLeadIdsSet = useLeadFinder((s) => s.selectedLeadIds);
  const selectedLeadIds = useMemo(() => Array.from(selectedLeadIdsSet), [selectedLeadIdsSet]);

  const toggleColumn = (key: string) => {
    setColumns((prev) => prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]);
  };

  const onExport = async () => {
    if (columns.length === 0) {
      toast.error("Select at least one column");
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          format,
          columns,
          leadIds: scope === "selected" ? selectedLeadIds : undefined,
          listId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error);
      }
      const blob = await res.blob();
      const fileName = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || `nifty-leads.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const count = res.headers.get("X-Export-Row-Count");
      toast.success(`Exported ${count || ""} leads to ${fileName}`);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Leads</DialogTitle>
          <DialogDescription>
            Choose a format and columns. CSV works in Excel/Google Sheets; XLSX is a native Excel spreadsheet. Both are formula-injection safe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider font-semibold">Format</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setFormat("csv")}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-colors",
                  format === "csv" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <FileText className="size-5 mb-1 text-primary" />
                <div className="text-sm font-semibold">CSV</div>
                <div className="text-[11px] text-muted-foreground">Universal, UTF-8, RFC 4180</div>
              </button>
              <button
                onClick={() => setFormat("xlsx")}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-colors",
                  format === "xlsx" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <FileSpreadsheet className="size-5 mb-1 text-primary" />
                <div className="text-sm font-semibold">Excel (XLSX)</div>
                <div className="text-[11px] text-muted-foreground">Native spreadsheet, shared strings</div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wider font-semibold">Columns ({columns.length})</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setColumns(DEFAULT_EXPORT_COLUMNS.map((c) => c.key))}>All</Button>
                <Button size="sm" variant="ghost" onClick={() => setColumns([])}>None</Button>
              </div>
            </div>
            <ScrollArea className="h-48 rounded-lg border border-border/60">
              <div className="p-2 grid grid-cols-2 gap-1">
                {DEFAULT_EXPORT_COLUMNS.map((c) => (
                  <label key={c.key} className="flex items-center gap-2 p-1.5 rounded hover:bg-accent/40 cursor-pointer text-xs">
                    <Checkbox checked={columns.includes(c.key)} onCheckedChange={() => toggleColumn(c.key)} />
                    <span>{c.label}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          {scope === "selected" && (
            <div className="text-xs text-muted-foreground">
              Exporting {selectedLeadIds.length} selected lead{selectedLeadIds.length !== 1 ? "s" : ""}.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={exporting}>Cancel</Button>
          <Button onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Download className="size-4 mr-1" />}
            Export {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
