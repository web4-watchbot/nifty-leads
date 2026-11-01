import { NextRequest, NextResponse } from "next/server";
import { TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getDemoUserId();
  const customTemplates = await db.savedTemplate.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    templates: TEMPLATES,
    categories: TEMPLATE_CATEGORIES,
    customTemplates: customTemplates.map((t) => ({
      ...t,
      sources: t.sources ? t.sources.split(",") : [],
      filters: t.filters ? JSON.parse(t.filters) : {},
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json());
  const userId = await getDemoUserId();
  const tpl = await db.savedTemplate.create({
    data: {
      userId,
      name: body.name,
      category: body.category || "Custom",
      query: body.query,
      sources: Array.isArray(body.sources) ? body.sources.join(",") : "",
      filters: JSON.stringify(body.filters || {}),
    },
  });
  return NextResponse.json({ template: tpl });
}
