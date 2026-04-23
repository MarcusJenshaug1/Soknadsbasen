import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo/siteConfig";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;

export default function OgImage() {
  const { bg, ink, accent } = siteConfig.brandColors;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          color: ink,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: ink,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: bg,
              }}
            />
          </div>
          <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: -0.5 }}>
            søknadsbasen
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 112,
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: -4,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Jobbsøking,</span>
            <span>med ro.</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(20,17,14,0.65)",
              maxWidth: 880,
              lineHeight: 1.35,
            }}
          >
            {siteConfig.shortDescription}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 20,
            color: "rgba(20,17,14,0.55)",
          }}
        >
          <span>søknadsbasen.no</span>
          <span style={{ color: accent, fontSize: 32 }}>●</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
