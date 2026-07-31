import { ImageResponse } from "next/og";
import { site } from "@/config/site";

/**
 * Every raster icon the app needs, generated from the site config so they
 * rebrand with everything else. Next.js picks this file up by name and emits
 * the <link rel="icon"> tags itself. The 192 and 512 sizes exist because
 * src/app/manifest.ts needs them for home-screen installs.
 */
export const contentType = "image/png";

const ICONS = [
  { id: "32", size: 32 },
  { id: "192", size: 192 },
  { id: "512", size: 512 },
];

export function generateImageMetadata() {
  return ICONS.map(({ id, size }) => ({
    id,
    contentType,
    size: { width: size, height: size },
  }));
}

// `id` arrives as a Promise in Next.js 16 and must be awaited. Destructuring it
// as a plain string silently yields a Promise object, every lookup misses, and
// all sizes render as the first entry, which is easy to miss because the <link>
// tags still advertise the correct dimensions.
export default async function Icon({ id }: { id: Promise<string | number> }) {
  const iconId = String(await id);
  const { size } = ICONS.find((icon) => icon.id === iconId) ?? ICONS[0];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: site.brandColor,
        color: "white",
        // Scales with the icon so the letter fills the tile at every size.
        fontSize: Math.round(size * 0.6),
        fontWeight: 700,
      }}
    >
      {site.name.charAt(0).toUpperCase()}
    </div>,
    { width: size, height: size }
  );
}
