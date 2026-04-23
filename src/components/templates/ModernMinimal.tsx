"use client";

import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  ContactRow,
  SectionHeading,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

/** Modern Minimal — Airy single-column, no heavy graphics */
export function ModernMinimalTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const sections = getVisibleSections(data);

  return (
    <A4Page>
      <div style={{ padding: "48px 52px", fontFamily: fonts.body }}>
        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            style={{
              fontFamily: fonts.heading,
              fontWeight: fonts.headingWeight,
              fontSize: "32px",
              color: colors.bodyText,
              letterSpacing: "-0.01em",
              marginBottom: "6px",
            }}
          >
            {data.contact.firstName || "Fornavn"} {data.contact.lastName || "Etternavn"}
          </h1>
          {data.role && (
            <p
              style={{
                fontSize: "14px",
                color: colors.primary,
                fontWeight: 500,
                marginBottom: "14px",
              }}
            >
              {data.role}
            </p>
          )}
          <ContactRow data={data} colors={colors} />
        </div>

        <div style={{ height: "1px", backgroundColor: colors.border, marginBottom: "24px" }} />

        {/* Sections */}
        {sections.map((key) => {
          const content = renderSectionContent(key, data, colors, fonts);
          if (!content) return null;
          return (
            <div key={key} style={{ marginBottom: "24px" }}>
              <SectionHeading
                sectionKey={key}
                locale={data.locale}
                colors={colors}
                fonts={fonts}
                showIcon={false}
                variant="caps-only"
              />
              {content}
            </div>
          );
        })}
      </div>
    </A4Page>
  );
}
