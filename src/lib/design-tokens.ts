/* ─── Color Palettes ──────────────────────────────────────── */

export interface ColorPalette {
  id: string;
  name: string;
  primary: string;       // Main accent (headings, name, links)
  primaryLight: string;   // Light tint for backgrounds
  secondary: string;      // Secondary text / subtle accents
  headerBg: string;       // Header/banner background
  headerText: string;     // Text on header
  sidebarBg: string;      // Sidebar background (two-col templates)
  sidebarText: string;    // Text on sidebar
  bodyText: string;       // Main body text
  mutedText: string;      // Dates, secondary info
  border: string;         // Dividers, borders
  pageBg: string;         // Page background
  dot: string;            // Timeline dots, bullets
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "indigo",
    name: "Indigo",
    primary: "#4f46e5",
    primaryLight: "#eef2ff",
    secondary: "#6366f1",
    headerBg: "#1e1b4b",
    headerText: "#ffffff",
    sidebarBg: "#1e1b4b",
    sidebarText: "#e0e7ff",
    bodyText: "#1f2937",
    mutedText: "#6b7280",
    border: "#e5e7eb",
    pageBg: "#ffffff",
    dot: "#c7d2fe",
  },
  {
    id: "slate",
    name: "Slate Minimal",
    primary: "#334155",
    primaryLight: "#f1f5f9",
    secondary: "#475569",
    headerBg: "#0f172a",
    headerText: "#f8fafc",
    sidebarBg: "#0f172a",
    sidebarText: "#cbd5e1",
    bodyText: "#1e293b",
    mutedText: "#64748b",
    border: "#e2e8f0",
    pageBg: "#ffffff",
    dot: "#94a3b8",
  },
  {
    id: "emerald",
    name: "Emerald",
    primary: "#059669",
    primaryLight: "#ecfdf5",
    secondary: "#10b981",
    headerBg: "#064e3b",
    headerText: "#ffffff",
    sidebarBg: "#064e3b",
    sidebarText: "#a7f3d0",
    bodyText: "#1f2937",
    mutedText: "#6b7280",
    border: "#d1fae5",
    pageBg: "#ffffff",
    dot: "#6ee7b7",
  },
  {
    id: "rose",
    name: "Rose",
    primary: "#e11d48",
    primaryLight: "#fff1f2",
    secondary: "#f43f5e",
    headerBg: "#4c0519",
    headerText: "#ffffff",
    sidebarBg: "#4c0519",
    sidebarText: "#fecdd3",
    bodyText: "#1f2937",
    mutedText: "#6b7280",
    border: "#fecdd3",
    pageBg: "#ffffff",
    dot: "#fda4af",
  },
  {
    id: "amber",
    name: "Executive Gold",
    primary: "#b45309",
    primaryLight: "#fffbeb",
    secondary: "#d97706",
    headerBg: "#451a03",
    headerText: "#fef3c7",
    sidebarBg: "#451a03",
    sidebarText: "#fde68a",
    bodyText: "#1c1917",
    mutedText: "#78716c",
    border: "#fde68a",
    pageBg: "#ffffff",
    dot: "#fbbf24",
  },
  {
    id: "navy",
    name: "Navy Classic",
    primary: "#1e3a5f",
    primaryLight: "#eff6ff",
    secondary: "#2563eb",
    headerBg: "#172554",
    headerText: "#ffffff",
    sidebarBg: "#172554",
    sidebarText: "#bfdbfe",
    bodyText: "#1e293b",
    mutedText: "#64748b",
    border: "#dbeafe",
    pageBg: "#ffffff",
    dot: "#93c5fd",
  },
];

/* ─── Font Pairs ──────────────────────────────────────────── */

export interface FontPair {
  id: string;
  name: string;
  heading: string;          // CSS font-family for headings
  body: string;             // CSS font-family for body
  headingWeight: number;
  bodyWeight: number;
  googleFonts?: string[];   // Google Fonts to load
}

export const FONT_PAIRS: FontPair[] = [
  {
    id: "inter-merriweather",
    name: "Modern Serif",
    heading: "'Merriweather', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
    headingWeight: 700,
    bodyWeight: 400,
    googleFonts: ["Inter:wght@400;500;600;700", "Merriweather:wght@400;700"],
  },
  {
    id: "inter-inter",
    name: "Clean Sans",
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    headingWeight: 700,
    bodyWeight: 400,
    googleFonts: ["Inter:wght@400;500;600;700"],
  },
  {
    id: "playfair-lato",
    name: "Elegant Contrast",
    heading: "'Playfair Display', Georgia, serif",
    body: "'Lato', system-ui, sans-serif",
    headingWeight: 700,
    bodyWeight: 400,
    googleFonts: ["Playfair+Display:wght@400;700", "Lato:wght@400;700"],
  },
  {
    id: "raleway-opensans",
    name: "Professional Light",
    heading: "'Raleway', system-ui, sans-serif",
    body: "'Open Sans', system-ui, sans-serif",
    headingWeight: 600,
    bodyWeight: 400,
    googleFonts: ["Raleway:wght@400;500;600;700", "Open+Sans:wght@400;600"],
  },
  {
    id: "jetbrains-inter",
    name: "Tech Mono",
    heading: "'JetBrains Mono', 'Fira Code', monospace",
    body: "'Inter', system-ui, sans-serif",
    headingWeight: 700,
    bodyWeight: 400,
    googleFonts: ["JetBrains+Mono:wght@400;700", "Inter:wght@400;500;600"],
  },
];

/* ─── Template definitions ────────────────────────────────── */

export type TemplateLayout = "single-column" | "two-column-left" | "two-column-right";
export type TemplateCategory = "ats" | "modern" | "executive" | "academic";

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  layout: TemplateLayout;
  category: TemplateCategory;
  defaultColorPalette: string;
  defaultFontPair: string;
  supportedColorPalettes: string[];   // "all" mapped to full list below
  supportedFontPairs: string[];
  hasTopBanner: boolean;
  hasSidebar: boolean;
  hasTimeline: boolean;
}

export const TEMPLATES: TemplateDef[] = [
  // ── ATS templates (2) ──
  {
    id: "ats-clean",
    name: "ATS Clean",
    description: "Ren, enkel layout uten grafikk. Maksimal ATS-kompatibilitet.",
    layout: "single-column",
    category: "ats",
    defaultColorPalette: "slate",
    defaultFontPair: "inter-inter",
    supportedColorPalettes: ["slate", "navy", "indigo"],
    supportedFontPairs: ["inter-inter", "raleway-opensans"],
    hasTopBanner: false,
    hasSidebar: false,
    hasTimeline: false,
  },
  {
    id: "ats-professional",
    name: "ATS Professional",
    description: "Strukturert enkolonne med tydelige seksjoner for jobbsøknader.",
    layout: "single-column",
    category: "ats",
    defaultColorPalette: "navy",
    defaultFontPair: "raleway-opensans",
    supportedColorPalettes: ["navy", "slate", "indigo"],
    supportedFontPairs: ["raleway-opensans", "inter-inter"],
    hasTopBanner: false,
    hasSidebar: false,
    hasTimeline: false,
  },
  // ── Modern single-column (2) ──
  {
    id: "modern-professional",
    name: "Modern Professional",
    description: "Moderne enkolonne-layout med sterk toppseksjon og ikoner.",
    layout: "single-column",
    category: "modern",
    defaultColorPalette: "indigo",
    defaultFontPair: "inter-merriweather",
    supportedColorPalettes: ["indigo", "emerald", "rose", "navy", "slate", "amber"],
    supportedFontPairs: ["inter-merriweather", "inter-inter", "raleway-opensans", "playfair-lato"],
    hasTopBanner: true,
    hasSidebar: false,
    hasTimeline: true,
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Minimalistisk og luftig design med fokus på innhold.",
    layout: "single-column",
    category: "modern",
    defaultColorPalette: "slate",
    defaultFontPair: "inter-inter",
    supportedColorPalettes: ["slate", "indigo", "navy", "emerald"],
    supportedFontPairs: ["inter-inter", "raleway-opensans"],
    hasTopBanner: false,
    hasSidebar: false,
    hasTimeline: false,
  },
  // ── Two-column with sidebar (2) ──
  {
    id: "sidebar-modern",
    name: "Two-Column Modern",
    description: "Tokolonne med farget sidebar for kontakt, ferdigheter og språk.",
    layout: "two-column-left",
    category: "modern",
    defaultColorPalette: "indigo",
    defaultFontPair: "inter-merriweather",
    supportedColorPalettes: ["indigo", "emerald", "rose", "navy", "slate", "amber"],
    supportedFontPairs: ["inter-merriweather", "inter-inter", "playfair-lato", "raleway-opensans"],
    hasTopBanner: false,
    hasSidebar: true,
    hasTimeline: true,
  },
  {
    id: "sidebar-creative",
    name: "Creative Sidebar",
    description: "Kreativ tokolonne med markant sidebar og ikonbasert kontaktinfo.",
    layout: "two-column-left",
    category: "modern",
    defaultColorPalette: "rose",
    defaultFontPair: "playfair-lato",
    supportedColorPalettes: ["rose", "indigo", "emerald", "amber", "navy"],
    supportedFontPairs: ["playfair-lato", "inter-merriweather", "raleway-opensans"],
    hasTopBanner: false,
    hasSidebar: true,
    hasTimeline: false,
  },
  // ── Executive (1) ──
  {
    id: "executive",
    name: "Executive",
    description: "Seriøs og elegant design for ledere og seniorkandidater.",
    layout: "single-column",
    category: "executive",
    defaultColorPalette: "amber",
    defaultFontPair: "playfair-lato",
    supportedColorPalettes: ["amber", "navy", "slate"],
    supportedFontPairs: ["playfair-lato", "inter-merriweather"],
    hasTopBanner: true,
    hasSidebar: false,
    hasTimeline: false,
  },
  // ── Academic (1) ──
  {
    id: "academic",
    name: "Academic",
    description: "Klassisk akademisk CV med rom for publikasjoner og prosjekter.",
    layout: "single-column",
    category: "academic",
    defaultColorPalette: "navy",
    defaultFontPair: "inter-merriweather",
    supportedColorPalettes: ["navy", "slate", "indigo"],
    supportedFontPairs: ["inter-merriweather", "playfair-lato", "raleway-opensans"],
    hasTopBanner: false,
    hasSidebar: false,
    hasTimeline: false,
  },
];

/* ─── Helpers ─────────────────────────────────────────────── */

export function getTemplate(id: string): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function getColorPalette(id: string): ColorPalette {
  return COLOR_PALETTES.find((p) => p.id === id) ?? COLOR_PALETTES[0];
}

export function getFontPair(id: string): FontPair {
  return FONT_PAIRS.find((f) => f.id === id) ?? FONT_PAIRS[0];
}

export function getGoogleFontsUrl(fontPairId: string): string {
  const fp = getFontPair(fontPairId);
  if (!fp.googleFonts?.length) return "";
  const families = fp.googleFonts.join("&family=");
  return `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
}
