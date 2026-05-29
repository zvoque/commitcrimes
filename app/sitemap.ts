import type { MetadataRoute } from "next";
import { topWanted } from "@/lib/store";

const SITE = "https://commitcrimes.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/wanted`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Only claimed records are listed — consented, and avoids index bloat from
  // every transiently-cached lookup.
  const wanted = await topWanted(1000).catch(() => []);
  const records: MetadataRoute.Sitemap = wanted.map((w) => ({
    url: `${SITE}/u/${w.login}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...records];
}
