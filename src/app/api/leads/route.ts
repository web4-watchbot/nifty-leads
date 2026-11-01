import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

// GET /api/leads — list leads (with filters)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = await getDemoUserId();

  const where: Record<string, unknown> = { userId };
  if (searchParams.get("saved") === "true") where.isSaved = true;
  if (searchParams.get("jobId")) where.jobId = searchParams.get("jobId");
  if (searchParams.get("status")) where.status = searchParams.get("status");
  if (searchParams.get("industry")) where.industry = searchParams.get("industry");
  if (searchParams.get("country")) where.country = searchParams.get("country");
  if (searchParams.get("hasEmail") === "true") {
    where.NOT = { email: null };
  }
  if (searchParams.get("hasPhone") === "true") {
    where.NOT = { phone: null };
  }

  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const offset = parseInt(searchParams.get("offset") || "0");

  const [leads, total] = await Promise.all([
    db.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.lead.count({ where }),
  ]);

  return NextResponse.json({
    leads: leads.map((l) => ({ ...l, sources: JSON.parse(l.sourcesJson || "[]") })),
    total,
    limit,
    offset,
  });
}

// POST /api/leads — manually create or save a lead
export async function POST(req: NextRequest) {
  const body = (await req.json());
  const userId = await getDemoUserId();
  const lead = await db.lead.create({
    data: {
      userId,
      businessName: body.businessName || null,
      contactPerson: body.contactPerson || null,
      position: body.position || null,
      description: body.description || null,
      email: body.email || null,
      phone: body.phone || null,
      website: body.website || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
      postalCode: body.postalCode || null,
      industry: body.industry || null,
      leadType: body.leadType || null,
      linkedinUrl: body.linkedinUrl || null,
      youtubeUrl: body.youtubeUrl || null,
      instagramUrl: body.instagramUrl || null,
      facebookUrl: body.facebookUrl || null,
      xUrl: body.xUrl || null,
      githubUrl: body.githubUrl || null,
      isSaved: body.isSaved ?? true,
      savedAt: body.isSaved ? new Date() : null,
      status: body.status || "new",
      notes: body.notes || "",
      tags: body.tags || "",
      sourceProvider: "manual",
      sourceUrl: body.website || "",
      sourcesJson: JSON.stringify([{ provider: "manual", url: body.website || "", title: body.businessName || "Manual entry", date: new Date().toISOString() }]),
    },
  });
  return NextResponse.json({ lead });
}
