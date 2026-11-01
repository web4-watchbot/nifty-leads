import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";
import { buildCsv, DEFAULT_EXPORT_COLUMNS } from "@/lib/export/csv";
import { buildXlsx } from "@/lib/export/xlsx";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ExportBody {
  scope: "all_results" | "selected" | "filtered" | "saved_list" | "enriched" | "email_available" | "phone_available" | "businesses" | "professionals";
  format: "csv" | "xlsx";
  leadIds?: string[];
  listId?: string;
  filters?: {
    industry?: string;
    country?: string;
    hasEmail?: boolean;
    hasPhone?: boolean;
    jobId?: string;
  };
  columns?: string[]; // keys from DEFAULT_EXPORT_COLUMNS
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ExportBody;
  const userId = await getDemoUserId();

  let where: Record<string, unknown> = { userId };
  switch (body.scope) {
    case "selected":
      if (!body.leadIds?.length) return NextResponse.json({ error: "No leads selected" }, { status: 400 });
      where = { userId, id: { in: body.leadIds } };
      break;
    case "saved_list":
      where = { userId, listItems: { some: { listId: body.listId } } };
      break;
    case "enriched":
      where = { userId, completenessScore: { gte: 50 } };
      break;
    case "email_available":
      where = { userId, NOT: { email: null } };
      break;
    case "phone_available":
      where = { userId, NOT: { phone: null } };
      break;
    case "businesses":
      where = { userId, leadType: { in: ["business", "company", "agency", "local_service"] } };
      break;
    case "professionals":
      where = { userId, leadType: { in: ["individual", "freelancer", "creator", "decision_maker"] } };
      break;
    case "all_results":
    case "filtered":
    default:
      if (body.filters?.jobId) where.jobId = body.filters.jobId;
      if (body.filters?.industry) where.industry = body.filters.industry;
      if (body.filters?.country) where.country = body.filters.country;
      if (body.filters?.hasEmail) where.NOT = { email: null };
      if (body.filters?.hasPhone) where.NOT = { phone: null };
      break;
  }

  const leads = await db.lead.findMany({
    where,
    orderBy: { relevanceScore: "desc" },
    take: 5000,
  });

  if (!leads.length) {
    return NextResponse.json({ error: "No leads match this export scope" }, { status: 400 });
  }

  const cols = body.columns?.length
    ? DEFAULT_EXPORT_COLUMNS.filter((c) => body.columns!.includes(c.key))
    : DEFAULT_EXPORT_COLUMNS;

  const rows = leads.map((l) => {
    const row: Record<string, string | number | null> = {};
    for (const c of cols) {
      const v = (l as unknown as Record<string, unknown>)[c.key];
      row[c.key] = v === null || v === undefined ? "" : (v as string | number);
    }
    return row;
  });

  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const fileName = `nifty-leads-${body.scope}-${ts}.${body.format}`;

  let fileData: Uint8Array;
  let mimeType: string;
  if (body.format === "csv") {
    const csv = buildCsv(rows, cols.map((c) => c.key));
    fileData = new TextEncoder().encode(csv);
    mimeType = "text/csv; charset=utf-8";
  } else {
    fileData = buildXlsx(rows, cols, "Leads");
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  // Persist export job for audit
  const exportJob = await db.exportJob.create({
    data: {
      userId,
      scope: body.scope,
      format: body.format,
      columns: JSON.stringify(cols.map((c) => c.key)),
      filters: JSON.stringify(body.filters || {}),
      rowCount: leads.length,
      fileSize: fileData.length,
      fileName,
      status: "completed",
      completedAt: new Date(),
    },
  });

  return new NextResponse(fileData as Buffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "X-Export-Job-Id": exportJob.id,
      "X-Export-Row-Count": String(leads.length),
    },
  });
}
