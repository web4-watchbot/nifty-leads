import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDemoUserId } from "@/lib/session";
import { crawlWebsite } from "@/lib/providers/webcrawler";
import { scoreLead, generateSummary } from "@/lib/extraction/scoring";
import type { ProviderId } from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/leads/[id]/enrich — run a fresh website crawl for the lead's website
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getDemoUserId();
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!lead.website) return NextResponse.json({ error: "No website to enrich" }, { status: 400 });

  const crawled = await crawlWebsite(lead.website);

  const updates: Record<string, unknown> = {};
  if (crawled.businessName && !lead.businessName) updates.businessName = crawled.businessName;
  if (crawled.description && (!lead.description || lead.description.length < 50)) updates.description = crawled.description;
  if (crawled.emails.length && !lead.email) {
    updates.email = crawled.emails[0];
    updates.emailExtra = crawled.emails.slice(1, 4).join(", ");
    updates.emailStatus = "publicly_listed";
  }
  if (crawled.phones.length && !lead.phone) {
    updates.phone = crawled.phones[0];
    updates.phoneExtra = crawled.phones.slice(1, 3).join(", ");
    updates.phoneStatus = "publicly_listed";
  }
  if (crawled.address && !lead.address) updates.address = crawled.address;
  if (crawled.city && !lead.city) updates.city = crawled.city;
  if (crawled.country && !lead.country) updates.country = crawled.country;
  if (crawled.postalCode && !lead.postalCode) updates.postalCode = crawled.postalCode;
  if (crawled.latitude && !lead.latitude) updates.latitude = crawled.latitude;
  if (crawled.longitude && !lead.longitude) updates.longitude = crawled.longitude;
  if (crawled.socialLinks.linkedin) updates.linkedinUrl = lead.linkedinUrl || crawled.socialLinks.linkedin;
  if (crawled.socialLinks.twitter) updates.xUrl = lead.xUrl || crawled.socialLinks.twitter;
  if (crawled.socialLinks.facebook) updates.facebookUrl = lead.facebookUrl || crawled.socialLinks.facebook;
  if (crawled.socialLinks.instagram) updates.instagramUrl = lead.instagramUrl || crawled.socialLinks.instagram;
  if (crawled.socialLinks.youtube) updates.youtubeUrl = lead.youtubeUrl || crawled.socialLinks.youtube;
  if (crawled.socialLinks.github) updates.githubUrl = lead.githubUrl || crawled.socialLinks.github;

  // Merge source
  const existingSources = JSON.parse(lead.sourcesJson || "[]") as Array<{ provider: ProviderId; url: string; title: string; date: string }>;
  existingSources.push({ provider: "crawler", url: crawled.finalUrl, title: crawled.title, date: new Date().toISOString() });
  updates.sourcesJson = JSON.stringify(existingSources);

  // Re-score
  const updatedLead = { ...lead, ...updates } as typeof lead;
  const s = scoreLead({
    query: lead.relevanceReason || lead.businessName || "",
    businessName: updatedLead.businessName,
    description: updatedLead.description,
    industry: updatedLead.industry,
    city: updatedLead.city,
    country: updatedLead.country,
    website: updatedLead.website,
    email: updatedLead.email,
    phone: updatedLead.phone,
    address: updatedLead.address,
    linkedinUrl: updatedLead.linkedinUrl,
    youtubeUrl: updatedLead.youtubeUrl,
    instagramUrl: updatedLead.instagramUrl,
    facebookUrl: updatedLead.facebookUrl,
    xUrl: updatedLead.xUrl,
    githubUrl: updatedLead.githubUrl,
    sourceProvider: updatedLead.sourceProvider as ProviderId | undefined,
  });
  updates.relevanceScore = s.relevanceScore;
  updates.completenessScore = s.completenessScore;
  updates.relevanceReason = s.relevanceReason;
  updates.aiSummary = generateSummary({
    query: lead.relevanceReason || lead.businessName || "",
    businessName: updatedLead.businessName,
    description: updatedLead.description,
    industry: updatedLead.industry,
    city: updatedLead.city,
    country: updatedLead.country,
    website: updatedLead.website,
    email: updatedLead.email,
    phone: updatedLead.phone,
    linkedinUrl: updatedLead.linkedinUrl,
    youtubeUrl: updatedLead.youtubeUrl,
  });

  const refreshed = await db.lead.update({ where: { id }, data: { ...updates, userId } });
  return NextResponse.json({ lead: { ...refreshed, sources: JSON.parse(refreshed.sourcesJson || "[]") }, crawled: { statusCode: crawled.statusCode, emailsFound: crawled.emails.length, phonesFound: crawled.phones.length } });
}
