
import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  ContactRow,
  SectionHeading,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

/** Executive — Elegant serif-heavy layout for senior/leadership profiles */
export function ExecutiveTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const sections = getVisibleSections(data);

  return (
    <A4Page>
      {/* Top banner — distinguished */}
      <div
        style={{
          backgroundColor: colors.headerBg,
          padding: "44px 52px 32px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: fonts.heading,
            fontWeight: fonts.headingWeight,
            fontSize: "36px",
            color: colors.headerText,
            letterSpacing: "0.04em",
            marginBottom: "6px",
          }}
        >
          {data.contact.firstName || "Fornavn"} {data.contact.lastName || "Etternavn"}
        </h1>
        {data.role && (
          <p
            style={{
              fontSize: "13px",
              color: colors.dot,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              marginBottom: "16px",
              fontFamily: fonts.body,
            }}
          >
            {data.role}
          </p>
        )}
        {/* Decorative line */}
        <div style={{ width: "60px", height: "2px", backgroundColor: colors.dot, margin: "0 auto 14px" }} />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ContactRow data={data} colors={colors} iconColor={colors.dot} textColor={colors.sidebarText} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "32px 52px 40px", fontFamily: fonts.body }}>
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
