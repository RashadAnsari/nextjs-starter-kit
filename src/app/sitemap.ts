import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: site.url, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/privacy-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    {
      url: `${site.url}/terms-and-conditions`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${site.url}/refund-policy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
