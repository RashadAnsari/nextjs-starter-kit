"use client";

import { useEffect } from "react";

/**
 * The last line of defence: it catches errors thrown by the root layout itself,
 * which error.tsx cannot, because that renders inside the layout that failed.
 *
 * It therefore has to supply its own <html> and <body>, and it cannot use the
 * app's components or stylesheet, since the layout that loads them is the thing
 * that broke. Keep the styles inline and the markup minimal.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#fafafa",
          color: "#111827",
        }}
      >
        <div style={{ maxWidth: 520, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: 12, fontSize: 17, lineHeight: 1.6, color: "#6b7280" }}>
            The application failed to load. Please try again.
          </p>
          {error.digest && (
            <p style={{ marginTop: 16, fontSize: 14, color: "#9ca3af" }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 32,
              padding: "12px 24px",
              fontSize: 15,
              fontWeight: 600,
              color: "white",
              background: "#1b6b4a",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
