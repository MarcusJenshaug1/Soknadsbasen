import { ImageResponse } from "next/og";
import { getJobBySlug } from "@/lib/jobs/get-job";
import { displayPlace, formatCategory } from "@/lib/jobs/format";

// Inline kopi av websiteToHost siden CompanyLogo er "use client" og kan ikke
// importeres fra server-komponenter.
function websiteToHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(prefixed);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return trimmed.replace(/^www\./i, "").toLowerCase().split("/")[0] || null;
  }
}

// Bruker Node runtime så vi kan kalle Prisma direkte. Edge runtime ville
// kreve egen DB-fetch via REST/HTTP.
export const runtime = "nodejs";
export const alt = "Stillingsannonse på Søknadsbasen";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Bruker site-tokens. Edge runtime kan ikke importere globals.css, så
// hex-verdiene speiles her. Endringer her må holdes i synk med globals.css.
const COLORS = {
  bg: "#faf8f5",
  panel: "#eee9df",
  ink: "#14110e",
  inkMuted: "rgba(20, 17, 14, 0.65)",
  inkSubtle: "rgba(20, 17, 14, 0.45)",
  accent: "#D5592E",
  border: "rgba(0, 0, 0, 0.08)",
  borderStrong: "rgba(0, 0, 0, 0.15)",
};

function formatNorwegianDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(d: Date | null): number | null {
  if (!d) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return days < 0 ? null : days;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function employmentLabel(engagementType: string | null, extent: string | null): string {
  return [engagementType, extent].filter((p): p is string => Boolean(p)).join(" · ");
}

export default async function OG({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  if (!job) {
    return new ImageResponse(
      (
        <div
          style={{
            width: size.width,
            height: size.height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: COLORS.bg,
            color: COLORS.ink,
            fontSize: 64,
            fontFamily: "sans-serif",
          }}
        >
          Søknadsbasen
        </div>
      ),
      size,
    );
  }

  const title = truncate(job.title, 96);
  const employer = truncate(job.employerName, 60);
  const location = displayPlace(job.location ?? "");
  const employment = employmentLabel(job.engagementType, job.extent);
  const category = job.category ? formatCategory(job.category) : null;
  const deadline = job.applicationDueAt ?? job.expiresAt;
  const daysLeft = daysUntil(deadline);
  const deadlineText = formatNorwegianDate(deadline);

  const logoHost = websiteToHost(job.employerHomepage);
  const logoUrl = logoHost
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(logoHost)}&sz=128`
    : null;

  const employerInitial = job.employerName.charAt(0).toUpperCase() || "S";

  return new ImageResponse(
    (
      <div
        style={{
          width: size.width,
          height: size.height,
          display: "flex",
          flexDirection: "column",
          background: COLORS.bg,
          color: COLORS.ink,
          padding: 64,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle accent gradient */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -180,
            width: 540,
            height: 540,
            borderRadius: 540,
            background: `radial-gradient(circle, ${COLORS.accent}33 0%, transparent 65%)`,
          }}
        />

        {/* Header: brand + countdown pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 56,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: COLORS.ink,
                color: COLORS.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              S
            </div>
            <span
              style={{
                fontSize: 24,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: COLORS.ink,
              }}
            >
              Søknadsbasen
            </span>
          </div>
          {daysLeft !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: daysLeft <= 3 ? `${COLORS.accent}1a` : COLORS.panel,
                color: daysLeft <= 3 ? COLORS.accent : COLORS.ink,
                padding: "10px 18px",
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  background: daysLeft <= 3 ? COLORS.accent : COLORS.ink,
                }}
              />
              {daysLeft === 0
                ? "Frist i dag"
                : daysLeft === 1
                  ? "Frist i morgen"
                  : `${daysLeft} dager til frist`}
            </div>
          )}
        </div>

        {/* Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            position: "relative",
          }}
        >
          {category && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
                color: COLORS.accent,
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 1,
                  background: COLORS.accent,
                }}
              />
              {category}
            </div>
          )}

          <div
            style={{
              fontSize: title.length > 60 ? 64 : title.length > 40 ? 76 : 88,
              fontWeight: 500,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              color: COLORS.ink,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            {title}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: "auto",
              fontSize: 22,
              color: COLORS.inkMuted,
              flexWrap: "wrap",
            }}
          >
            {location && <span>{location}</span>}
            {location && employment && (
              <span style={{ color: COLORS.inkSubtle }}>·</span>
            )}
            {employment && <span>{employment}</span>}
            {(location || employment) && deadlineText && (
              <span style={{ color: COLORS.inkSubtle }}>·</span>
            )}
            {deadlineText && <span>Frist {deadlineText}</span>}
          </div>
        </div>

        {/* Footer: employer + CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: `1px solid ${COLORS.border}`,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: COLORS.panel,
                border: `1px solid ${COLORS.borderStrong}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.inkMuted,
                fontSize: 28,
                fontWeight: 500,
                overflow: "hidden",
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  width={64}
                  height={64}
                  style={{ width: 64, height: 64, objectFit: "cover" }}
                />
              ) : (
                <span>{employerInitial}</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontSize: 14,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: COLORS.inkSubtle,
                }}
              >
                Arbeidsgiver
              </span>
              <span style={{ fontSize: 26, fontWeight: 500, color: COLORS.ink }}>
                {employer}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 22px",
              borderRadius: 999,
              background: COLORS.accent,
              color: COLORS.bg,
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            Søk via søknadsbasen.no
            <span style={{ fontSize: 20 }}>→</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
