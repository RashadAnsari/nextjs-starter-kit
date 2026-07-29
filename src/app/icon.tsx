import { ImageResponse } from "next/og";
import { site } from "@/config/site";

/**
 * The browser tab icon, generated from the site config so it rebrands with
 * everything else. Next.js picks this file up by name and emits the <link>
 * tag itself.
 *
 * Replace it with a real favicon when you have one: delete this file and put an
 * `icon.png` (or `favicon.ico` in the app directory) in its place.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
        fontSize: 20,
        fontWeight: 700,
        borderRadius: 6,
      }}
    >
      {site.name.charAt(0).toUpperCase()}
    </div>,
    size
  );
}
