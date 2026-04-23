"use client";

import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  SectionHeading,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

/** ATS Professional — Structured single-column with bold section headers */
export function ATSProfessionalTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const sections = getVisibleSections(data);

  return (
    <A4Page>
      <div style={{ padding: "40px 48px", fontFamily: fonts.body }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "20px",
            paddingBottom: "20px",
            borderBottom: `2px solid ${colors.primary}`,
          }}
        >
          <h1
            style={{
              fontFamily: fonts.heading,
              fontWeight: fonts.headingWeight,
              fontSize: "30px",
              color: colors.bodyText,
              letterSpacing: "0.02em",
            }}
          >
            {data.contact.firstName || "Fornavn"} {data.contact.lastName || "Etternavn"}
          </h1>
          {data.role && (
            <p style={{ fontSize: "14px", color: colors.primary, fontWeight: 500, marginTop: "4px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {data.role}
            </p>
          )}
          <div
            style={{
              fontSize: "12px",
              color: colors.mutedText,
              marginTop: "10px",
            }}
          >
            {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        {/* Sections */}
        {sections.map((key) => {
          const content = renderSectionContent(key, data, colors, fonts);
          if (!content) return null;
          return (
            <div key={key} style={{ marginBottom: "20px" }}>
              <SectionHeading
                sectionKey={key}
                locale={data.locale}
                colors={colors}
                fonts={fonts}
                showIcon={false}
                variant="border-left"
              />
              {content}
            </div>
          );
        })}
      </div>
    </A4Page>
  );
}
