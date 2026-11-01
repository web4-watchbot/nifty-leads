import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await db.exportJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}
