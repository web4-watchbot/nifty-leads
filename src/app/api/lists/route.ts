import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getDemoUserId();
  const lists = await db.leadList.findMany({
    where: { userId },
    include: { _count: { select: { items: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ lists });
}

export async function POST(req: NextRequest) {
  const body = (await req.json());
  const userId = await getDemoUserId();
  const list = await db.leadList.create({
    data: {
      userId,
      name: body.name,
      description: body.description || "",
      color: body.color || "cyan",
    },
  });
  // Optional: bulk-add lead IDs
  if (Array.isArray(body.leadIds) && body.leadIds.length) {
    await db.leadListItem.createMany({
      data: body.leadIds.map((leadId: string) => ({ listId: list.id, leadId })),
      skipDuplicates: true,
    });
  }
  const refreshed = await db.leadList.findUnique({
    where: { id: list.id },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({ list: refreshed });
}
