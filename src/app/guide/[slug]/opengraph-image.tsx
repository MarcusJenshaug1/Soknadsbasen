import { ImageResponse } from "next/og";
import { getGuide } from "@/lib/guide/loader";
import { siteConfig } from "@/lib/seo/siteConfig";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const alt = "Søknadsbasen — guide";

type Props = { params: Promise<{ slug: string }> };

export default async function GuideOgImage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  const title = guide?.frontmatter.title ?? "Guide";
  const tag = guide?.frontmatter.tags?.[0] ?? "Guide";
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: bg,
                }}
              />
            </div>
            <div style={{ fontSize: 24, fontWeight: 500 }}>søknadsbasen</div>
          </div>
          <div
            style={{
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: accent,
            }}
          >
            {tag}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: title.length > 50 ? 64 : 80,
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 1040,
          }}
        >
          {title}
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
          <span>søknadsbasen.no/guide</span>
          <span style={{ color: accent, fontSize: 28 }}>●</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
