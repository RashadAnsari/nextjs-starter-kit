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

// Both media-src and img-src allow the same two hosts: an <img> may point at a
// public asset, and a signed URL may serve either an image or a video.
const storage = mediaOrigins ? ` ${mediaOrigins}` : "";

const csp = [
  "font-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "default-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src https://*.paddle.com",
  "style-src 'self' 'unsafe-inline'",
  `media-src 'self' blob:${storage}`,
  `img-src 'self' data: blob:${storage} https://www.google-analytics.com https://*.google-analytics.com`,
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
  // Pinned explicitly, though Next.js already externalises `pg` by default: the
  // driver must stay outside the Server Components bundle and be required by
  // Node at runtime. Listing it here means a change to that default list cannot
  // silently break the connection pool.
  serverExternalPackages: ["pg"],
  // Vars that must reach the client bundle. Next.js substitutes these at build
  // time, which has two consequences worth knowing before adding one.
  //
  // They become public: the value is written into JavaScript the browser
  // downloads, so never list a secret here.
  //
  // They stop being runtime configuration: once a var is listed, its value is
  // frozen into the image, and setting it in the environment of a running
  // container does nothing. It has to be a Dockerfile build argument too, which
  // is why the Dockerfile carries an ARG for each one.
  //
  // A var read by a server component needs neither: it is read per request, so
  // supplying it at runtime is enough. PADDLE_CLIENT_TOKEN works that way, read
  // in src/app/checkout/page.tsx and passed down as a prop.
  env: {
    ANALYTICS_GA_MEASUREMENT_ID: process.env.ANALYTICS_GA_MEASUREMENT_ID ?? "",
  },
};

export default nextConfig;
