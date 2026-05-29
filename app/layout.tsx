import type { Metadata } from "next";
import { Special_Elite, Saira_Stencil_One } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import PostHogProvider from "@/components/PostHogProvider";
import { clerkClientEnabled as clerkEnabled } from "@/lib/config";
import "./globals.css";

const typewriter = Special_Elite({
  variable: "--font-typewriter",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const stencil = Saira_Stencil_One({
  variable: "--font-stencil",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://commitcrimes.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "CommitCrimes: your git habits, prosecuted",
  description:
    "Paste a GitHub username. We pull the public record and book them for crimes against version control. Get sentenced. Earn your badge.",
  openGraph: {
    title: "CommitCrimes: your git habits, prosecuted",
    description:
      "Paste a GitHub username. We book them for crimes against version control.",
    url: SITE,
    siteName: "CommitCrimes",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CommitCrimes: your git habits, prosecuted",
    description: "Paste a GitHub username. Get sentenced. Earn your badge.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const html = (
    <html
      lang="en"
      className={`${typewriter.variable} ${stencil.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );

  return clerkEnabled ? <ClerkProvider>{html}</ClerkProvider> : html;
}
