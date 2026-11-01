import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getDemoUserId();
  const jobs = await db.searchJob.findMany({
    where: { userId, bulkParentId: null },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { _count: { select: { results: true, leads: true } } },
  });
  return NextResponse.json({ jobs });
}

export async function DELETE(_req: NextRequest) {
  const userId = await getDemoUserId();
  await db.searchJob.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
