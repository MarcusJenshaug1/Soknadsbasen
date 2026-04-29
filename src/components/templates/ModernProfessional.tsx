
import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  ContactRow,
  SectionHeading,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

/** Modern Professional — Strong top header with accent color, timeline, icons */
export function ModernProfessionalTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const sections = getVisibleSections(data);

  return (
    <A4Page>
      {/* Top banner */}
      <div
        style={{
          backgroundColor: colors.headerBg,
          padding: "36px 48px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "24px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontFamily: fonts.heading,
              fontWeight: fonts.headingWeight,
              fontSize: "34px",
              color: colors.headerText,
              lineHeight: 1.2,
              marginBottom: "6px",
            }}
          >
            {data.contact.firstName || "Fornavn"} {data.contact.lastName || "Etternavn"}
          </h1>
          {data.role && (
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: colors.dot,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "14px",
              }}
            >
              {data.role}
            </p>
          )}
          <ContactRow data={data} colors={colors} iconColor={colors.dot} textColor={colors.sidebarText} />
        </div>

        {data.contact.includePhoto && data.contact.photoUrl && (
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              overflow: "hidden",
              border: `3px solid ${colors.dot}`,
              flexShrink: 0,
            }}
          >
            <img
              src={data.contact.photoUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "28px 48px 40px", fontFamily: fonts.body }}>
        {sections.map((key) => {
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
    </A4Page>
  );
}
