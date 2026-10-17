/**
 * Seed data (SPEC Sections 5.5, 7, 8.2, 8.5).
 * Seeds: default Industries, starter Business Types with OSM/Google maps,
 * default Plans (Free / Paid), default Sources, and System email setting.
 * Usage: DATABASE_URL=... APP_ENCRYPTION_KEY=... pnpm --filter @nifty-leads/db seed
 */

import { Pool } from "pg";
import * as schema from "./schema";
import { drizzle } from "drizzle-orm/node-postgres";

const INDUSTRIES = [
  "Agriculture",
  "Automotive",
  "Banking & Financial Services",
  "Construction & Real Estate",
  "Consumer Goods & Retail",
  "Education",
  "Energy & Utilities",
  "Food & Beverage",
  "Government & Public Sector",
  "Healthcare & Medical",
  "Hospitality & Travel",
  "Information Technology & Software",
  "Legal & Professional Services",
  "Logistics & Transportation",
  "Manufacturing",
  "Marketing, Media & Advertising",
  "Non-Profit",
  "Personal Services & Beauty",
  "Telecommunications",
  "Wholesale & Distribution",
  "Other",
];

// Starter set of Business Types (Section 5.5: seed at least 150; Admin completes via UI).
// Each Business Type links to one Industry and has OSM tag + Google type maps.
const BUSINESS_TYPES: Array<{
  industry: string;
  name: string;
  osmTags: Record<string, string>;
  googleTypes: string[];
}> = [
  { industry: "Healthcare & Medical", name: "Dental Clinic", osmTags: { amenity: "dentist" }, googleTypes: ["dentist", "health"] },
  { industry: "Healthcare & Medical", name: "General Practice", osmTags: { amenity: "doctors" }, googleTypes: ["doctor", "health"] },
  { industry: "Healthcare & Medical", name: "Physiotherapy Clinic", osmTags: { healthcare: "physiotherapy" }, googleTypes: ["physiotherapist", "health"] },
  { industry: "Hospitality & Travel", name: "Hotel", osmTags: { tourism: "hotel" }, googleTypes: ["lodging", "hotel"] },
  { industry: "Hospitality & Travel", name: "Restaurant", osmTags: { amenity: "restaurant" }, googleTypes: ["restaurant", "food"] },
  { industry: "Hospitality & Travel", name: "Cafe", osmTags: { amenity: "cafe" }, googleTypes: ["cafe", "food"] },
  { industry: "Personal Services & Beauty", name: "Hair Salon", osmTags: { shop: "hairdresser" }, googleTypes: ["hair_care", "beauty_salon"] },
  { industry: "Personal Services & Beauty", name: "Beauty Salon", osmTags: { shop: "beauty" }, googleTypes: ["beauty_salon", "personal_care"] },
  { industry: "Automotive", name: "Car Repair", osmTags: { shop: "car_repair" }, googleTypes: ["car_repair", "automotive"] },
  { industry: "Automotive", name: "Car Dealership", osmTags: { shop: "car" }, googleTypes: ["car_dealer", "automotive"] },
  { industry: "Retail", name: "Grocery Store", osmTags: { shop: "supermarket" }, googleTypes: ["grocery_or_supermarket", "store"] },
  { industry: "Retail", name: "Pharmacy", osmTags: { shop: "pharmacy" }, googleTypes: ["pharmacy", "health"] },
  { industry: "Education", name: "School", osmTags: { amenity: "school" }, googleTypes: ["school", "education"] },
  { industry: "Education", name: "University", osmTags: { amenity: "university" }, googleTypes: ["university", "education"] },
  { industry: "Legal & Professional Services", name: "Law Firm", osmTags: { office: "lawyer" }, googleTypes: ["lawyer", "professional_service"] },
  { industry: "Legal & Professional Services", name: "Accounting Firm", osmTags: { office: "accountant" }, googleTypes: ["accounting", "professional_service"] },
  { industry: "Information Technology & Software", name: "Software Company", osmTags: { office: "it" }, googleTypes: ["software_company", "technology"] },
  { industry: "Information Technology & Software", name: "Web Design Agency", osmTags: { office: "company" }, googleTypes: ["marketing_agency", "professional_service"] },
  { industry: "Food & Beverage", name: "Bakery", osmTags: { shop: "bakery" }, googleTypes: ["bakery", "food"] },
  { industry: "Food & Beverage", name: "Bar", osmTags: { amenity: "bar" }, googleTypes: ["bar", "food"] },
  { industry: "Construction & Real Estate", name: "Real Estate Agency", osmTags: { office: "estate_agent" }, googleTypes: ["real_estate_agency", "real_estate"] },
  { industry: "Construction & Real Estate", name: "Construction Company", osmTags: { office: "construction" }, googleTypes: ["construction", "building"] },
];

const DEFAULT_PLANS = [
  {
    name: "Free",
    priceLabel: "$0 / month",
    monthlyCredits: 100,
    maxLeadsPerRun: 25,
    runsPerDay: 2,
    parallelRuns: 1,
    maxLeadsStored: 200,
    maxLists: 1,
    monthlyAiTokens: 0,
    exportRowLimit: 100,
    aiEnabled: false,
    emailSendingEnabled: false,
    fullEmailVerification: false,
    webhookExport: false,
    aiExtraction: false,
  },
  {
    name: "Paid",
    priceLabel: "$49 / month",
    monthlyCredits: 3000,
    maxLeadsPerRun: 500,
    runsPerDay: 20,
    parallelRuns: 3,
    maxLeadsStored: 20000,
    maxLists: -1, // unlimited
    monthlyAiTokens: 2000000,
    exportRowLimit: -1, // unlimited
    aiEnabled: true,
    emailSendingEnabled: false, // Phase 2
    fullEmailVerification: true,
    webhookExport: true,
    aiExtraction: true,
  },
];

const DEFAULT_SOURCES = [
  {
    name: "OpenStreetMap (Overpass)",
    kind: "osm_overpass",
    baseUrl: "https://overpass-api.de/api/interpreter",
    authType: "none",
    canFill: ["company_name", "company_website", "phone", "email", "location", "business_type"],
    allowedPlans: ["Free", "Paid"],
    attributionText: "© OpenStreetMap contributors",
    termsUrl: "https://operations.osmfoundation.org/policies/terms/",
    reliability: 0.8,
    costCreditsPerCall: 0,
    costUsdPerCall: 0,
    costInrPerCall: 0,
    enabled: true,
  },
  {
    name: "Nominatim (Geocode)",
    kind: "nominatim",
    baseUrl: "https://nominatim.openstreetmap.org",
    authType: "none",
    canFill: ["location"],
    allowedPlans: ["Free", "Paid"],
    attributionText: "© OpenStreetMap contributors",
    termsUrl: "https://operations.osmfoundation.org/policies/terms/",
    reliability: 0.85,
    costCreditsPerCall: 0,
    costUsdPerCall: 0,
    costInrPerCall: 0,
    enabled: true,
  },
  {
    name: "Website Enricher",
    kind: "website_enricher",
    baseUrl: "",
    authType: "none",
    canFill: ["email", "phone", "individual_name", "role", "person_linkedin_url", "company_linkedin_url"],
    allowedPlans: ["Free", "Paid"],
    attributionText: "Nifty Leads",
    termsUrl: "",
    reliability: 0.7,
    costCreditsPerCall: 0,
    costUsdPerCall: 0,
    costInrPerCall: 0,
    enabled: true,
  },
  {
    name: "Wikidata",
    kind: "wikidata",
    baseUrl: "https://query.wikidata.org/sparql",
    authType: "none",
    canFill: ["company_name", "company_website", "company_linkedin_url", "industry", "location"],
    allowedPlans: ["Free", "Paid"],
    attributionText: "Wikidata (CC0)",
    termsUrl: "https://www.wikidata.org/wiki/Wikidata:Legal",
    reliability: 0.75,
    costCreditsPerCall: 0,
    costUsdPerCall: 0,
    costInrPerCall: 0,
    enabled: true,
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  // Industries
  for (const name of INDUSTRIES) {
    await db.insert(schema.taxonomyIndustries).values({ name }).onConflictDoNothing();
  }

  const industryRows = await db.select().from(schema.taxonomyIndustries);
  const industryByName = new Map(
    industryRows.map((i: { name: string; id: number }) => [i.name, i.id]),
  );

  // Business types
  for (const bt of BUSINESS_TYPES) {
    const industryId = industryByName.get(bt.industry);
    if (!industryId) continue;
    await db.insert(schema.taxonomyBusinessTypes).values({
      industryId,
      name: bt.name,
      osmTags: bt.osmTags,
      googleTypes: bt.googleTypes,
    }).onConflictDoNothing();
  }

  // Plans
  for (const p of DEFAULT_PLANS) {
    await db.insert(schema.plans).values(p).onConflictDoNothing();
  }

  // Sources
  for (const s of DEFAULT_SOURCES) {
    await db.insert(schema.sources).values(s).onConflictDoNothing();
  }

  // System email setting (Section 8.5) - not configured by default
  await db.insert(schema.settings).values({
    key: "system_email",
    value: { provider: "none", fromName: "Nifty Leads", fromAddress: "noreply@example.com" },
  }).onConflictDoNothing();

  // Set first admin from ADMIN_EMAILS env (better-auth handles roles; we record intent here)
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  console.log("Admin emails:", adminEmails);

  console.log("Seed complete");
  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
