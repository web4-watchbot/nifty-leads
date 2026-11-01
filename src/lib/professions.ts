// Professions library — role-specific search templates that target people leads.
// Each profession comes with a curated query template + recommended sources so
// the user gets real, relevant person leads (not generic web pages).

export interface Profession {
  id: string;
  label: string;
  category: "executive" | "marketing" | "engineering" | "creative" | "sales" | "finance" | "legal" | "other";
  query: string;           // Query template; "{{location}}" is replaced with the user's location filter
  sources: string[];        // Recommended source IDs (linkedin, github, web, etc.)
  leadType: string;         // Used as the lead type filter when applied
  description?: string;
}

// The query template uses {{location}} as a placeholder. If no location is set,
// it's simply stripped out.
export function buildProfessionQuery(prof: Profession, location?: string): string {
  const loc = location && location !== "worldwide" ? location : "";
  return prof.query.replace(/\{\{location\}\}/g, loc).trim();
}

export const PROFESSIONS: Profession[] = [
  // ===== Executives =====
  {
    id: "ceo-founder",
    label: "CEO / Founder",
    category: "executive",
    query: '"CEO" OR "Founder" OR "Co-founder" {{location}}',
    sources: ["linkedin", "crunchbase", "web"],
    leadType: "decision_maker",
    description: "Chief executives and company founders",
  },
  {
    id: "cto",
    label: "CTO / Chief Technology Officer",
    category: "executive",
    query: '"CTO" OR "Chief Technology Officer" {{location}}',
    sources: ["linkedin", "github", "web"],
    leadType: "decision_maker",
    description: "Technology leaders and decision makers",
  },
  {
    id: "cmo",
    label: "CMO / Chief Marketing Officer",
    category: "executive",
    query: '"CMO" OR "Chief Marketing Officer" {{location}}',
    sources: ["linkedin", "web", "crunchbase"],
    leadType: "decision_maker",
    description: "Marketing leaders and decision makers",
  },
  {
    id: "vp-director",
    label: "VP / Director",
    category: "executive",
    query: '"VP" OR "Vice President" OR "Director" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "decision_maker",
    description: "Vice Presidents and Directors",
  },

  // ===== Marketing =====
  {
    id: "marketing-manager",
    label: "Marketing Manager",
    category: "marketing",
    query: '"Marketing Manager" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "Marketing managers and coordinators",
  },
  {
    id: "digital-marketer",
    label: "Digital Marketer",
    category: "marketing",
    query: '"Digital Marketing" specialist OR manager {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "Digital marketing specialists",
  },
  {
    id: "seo-specialist",
    label: "SEO Specialist",
    category: "marketing",
    query: '"SEO Specialist" OR "SEO Manager" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "Search engine optimization specialists",
  },
  {
    id: "social-media-manager",
    label: "Social Media Manager",
    category: "marketing",
    query: '"Social Media Manager" {{location}}',
    sources: ["linkedin", "social", "web"],
    leadType: "individual",
    description: "Social media managers and strategists",
  },
  {
    id: "content-strategist",
    label: "Content Strategist / Writer",
    category: "marketing",
    query: '"Content Strategist" OR "Content Writer" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "Content creators and strategists",
  },
  {
    id: "growth-marketer",
    label: "Growth / Performance Marketer",
    category: "marketing",
    query: '"Growth Marketer" OR "Performance Marketing" {{location}}',
    sources: ["linkedin", "crunchbase", "web"],
    leadType: "individual",
    description: "Growth and performance marketing specialists",
  },

  // ===== Engineering =====
  {
    id: "software-engineer",
    label: "Software Engineer",
    category: "engineering",
    query: '"Software Engineer" {{location}}',
    sources: ["github", "linkedin", "web"],
    leadType: "individual",
    description: "Backend, frontend, and full-stack engineers",
  },
  {
    id: "frontend-developer",
    label: "Frontend Developer",
    category: "engineering",
    query: '"Frontend Developer" OR "Front-end Developer" {{location}}',
    sources: ["github", "linkedin", "web"],
    leadType: "freelancer",
    description: "React, Vue, and frontend specialists",
  },
  {
    id: "backend-developer",
    label: "Backend Developer",
    category: "engineering",
    query: '"Backend Developer" OR "Back-end Developer" {{location}}',
    sources: ["github", "linkedin", "web"],
    leadType: "freelancer",
    description: "API and server-side engineers",
  },
  {
    id: "fullstack-developer",
    label: "Full-Stack Developer",
    category: "engineering",
    query: '"Full Stack Developer" OR "Full-stack Engineer" {{location}}',
    sources: ["github", "linkedin", "web"],
    leadType: "freelancer",
    description: "End-to-end web developers",
  },
  {
    id: "devops-engineer",
    label: "DevOps Engineer",
    category: "engineering",
    query: '"DevOps Engineer" OR "Site Reliability Engineer" {{location}}',
    sources: ["github", "linkedin", "web"],
    leadType: "individual",
    description: "DevOps and SRE engineers",
  },
  {
    id: "data-scientist",
    label: "Data Scientist / ML Engineer",
    category: "engineering",
    query: '"Data Scientist" OR "Machine Learning Engineer" {{location}}',
    sources: ["github", "linkedin", "web"],
    leadType: "individual",
    description: "Data scientists and ML engineers",
  },
  {
    id: "mobile-developer",
    label: "Mobile Developer (iOS/Android)",
    category: "engineering",
    query: '"iOS Developer" OR "Android Developer" OR "Mobile Developer" {{location}}',
    sources: ["github", "linkedin", "web"],
    leadType: "freelancer",
    description: "iOS and Android mobile developers",
  },

  // ===== Creative =====
  {
    id: "ux-designer",
    label: "UX / UI Designer",
    category: "creative",
    query: '"UX Designer" OR "UI Designer" OR "Product Designer" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "freelancer",
    description: "User experience and interface designers",
  },
  {
    id: "graphic-designer",
    label: "Graphic Designer",
    category: "creative",
    query: '"Graphic Designer" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "freelancer",
    description: "Visual and brand designers",
  },
  {
    id: "video-editor",
    label: "Video Editor / Producer",
    category: "creative",
    query: '"Video Editor" OR "Video Producer" {{location}}',
    sources: ["linkedin", "youtube", "web"],
    leadType: "freelancer",
    description: "Video editing and production specialists",
  },
  {
    id: "photographer",
    label: "Photographer",
    category: "creative",
    query: '"Photographer" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "freelancer",
    description: "Professional photographers",
  },
  {
    id: "podcast-host",
    label: "Podcast Host / Producer",
    category: "creative",
    query: '"Podcast Host" OR "Podcast Producer" {{location}}',
    sources: ["linkedin", "youtube", "web"],
    leadType: "creator",
    description: "Podcast hosts and producers",
  },

  // ===== Sales =====
  {
    id: "sales-manager",
    label: "Sales Manager / Director",
    category: "sales",
    query: '"Sales Manager" OR "Head of Sales" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "decision_maker",
    description: "Sales leaders and managers",
  },
  {
    id: "account-executive",
    label: "Account Executive",
    category: "sales",
    query: '"Account Executive" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "B2B account executives",
  },
  {
    id: "business-dev",
    label: "Business Development",
    category: "sales",
    query: '"Business Development Manager" OR "BD Manager" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "BD managers and partnerships leads",
  },

  // ===== Finance =====
  {
    id: "cfo",
    label: "CFO / Finance Director",
    category: "finance",
    query: '"CFO" OR "Finance Director" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "decision_maker",
    description: "Chief financial officers",
  },
  {
    id: "accountant",
    label: "Accountant / CPA",
    category: "finance",
    query: '"Accountant" OR "CPA" OR "Chartered Accountant" {{location}}',
    sources: ["linkedin", "business", "web"],
    leadType: "individual",
    description: "Accountants and bookkeepers",
  },
  {
    id: "financial-advisor",
    label: "Financial Advisor",
    category: "finance",
    query: '"Financial Advisor" OR "Financial Planner" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "Personal and corporate financial advisors",
  },

  // ===== Legal =====
  {
    id: "lawyer-attorney",
    label: "Lawyer / Attorney",
    category: "legal",
    query: '"Lawyer" OR "Attorney" OR "Solicitor" {{location}}',
    sources: ["linkedin", "business", "web"],
    leadType: "individual",
    description: "Practicing lawyers and attorneys",
  },

  // ===== Other professionals =====
  {
    id: "recruiter",
    label: "Recruiter / Talent Acquisition",
    category: "other",
    query: '"Recruiter" OR "Talent Acquisition" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "individual",
    description: "Recruiters and HR specialists",
  },
  {
    id: "consultant",
    label: "Consultant",
    category: "other",
    query: '"Consultant" {{location}}',
    sources: ["linkedin", "web"],
    leadType: "freelancer",
    description: "Strategy, operations, and management consultants",
  },
  {
    id: "real-estate-agent",
    label: "Real Estate Agent",
    category: "other",
    query: '"Real Estate Agent" OR "Realtor" {{location}}',
    sources: ["linkedin", "business", "web"],
    leadType: "individual",
    description: "Real estate agents and brokers",
  },
  {
    id: "influencer-creator",
    label: "Influencer / Creator",
    category: "other",
    query: '"influencer" OR "content creator" {{location}}',
    sources: ["social", "youtube", "web"],
    leadType: "creator",
    description: "Social media influencers and creators",
  },
];

export const PROFESSION_CATEGORIES = [
  { id: "executive",  label: "Executives & Founders" },
  { id: "marketing",  label: "Marketing" },
  { id: "engineering", label: "Engineering & Tech" },
  { id: "creative",   label: "Creative & Design" },
  { id: "sales",      label: "Sales & BD" },
  { id: "finance",    label: "Finance" },
  { id: "legal",      label: "Legal" },
  { id: "other",      label: "Other Professionals" },
] as const;

export function getProfession(id: string): Profession | undefined {
  return PROFESSIONS.find((p) => p.id === id);
}
