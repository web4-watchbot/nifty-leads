import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nifty Lead Finder — Global AI-Powered Lead Discovery Engine | NiftyTechFinds",
  description:
    "Find businesses, professionals, creators, agencies and companies from across the public web. Nifty Lead Finder by NiftyTechFinds — discover, enrich and export leads to Excel/CSV in seconds. 100% free, no API key required.",
  keywords: [
    "lead finder",
    "B2B lead generation",
    "business leads",
    "email finder",
    "contact extractor",
    "NiftyTechFinds",
    "Nifty Lead Finder",
    "free lead discovery",
    "CSV export leads",
    "Excel leads",
  ],
  authors: [{ name: "NiftyTechFinds", url: "https://niftytechfinds.com" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Nifty Lead Finder — Global AI-Powered Lead Discovery Engine",
    description: "Find. Discover. Enrich. Export. Turn ordinary search queries into organised, enriched and exportable business lead databases.",
    url: "https://niftytechfinds.com/lead-finder/",
    siteName: "NiftyTechFinds",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nifty Lead Finder",
    description: "AI-powered global lead discovery engine by NiftyTechFinds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
