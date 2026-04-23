"use client";

import type { SectionKey } from "@/store/useResumeStore";
import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  ContactRow,
  SectionHeading,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

const SIDEBAR_SECTIONS: SectionKey[] = ["skills", "languages", "certifications", "interests"];

/** Creative Sidebar — Bold colored sidebar with playful typography */
export function SidebarCreativeTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const allVisible = getVisibleSections(data);
  const sidebarSections = allVisible.filter((k) => SIDEBAR_SECTIONS.includes(k));
  const mainSections = allVisible.filter((k) => !SIDEBAR_SECTIONS.includes(k));

  return (
    <A4Page>
      <div style={{ display: "flex", minHeight: "297mm" }}>
        {/* ── Sidebar ── */}
        <div
          style={{
            width: "33%",
            background: `linear-gradient(180deg, ${colors.headerBg} 0%, ${colors.sidebarBg} 100%)`,
            color: colors.sidebarText,
            padding: "40px 22px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Photo */}
          {data.contact.includePhoto && data.contact.photoUrl && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: `3px solid ${colors.dot}`,
                }}
              >
                <img
                  src={data.contact.photoUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
          )}

          {/* Name */}
          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontFamily: fonts.heading,
                fontWeight: fonts.headingWeight,
                fontSize: "24px",
                color: colors.headerText,
                lineHeight: 1.15,
              }}
            >
              {data.contact.firstName || "Fornavn"}
              <br />
              {data.contact.lastName || "Etternavn"}
            </h1>
            {data.role && (
              <p
                style={{
                  fontSize: "11px",
                  color: colors.dot,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginTop: "6px",
                  fontFamily: fonts.body,
                }}
              >
                {data.role}
              </p>
            )}
          </div>

          <div style={{ height: "1px", backgroundColor: `${colors.dot}44`, margin: "0 8px" }} />

          {/* Contact */}
          <ContactRow data={data} colors={colors} direction="column" iconColor={colors.dot} textColor={colors.sidebarText} />

          <div style={{ height: "1px", backgroundColor: `${colors.dot}44`, margin: "0 8px" }} />

          {/* Sidebar sections */}
          {sidebarSections.map((key) => {
            const sidebarColors = { ...colors, bodyText: colors.sidebarText, primaryLight: `${colors.dot}22`, primary: colors.dot };
            const content = renderSectionContent(key, data, sidebarColors, fonts);
            if (!content) return null;
            return (
              <div key={key}>
                <SectionHeading
                  sectionKey={key}
                  locale={data.locale}
                  colors={{ ...colors, primary: colors.dot }}
                  fonts={fonts}
                  showIcon={data.showSectionIcons}
                  variant="caps-only"
                />
                {content}
              </div>
            );
          })}
        </div>

        {/* ── Main ── */}
        <div style={{ width: "67%", padding: "40px 36px", fontFamily: fonts.body }}>
          {mainSections.map((key) => {
            const content = renderSectionContent(key, data, colors, fonts);
            if (!content) return null;
            return (
              <div key={key} style={{ marginBottom: "22px" }}>
                <SectionHeading
                  sectionKey={key}
                  locale={data.locale}
                  colors={colors}
                  fonts={fonts}
                  showIcon={data.showSectionIcons}
                  variant="border-left"
                />
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </A4Page>
  );
}
