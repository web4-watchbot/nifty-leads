"use client";

import { useEffect, useState } from "react";
import { useLeadFinder } from "@/lib/store/lead-finder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  FolderKanban, Plus, Trash2, Folder, Users,
} from "lucide-react";
import { toast } from "sonner";

interface LeadList {
  id: string;
  name: string;
  description: string;
  color: string;
  _count?: { items: number };
  createdAt: string;
}

export function ListsView() {
  const [lists, setLists] = useState<LeadList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("cyan");
  const listsVersion = useLeadFinder((s) => s.listsVersion);
  const bumpLists = useLeadFinder((s) => s.bumpLists);
  const setView = useLeadFinder((s) => s.setView);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lists");
      const data = await res.json();
      setLists(data.lists || []);
    } catch {
      toast.error("Failed to load lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [listsVersion]);

  const onCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a list name");
      return;
    }
    try {
      await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      });
      bumpLists();
      setShowCreate(false);
      setName("");
      setDescription("");
      toast.success("List created");
    } catch {
      toast.error("Failed to create list");
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this list? Leads will not be deleted.")) return;
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    bumpLists();
    toast.success("List deleted");
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FolderKanban className="size-5 text-primary" /> Lead Lists
          </h2>
          <p className="text-sm text-muted-foreground">Organize saved leads into named folders for outreach campaigns</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1" /> New list
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : lists.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Folder className="size-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No lists yet. Create your first list to organize leads.</p>
            <Button onClick={() => setShowCreate(true)}><Plus className="size-4 mr-1" /> Create list</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {lists.map((list) => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`size-8 rounded-lg bg-${list.color}-500/20 flex items-center justify-center`}>
                      <Folder className={`size-4 text-${list.color}-500`} />
                    </div>
                    <CardTitle className="text-base truncate">{list.name}</CardTitle>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onDelete(list.id)}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {list.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{list.description}</p>}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    <Users className="size-3 mr-1" />
                    {list._count?.items || 0} leads
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setView("leads")}>View leads</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new list</DialogTitle>
            <DialogDescription>Lists are private folders for organizing saved leads.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Australian Accounting Firms" />
            </div>
            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What kind of leads will you store here?" />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {["cyan", "blue", "emerald", "amber", "rose", "violet"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`size-8 rounded-full bg-${c}-500 ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-primary" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={onCreate}>Create list</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
