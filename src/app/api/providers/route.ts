import { NextRequest, NextResponse } from "next/server";
import { PROVIDERS, OPTIONAL_PROVIDERS, API_CHECKLIST } from "@/lib/providers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    freeProviders: Object.values(PROVIDERS),
    optionalProviders: OPTIONAL_PROVIDERS,
    apiChecklist: API_CHECKLIST,
  });
}

// Test connection (for optional BYOK providers — just validates the key format)
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { provider: string; apiKey?: string };
  const def = OPTIONAL_PROVIDERS.find((p) => p.id === body.provider);
  if (!def) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

  const key = body.apiKey?.trim();
  if (!key) return NextResponse.json({ ok: false, error: "API key required" });

  // Minimal validation — each provider has a different key format
  const ok = key.length >= 8;
  return NextResponse.json({ ok, message: ok ? "Key format looks valid" : "Key looks too short" });
}
