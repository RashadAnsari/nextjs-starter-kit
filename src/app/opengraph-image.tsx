import { ImageResponse } from "next/og";
import { site } from "@/config/site";

/**
 * The social preview card, generated at build time rather than shipped as a
 * binary, so renaming the product rebrands it. Next.js picks this file up by
 * name and injects the og:image and twitter:image tags itself, which is why
 * layout.tsx declares neither.
 */
export const alt = site.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px",
        background: site.brandColor,
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.02em" }}>{site.name}</div>
      <div style={{ marginTop: 24, fontSize: 36, lineHeight: 1.3, opacity: 0.85 }}>
        {site.tagline}
      </div>
    </div>,
    size
  );
}
