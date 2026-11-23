import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/login", "/traffic-dashboard"] },
    ],
    sitemap: "https://imperiaboutiquehotel.in/sitemap.xml",
  };
}
