import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getDemoUserId();
  const records = await db.suppressionRecord.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { value: string; kind: "email" | "phone" | "domain"; reason?: string };
  const userId = await getDemoUserId();
  try {
    const rec = await db.suppressionRecord.create({
      data: { userId, value: body.value, kind: body.kind, reason: body.reason || "user_requested" },
    });
    return NextResponse.json({ record: rec });
  } catch {
    return NextResponse.json({ ok: true, message: "Already in suppression list" });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    await db.suppressionRecord.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
