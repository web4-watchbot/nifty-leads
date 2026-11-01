// Pre-built search templates — library of ready-made searches.

export interface SearchTemplate {
  id: string;
  category: string;
  name: string;
  query: string;
  sources: string[];        // provider IDs
  industry?: string;
  leadType?: string;
  expectedFields: string[];
  editableLocation: boolean;
}

export const TEMPLATES: SearchTemplate[] = [
  // People & Professionals (NEW — uses LinkedIn + Crunchbase + social sources)
  { id: "linkedin-marketing-mgrs", category: "People & Professionals", name: "Marketing Managers (LinkedIn)", query: '"Marketing Manager"', sources: ["linkedin", "web"], leadType: "individual", expectedFields: ["name", "position", "company", "linkedinUrl"], editableLocation: true },
  { id: "linkedin-ctos", category: "People & Professionals", name: "CTOs & Tech Leaders", query: '"CTO" OR "Chief Technology Officer"', sources: ["linkedin", "github", "web"], leadType: "decision_maker", expectedFields: ["name", "position", "company", "linkedinUrl"], editableLocation: true },
  { id: "linkedin-ceos", category: "People & Professionals", name: "CEOs & Founders", query: '"CEO" OR "Founder" OR "Co-founder"', sources: ["linkedin", "crunchbase", "web"], leadType: "decision_maker", expectedFields: ["name", "company", "linkedinUrl"], editableLocation: true },
  { id: "linkedin-developers", category: "People & Professionals", name: "Software Engineers", query: '"Software Engineer"', sources: ["github", "linkedin", "web"], leadType: "individual", expectedFields: ["name", "githubUrl", "linkedinUrl", "email"], editableLocation: true },
  { id: "linkedin-designers", category: "People & Professionals", name: "UX / UI Designers", query: '"UX Designer" OR "UI Designer" OR "Product Designer"', sources: ["linkedin", "web"], leadType: "freelancer", expectedFields: ["name", "linkedinUrl", "website"], editableLocation: true },
  { id: "linkedin-recruiters", category: "People & Professionals", name: "Recruiters & Talent Acquisition", query: '"Recruiter" OR "Talent Acquisition"', sources: ["linkedin", "web"], leadType: "individual", expectedFields: ["name", "company", "linkedinUrl"], editableLocation: true },
  { id: "social-indie-makers", category: "People & Professionals", name: "Indie Makers & Builders", query: '"indie maker" OR "indie hacker"', sources: ["social", "producthunt", "web"], leadType: "creator", expectedFields: ["username", "profileUrl", "platform"], editableLocation: true },

  // Startups & Products (NEW — uses Crunchbase + ProductHunt)
  { id: "crunchbase-startups", category: "Startups & Products", name: "Startups (Crunchbase)", query: "startup", sources: ["crunchbase", "web"], leadType: "company", expectedFields: ["businessName", "website", "industry"], editableLocation: true },
  { id: "crunchbase-saas", category: "Startups & Products", name: "SaaS Companies", query: "SaaS company", sources: ["crunchbase", "web", "github"], industry: "Technology", leadType: "company", expectedFields: ["businessName", "website", "industry"], editableLocation: true },
  { id: "producthunt-launches", category: "Startups & Products", name: "Product Hunt Launches", query: "AI tool", sources: ["producthunt", "web"], leadType: "company", expectedFields: ["productName", "makers", "upvotes"], editableLocation: true },
  { id: "producthunt-marketing", category: "Startups & Products", name: "Marketing Tools", query: "marketing tool", sources: ["producthunt", "web"], industry: "Marketing", leadType: "company", expectedFields: ["productName", "website"], editableLocation: true },

  // Content & Creators
  { id: "yt-creators", category: "Content & Creators", name: "YouTube Creators", query: "site:youtube.com \"creator\" business inquiries", sources: ["youtube", "web"], leadType: "creator", expectedFields: ["channelName", "channelUrl", "description", "email"], editableLocation: true },
  { id: "podcast-hosts", category: "Content & Creators", name: "Podcast Hosts", query: "\"podcast host\" business inquiries", sources: ["linkedin", "youtube", "web"], leadType: "creator", expectedFields: ["name", "email", "website"], editableLocation: true },
  { id: "video-editors", category: "Content & Creators", name: "Video Editors", query: "\"video editor\" freelance services", sources: ["linkedin", "web"], leadType: "freelancer", expectedFields: ["name", "website", "email"], editableLocation: true },
  { id: "video-directors", category: "Content & Creators", name: "Video Directors", query: "\"video director\" production studio", sources: ["linkedin", "youtube", "web"], leadType: "individual", expectedFields: ["name", "studio", "email", "website"], editableLocation: true },
  { id: "content-agencies", category: "Content & Creators", name: "Content Marketing Agencies", query: "\"content marketing agency\"", sources: ["web", "crunchbase"], industry: "Marketing", leadType: "agency", expectedFields: ["businessName", "email", "website"], editableLocation: true },

  // Business Leads
  { id: "accounting-firms", category: "Business Leads", name: "Accounting Firms", query: "accounting firms", sources: ["business", "web"], industry: "Accounting", leadType: "business", expectedFields: ["businessName", "phone", "email", "address"], editableLocation: true },
  { id: "marketing-agencies", category: "Business Leads", name: "Marketing Agencies", query: "marketing agencies", sources: ["business", "web"], industry: "Marketing", leadType: "agency", expectedFields: ["businessName", "phone", "email", "website"], editableLocation: true },
  { id: "recruitment-firms", category: "Business Leads", name: "Recruitment Agencies", query: "recruitment agencies", sources: ["business", "web"], industry: "Recruitment", leadType: "agency", expectedFields: ["businessName", "phone", "email"], editableLocation: true },
  { id: "it-companies", category: "Business Leads", name: "IT Companies", query: "IT companies software development", sources: ["business", "github", "web"], industry: "Technology", leadType: "company", expectedFields: ["businessName", "website", "email"], editableLocation: true },
  { id: "outsourcing-companies", category: "Business Leads", name: "Outsourcing Companies", query: "outsourcing companies BPO services", sources: ["web", "business"], industry: "Professional Services", leadType: "company", expectedFields: ["businessName", "email", "phone"], editableLocation: true },
  { id: "real-estate", category: "Business Leads", name: "Real Estate Agencies", query: "real estate agencies", sources: ["business", "web"], industry: "Real Estate", leadType: "agency", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
  { id: "healthcare", category: "Business Leads", name: "Healthcare Businesses", query: "hospitals clinics healthcare", sources: ["business"], industry: "Healthcare", leadType: "business", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
  { id: "education", category: "Business Leads", name: "Education Companies", query: "schools training institutes education", sources: ["business", "web"], industry: "Education", leadType: "business", expectedFields: ["businessName", "phone", "address"], editableLocation: true },

  // Sales Prospecting
  { id: "saas-companies", category: "Sales Prospecting", name: "SaaS Companies", query: "SaaS company software-as-a-service", sources: ["web", "github"], industry: "Technology", leadType: "company", expectedFields: ["businessName", "website", "email"], editableLocation: true },
  { id: "ecommerce", category: "Sales Prospecting", name: "E-commerce Stores", query: "e-commerce online store shop", sources: ["web", "business"], industry: "E-commerce", leadType: "business", expectedFields: ["businessName", "website", "email"], editableLocation: true },
  { id: "manufacturers", category: "Sales Prospecting", name: "Manufacturers", query: "manufacturers factory production", sources: ["web", "business"], industry: "Manufacturing", leadType: "business", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
  { id: "wholesalers", category: "Sales Prospecting", name: "Wholesalers", query: "wholesalers wholesale distributors", sources: ["web", "business"], industry: "Retail", leadType: "business", expectedFields: ["businessName", "phone", "address"], editableLocation: true },

  // Recruitment
  { id: "hiring-devs", category: "Recruitment", name: "Companies Hiring Developers", query: "\"hiring developers\" \"we are hiring\" careers", sources: ["web", "github"], industry: "Technology", leadType: "company", expectedFields: ["businessName", "website", "careers url"], editableLocation: true },
  { id: "hiring-accountants", category: "Recruitment", name: "Companies Hiring Accountants", query: "\"hiring accountant\" careers finance", sources: ["web"], industry: "Finance", leadType: "company", expectedFields: ["businessName", "website", "careers url"], editableLocation: true },
  { id: "hr-consultancies", category: "Recruitment", name: "HR Consultancies", query: "HR consultancy human resources advisory", sources: ["web", "business"], industry: "Recruitment", leadType: "agency", expectedFields: ["businessName", "phone", "email"], editableLocation: true },

  // Local Business
  { id: "restaurants", category: "Local Business", name: "Restaurants", query: "restaurants", sources: ["business"], industry: "Hospitality", leadType: "local_service", expectedFields: ["businessName", "phone", "address", "cuisine"], editableLocation: true },
  { id: "hotels", category: "Local Business", name: "Hotels", query: "hotels accommodation", sources: ["business"], industry: "Hospitality", leadType: "local_service", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
  { id: "clinics", category: "Local Business", name: "Clinics", query: "clinics medical healthcare", sources: ["business"], industry: "Healthcare", leadType: "local_service", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
  { id: "dentists", category: "Local Business", name: "Dentists", query: "dentists dental clinic", sources: ["business"], industry: "Healthcare", leadType: "local_service", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
  { id: "gyms", category: "Local Business", name: "Gyms & Fitness", query: "gyms fitness centre", sources: ["business"], industry: "Hospitality", leadType: "local_service", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
  { id: "schools", category: "Local Business", name: "Schools", query: "schools education", sources: ["business"], industry: "Education", leadType: "local_service", expectedFields: ["businessName", "phone", "address"], editableLocation: true },
];

export const TEMPLATE_CATEGORIES = [...new Set(TEMPLATES.map((t) => t.category))];
