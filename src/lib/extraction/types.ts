// Unified lead type — every provider's output is normalized to this shape.

import type { ProviderId } from "../providers";

export interface UnifiedLead {
  // Identity
  businessName?: string;
  contactPerson?: string;
  position?: string;
  description?: string;

  // Contact
  email?: string;
  emailExtra?: string[];
  phone?: string;
  phoneExtra?: string[];
  website?: string;
  contactPageUrl?: string;

  // Location
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  location?: string;          // Free-form location string (e.g. "Berlin, Germany")

  // Categorisation
  industry?: string;
  leadType?: "business" | "individual" | "freelancer" | "creator" | "agency" | "decision_maker" | "local_service" | "company";
  businessSize?: string;

  // Social
  linkedinUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  xUrl?: string;
  tiktokUrl?: string;
  githubUrl?: string;
  otherProfiles?: string[];

  // Quality
  relevanceScore?: number;
  completenessScore?: number;
  emailStatus?: "verified" | "publicly_listed" | "inferred" | "invalid" | "not_found";
  phoneStatus?: "verified" | "publicly_listed" | "inferred" | "invalid" | "not_found";
  verificationStatus?: "verified" | "unverified";

  // Provenance
  sourceProvider: ProviderId;
  sourceUrl: string;
  sources: Array<{ provider: ProviderId; url: string; title: string; date: string }>;
  aiSummary?: string;
  relevanceReason?: string;
  thumbnailUrl?: string;
  rawMetadata?: Record<string, unknown>;
}

export function emptyLead(provider: ProviderId, url: string): UnifiedLead {
  return {
    sourceProvider: provider,
    sourceUrl: url,
    sources: [{ provider, url, title: "", date: new Date().toISOString() }],
    emailStatus: "not_found",
    phoneStatus: "not_found",
    verificationStatus: "unverified",
  };
}
