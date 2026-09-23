import type { MetadataRoute } from "next";
import { CALCULATORS, SITE } from "./lib/calculators";
import { LEGAL_LAST_UPDATED } from "./lib/legal";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/calculators`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...CALCULATORS.map((c) => ({
      url: `${SITE}/calculators/${c.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // The legal pages change only when they are revised, so they carry their
    // own date rather than today's.
    ...["privacy", "terms", "disclaimer"].map((slug) => ({
      url: `${SITE}/${slug}`,
      lastModified: LEGAL_LAST_UPDATED,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
