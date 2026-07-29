import type { NextConfig } from "next";

/** Scheme and host of a URL, or empty when it is unset or malformed. */
function origin(url: string | undefined): string {
  if (!url) {
    return "";
  }
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

// Storage origins the browser may load media from, derived from the storage
// configuration rather than listed separately, so there is nothing extra to
// change when a bucket or CDN host moves. ASSETS_BASE_URL is the public bucket
// (or the CDN in front of it); S3_ENDPOINT serves signed URLs for private
// objects. The two are often different hosts.
const assetsOrigin = origin(process.env.ASSETS_BASE_URL);
const uploadsOrigin = origin(process.env.S3_ENDPOINT);
const mediaOrigins = [...new Set([assetsOrigin, uploadsOrigin])].filter(Boolean).join(" ");

const media = mediaOrigins ? ` ${mediaOrigins}` : "";
const images = mediaOrigins ? ` ${mediaOrigins}` : "";

const csp = [
  "font-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "default-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src https://*.paddle.com",
  "style-src 'self' 'unsafe-inline'",
  `media-src 'self' blob:${media}`,
  `img-src 'self' data: blob:${images} https://www.google-analytics.com https://*.google-analytics.com`,
  "connect-src 'self' blob: https://*.paddle.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://cdn.paddle.com https://www.googletagmanager.com`,
].join("; ");

const nextConfig: NextConfig = {
  // Allow a dev tunnel (ngrok, cloudflared, …) to reach the dev server, so the
  // site is reachable through the tunnel's public URL for webhook testing,
  // viewing on another device, or sharing. Set DEV_TUNNEL_HOST to the tunnel
  // host with no protocol, e.g. "abc123.trycloudflare.com".
  ...(process.env.DEV_TUNNEL_HOST ? { allowedDevOrigins: [process.env.DEV_TUNNEL_HOST] } : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  // Tie the build ID to the git SHA so Next.js can detect stale clients after a
  // redeploy and trigger a full page reload instead of failing on mismatched
  // Server Action IDs.
  generateBuildId: async () => process.env.GIT_SHA ?? "development",
  // Keep native addons out of the webpack bundle so Node can require them at runtime.
  serverExternalPackages: ["pg"],
  // Vars that must reach the client bundle. Next.js inlines these at build time,
  // so anything listed here is public: never add a secret.
  env: {
    ANALYTICS_GA_MEASUREMENT_ID: process.env.ANALYTICS_GA_MEASUREMENT_ID ?? "",
    PADDLE_CLIENT_TOKEN: process.env.PADDLE_CLIENT_TOKEN ?? "",
  },
};

export default nextConfig;
