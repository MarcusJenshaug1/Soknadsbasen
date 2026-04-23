/**
 * Server-side CV parser — takes raw text extracted from a PDF
 * and maps it intelligently into our ResumeData shape.
 *
 * Supports two primary formats:
 *  1. Standard CV PDFs (section headers like PROFIL, ERFARING, etc.)
 *  2. LinkedIn PDF exports (Sammendrag, Erfaring, Utdanning, etc.)
 */

/* ─── Types (mirrored from useResumeStore to avoid client import) ─── */

interface ParsedContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
}

interface ParsedExperience {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface ParsedEducation {
  id: string;
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

interface ParsedLanguage {
  id: string;
  name: string;
  level: string;
}

interface ParsedReference {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  relationship: string;
}

interface ParsedCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface ParsedCV {
  contact: ParsedContact;
  role: string;
  summary: string;
  experience: ParsedExperience[];
  education: ParsedEducation[];
  skills: string[];
  languages: ParsedLanguage[];
  references: ParsedReference[];
  certifications: ParsedCertification[];
  source: "cv" | "linkedin";
}

/* ─── Helpers ─────────────────────────────────────────────── */

let idCounter = 0;
function uid() {
  return `imp-${++idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

function clean(text: string): string {
  // Normalize spaces from PDF extraction
  return text
    .replace(/\s+/g, " ")
    .replace(/\s*\.\s*/g, ".")
    .replace(/\s*@\s*/g, "@")
    .replace(/\s*:\s*\/\s*\/\s*/g, "://")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-")
    .trim();
}

function cleanLight(text: string): string {
  // Only normalize excessive whitespace, don't touch punctuation
  return text.replace(/[ \t]+/g, " ").trim();
}

/** Clean text for display — fix PDF spacing artifacts around punctuation */
function cleanDisplay(text: string): string {
  return text
    .replace(/[ \t]+/g, " ")       // Collapse horizontal whitespace
    .replace(/(\w)[ ]+\.[ ]+(\w)/g, "$1.$2") // "Eiendomsavtaler . no" → "Eiendomsavtaler.no"
    .replace(/(\w)[ ]+@[ ]+(\w)/g, "$1@$2")  // "name @ domain" → "name@domain"
    .replace(/(\w)[ ]+:[ ]*\/[ ]*\/[ ]*/g, "$1://") // "https :// www" → "https://www"
    .replace(/\s+([,.:;!?])/g, "$1") // Remove space before punctuation
    .replace(/([,;!?])(\w)/g, "$1 $2") // Ensure space after comma/semicolon before word
    .replace(/\.([A-ZÆØÅ])/g, ". $1") // Ensure space after period before uppercase (sentence boundary)
    .replace(/(\w) - (\w)/g, "$1-$2") // "IT - drift" → "IT-drift"
    .replace(/\(\s+/g, "(")        // "( Uniweb" → "(Uniweb"
    .replace(/\s+\)/g, ")")        // "Fastname )" → "Fastname)"
    .trim();
}

function extractEmail(text: string): string {
  const m = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return m ? m[0] : "";
}

function extractPhone(text: string): string {
  const m = text.match(/\+?\d[\d\s()-]{7,}/);
  return m ? m[0].replace(/\s+/g, " ").trim() : "";
}

function extractLinkedin(text: string): string {
  const m = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+\/?/i);
  if (m) {
    const url = m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
    return url.replace(/\s/g, "");
  }
  return "";
}

function extractUrl(text: string): string {
  const m = text.match(/https?:\/\/[\w./-]+/);
  return m ? m[0] : "";
}

/* ─── Section detection ───────────────────────────────────── */

// Norwegian & English section headers, normalized to lowercase
const SECTION_PATTERNS: Record<string, RegExp> = {
  summary: /^(?:profil|sammendrag|summary|om meg|about me)$/i,
  experience: /^(?:erfaring|experience|arbeidserfaring|work experience)$/i,
  education: /^(?:utdanning|education|utdannelse)$/i,
  skills: /^(?:ferdigheter|skills|kompetanse|fremhevede ferdigheter)$/i,
  languages: /^(?:språk|languages)$/i,
  references: /^(?:referanser|references)$/i,
  certifications: /^(?:sertifiseringer?|certifications?|lisenser)$/i,
};

interface Section {
  type: string;
  content: string;
}

function splitIntoSections(text: string): Section[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sections: Section[] = [];
  let currentType = "header"; // Everything before first section is header
  let currentContent: string[] = [];

  for (const line of lines) {
    const cleanLine = line.replace(/[^\w\sæøåÆØÅ]/g, "").trim();
    let matched = false;

    for (const [type, pattern] of Object.entries(SECTION_PATTERNS)) {
      if (pattern.test(cleanLine)) {
        // Save previous section — even if empty, to track two-column PDF layouts
        // where headers appear consecutively with no content between them
        if (currentContent.length > 0 || currentType !== "header") {
          sections.push({ type: currentType, content: currentContent.join("\n") });
        }
        currentType = type;
        currentContent = [];
        matched = true;
        break;
      }
    }

    if (!matched) {
      currentContent.push(line);
    }
  }

  // Last section
  if (currentContent.length > 0) {
    sections.push({ type: currentType, content: currentContent.join("\n") });
  }

  return sections;
}

/* ─── Two-column layout detection & fix ───────────────────── */

/**
 * Detects when a PDF has a two-column/sidebar layout where pdfjs-dist
 * extracts section headers from the left column first, then content
 * from the right column appears after all headers — resulting in
 * empty experience/education sections and all content dumped into
 * the last section (typically references).
 */
function detectAndFixTwoColumnLayout(sections: Section[]): Section[] {
  const expIdx = sections.findIndex((s) => s.type === "experience");
  const eduIdx = sections.findIndex((s) => s.type === "education");

  const hasExpHeader = expIdx !== -1;
  const hasEduHeader = eduIdx !== -1;
  const expEmpty = !hasExpHeader || sections[expIdx].content.trim().length === 0;
  const eduEmpty = !hasEduHeader || sections[eduIdx].content.trim().length === 0;

  // If both have content, no fix needed
  if (!expEmpty && !eduEmpty) return sections;
  // If neither header exists, can't redistribute
  if (!hasExpHeader && !hasEduHeader) return sections;

  // Find the section with the most date-range entries (overflow candidate)
  const DATE_RE = /\d{4}\s*[-–—]\s*(?:\d{4}|[Nn]å|present|pågående|nåværende)/gi;
  let overflowIdx = -1;
  let maxDateEntries = 0;

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.type === "header" || s.type === "summary") continue;
    if (s.type === "experience" && expEmpty) continue;
    if (s.type === "education" && eduEmpty) continue;

    const matches = s.content.match(DATE_RE) || [];
    if (matches.length > maxDateEntries) {
      maxDateEntries = matches.length;
      overflowIdx = i;
    }
  }

  if (overflowIdx === -1 || maxDateEntries === 0) return sections;

  // Extract structured entries from the overflow section
  const overflow = sections[overflowIdx];
  const { retained, experienceContent, educationContent } =
    splitOverflowContent(overflow.content);

  const result = [...sections];

  // Update the overflow section with only its retained content
  result[overflowIdx] = { ...overflow, content: retained };

  // Populate empty experience section
  if (expEmpty && experienceContent) {
    if (hasExpHeader) {
      result[expIdx] = { ...result[expIdx], content: experienceContent };
    } else {
      result.push({ type: "experience", content: experienceContent });
    }
  }

  // Populate empty education section
  if (eduEmpty && educationContent) {
    if (hasEduHeader) {
      result[eduIdx] = { ...result[eduIdx], content: educationContent };
    } else {
      result.push({ type: "education", content: educationContent });
    }
  }

  return result;
}

/**
 * Splits overflow content into: original section content (e.g. references)
 * + experience entries + education entries, classified by heuristics.
 */
function splitOverflowContent(content: string): {
  retained: string;
  experienceContent: string;
  educationContent: string;
} {
  const lines = content.split("\n");
  const DATE_RE =
    /\d{4}\s*[-–—]\s*(?:\d{4}|[Nn]å|present|pågående|nåværende)/i;
  const EDU_INDICATORS =
    /videregående|universitet|høy?skole|fagskole|studiekompetanse|bachelor|master|årstrinn|fagbrev|ph\.?d|doktorgrad|grunnskole/i;

  // Find where structured entries begin (first line with a date range)
  let firstDateLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (DATE_RE.test(lines[i])) {
      firstDateLine = i;
      break;
    }
  }

  if (firstDateLine === -1) {
    return { retained: content, experienceContent: "", educationContent: "" };
  }

  // Everything before the first date-range entry is the original section content
  const retained = lines.slice(0, firstDateLine).join("\n");

  // Split remaining lines into entry blocks, each starting with a date-range line
  const entryBlocks: { blockLines: string[]; isEducation: boolean }[] = [];
  let currentBlock: string[] = [];
  let currentIsEdu = false;

  for (let i = firstDateLine; i < lines.length; i++) {
    if (DATE_RE.test(lines[i]) && currentBlock.length > 0) {
      entryBlocks.push({ blockLines: [...currentBlock], isEducation: currentIsEdu });
      currentBlock = [];
    }

    if (DATE_RE.test(lines[i]) && currentBlock.length === 0) {
      // Classify: check this line + next line for education indicators
      const context = lines[i] + " " + (lines[i + 1] || "");
      currentIsEdu = EDU_INDICATORS.test(context);
    }

    currentBlock.push(lines[i]);
  }

  if (currentBlock.length > 0) {
    entryBlocks.push({ blockLines: currentBlock, isEducation: currentIsEdu });
  }

  const experienceContent = entryBlocks
    .filter((b) => !b.isEducation)
    .map((b) => b.blockLines.join("\n"))
    .join("\n");

  const educationContent = entryBlocks
    .filter((b) => b.isEducation)
    .map((b) => b.blockLines.join("\n"))
    .join("\n");

  return { retained, experienceContent, educationContent };
}

/* ─── Contact parsing ─────────────────────────────────────── */

function parseContact(headerText: string): ParsedContact {
  const cleaned = clean(headerText);

  const email = extractEmail(cleaned);
  const phone = extractPhone(cleaned);
  const linkedin = extractLinkedin(cleaned);

  // Try to find a website that isn't linkedin
  const urls = cleaned.match(/https?:\/\/[\w./-]+/g) || [];
  const website = urls.find((u) => !u.includes("linkedin.com")) || "";

  // Extract name — usually the first meaningful line
  const lines = headerText.split("\n").map((l) => cleanLight(l)).filter(Boolean);
  let fullName = "";

  for (const line of lines) {
    const trimmed = line.replace(/\s+/g, " ").trim();
    // Skip lines that look like contact info
    if (trimmed.includes("@") || trimmed.includes("+47") || trimmed.includes("http") || trimmed.includes("linkedin")) continue;
    // Skip lines that look like a role/title
    if (trimmed.match(/^(Lead|Senior|Junior|Fullstack|Frontend|Backend|Daglig|Head|CTO|CEO)/i)) continue;
    // If it's short and looks like a name (2-4 words, no special chars)
    const words = trimmed.split(" ").filter(Boolean);
    if (words.length >= 2 && words.length <= 5 && !trimmed.includes("|") && !trimmed.match(/\d{4}/)) {
      fullName = trimmed;
      break;
    }
  }

  // Split name
  const nameParts = fullName.split(" ").filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Location — look for Norwegian places or "City, Country" patterns
  let location = "";
  const locationMatch = cleaned.match(
    /(?:Tønsberg|Oslo|Bergen|Trondheim|Stavanger|Kristiansand|Drammen|Tromsø|Sandefjord|Færder|Skallestad|Vestfold|Telemark)[\wæøåÆØÅ\s,]*/i
  );
  if (locationMatch) {
    location = locationMatch[0].replace(/[|·].*/, "").trim();
  }

  // Role — look for title-like text
  let role = "";
  for (const line of lines) {
    const trimmed = cleanLight(line);
    if (
      trimmed.match(/(?:utvikler|developer|designer|leder|manager|engineer|arkitekt|analyst|konsulent)/i) &&
      !trimmed.includes("@") &&
      trimmed.length < 100
    ) {
      role = trimmed.split("|")[0].trim();
      if (role.length > 60) role = role.substring(0, 60);
      break;
    }
  }

  return { firstName, lastName, email, phone, location, linkedin, website };
}

/* ─── Experience parsing ──────────────────────────────────── */

const DATE_RANGE_PATTERN =
  /(\d{4}|(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s+\d{4})\s*[-–—]\s*((?:\d{4}|(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s+\d{4})|(?:nå|present|pågående|nåværende))/i;

function parseExperienceSection(content: string): ParsedExperience[] {
  const entries: ParsedExperience[] = [];
  const lines = content.split("\n").map((l) => cleanLight(l)).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    // Look for a date range — this indicates a new entry
    const dateMatch = lines[i].match(DATE_RANGE_PATTERN);
    if (dateMatch) {
      const startDate = dateMatch[1];
      const endDateRaw = dateMatch[2];
      const current = /nå|present|pågående|nåværende/i.test(endDateRaw);
      const endDate = current ? "" : endDateRaw;

      let title = "";
      let company = "";
      let location = "";

      // Check if title is on the same line as dates (Format A: "Title YYYY—YYYY")
      const dateIndex = lines[i].indexOf(dateMatch[0]);
      const beforeDate = dateIndex > 0 ? lines[i].substring(0, dateIndex).trim() : "";

      if (beforeDate && beforeDate.length > 2) {
        // Format A (our platform): title before dates on the same line
        title = beforeDate;
        i++; // Move past date line

        // Next line should be "Company · Location"
        if (i < lines.length && !lines[i].match(DATE_RANGE_PATTERN)) {
          const nextLine = lines[i];
          if (nextLine.includes("·") || nextLine.includes("•")) {
            const parts = nextLine.split(/[·•]/).map((p) => p.trim());
            company = parts[0] || "";
            location = parts[1] || "";
            i++; // Consume company line
          }
        }
      } else {
        // Format B: dates on their own line, title/company on preceding lines
        if (i > 0) {
          const prevLine = lines[i - 1];
          if (prevLine.includes("·") || prevLine.includes("•")) {
            const parts = prevLine.split(/[·•]/).map((p) => p.trim());
            company = parts[0] || "";
            location = parts[1] || "";
          } else {
            title = prevLine;
          }

          if (i > 1 && (!title || !company)) {
            const prev2 = lines[i - 2];
            if (!company && (prev2.includes("AS") || prev2.includes("·") || prev2.includes(","))) {
              const parts = prev2.split(/[·•,]/).map((p) => p.trim());
              if (!company) company = parts[0];
              if (!location && parts[1]) location = parts[1];
            } else if (!title) {
              title = prev2;
            }
          }
        }
        i++; // Move past date line
      }

      // Gather description lines until next entry
      const descLines: string[] = [];
      while (i < lines.length) {
        // Stop at lines containing a date range (next entry)
        if (lines[i].match(DATE_RANGE_PATTERN)) break;

        // For Format B: stop if this looks like a title line for the next entry
        // But only if the next entry appears to be Format B (date on its own line)
        if (i + 1 < lines.length && lines[i + 1].match(DATE_RANGE_PATTERN)) {
          const nextDateM = lines[i + 1].match(DATE_RANGE_PATTERN);
          if (nextDateM) {
            const nextIdx = lines[i + 1].indexOf(nextDateM[0]);
            const nextBefore = lines[i + 1].substring(0, nextIdx).trim();
            // Format B: next line is just a date → current line is a title for next entry
            if (!nextBefore || nextBefore.length <= 2) {
              if (lines[i].length < 80 && !lines[i].match(/^[-•·]/)) {
                break;
              }
            }
          }
        }

        descLines.push(lines[i]);
        i++;
      }

      const description = descLines
        .filter((l) => !l.match(/^Page\s+\d+\s+of\s+\d+$/i))
        .join("\n")
        .trim();

      if (title.match(/^\(\d+/)) title = "";

      entries.push({
        id: uid(),
        title: cleanDisplay(title.replace(/[·•|]/g, "")),
        company: cleanDisplay(company.replace(/[·•|]/g, "")),
        location: cleanDisplay(location),
        startDate,
        endDate,
        current,
        description: cleanDisplay(description),
      });
    } else {
      i++;
    }
  }

  return entries;
}

/* ─── LinkedIn experience parsing (different structure) ───── */

function parseLinkedinExperience(content: string): ParsedExperience[] {
  const entries: ParsedExperience[] = [];
  // LinkedIn format: Company\nTitle\ndate - date (duration)\nLocation\nDescription...
  const lines = content.split("\n").map((l) => cleanLight(l)).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    // Skip page numbers
    if (lines[i].match(/^Page\s+\d+\s+of\s+\d+$/i)) {
      i++;
      continue;
    }

    const dateMatch = lines[i].match(DATE_RANGE_PATTERN);
    if (dateMatch) {
      const startDate = dateMatch[1];
      const endDateRaw = dateMatch[2];
      const current = /nå|present|pågående|nåværende/i.test(endDateRaw);
      const endDate = current ? "" : endDateRaw;

      // In LinkedIn format, title is typically i-1, company is i-2
      let title = i > 0 ? lines[i - 1] : "";
      let company = i > 1 ? lines[i - 2] : "";
      let location = "";

      // Duration in parentheses might be on same line
      // Next line might be location
      i++;
      if (i < lines.length && !lines[i].match(DATE_RANGE_PATTERN)) {
        const nextLine = lines[i];
        // Location lines typically contain city/region/country
        if (nextLine.match(/kommune|Norge|Norway|Sweden|Danmark|Vestfold|Telemark|Oslo|Bergen|Kypros|Cyprus/i)) {
          location = nextLine;
          i++;
        }
      }

      // Gather description
      const descLines: string[] = [];
      while (i < lines.length) {
        if (lines[i].match(/^Page\s+\d+\s+of\s+\d+$/i)) {
          i++;
          continue;
        }
        // Next entry starts: usually a company name followed by a title then a date
        if (i + 2 < lines.length && lines[i + 2].match(DATE_RANGE_PATTERN)) break;
        if (i + 1 < lines.length && lines[i + 1].match(DATE_RANGE_PATTERN)) break;
        if (lines[i].match(DATE_RANGE_PATTERN)) break;

        descLines.push(lines[i]);
        i++;
      }

      // Clean duration text from title
      title = title.replace(/\s*\(\d+\s+[åm].*?\)/, "").trim();

      entries.push({
        id: uid(),
        title: cleanDisplay(title),
        company: cleanDisplay(company),
        location: cleanDisplay(location),
        startDate,
        endDate,
        current,
        description: cleanDisplay(descLines.join("\n")),
      });
    } else {
      i++;
    }
  }

  return entries;
}

/* ─── Education parsing ───────────────────────────────────── */

function parseEducationSection(content: string): ParsedEducation[] {
  const entries: ParsedEducation[] = [];
  const lines = content.split("\n").map((l) => cleanLight(l)).filter(Boolean);

  // Education date pattern — same as experience but without "nå/present"
  const EDU_DATE =
    /\(?\s*(?:((?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s+)?\d{4})\s*[-–—]\s*((?:(?:januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)\s+)?\d{4})(?:\s*\))?\s*/i;

  let i = 0;
  while (i < lines.length) {
    if (lines[i].match(/^Page\s+\d+\s+of\s+\d+$/i)) {
      i++;
      continue;
    }

    const dateMatch = lines[i].match(EDU_DATE);
    if (dateMatch) {
      const startDate = dateMatch[1] || dateMatch[0].match(/\d{4}/)?.[0] || "";
      const endDate = dateMatch[2] || "";

      let school = "";
      let degree = "";
      let field = "";
      let location = "";

      // Check if degree/field is on the same line as dates (Format A)
      const dateIndex = lines[i].indexOf(dateMatch[0]);
      const beforeDate = dateIndex > 0 ? lines[i].substring(0, dateIndex).trim() : "";

      if (beforeDate && beforeDate.length > 2) {
        // Format A: "Degree — Field YYYY—YYYY" on one line
        // Use spaced em-dash/en-dash to split (not regular hyphen, which appears in compound words)
        const dashMatch = beforeDate.match(/^(.+?)\s+[–—]\s+(.+)$/);
        if (dashMatch) {
          degree = dashMatch[1].trim();
          field = dashMatch[2].trim();
        } else {
          degree = beforeDate;
        }
        i++; // Move past date line

        // Next line should be "School · Location"
        if (i < lines.length && !lines[i].match(EDU_DATE)) {
          const nextLine = lines[i];
          if (nextLine.includes("·")) {
            const parts = nextLine.split("·").map((p) => p.trim());
            school = parts[0] || "";
            location = parts[1] || "";
            i++; // Consume school line
          } else if (nextLine.match(/skole|universitet|høy?skole|fagskole/i)) {
            school = nextLine;
            i++;
          }
        }
      } else {
        // Format B: dates on their own line, school/degree on preceding lines
        if (i > 0) {
          const prevLine = lines[i - 1];
          if (prevLine.includes("·")) {
            const parts = prevLine.split("·").map((p) => p.trim());
            degree = parts[0];
            field = parts.slice(1).join(", ");
            if (i > 1) school = lines[i - 2];
          } else if (
            prevLine.match(
              /kompetanse|studiekompetanse|servicefag|kommunikasjon|VGS|videregående|skole|universitet/i
            )
          ) {
            const dashParts = prevLine.split(/\s*[-–—]\s*/);
            degree = dashParts[0].trim();
            field = dashParts.slice(1).join(" ").trim();
            if (i > 1) school = lines[i - 2];
          } else {
            school = prevLine;
          }
        }
        i++; // Move past date line
      }

      // Gather description lines
      const descLines: string[] = [];
      while (i < lines.length) {
        if (lines[i].match(/^Page\s+\d+\s+of\s+\d+$/i)) {
          i++;
          continue;
        }
        // Stop at lines with date ranges (next entry)
        if (lines[i].match(EDU_DATE)) break;
        // For Format B: stop if this is a title line for the next entry
        if (i + 1 < lines.length && lines[i + 1].match(EDU_DATE)) {
          const nextDateM = lines[i + 1].match(EDU_DATE);
          if (nextDateM) {
            const nextIdx = lines[i + 1].indexOf(nextDateM[0]);
            const nextBefore = lines[i + 1].substring(0, nextIdx).trim();
            if (!nextBefore || nextBefore.length <= 2) {
              break;
            }
          }
        }

        const line = lines[i];
        // Detect location (·-separated)
        if (!location && line.includes("·")) {
          const parts = line.split("·").map((p) => p.trim());
          if (!school) school = parts[0];
          location = parts[1] || "";
        } else {
          descLines.push(line);
        }
        i++;
      }

      entries.push({
        id: uid(),
        school: cleanDisplay(school.replace(/[·•|]/g, "")),
        degree: cleanDisplay(degree),
        field: cleanDisplay(field),
        location: cleanDisplay(location),
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        current: false,
        description: cleanDisplay(descLines.join("\n")),
      });
    } else {
      i++;
    }
  }

  return entries;
}

/* ─── Skills parsing ──────────────────────────────────────── */

function parseSkills(content: string): string[] {
  const cleaned = content
    .replace(/fremhevede ferdigheter/i, "")
    .replace(/Page\s+\d+\s+of\s+\d+/gi, "");

  // First, try splitting by known delimiters (comma, newline, bullet, middle dot)
  let items: string[] = [];

  if (cleaned.includes(",") || cleaned.includes("•") || cleaned.includes("·")) {
    items = cleaned
      .split(/[,\n•·]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 50 && !s.match(/^\d+$/));
  }

  // If that gives too few results, try multi-space separation (common in PDF extraction)
  if (items.length < 3) {
    items = cleaned
      .split(/\n/)
      .flatMap((line) => line.split(/\s{2,}/)) // Split on 2+ spaces
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter((s) => s.length > 0 && s.length < 50 && !s.match(/^\d+$/));
  }

  // Last resort: single-space separated items on one line
  if (items.length < 3) {
    items = cleaned
      .split(/[\n,]/)
      .flatMap((line) => line.trim().split(/\s+/))
      .filter((s) => s.length > 1 && s.length < 30 && !s.match(/^\d+$/));
  }

  return [...new Set(items)];
}

/* ─── Languages parsing ──────────────────────────────────── */

function parseLanguages(content: string): ParsedLanguage[] {
  const langs: ParsedLanguage[] = [];
  const lines = content.split("\n").map((l) => cleanLight(l)).filter(Boolean);

  for (const line of lines) {
    // Pattern: "Norsk — Morsmål" or "Engelsk — Flytende"
    const dashMatch = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (dashMatch) {
      langs.push({
        id: uid(),
        name: dashMatch[1].trim(),
        level: dashMatch[2].trim(),
      });
    }
  }

  return langs;
}

/* ─── References parsing ─────────────────────────────────── */

function parseReferences(content: string): ParsedReference[] {
  const refs: ParsedReference[] = [];
  const lines = content.split("\n").map((l) => cleanLight(l)).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    // Pattern: "Name — Title, Company"
    const nameMatch = lines[i].match(/^(.+?)\s*[-–—]\s*(.+)$/);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      const titleParts = nameMatch[2].split(",").map((p) => p.trim());
      const title = titleParts[0] || "";
      const company = titleParts.slice(1).join(", ");

      let email = "";
      let phone = "";

      // Next line might contain contact info
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        email = extractEmail(nextLine);
        phone = extractPhone(nextLine);
        if (email || phone) i++;
      }

      refs.push({
        id: uid(),
        name,
        title,
        company,
        email,
        phone,
        relationship: "",
      });
    }
  }

  return refs;
}

/* ─── Certifications ─────────────────────────────────────── */

function parseCertifications(content: string): ParsedCertification[] {
  const certs: ParsedCertification[] = [];
  const lines = content.split("\n").map((l) => cleanLight(l)).filter(Boolean);

  for (const line of lines) {
    if (line.length > 3 && !line.match(/^Page\s+\d+/i)) {
      certs.push({
        id: uid(),
        name: line.trim(),
        issuer: "",
        date: "",
        url: "",
      });
    }
  }

  return certs;
}

/* ─── LinkedIn format detection ───────────────────────────── */

function isLinkedinPdf(text: string): boolean {
  return (
    text.includes("Page   1   of") ||
    text.includes("(LinkedIn)") ||
    text.includes("Forbindelse") ||
    text.includes("Fremhevede ferdigheter")
  );
}

/* ─── Role extraction from header ─────────────────────────── */

function extractRole(text: string): string {
  const lines = text.split("\n").map((l) => cleanLight(l)).filter(Boolean);
  for (const line of lines) {
    if (
      line.match(/utvikler|developer|designer|leder|manager|engineer|arkitekt|analyst|konsulent|ansvarlig/i) &&
      !line.includes("@") &&
      line.length < 100
    ) {
      // Clean up the role text
      return line
        .replace(/\|.*/, "")
        .replace(/@.*/, "")
        .trim();
    }
  }
  return "";
}

/* ═══════════════════════════════════════════════════════════ */
/* ─── Main parse function ─────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════ */

export function parseCVText(rawText: string): ParsedCV {
  idCounter = 0;
  const isLinkedin = isLinkedinPdf(rawText);

  // Normalize the raw text — fix common PDF extraction artifacts
  // IMPORTANT: Use [ \t]+ (horizontal whitespace) instead of \s+ to avoid
  // joining lines across newlines — newlines are critical for section parsing.
  const normalized = rawText
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]*\|[ \t]*/g, " | ")
    // Fix spaced-out words from PDF extraction (e.g. "marcus @ jenshaug . no" → "marcus@jenshaug.no")
    .replace(/(\w)[ \t]+@[ \t]+(\w)/g, "$1@$2")
    .replace(/(\w)[ \t]+\.[ \t]+(\w)/g, "$1.$2")
    // Fix spaced-out URL components (e.g. "https :// www . linkedin . com")
    .replace(/[ \t]+:[ \t]*\/[ \t]*\/[ \t]*/g, "://")
    .replace(/(\w)[ \t]+\/[ \t]+(\w)/g, "$1/$2");

  const rawSections = splitIntoSections(normalized);

  // Fix two-column PDF layouts where section headers appear without content
  const sections = detectAndFixTwoColumnLayout(rawSections);

  // Get header section (everything before first recognized section)
  const headerSection = sections.find((s) => s.type === "header");
  const headerText = headerSection?.content || "";

  const contact = parseContact(headerText);
  const role = extractRole(headerText + "\n" + (sections.find((s) => s.type === "header")?.content || ""));

  // Parse each section
  let summary = "";
  let experience: ParsedExperience[] = [];
  let education: ParsedEducation[] = [];
  let skills: string[] = [];
  let languages: ParsedLanguage[] = [];
  let references: ParsedReference[] = [];
  let certifications: ParsedCertification[] = [];

  for (const section of sections) {
    switch (section.type) {
      case "summary":
        summary = cleanDisplay(section.content.replace(/Page\s+\d+\s+of\s+\d+/gi, ""));
        break;
      case "experience":
        experience = isLinkedin
          ? parseLinkedinExperience(section.content)
          : parseExperienceSection(section.content);
        break;
      case "education":
        education = parseEducationSection(section.content);
        break;
      case "skills":
        skills = parseSkills(section.content);
        break;
      case "languages":
        languages = parseLanguages(section.content);
        break;
      case "references":
        references = parseReferences(section.content);
        break;
      case "certifications":
        certifications = parseCertifications(section.content);
        break;
    }
  }

  return {
    contact,
    role,
    summary,
    experience,
    education,
    skills,
    languages,
    references,
    certifications,
    source: isLinkedin ? "linkedin" : "cv",
  };
}
