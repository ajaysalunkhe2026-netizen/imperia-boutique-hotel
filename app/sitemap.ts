import type { MetadataRoute } from "next";

const siteUrl = "https://imperiaboutiquehotel.in";
const sections = ["hotel", "rooms", "dining", "experiences", "offers", "contact", "booking"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    ...sections.map((section) => ({
      url: `${siteUrl}/${section}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: section === "booking" ? 0.8 : 0.7,
    })),
  ];
}
