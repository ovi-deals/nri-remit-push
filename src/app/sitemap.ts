import type { MetadataRoute } from "next";
import { getAllCorridorSlugs } from "@/lib/corridors";

// IMPORTANT: replace with your real production domain once deployed —
// search engines need the canonical absolute URL, not a relative path.
const BASE_URL = "https://nritransfer.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const corridorPages = getAllCorridorSlugs().map((slug) => ({
    url: `${BASE_URL}/send-money/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const, // rates update constantly, content less so — daily is a reasonable signal
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...corridorPages,
  ];
}
