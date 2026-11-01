"use client";

import Link from "next/link";
import { ShieldCheck, Globe, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-card/30 backdrop-blur-sm">
      <div className="px-4 py-4 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="https://niftytechfinds.com" target="_blank" className="font-semibold text-foreground hover:text-primary">
              NiftyTechFinds.com
            </Link>
            <span>•</span>
            <span>Nifty Lead Finder v1.0</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Find. Discover. Enrich. Export.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><ShieldCheck className="size-3 text-emerald-500" /> Public data only</span>
            <span className="flex items-center gap-1"><Globe className="size-3 text-cyan-500" /> 11 free sources</span>
            <span className="flex items-center gap-1"><Heart className="size-3 text-rose-500" /> 100% free</span>
          </div>
        </div>
        <div className="mt-2 text-[10px]">
          Data: Web Search • LinkedIn • Crunchbase • Product Hunt • X/Reddit/SO/Mastodon • OpenStreetMap (ODbL) • Wikipedia • GitHub • Hacker News • YouTube oEmbed.
          Always comply with GDPR, CCPA, CAN-SPAM, CASL, India&apos;s DPDP Act and applicable laws.
        </div>
      </div>
    </footer>
  );
}
