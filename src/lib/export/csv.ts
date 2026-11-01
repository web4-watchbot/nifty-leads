// CSV export with proper RFC 4180 escaping + formula-injection safety.

export type CsvRow = Record<string, string | number | null | undefined | boolean>;

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Formula injection protection: prefix dangerous leading chars
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\n\r]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(rows: CsvRow[], columns?: string[]): string {
  if (!rows.length) return "";
  const cols = columns || Object.keys(rows[0]);
  const header = cols.map(escapeCsvCell).join(",");
  const body = rows.map((r) => cols.map((c) => escapeCsvCell(r[c])).join(","));
  // BOM for Excel UTF-8 detection
  return "\uFEFF" + [header, ...body].join("\r\n");
}

export const DEFAULT_EXPORT_COLUMNS: Array<{ key: string; label: string }> = [
  { key: "businessName", label: "Business Name" },
  { key: "contactPerson", label: "Contact Person" },
  { key: "position", label: "Professional Position" },
  { key: "email", label: "Business Email" },
  { key: "emailExtra", label: "Additional Published Business Email" },
  { key: "phone", label: "Phone Number" },
  { key: "phoneExtra", label: "Additional Phone" },
  { key: "website", label: "Business Website" },
  { key: "address", label: "Business Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "industry", label: "Industry" },
  { key: "description", label: "Business Description" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "youtubeUrl", label: "YouTube URL" },
  { key: "instagramUrl", label: "Instagram URL" },
  { key: "facebookUrl", label: "Facebook URL" },
  { key: "xUrl", label: "X URL" },
  { key: "tiktokUrl", label: "TikTok URL" },
  { key: "githubUrl", label: "GitHub URL" },
  { key: "otherProfiles", label: "Other Public Profiles" },
  { key: "sourceUrl", label: "Source URL" },
  { key: "sourceProvider", label: "Source Provider" },
  { key: "emailStatus", label: "Email Verification Status" },
  { key: "phoneStatus", label: "Phone Verification Status" },
  { key: "relevanceScore", label: "Relevance Score" },
  { key: "completenessScore", label: "Completeness Score" },
  { key: "verificationStatus", label: "Verification Status" },
  { key: "createdAt", label: "Date Discovered" },
  { key: "status", label: "Lead Status" },
  { key: "notes", label: "Notes" },
];
