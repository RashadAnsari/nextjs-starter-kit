import { ImageResponse } from "next/og";
import { site } from "@/config/site";

/**
 * The icon iOS uses when someone adds the site to their home screen. It needs
 * its own file because Safari expects a single 180x180 image with no
 * transparency: iOS composites it onto a rounded tile itself, so a transparent
 * background would show through as black.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        fontSize: 108,
        fontWeight: 700,
      }}
    >
      {site.name.charAt(0).toUpperCase()}
    </div>,
    size
  );
}
