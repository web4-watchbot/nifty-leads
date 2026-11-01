import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getDemoUserId();
  const [
    totalSearches,
    totalResults,
    savedLeads,
    totalLeads,
    emailsDiscovered,
    verifiedEmails,
    phonesFound,
    websitesDiscovered,
    businessesDiscovered,
    leadsByCountry,
    leadsByIndustry,
    leadsBySource,
    recentSearches,
    leadsOverTime,
  ] = await Promise.all([
    db.searchJob.count({ where: { userId } }),
    db.searchJob.aggregate({ where: { userId }, _sum: { totalResults: true } }),
    db.lead.count({ where: { userId, isSaved: true } }),
    db.lead.count({ where: { userId } }),
    db.lead.count({ where: { userId, NOT: { email: null } } }),
    db.lead.count({ where: { userId, emailStatus: "verified" } }),
    db.lead.count({ where: { userId, NOT: { phone: null } } }),
    db.lead.count({ where: { userId, NOT: { website: null } } }),
    db.lead.count({ where: { userId, leadType: { in: ["business", "company", "agency", "local_service"] } } }),
    db.lead.groupBy({ by: ["country"], where: { userId, NOT: { country: null } }, _count: true, take: 10, orderBy: { _count: { country: "desc" } } }),
    db.lead.groupBy({ by: ["industry"], where: { userId, NOT: { industry: null } }, _count: true, take: 10, orderBy: { _count: { industry: "desc" } } }),
    db.lead.groupBy({ by: ["sourceProvider"], where: { userId }, _count: true, take: 10, orderBy: { _count: { sourceProvider: "desc" } } }),
    db.searchJob.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.lead.findMany({ where: { userId }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 500 }),
  ]);

  // Bucket leads over time by day
  const dayBuckets = new Map<string, number>();
  for (const l of leadsOverTime) {
    const day = new Date(l.createdAt).toISOString().slice(0, 10);
    dayBuckets.set(day, (dayBuckets.get(day) || 0) + 1);
  }
  const leadsTimeSeries = Array.from(dayBuckets.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  // Contact completeness breakdown
  const withEmail = await db.lead.count({ where: { userId, NOT: { email: null } } });
  const withPhone = await db.lead.count({ where: { userId, NOT: { phone: null } } });
  const withWebsite = await db.lead.count({ where: { userId, NOT: { website: null } } });
  const withAddress = await db.lead.count({ where: { userId, NOT: { address: null } } });
  const withSocial = await db.lead.count({
    where: {
      userId,
      OR: [
        { NOT: { linkedinUrl: null } },
        { NOT: { youtubeUrl: null } },
        { NOT: { instagramUrl: null } },
        { NOT: { facebookUrl: null } },
        { NOT: { xUrl: null } },
        { NOT: { githubUrl: null } },
      ],
    },
  });

  return NextResponse.json({
    totals: {
      totalSearches,
      totalResults: totalResults._sum.totalResults || 0,
      savedLeads,
      totalLeads,
      emailsDiscovered,
      verifiedEmails,
      phonesFound,
      websitesDiscovered,
      businessesDiscovered,
    },
    charts: {
      leadsByCountry: leadsByCountry.map((c) => ({ country: c.country || "Unknown", count: c._count })),
      leadsByIndustry: leadsByIndustry.map((c) => ({ industry: c.industry || "Unknown", count: c._count })),
      leadsBySource: leadsBySource.map((c) => ({ source: c.sourceProvider || "Unknown", count: c._count })),
      leadsTimeSeries,
      contactCompleteness: [
        { field: "Email", count: withEmail },
        { field: "Phone", count: withPhone },
        { field: "Website", count: withWebsite },
        { field: "Address", count: withAddress },
        { field: "Social", count: withSocial },
      ],
    },
    recentSearches,
  });
}
