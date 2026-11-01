// Free OpenStreetMap Overpass API business search — no API key required.
// Returns real businesses with names, addresses, phones, websites, and coordinates.
// Respects Overpass usage policy (max ~2 concurrent requests, sensible timeouts).

export interface OverpassBusiness {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  lat?: number;
  lon?: number;
  category?: string;
  cuisine?: string;
  osmId?: string;
  osmType?: string;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass.osm.ch/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const AMENITY_MAP: Record<string, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  bar: "Bar",
  pub: "Pub",
  fast_food: "Fast Food",
  hotel: "Hotel",
  hostel: "Hostel",
  hospital: "Hospital",
  clinic: "Clinic",
  doctors: "Doctor",
  dentist: "Dentist",
  pharmacy: "Pharmacy",
  school: "School",
  college: "College",
  university: "University",
  bank: "Bank",
  gym: "Gym",
  fuel: "Fuel Station",
  car_repair: "Car Repair",
  hairdresser: "Hair Salon",
  beauty: "Beauty Salon",
  lawyer: "Lawyer",
  accounting: "Accounting Firm",
  real_estate_agent: "Real Estate Agency",
  employment_agency: "Recruitment Agency",
  advertising: "Marketing Agency",
  it: "IT Company",
};

const SHOP_MAP: Record<string, string> = {
  supermarket: "Supermarket",
  convenience: "Convenience Store",
  clothes: "Clothing Store",
  bakery: "Bakery",
  butcher: "Butcher",
  electronics: "Electronics Store",
  furniture: "Furniture Store",
  hardware: "Hardware Store",
  jewelry: "Jewelry Store",
  books: "Bookstore",
  car: "Car Dealer",
  mobile_phone: "Mobile Phone Shop",
  computer: "Computer Shop",
  optician: "Optician",
  travel_agency: "Travel Agency",
  office: "Office Supplies",
};

const OFFICE_MAP: Record<string, string> = {
  company: "Company",
  insurance: "Insurance Agency",
  lawyer: "Law Firm",
  accountant: "Accounting Firm",
  real_estate_agent: "Real Estate Agency",
  advertising: "Marketing Agency",
  it: "IT Company",
  consulting: "Consulting Firm",
  educational_institution: "Educational Institution",
  research: "Research Institute",
  telecommunication: "Telecommunications",
  NGO: "NGO",
};

const CRAFT_MAP: Record<string, string> = {
  electrician: "Electrician",
  plumber: "Plumber",
  carpenter: "Carpenter",
  painter: "Painter",
  photographer: "Photographer",
  tailor: "Tailor",
  mechanic: "Mechanic",
  gardener: "Gardener",
};

const TOURISM_MAP: Record<string, string> = {
  hotel: "Hotel",
  motel: "Motel",
  hostel: "Hostel",
  guest_house: "Guest House",
  apartment: "Apartment",
  attraction: "Attraction",
  museum: "Museum",
  gallery: "Gallery",
};

export interface BusinessCategory {
  key: string;
  label: string;
  osmTags: string; // The Overpass filter expression
}

export function resolveCategory(query: string): BusinessCategory | null {
  const q = query.toLowerCase();

  // Direct keyword → category mapping
  const checks: Array<{ keywords: string[]; cat: BusinessCategory }> = [
    { keywords: ["restaurant", "cafe", "coffee", "bar", "pub", "fast food"], cat: { key: "amenity_food", label: "Food & Drink", osmTags: '["amenity"~"restaurant|cafe|bar|pub|fast_food"]' } },
    { keywords: ["hotel", "motel", "hostel", "guest house", "accommodation"], cat: { key: "tourism", label: "Hospitality", osmTags: '["tourism"~"hotel|motel|hostel|guest_house|apartment"]' } },
    { keywords: ["hospital", "clinic", "doctor", "dentist", "pharmacy", "medical", "healthcare"], cat: { key: "amenity_health", label: "Healthcare", osmTags: '["amenity"~"hospital|clinic|doctors|dentist|pharmacy"]' } },
    { keywords: ["school", "college", "university", "education", "training", "institute"], cat: { key: "amenity_edu", label: "Education", osmTags: '["amenity"~"school|college|university"]' } },
    { keywords: ["bank", "atm", "financial"], cat: { key: "amenity_bank", label: "Banking", osmTags: '["amenity"~"bank"]' } },
    { keywords: ["gym", "fitness", "leisure"], cat: { key: "leisure", label: "Fitness & Leisure", osmTags: '["leisure"~"fitness_centre|sports_centre"]' } },
    { keywords: ["lawyer", "law firm", "attorney", "legal"], cat: { key: "office_law", label: "Law Firm", osmTags: '["office"~"lawyer"]' } },
    { keywords: ["accounting", "accountant", "auditor", "tax"], cat: { key: "office_acc", label: "Accounting Firm", osmTags: '["office"~"accountant"]' } },
    { keywords: ["real estate", "realtor", "property", "estate agent"], cat: { key: "office_re", label: "Real Estate Agency", osmTags: '["office"~"real_estate_agent"]' } },
    { keywords: ["recruitment", "employment agency", "staffing", "hr consultancy"], cat: { key: "office_rec", label: "Recruitment Agency", osmTags: '["amenity"~"employment_agency"]' } },
    { keywords: ["marketing agency", "advertising", "ad agency"], cat: { key: "office_ad", label: "Marketing Agency", osmTags: '["office"~"advertising"]' } },
    { keywords: ["it company", "software", "tech company", "saas", "developer"], cat: { key: "office_it", label: "IT Company", osmTags: '["office"~"it|software|telecommunication"]' } },
    { keywords: ["consulting", "consultancy", "advisor"], cat: { key: "office_consult", label: "Consulting Firm", osmTags: '["office"~"consulting|company"]' } },
    { keywords: ["shop", "store", "retail", "supermarket", "boutique"], cat: { key: "shop", label: "Retail Store", osmTags: '["shop"]' } },
    { keywords: ["salon", "spa", "beauty", "hairdresser", "barber"], cat: { key: "shop_beauty", label: "Beauty & Salon", osmTags: '["shop"~"hairdresser|beauty"]' } },
    { keywords: ["electrician", "plumber", "carpenter", "painter", "mechanic", "contractor"], cat: { key: "craft", label: "Trades & Craft", osmTags: '["craft"]' } },
    { keywords: ["car repair", "garage", "auto"], cat: { key: "amenity_car", label: "Automotive", osmTags: '["shop"~"car|car_repair"]' } },
  ];

  for (const c of checks) {
    if (c.keywords.some((k) => q.includes(k))) return c.cat;
  }
  return null;
}

function normalizeQueryToArea(query: string): string {
  // Strip out common category keywords and return a location-focused string
  return query
    .replace(/\b(restaurant|cafe|bar|pub|hotel|hospital|clinic|school|bank|gym|lawyer|accountant|accounting|real\s*estate|recruitment|marketing|advertising|it\s*company|software|consulting|shop|salon|beauty|electrician|plumber|carpenter|painter|mechanic|company|agency|firm|business(es)?|service(s)?|provider(s)?)\b/gi, "")
    .replace(/\b(in|near|around|at|of|the|find|list|top|best|cheap|affordable|all)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function geocodeArea(area: string): Promise<{ lat: number; lon: number; radius: number; displayName: string } | null> {
  if (!area) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(area)}&limit=1&addressdetails=0`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "NiftyLeadFinder/1.0 (https://niftytechfinds.com)",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string; boundingbox?: string[] }>;
  if (!data.length) return null;
  const d = data[0];
  let radius = 25000; // 25 km default
  if (d.boundingbox && d.boundingbox.length === 4) {
    const south = parseFloat(d.boundingbox[0]);
    const north = parseFloat(d.boundingbox[1]);
    const west = parseFloat(d.boundingbox[2]);
    const east = parseFloat(d.boundingbox[3]);
    // Approximate radius from bounding box diagonal
    const dLat = (north - south) * 111000;
    const dLon = (east - west) * 111000 * Math.cos((parseFloat(d.lat) * Math.PI) / 180);
    radius = Math.max(5000, Math.min(50000, Math.round(Math.sqrt(dLat * dLat + dLon * dLon) / 2)));
  }
  return { lat: parseFloat(d.lat), lon: parseFloat(d.lon), radius, displayName: d.display_name };
}

export async function searchOverpass(query: string, maxResults = 50): Promise<OverpassBusiness[]> {
  const category = resolveCategory(query);
  const area = normalizeQueryToArea(query);
  const geo = await geocodeArea(area);
  if (!category) {
    // No category matched → skip overpass, this is not a local business query
    return [];
  }

  const around = geo ? `(around:${geo.radius},${geo.lat},${geo.lon})` : "(around:50000,0,0)";
  const tagFilter = category.osmTags;

  // Build a query that searches both nodes and ways within the area
  const overpassQ = `
    [out:json][timeout:25];
    (
      nwr${tagFilter}${around};
    );
    out center tags 200;
  `;

  let lastError: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NiftyLeadFinder/1.0 (https://niftytechfinds.com)" },
        body: "data=" + encodeURIComponent(overpassQ),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        lastError = new Error(`Overpass ${endpoint} returned ${res.status}`);
        continue;
      }
      // Some Overpass mirrors return an HTML rate-limit/error page with HTTP 200.
      // Detect that and try the next endpoint instead of crashing on JSON.parse.
      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();
      if (!contentType.includes("application/json") || !text.trim().startsWith("{")) {
        lastError = new Error(`Overpass ${endpoint} returned non-JSON (likely rate-limited)`);
        continue;
      }
      let data: { elements: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
      try {
        data = JSON.parse(text);
      } catch {
        lastError = new Error(`Overpass ${endpoint} returned unparseable JSON`);
        continue;
      }
      // Some mirrors return a 200 with empty elements because they hold a stale
      // or partial OSM dataset. If we got zero elements but the query was valid,
      // move on to the next endpoint rather than reporting zero businesses.
      if (!data.elements || data.elements.length === 0) {
        lastError = new Error(`Overpass ${endpoint} returned 0 elements`);
        continue;
      }
      const out: OverpassBusiness[] = [];
      for (const el of data.elements) {
        const t = el.tags || {};
        if (!t.name) continue;
        const addrParts = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"], t["addr:city"], t["addr:state"], t["addr:postcode"], t["addr:country"]].filter(Boolean);
        const business: OverpassBusiness = {
          name: t.name,
          phone: t.phone || t["contact:phone"] || t["contact:mobile"] || undefined,
          email: t.email || t["contact:email"] || undefined,
          website: t.website || t["contact:website"] || t.url || undefined,
          address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ").trim() || undefined,
          city: t["addr:city"] || undefined,
          state: t["addr:state"] || undefined,
          postcode: t["addr:postcode"] || undefined,
          country: t["addr:country"] || undefined,
          lat: el.lat ?? el.center?.lat,
          lon: el.lon ?? el.center?.lon,
          category: t.amenity ? AMENITY_MAP[t.amenity] : t.shop ? SHOP_MAP[t.shop] : t.office ? OFFICE_MAP[t.office] : t.craft ? CRAFT_MAP[t.craft] : t.tourism ? TOURISM_MAP[t.tourism] : category.label,
          cuisine: t.cuisine || undefined,
          osmId: String(el.id),
          osmType: el.type,
        };
        if (addrParts.length) business.address = addrParts.join(", ");
        out.push(business);
      }
      return out.slice(0, maxResults);
    } catch (e) {
      lastError = e as Error;
      continue;
    }
  }
  // All endpoints failed/empty — return empty array rather than throwing, so the
  // orchestrator can still return leads from other sources (web, linkedin, etc.)
  // and the user gets a useful result instead of an error page.
  return [];
}
