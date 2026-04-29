
import type { ResumeData, SectionKey } from "@/store/useResumeStore";
import { SECTION_LABELS } from "@/store/useResumeStore";
import type { ColorPalette, FontPair } from "@/lib/design-tokens";
import {
  Briefcase,
  GraduationCap,
  Wrench,
  Globe,
  Award,
  BookOpen,
  FolderOpen,
  Heart,
  Users,
  FileText,
  Star,
  Lightbulb,
  Mail,
  Phone,
  MapPin,
  Link2,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Icon map ────────────────────────────────────────────── */

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  summary: FileText,
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  languages: Globe,
  certifications: Award,
  projects: FolderOpen,
  courses: BookOpen,
  volunteering: Heart,
  awards: Star,
  publications: BookOpen,
  references: Users,
  interests: Lightbulb,
};

/* ─── Shared types ────────────────────────────────────────── */

export interface TemplateRenderProps {
  data: ResumeData;
  colors: ColorPalette;
  fonts: FontPair;
}

/* ─── Utility: get localised label ────────────────────────── */

export function label(key: SectionKey, locale: "no" | "en"): string {
  return SECTION_LABELS[key][locale];
}

/* ─── Section heading ─────────────────────────────────────── */

export function SectionHeading({
  sectionKey,
  locale,
  colors,
  fonts,
  showIcon,
  variant = "default",
}: {
  sectionKey: SectionKey;
  locale: "no" | "en";
  colors: ColorPalette;
  fonts: FontPair;
  showIcon: boolean;
  variant?: "default" | "underline" | "border-left" | "caps-only";
}) {
  const Icon = SECTION_ICONS[sectionKey];
  const text = label(sectionKey, locale);

  const base: React.CSSProperties = {
    fontFamily: fonts.heading,
    fontWeight: fonts.headingWeight,
    color: colors.primary,
    fontSize: "13px",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    pageBreakAfter: "avoid",
  };

  if (variant === "underline") {
    return (
      <h3 style={{ ...base, paddingBottom: "6px", borderBottom: `2px solid ${colors.border}` }}>
        {showIcon && <Icon size={14} />}
        {text}
      </h3>
    );
  }
  if (variant === "border-left") {
    return (
      <h3 style={{ ...base, paddingLeft: "10px", borderLeft: `3px solid ${colors.primary}` }}>
        {showIcon && <Icon size={14} />}
        {text}
      </h3>
    );
  }

  return (
    <h3 style={base}>
      {showIcon && <Icon size={14} />}
      {text}
    </h3>
  );
}

/* ─── Contact info row ────────────────────────────────────── */

export function ContactRow({
  data,
  colors,
  direction = "row",
  iconColor,
  textColor,
}: {
  data: ResumeData;
  colors: ColorPalette;
  direction?: "row" | "column";
  iconColor?: string;
  textColor?: string;
}) {
  const c = data.contact;
  const items: { icon: LucideIcon; value: string; href?: string }[] = [];

  if (c.email) items.push({ icon: Mail, value: c.email, href: `mailto:${c.email}` });
  if (c.phone) items.push({ icon: Phone, value: c.phone, href: `tel:${c.phone}` });
  if (c.location) items.push({ icon: MapPin, value: c.location });
  if (c.linkedin) items.push({ icon: Link2, value: c.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, ""), href: c.linkedin });
  if (c.website) items.push({ icon: ExternalLink, value: c.website.replace(/^https?:\/\//, ""), href: c.website });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction,
        flexWrap: "wrap",
        gap: direction === "row" ? "16px" : "6px",
        fontSize: "12px",
        color: textColor ?? colors.mutedText,
      }}
    >
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <item.icon size={13} color={iconColor ?? colors.mutedText} />
          {item.href ? (
            <a href={item.href} style={{ color: "inherit", textDecoration: "none" }}>
              {item.value}
            </a>
          ) : (
            <span>{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Experience entry ────────────────────────────────────── */

export function ExperienceEntry({
  exp,
  colors,
  fonts,
  datePosition,
  showTimeline = false,
}: {
  exp: ResumeData["experience"][0];
  colors: ColorPalette;
  fonts: FontPair;
  datePosition: "left" | "right";
  showTimeline?: boolean;
}) {
  const dateStr = `${exp.startDate || "Start"} — ${exp.current ? "Nå" : exp.endDate || "Slutt"}`;

  return (
    <div
      style={{
        position: "relative",
        paddingLeft: showTimeline ? "14px" : "0",
        borderLeft: showTimeline ? `2px solid ${colors.border}` : "none",
        marginBottom: "14px",
        pageBreakInside: "avoid",
      }}
    >
      {showTimeline && (
        <div
          style={{
            position: "absolute",
            left: "-5px",
            top: "6px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: colors.dot,
            border: "2px solid white",
          }}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
        {datePosition === "left" && (
          <span style={{ fontSize: "12px", color: colors.mutedText, minWidth: "120px", flexShrink: 0, fontFamily: fonts.body }}>{dateStr}</span>
        )}
        <h4
          style={{
            fontFamily: fonts.body,
            fontWeight: 600,
            fontSize: "14px",
            color: colors.bodyText,
            flex: 1,
          }}
        >
          {exp.title || "Stillingstittel"}
        </h4>
        {datePosition === "right" && (
          <span style={{ fontSize: "12px", color: colors.mutedText, flexShrink: 0, marginLeft: "12px", fontFamily: fonts.body }}>{dateStr}</span>
        )}
      </div>
      <p style={{ fontSize: "13px", color: colors.mutedText, fontWeight: 500, marginBottom: "4px", fontFamily: fonts.body }}>
        {exp.company || "Selskap"}{exp.location ? ` · ${exp.location}` : ""}
      </p>
      {exp.description && (
        <div
          className="rich-content"
          style={{ fontSize: "12px", lineHeight: "1.6", color: colors.bodyText, fontFamily: fonts.body }}
          dangerouslySetInnerHTML={{ __html: exp.description }}
        />
      )}
    </div>
  );
}

/* ─── Education entry ─────────────────────────────────────── */

export function EducationEntry({
  edu,
  colors,
  fonts,
  datePosition,
  showTimeline = false,
}: {
  edu: ResumeData["education"][0];
  colors: ColorPalette;
  fonts: FontPair;
  datePosition: "left" | "right";
  showTimeline?: boolean;
}) {
  const dateStr = `${edu.startDate || "Start"} — ${edu.current ? "Nå" : edu.endDate || "Slutt"}`;

  return (
    <div
      style={{
        position: "relative",
        paddingLeft: showTimeline ? "14px" : "0",
        borderLeft: showTimeline ? `2px solid ${colors.border}` : "none",
        marginBottom: "14px",
        pageBreakInside: "avoid",
      }}
    >
      {showTimeline && (
        <div
          style={{
            position: "absolute",
            left: "-5px",
            top: "6px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: colors.dot,
            border: "2px solid white",
          }}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
        {datePosition === "left" && (
          <span style={{ fontSize: "12px", color: colors.mutedText, minWidth: "120px", flexShrink: 0, fontFamily: fonts.body }}>{dateStr}</span>
        )}
        <h4 style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: "14px", color: colors.bodyText, flex: 1 }}>
          {edu.degree || "Grad"}{edu.field ? ` — ${edu.field}` : ""}
        </h4>
        {datePosition === "right" && (
          <span style={{ fontSize: "12px", color: colors.mutedText, flexShrink: 0, marginLeft: "12px", fontFamily: fonts.body }}>{dateStr}</span>
        )}
      </div>
      <p style={{ fontSize: "13px", color: colors.mutedText, fontWeight: 500, marginBottom: "4px", fontFamily: fonts.body }}>
        {edu.school || "Skole"}{edu.location ? ` · ${edu.location}` : ""}
      </p>
      {edu.description && (
        <div
          className="rich-content"
          style={{ fontSize: "12px", lineHeight: "1.6", color: colors.bodyText, fontFamily: fonts.body }}
          dangerouslySetInnerHTML={{ __html: edu.description }}
        />
      )}
    </div>
  );
}

/* ─── Skills list (tags or plain) ─────────────────────────── */

export function SkillsList({
  skills,
  colors,
  fonts,
  variant = "tags",
}: {
  skills: string[];
  colors: ColorPalette;
  fonts: FontPair;
  variant?: "tags" | "plain" | "dots";
}) {
  if (!skills.length) return null;
  if (variant === "tags") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {skills.map((s, i) => (
          <span
            key={i}
            style={{
              padding: "3px 10px",
              borderRadius: "4px",
              backgroundColor: colors.primaryLight,
              color: colors.primary,
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: fonts.body,
            }}
          >
            {s}
          </span>
        ))}
      </div>
    );
  }
  if (variant === "dots") {
    return (
      <div style={{ fontSize: "12px", color: colors.bodyText, fontFamily: fonts.body }}>
        {skills.join(" · ")}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      {skills.map((s, i) => (
        <span key={i} style={{ fontSize: "12px", color: colors.bodyText, fontFamily: fonts.body }}>{s}</span>
      ))}
    </div>
  );
}

/* ─── Languages list ──────────────────────────────────────── */

export function LanguagesList({
  languages,
  colors,
  fonts,
}: {
  languages: ResumeData["languages"];
  colors: ColorPalette;
  fonts: FontPair;
}) {
  if (!languages.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      {languages.map((l) => (
        <div key={l.id} style={{ fontSize: "12px", fontFamily: fonts.body, color: colors.bodyText }}>
          <span style={{ fontWeight: 500 }}>{l.name}</span>
          {l.level && <span style={{ color: colors.mutedText }}> — {l.level}</span>}
        </div>
      ))}
    </div>
  );
}

/* ─── Generic dated entry (certifications, courses, awards, projects, volunteering) ─── */

export function DatedEntry({
  title,
  subtitle,
  date,
  description,
  url,
  colors,
  fonts,
}: {
  title: string;
  subtitle?: string;
  date?: string;
  description?: string;
  url?: string;
  colors: ColorPalette;
  fonts: FontPair;
}) {
  return (
    <div style={{ marginBottom: "10px", pageBreakInside: "avoid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h4 style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: "13px", color: colors.bodyText }}>
          {url ? (
            <a href={url} style={{ color: colors.primary, textDecoration: "none" }}>{title}</a>
          ) : (
            title
          )}
        </h4>
        {date && <span style={{ fontSize: "11px", color: colors.mutedText, fontFamily: fonts.body }}>{date}</span>}
      </div>
      {subtitle && (
        <p style={{ fontSize: "12px", color: colors.mutedText, fontFamily: fonts.body }}>{subtitle}</p>
      )}
      {description && (
        <div
          className="rich-content"
          style={{ fontSize: "11px", lineHeight: "1.5", color: colors.bodyText, fontFamily: fonts.body, marginTop: "2px" }}
          dangerouslySetInnerHTML={{ __html: description }}
        />
      )}
    </div>
  );
}

/* ─── Reference entry ─────────────────────────────────────── */

export function ReferenceEntry({
  ref: r,
  colors,
  fonts,
}: {
  ref: ResumeData["references"][0];
  colors: ColorPalette;
  fonts: FontPair;
}) {
  return (
    <div style={{ marginBottom: "8px", pageBreakInside: "avoid" }}>
      <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: "12px", color: colors.bodyText }}>{r.name}</span>
      {r.title && <span style={{ fontSize: "12px", color: colors.mutedText, fontFamily: fonts.body }}> — {r.title}{r.company ? `, ${r.company}` : ""}</span>}
      <div style={{ fontSize: "11px", color: colors.mutedText, fontFamily: fonts.body }}>
        {r.email && <span>{r.email}</span>}
        {r.phone && <span> · {r.phone}</span>}
      </div>
    </div>
  );
}

/* ─── Visible sections helper ─────────────────────────────── */

export function getVisibleSections(data: ResumeData): SectionKey[] {
  return data.sectionOrder.filter((key) => data.sectionVisibility[key]);
}

/* ─── Render a section by key ─────────────────────────────── */

export function renderSectionContent(
  key: SectionKey,
  data: ResumeData,
  colors: ColorPalette,
  fonts: FontPair,
) {
  switch (key) {
    case "summary":
      if (!data.summary) return null;
      return (
        <div
          className="rich-content"
          style={{ fontSize: "12px", lineHeight: "1.7", color: colors.bodyText, fontFamily: fonts.body }}
          dangerouslySetInnerHTML={{ __html: data.summary }}
        />
      );
    case "experience":
      if (!data.experience.length) return null;
      return (
        <div>
          {data.experience.map((exp) => (
            <ExperienceEntry key={exp.id} exp={exp} colors={colors} fonts={fonts} datePosition={data.datePosition} showTimeline />
          ))}
        </div>
      );
    case "education":
      if (!data.education.length) return null;
      return (
        <div>
          {data.education.map((edu) => (
            <EducationEntry key={edu.id} edu={edu} colors={colors} fonts={fonts} datePosition={data.datePosition} showTimeline />
          ))}
        </div>
      );
    case "skills":
      return <SkillsList skills={data.skills} colors={colors} fonts={fonts} variant="tags" />;
    case "languages":
      return <LanguagesList languages={data.languages} colors={colors} fonts={fonts} />;
    case "certifications":
      if (!data.certifications.length) return null;
      return (
        <div>
          {data.certifications.map((c) => (
            <DatedEntry key={c.id} title={c.name} subtitle={c.issuer} date={c.date} url={c.url} colors={colors} fonts={fonts} />
          ))}
        </div>
      );
    case "projects":
      if (!data.projects.length) return null;
      return (
        <div>
          {data.projects.map((p) => (
            <DatedEntry key={p.id} title={p.name} subtitle={p.role} date={`${p.startDate}${p.endDate ? ` — ${p.current ? "Nå" : p.endDate}` : ""}`} description={p.description} url={p.url} colors={colors} fonts={fonts} />
          ))}
        </div>
      );
    case "courses":
      if (!data.courses.length) return null;
      return (
        <div>
          {data.courses.map((c) => (
            <DatedEntry key={c.id} title={c.name} subtitle={c.institution} date={c.date} description={c.description} colors={colors} fonts={fonts} />
          ))}
        </div>
      );
    case "volunteering":
      if (!data.volunteering.length) return null;
      return (
        <div>
          {data.volunteering.map((v) => (
            <DatedEntry key={v.id} title={v.role} subtitle={v.organization} date={`${v.startDate}${v.endDate ? ` — ${v.current ? "Nå" : v.endDate}` : ""}`} description={v.description} colors={colors} fonts={fonts} />
          ))}
        </div>
      );
    case "awards":
      if (!data.awards.length) return null;
      return (
        <div>
          {data.awards.map((a) => (
            <DatedEntry key={a.id} title={a.title} subtitle={a.issuer} date={a.date} description={a.description} colors={colors} fonts={fonts} />
          ))}
        </div>
      );
    case "publications":
      if (!data.publications.length) return null;
      return (
        <div>
          {data.publications.map((p) => (
            <DatedEntry key={p.id} title={p.title} subtitle={p.publisher} date={p.date} description={p.description} url={p.url} colors={colors} fonts={fonts} />
          ))}
        </div>
      );
    case "references":
      if (!data.references.length) return null;
      return (
        <div>
          {data.references.map((r) => (
            <ReferenceEntry key={r.id} ref={r} colors={colors} fonts={fonts} />
          ))}
        </div>
      );
    case "interests":
      if (!data.interests.length) return null;
      return <SkillsList skills={data.interests} colors={colors} fonts={fonts} variant="dots" />;
    default:
      return null;
  }
}

/* ─── Page wrapper (A4) ───────────────────────────────────── */

export function A4Page({
  children,
  pageBg = "#ffffff",
  className = "",
}: {
  children: React.ReactNode;
  pageBg?: string;
  className?: string;
}) {
  return (
    <div
      className={`a4-page ${className}`}
      style={{
        width: "210mm",
        minHeight: "297mm",
        backgroundColor: pageBg,
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        borderRadius: "4px",
        position: "relative",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        overflow: "hidden",
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
