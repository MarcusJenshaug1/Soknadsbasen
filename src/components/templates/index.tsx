
import type { ResumeData } from "@/store/useResumeStore";
import { getColorPalette, getFontPair } from "@/lib/design-tokens";
import { ATSCleanTemplate } from "./ATSClean";
import { ATSProfessionalTemplate } from "./ATSProfessional";
import { ModernProfessionalTemplate } from "./ModernProfessional";
import { ModernMinimalTemplate } from "./ModernMinimal";
import { SidebarModernTemplate } from "./SidebarModern";
import { SidebarCreativeTemplate } from "./SidebarCreative";
import { ExecutiveTemplate } from "./Executive";
import { AcademicTemplate } from "./Academic";

const TEMPLATE_MAP: Record<string, React.ComponentType<{ data: ResumeData; colors: ReturnType<typeof getColorPalette>; fonts: ReturnType<typeof getFontPair> }>> = {
  "ats-clean": ATSCleanTemplate,
  "ats-professional": ATSProfessionalTemplate,
  "modern-professional": ModernProfessionalTemplate,
  "modern-minimal": ModernMinimalTemplate,
  "sidebar-modern": SidebarModernTemplate,
  "sidebar-creative": SidebarCreativeTemplate,
  "executive": ExecutiveTemplate,
  "academic": AcademicTemplate,
};

export function TemplateRenderer({ data }: { data: ResumeData }) {
  const colors = getColorPalette(data.colorPalette);
  const fonts = getFontPair(data.fontPair);
  const Component = TEMPLATE_MAP[data.templateId] ?? ModernProfessionalTemplate;

  return <Component data={data} colors={colors} fonts={fonts} />;
}
