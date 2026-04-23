"use client";

import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  ContactRow,
  SectionHeading,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

/** ATS Clean — Simple single-column, no graphics, maximum parser compatibility */
export function ATSCleanTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const sections = getVisibleSections(data);

  return (
    <A4Page>
      <div style={{ padding: "40px 48px", fontFamily: fonts.body }}>
        {/* Name & role */}
        <div style={{ marginBottom: "16px" }}>
          <h1
            style={{
              fontFamily: fonts.heading,
              fontWeight: fonts.headingWeight,
              fontSize: "28px",
              color: colors.bodyText,
              marginBottom: "4px",
            }}
          >
            {data.contact.firstName || "Fornavn"} {data.contact.lastName || "Etternavn"}
          </h1>
          {data.role && (
            <p style={{ fontSize: "15px", color: colors.mutedText, fontWeight: 500 }}>
              {data.role}
            </p>
          )}
        </div>

        {/* Contact info as simple text line */}
        <div
          style={{
            fontSize: "12px",
            color: colors.mutedText,
            marginBottom: "20px",
            paddingBottom: "16px",
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          {[data.contact.email, data.contact.phone, data.contact.location, data.contact.linkedin, data.contact.website]
            .filter(Boolean)
            .join(" | ")}
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
                variant="underline"
              />
              {content}
            </div>
          );
        })}
      </div>
    </A4Page>
  );
}
