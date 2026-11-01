import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/extraction/orchestrator";
import { expandQuery, parseQuery } from "@/lib/extraction/query-parser";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";
import type { ProviderId } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SearchBody {
  query: string;
  sources?: string[];
  location?: string;
  industry?: string;
  leadType?: string;
  professionId?: string;
  maxResults?: number;
  enrichWebsites?: boolean;
  maxSitesToCrawl?: number;
  isBulk?: boolean;
  bulkParentId?: string;
  generatedQueries?: string[];
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as SearchBody;
  if (!body.query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Default sources now include the new lead-discovery providers so users get
  // richer results even before opening the source dropdown.
  const sources = (body.sources?.length
    ? body.sources
    : ["web", "linkedin", "crunchbase", "github", "wikipedia"]) as ProviderId[];
  const userId = await getDemoUserId();

  // Persist the search job
  const job = await db.searchJob.create({
    data: {
      userId,
      query: body.query,
      rawQuery: body.query,
      sources: sources.join(","),
      filters: JSON.stringify({
        location: body.location,
        industry: body.industry,
        leadType: body.leadType,
        maxResults: body.maxResults,
      }),
      status: "running",
      isBulk: !!body.isBulk,
      bulkParentId: body.bulkParentId,
      generatedQueries: JSON.stringify(body.generatedQueries || expandQuery(body.query, { location: body.location, industry: body.industry })),
      startedAt: new Date(),
    },
  });

  try {
    const outcome = await runSearch({
      query: body.query,
      sources,
      location: body.location,
      industry: body.industry,
      leadType: body.leadType,
      maxResults: body.maxResults,
      enrichWebsites: body.enrichWebsites,
      maxSitesToCrawl: body.maxSitesToCrawl,
    });

    // Persist search results
    if (outcome.leads.length) {
      await db.searchResult.createMany({
        data: outcome.leads.map((l, i) => ({
          jobId: job.id,
          provider: l.sourceProvider,
          title: l.businessName || l.contactPerson || "Untitled",
          url: l.sourceUrl,
          snippet: l.description || "",
          displayUrl: l.website || l.sourceUrl,
          position: i,
          metadata: JSON.stringify({
            email: l.email,
            phone: l.phone,
            city: l.city,
            country: l.country,
            industry: l.industry,
            relevanceScore: l.relevanceScore,
            completenessScore: l.completenessScore,
          }),
        })),
      });
    }

    // Persist leads (deduplicated)
    const createdLeads = [];
    for (const lead of outcome.leads) {
      try {
        const created = await db.lead.create({
          data: {
            userId,
            jobId: job.id,
            businessName: lead.businessName || null,
            contactPerson: lead.contactPerson || null,
            position: lead.position || null,
            description: lead.description || null,
            email: lead.email || null,
            emailExtra: lead.emailExtra?.join(", ") || null,
            phone: lead.phone || null,
            phoneExtra: lead.phoneExtra?.join(", ") || null,
            website: lead.website || null,
            address: lead.address || null,
            city: lead.city || null,
            state: lead.state || null,
            country: lead.country || null,
            postalCode: lead.postalCode || null,
            latitude: lead.latitude || null,
            longitude: lead.longitude || null,
            industry: lead.industry || null,
            leadType: lead.leadType || null,
            linkedinUrl: lead.linkedinUrl || null,
            youtubeUrl: lead.youtubeUrl || null,
            instagramUrl: lead.instagramUrl || null,
            facebookUrl: lead.facebookUrl || null,
            xUrl: lead.xUrl || null,
            tiktokUrl: lead.tiktokUrl || null,
            githubUrl: lead.githubUrl || null,
            otherProfiles: lead.otherProfiles?.join(", ") || null,
            relevanceScore: lead.relevanceScore || 0,
            completenessScore: lead.completenessScore || 0,
            emailStatus: lead.emailStatus || "not_found",
            phoneStatus: lead.phoneStatus || "not_found",
            verificationStatus: lead.verificationStatus || "unverified",
            sourceProvider: lead.sourceProvider,
            sourceUrl: lead.sourceUrl,
            sourcesJson: JSON.stringify(lead.sources),
            aiSummary: lead.aiSummary || null,
            relevanceReason: lead.relevanceReason || null,
          },
        });
        createdLeads.push(created);
      } catch (e) {
        // Skip leads that fail to persist (e.g., constraint issues)
        console.error("Failed to persist lead:", e);
      }
    }

    // Update job stats
    const withEmails = outcome.leads.filter((l) => l.email).length;
    const withPhones = outcome.leads.filter((l) => l.phone).length;
    const withWebsites = outcome.leads.filter((l) => l.website).length;
    await db.searchJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        progress: 100,
        totalResults: outcome.leads.length,
        uniqueLeads: createdLeads.length,
        withEmails,
        withPhones,
        withWebsites,
        durationMs: outcome.durationMs,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      jobId: job.id,
      leads: createdLeads.map((l) => ({ ...l, sources: JSON.parse(l.sourcesJson || "[]") })),
      stats: {
        totalResults: outcome.leads.length,
        uniqueLeads: createdLeads.length,
        withEmails,
        withPhones,
        withWebsites,
        durationMs: outcome.durationMs,
        rawCounts: outcome.rawCounts,
        errors: outcome.errors,
        dedupedCount: outcome.dedupedCount,
        generatedQueries: outcome.generatedQueries,
      },
    });
  } catch (e) {
    await db.searchJob.update({
      where: { id: job.id },
      data: { status: "failed", errorMessage: (e as Error).message, completedAt: new Date() },
    });
    return NextResponse.json({ error: (e as Error).message, jobId: job.id }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if (jobId) {
    const job = await db.searchJob.findUnique({
      where: { id: jobId },
      include: { results: true },
    });
    return NextResponse.json({ job });
  }
  const userId = await getDemoUserId();
  const jobs = await db.searchJob.findMany({
    where: { userId, bulkParentId: null },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({ jobs });
}

// Used by template/preview flow to expand a query without executing
export async function PUT(req: NextRequest) {
  const body = (await req.json()) as { query: string; location?: string; industry?: string };
  const parsed = parseQuery(body.query);
  const expanded = expandQuery(body.query, { location: body.location, industry: body.industry });
  return NextResponse.json({ parsed, expanded });
}
