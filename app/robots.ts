import type { MetadataRoute } from "next";

const SITE = "https://commitcrimes.dev";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth/personal + API surfaces — nothing to index.
      disallow: ["/api/", "/me", "/deep", "/remove"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
