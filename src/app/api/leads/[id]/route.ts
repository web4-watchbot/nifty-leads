import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lead: { ...lead, sources: JSON.parse(lead.sourcesJson || "[]") } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json());
  const userId = await getDemoUserId();

  // Track status history if status changed
  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...body };
  delete data.id;
  delete data.userId;
  delete data.sourcesJson;

  // Convert isSaved → savedAt
  if (body.isSaved === true && !existing.isSaved) {
    data.isSaved = true;
    data.savedAt = new Date();
  }

  if (body.status && body.status !== existing.status) {
    await db.leadStatusHistory.create({
      data: {
        leadId: id,
        fromStatus: existing.status,
        toStatus: body.status,
      },
    });
  }

  if (body.notes !== undefined && body.notes !== existing.notes) {
    if (body.notes && body.notes.trim()) {
      await db.leadNote.create({
        data: { leadId: id, content: body.notes },
      });
    }
  }

  const updated = await db.lead.update({
    where: { id },
    data: { ...data, userId }, // ensure userId stays
  });

  return NextResponse.json({ lead: { ...updated, sources: JSON.parse(updated.sourcesJson || "[]") } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
