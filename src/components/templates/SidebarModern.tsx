"use client";

import type { ResumeData, SectionKey } from "@/store/useResumeStore";
import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  ContactRow,
  SectionHeading,
  SkillsList,
  LanguagesList,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

/* Sidebar sections — these go in the left column */
const SIDEBAR_SECTIONS: SectionKey[] = ["skills", "languages", "certifications", "interests"];

/** Two-Column Modern — Dark sidebar on left with contact/skills, main content on right */
export function SidebarModernTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const allVisible = getVisibleSections(data);
  const sidebarSections = allVisible.filter((k) => SIDEBAR_SECTIONS.includes(k));
  const mainSections = allVisible.filter((k) => !SIDEBAR_SECTIONS.includes(k));

  return (
    <A4Page>
      <div style={{ display: "flex", minHeight: "297mm" }}>
        {/* ── Sidebar ── */}
        <div
          style={{
            width: "35%",
            backgroundColor: colors.sidebarBg,
            color: colors.sidebarText,
            padding: "36px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Photo */}
          {data.contact.includePhoto && data.contact.photoUrl && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "4px" }}>
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: `3px solid ${colors.dot}`,
                }}
              >
                <img
                  src={data.contact.photoUrl}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: data.contact.photoPosition || "center",
                  }}
                />
              </div>
            </div>
          )}

          {/* Name (sidebar) */}
          <div>
            <h1
              style={{
                fontFamily: fonts.heading,
                fontWeight: fonts.headingWeight,
                fontSize: "22px",
                color: colors.headerText,
                lineHeight: 1.2,
                marginBottom: "4px",
              }}
            >
              {data.contact.firstName || "Fornavn"}{"\n"}
              {data.contact.lastName || "Etternavn"}
            </h1>
            {data.role && (
              <p style={{ fontSize: "12px", color: colors.dot, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: "4px" }}>
                {data.role}
              </p>
            )}
          </div>

          {/* Contact */}
          <div>
            <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: colors.dot, marginBottom: "8px", fontFamily: fonts.heading }}>
              {data.locale === "no" ? "Kontakt" : "Contact"}
            </h3>
            <ContactRow data={data} colors={colors} direction="column" iconColor={colors.dot} textColor={colors.sidebarText} />
          </div>

          {/* Sidebar sections */}
          {sidebarSections.map((key) => {
            const sidebarColors = { ...colors, bodyText: colors.sidebarText, primaryLight: `${colors.dot}22` };
            const content = renderSectionContent(key, data, sidebarColors, fonts);
            if (!content) return null;
            return (
              <div key={key}>
                <h3 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: colors.dot, marginBottom: "8px", fontFamily: fonts.heading }}>
                  {key === "skills" ? (data.locale === "no" ? "Ferdigheter" : "Skills") :
                   key === "languages" ? (data.locale === "no" ? "Språk" : "Languages") :
                   key === "certifications" ? (data.locale === "no" ? "Sertifiseringer" : "Certifications") :
                   (data.locale === "no" ? "Interesser" : "Interests")}
                </h3>
                {content}
              </div>
            );
          })}
        </div>

        {/* ── Main content ── */}
        <div style={{ width: "65%", padding: "36px 36px 40px 32px", fontFamily: fonts.body }}>
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
                  variant="underline"
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
