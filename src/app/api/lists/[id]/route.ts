import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = await getDemoUserId();
  const list = await db.leadList.findFirst({
    where: { id, userId },
    include: { items: { include: { lead: true }, orderBy: { addedAt: "desc" } } },
  });
  if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const format = searchParams.get("format");
  if (format === "ids") {
    return NextResponse.json({ leadIds: list.items.map((i) => i.leadId) });
  }
  return NextResponse.json({
    list,
    leads: list.items.map((i) => ({ ...i.lead, sources: JSON.parse(i.lead.sourcesJson || "[]") })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json());
  const userId = await getDemoUserId();
  // Add or remove leads
  if (Array.isArray(body.addLeadIds)) {
    await db.leadListItem.createMany({
      data: body.addLeadIds.map((leadId: string) => ({ listId: id, leadId })),
      skipDuplicates: true,
    });
  }
  if (Array.isArray(body.removeLeadIds)) {
    await db.leadListItem.deleteMany({
      where: { listId: id, leadId: { in: body.removeLeadIds } },
    });
  }
  if (body.name || body.description !== undefined || body.color) {
    await db.leadList.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.color ? { color: body.color } : {}),
        userId,
      },
    });
  }
  const refreshed = await db.leadList.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({ list: refreshed });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.leadList.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
