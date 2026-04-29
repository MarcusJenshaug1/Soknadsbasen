
import type { TemplateRenderProps } from "./shared";
import {
  A4Page,
  ContactRow,
  SectionHeading,
  getVisibleSections,
  renderSectionContent,
} from "./shared";

/** Academic — Classic layout with emphasis on publications, projects, education */
export function AcademicTemplate({ data, colors, fonts }: TemplateRenderProps) {
  const sections = getVisibleSections(data);

  return (
    <A4Page>
      <div style={{ padding: "44px 48px", fontFamily: fonts.body }}>
        {/* Header */}
        <div
          style={{
            marginBottom: "24px",
            paddingBottom: "18px",
            borderBottom: `2px solid ${colors.bodyText}`,
          }}
        >
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
            <p
              style={{
                fontSize: "14px",
                color: colors.primary,
                fontWeight: 500,
                fontStyle: "italic",
                marginBottom: "10px",
                fontFamily: fonts.heading,
              }}
            >
              {data.role}
            </p>
          )}
          <ContactRow data={data} colors={colors} />
        </div>

        {/* Sections */}
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
