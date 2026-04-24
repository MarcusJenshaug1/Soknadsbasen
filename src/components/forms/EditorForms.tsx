import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useResumeStore, SECTION_LABELS, type ResumeData, type SectionKey } from "@/store/useResumeStore";
import { TEMPLATES, COLOR_PALETTES, FONT_PAIRS, getTemplate } from "@/lib/design-tokens";
import { analyzeAtsMatch } from "@/lib/ats";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Palette, Type, Layout, Download, Globe, GripVertical, Sparkles, Target, ArrowDownUp } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

const LexicalEditor = dynamic(
  () => import("./LexicalEditor").then((m) => m.LexicalEditor),
  { ssr: false, loading: () => <Skeleton className="h-40 w-full rounded-xl" /> },
);

/* ─── Shared styling constants ─────────────────────────────── */

const inputClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all";
const cardClass =
  "p-6 rounded-xl border border-neutral-200 bg-neutral-50 relative group transition-all";
const addBtnClass =
  "w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-neutral-700">{children}</label>;
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
    >
      <Trash2 className="size-4" />
    </button>
  );
}

/* ─── Role ────────────────────────────────────────────────── */

export function RoleForm() {
  const role = useResumeStore((s) => s.data.role);
  const updateRole = useResumeStore((s) => s.updateRole);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Ønsket Rolle / Yrkestittel</h3>
        <p className="text-sm text-neutral-500">
          Skreddersy tittelen til jobben du søker på. Dette fanger umiddelbart oppmerksomheten til rekruttereren.
        </p>
      </div>
      <div className="space-y-1">
        <Label>Yrkestittel</Label>
        <input
          type="text"
          className={inputClass}
          placeholder="F.eks. Senior Frontend Utvikler"
          value={role}
          onChange={(e) => updateRole(e.target.value)}
        />
      </div>
    </div>
  );
}

/* ─── Experience ──────────────────────────────────────────── */

export function ExperienceForm() {
  const experience = useResumeStore((s) => s.data.experience);
  const addExperience = useResumeStore((s) => s.addExperience);
  const updateExperience = useResumeStore((s) => s.updateExperience);
  const removeExperience = useResumeStore((s) => s.removeExperience);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Arbeidserfaring</h3>
        <p className="text-sm text-neutral-500">
          Legg til dine mest relevante jobber. Bruk mønsteret &quot;handling + ansvar + resultat&quot; for beste effekt.
        </p>
      </div>
      <div className="space-y-8">
        {experience.map((exp) => (
          <div key={exp.id} className={cardClass}>
            <RemoveBtn onClick={() => removeExperience(exp.id)} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tittel</Label>
                <input className={inputClass} value={exp.title} onChange={(e) => updateExperience(exp.id, { title: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Arbeidsgiver</Label>
                <input className={inputClass} value={exp.company} onChange={(e) => updateExperience(exp.id, { company: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Sted</Label>
                <input className={inputClass} value={exp.location} placeholder="Oslo, Norge" onChange={(e) => updateExperience(exp.id, { location: e.target.value })} />
              </div>
              <div />
              <div className="space-y-1">
                <Label>Start (mm.åååå)</Label>
                <input className={inputClass} value={exp.startDate} onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label>Slutt (mm.åååå)</Label>
                  <label className="text-xs flex items-center gap-1.5 text-neutral-600 cursor-pointer">
                    <input type="checkbox" checked={exp.current} onChange={(e) => updateExperience(exp.id, { current: e.target.checked })} /> Nåværende
                  </label>
                </div>
                <input className={`${inputClass} disabled:bg-neutral-100 disabled:text-neutral-400`} disabled={exp.current} value={exp.current ? "Nå" : exp.endDate} onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium text-neutral-700 flex justify-between">
                  <span>Beskrivelse / Resultater</span>
                </label>
                <LexicalEditor value={exp.description} onChange={(val) => updateExperience(exp.id, { description: val })} placeholder="• Økte omsetningen med 20% gjennom..." />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addExperience} className={addBtnClass}>
          <Plus className="size-4" /> Legg til ny stilling
        </button>
      </div>
    </div>
  );
}

/* ─── Education ───────────────────────────────────────────── */

export function EducationForm() {
  const education = useResumeStore((s) => s.data.education);
  const addEducation = useResumeStore((s) => s.addEducation);
  const updateEducation = useResumeStore((s) => s.updateEducation);
  const removeEducation = useResumeStore((s) => s.removeEducation);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Utdanning</h3>
      </div>
      <div className="space-y-8">
        {education.map((edu) => (
          <div key={edu.id} className={cardClass}>
            <RemoveBtn onClick={() => removeEducation(edu.id)} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Grad / Studie</Label>
                <input className={inputClass} value={edu.degree} onChange={(e) => updateEducation(edu.id, { degree: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Lærested</Label>
                <input className={inputClass} value={edu.school} onChange={(e) => updateEducation(edu.id, { school: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Fagfelt</Label>
                <input className={inputClass} value={edu.field} placeholder="F.eks. Informatikk" onChange={(e) => updateEducation(edu.id, { field: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Sted</Label>
                <input className={inputClass} value={edu.location} placeholder="Oslo, Norge" onChange={(e) => updateEducation(edu.id, { location: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Beskrivelse / Spesialisering</Label>
                <LexicalEditor value={edu.description} onChange={(val) => updateEducation(edu.id, { description: val })} placeholder="F.eks. Masteroppgave om..." />
              </div>
              <div className="space-y-1">
                <Label>Start (åååå)</Label>
                <input className={inputClass} value={edu.startDate} onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label>Slutt (åååå)</Label>
                  <label className="text-xs flex items-center gap-1.5 text-neutral-600 cursor-pointer">
                    <input type="checkbox" checked={edu.current} onChange={(e) => updateEducation(edu.id, { current: e.target.checked })} /> Pågår
                  </label>
                </div>
                <input className={`${inputClass} disabled:bg-neutral-100`} disabled={edu.current} value={edu.current ? "Pågår" : edu.endDate} onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })} />
              </div>
            </div>
          </div>
        ))}
        <button onClick={addEducation} className={addBtnClass}>
          <Plus className="size-4" /> Legg til utdanning
        </button>
      </div>
    </div>
  );
}

/* ─── Skills ──────────────────────────────────────────────── */

export function SkillsForm() {
  const skills = useResumeStore((s) => s.data.skills);
  const updateSkills = useResumeStore((s) => s.updateSkills);
  const [inputValue, setInputValue] = useState(skills.join(", "));

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);
    updateSkills(val.split(",").map((s) => s.trim()).filter(Boolean));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Ferdigheter</h3>
        <p className="text-sm text-neutral-500">Separér ferdighetene med komma (f.eks: React, Node.js, Prosjektledelse).</p>
      </div>
      <textarea className={`${inputClass} min-h-[120px]`} value={inputValue} onChange={handleChange} placeholder="Skriv inn ferdigheter..." />
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {skills.map((s, i) => (
            <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Summary ─────────────────────────────────────────────── */

export function SummaryForm() {
  const summary = useResumeStore((s) => s.data.summary);
  const updateSummary = useResumeStore((s) => s.updateSummary);
  const [editorKey, setEditorKey] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [tone, setTone] = useState<"varm" | "formell" | "konsis">("varm");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string | null>(null);

  async function runImprove() {
    setAiLoading(true);
    setAiError(null);
    setStreamText("");
    try {
      const res = await fetch("/api/ai/improve-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, tone }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "AI-feil");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          try {
            const evt = JSON.parse(payload) as {
              chunk?: string;
              done?: boolean;
              text?: string;
              error?: string;
            };
            if (evt.error) throw new Error(evt.error);
            if (evt.chunk) {
              accumulated += evt.chunk;
              setStreamText(accumulated);
            }
            if (evt.done && evt.text != null) {
              const converted = `<p>${evt.text.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
              updateSummary(converted);
              setEditorKey((k) => k + 1);
              setStreamText(null);
              setAiOpen(false);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Ukjent feil");
      setStreamText(null);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Profil / Oppsummering</h3>
          <p className="text-sm text-neutral-500">
            En kort tekst (3-4 setninger) som oppsummerer hvem du er, hva du kan, og hva du ønsker å oppnå.
          </p>
        </div>
        {!aiOpen ? (
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[11px] font-medium hover:bg-[#a94424] transition-colors"
          >
            Forbedre med AI
          </button>
        ) : (
          <div className="shrink-0 flex items-center gap-2 flex-wrap">
            <div className="inline-flex bg-[#eee9df] rounded-full p-1">
              {(["varm", "formell", "konsis"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`px-3 py-1 rounded-full text-[11px] transition-colors ${
                    tone === t
                      ? "bg-[#faf8f5] text-[#14110e] font-medium"
                      : "text-[#14110e]/60 hover:text-[#14110e]"
                  }`}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={runImprove}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[11px] font-medium hover:bg-[#a94424] disabled:opacity-50"
            >
              {aiLoading ? "Skriver …" : "Generer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAiOpen(false);
                setAiError(null);
              }}
              className="text-[11px] text-[#14110e]/55 hover:text-[#14110e]"
            >
              Avbryt
            </button>
          </div>
        )}
      </div>
      {aiError && <p className="text-[11px] text-[#D5592E]">{aiError}</p>}
      {streamText !== null ? (
        <div className="relative rounded-2xl bg-white border border-[#D5592E] overflow-hidden min-h-[160px]">
          <div className="px-5 py-4 text-[14px] text-[#14110e] leading-[1.6] whitespace-pre-wrap">
            {streamText ? (
              <>
                {streamText}
                <span className="inline-block w-[2px] h-[0.9em] bg-[#D5592E] ml-[2px] align-[-0.05em] animate-pulse" />
              </>
            ) : (
              <span className="text-[#14110e]/35 animate-pulse">AI skriver …</span>
            )}
          </div>
        </div>
      ) : (
        <LexicalEditor
          key={editorKey}
          value={summary}
          onChange={(val) => updateSummary(val)}
          placeholder="I over 10 år har jeg jobbet med..."
        />
      )}
      <div className="flex justify-end text-xs text-neutral-400">
        {summary.length} tegn (inkl. HTML)
      </div>
    </div>
  );
}

/* ─── Languages ───────────────────────────────────────────── */

export function LanguagesForm() {
  const languages = useResumeStore((s) => s.data.languages);
  const addLanguage = useResumeStore((s) => s.addLanguage);
  const updateLanguage = useResumeStore((s) => s.updateLanguage);
  const removeLanguage = useResumeStore((s) => s.removeLanguage);

  const levels = ["Morsmål", "Flytende", "Avansert", "Mellom", "Grunnleggende"];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Språk</h3>
      </div>
      <div className="space-y-4">
        {languages.map((lang) => (
          <div key={lang.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className={`${inputClass} min-w-0 sm:flex-1`}
              value={lang.name}
              placeholder="Språk"
              onChange={(e) => updateLanguage(lang.id, { name: e.target.value })}
            />
            <div className="flex items-center gap-3 sm:shrink-0">
              <select className={`${inputClass} min-w-0 w-full sm:w-40`} value={lang.level} onChange={(e) => updateLanguage(lang.id, { level: e.target.value })}>
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <button onClick={() => removeLanguage(lang.id)} className="shrink-0 p-2 text-neutral-400 hover:text-red-500">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        <button onClick={addLanguage} className={addBtnClass}>
          <Plus className="size-4" /> Legg til språk
        </button>
      </div>
    </div>
  );
}

/* ─── Extra Sections Form (all optional sections) ─────────── */

export function ExtraSectionsForm() {
  const data = useResumeStore((s) => s.data);
  const toggleVisibility = useResumeStore((s) => s.toggleSectionVisibility);

  const optionalSections: { key: SectionKey; desc: string }[] = [
    { key: "languages", desc: "Språk du behersker" },
    { key: "certifications", desc: "Profesjonelle sertifiseringer" },
    { key: "projects", desc: "Relevante prosjekter" },
    { key: "courses", desc: "Relevante kurs" },
    { key: "volunteering", desc: "Frivillig arbeid" },
    { key: "awards", desc: "Priser og utmerkelser" },
    { key: "publications", desc: "Publikasjoner" },
    { key: "references", desc: "Referanser" },
    { key: "interests", desc: "Interesser og hobbyer" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Ekstra seksjoner</h3>
        <p className="text-sm text-neutral-500">Slå på seksjonene du vil inkludere i CV-en din. Du kan redigere innholdet etter at de er aktivert.</p>
      </div>
      <div className="space-y-3">
        {optionalSections.map(({ key, desc }) => {
          const visible = data.sectionVisibility[key];
          return (
            <div
              key={key}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                visible ? "border-indigo-200 bg-indigo-50/50" : "border-neutral-200 bg-white"
              }`}
            >
              <div>
                <span className="font-medium text-sm text-neutral-800">{SECTION_LABELS[key][data.locale]}</span>
                <p className="text-xs text-neutral-500">{desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={visible} onChange={() => toggleVisibility(key)} />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>
          );
        })}
      </div>

      {/* Inline editing for enabled sections */}
      {data.sectionVisibility.certifications && <CertificationsSubForm />}
      {data.sectionVisibility.projects && <ProjectsSubForm />}
      {data.sectionVisibility.courses && <CoursesSubForm />}
      {data.sectionVisibility.volunteering && <VolunteeringSubForm />}
      {data.sectionVisibility.awards && <AwardsSubForm />}
      {data.sectionVisibility.publications && <PublicationsSubForm />}
      {data.sectionVisibility.references && <ReferencesSubForm />}
      {data.sectionVisibility.interests && <InterestsSubForm />}
    </div>
  );
}

/* ─── Sub-forms for optional sections ──────────────────────── */

function CertificationsSubForm() {
  const items = useResumeStore((s) => s.data.certifications);
  const add = useResumeStore((s) => s.addCertification);
  const update = useResumeStore((s) => s.updateCertification);
  const remove = useResumeStore((s) => s.removeCertification);
  return (
    <SubSection title="Sertifiseringer">
      {items.map((c) => (
        <div key={c.id} className={cardClass}>
          <RemoveBtn onClick={() => remove(c.id)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Navn</Label><input className={inputClass} value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Utsteder</Label><input className={inputClass} value={c.issuer} onChange={(e) => update(c.id, { issuer: e.target.value })} /></div>
            <div className="space-y-1"><Label>Dato</Label><input className={inputClass} value={c.date} onChange={(e) => update(c.id, { date: e.target.value })} /></div>
            <div className="space-y-1"><Label>URL</Label><input className={inputClass} value={c.url} placeholder="https://..." onChange={(e) => update(c.id, { url: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}><Plus className="size-4" /> Legg til sertifisering</button>
    </SubSection>
  );
}

function ProjectsSubForm() {
  const items = useResumeStore((s) => s.data.projects);
  const add = useResumeStore((s) => s.addProject);
  const update = useResumeStore((s) => s.updateProject);
  const remove = useResumeStore((s) => s.removeProject);
  return (
    <SubSection title="Prosjekter">
      {items.map((p) => (
        <div key={p.id} className={cardClass}>
          <RemoveBtn onClick={() => remove(p.id)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Prosjektnavn</Label><input className={inputClass} value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Rolle</Label><input className={inputClass} value={p.role} onChange={(e) => update(p.id, { role: e.target.value })} /></div>
            <div className="space-y-1"><Label>URL</Label><input className={inputClass} value={p.url} placeholder="https://..." onChange={(e) => update(p.id, { url: e.target.value })} /></div>
            <div />
            <div className="space-y-1"><Label>Start</Label><input className={inputClass} value={p.startDate} onChange={(e) => update(p.id, { startDate: e.target.value })} /></div>
            <div className="space-y-1"><Label>Slutt</Label><input className={inputClass} value={p.current ? "Pågår" : p.endDate} disabled={p.current} onChange={(e) => update(p.id, { endDate: e.target.value })} /></div>
            <div className="col-span-2 space-y-1"><Label>Beskrivelse</Label><LexicalEditor value={p.description} onChange={(val) => update(p.id, { description: val })} placeholder="Beskriv prosjektet..." /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}><Plus className="size-4" /> Legg til prosjekt</button>
    </SubSection>
  );
}

function CoursesSubForm() {
  const items = useResumeStore((s) => s.data.courses);
  const add = useResumeStore((s) => s.addCourse);
  const update = useResumeStore((s) => s.updateCourse);
  const remove = useResumeStore((s) => s.removeCourse);
  return (
    <SubSection title="Kurs">
      {items.map((c) => (
        <div key={c.id} className={cardClass}>
          <RemoveBtn onClick={() => remove(c.id)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Kursnavn</Label><input className={inputClass} value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Institusjon</Label><input className={inputClass} value={c.institution} onChange={(e) => update(c.id, { institution: e.target.value })} /></div>
            <div className="space-y-1"><Label>Dato</Label><input className={inputClass} value={c.date} onChange={(e) => update(c.id, { date: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}><Plus className="size-4" /> Legg til kurs</button>
    </SubSection>
  );
}

function VolunteeringSubForm() {
  const items = useResumeStore((s) => s.data.volunteering);
  const add = useResumeStore((s) => s.addVolunteering);
  const update = useResumeStore((s) => s.updateVolunteering);
  const remove = useResumeStore((s) => s.removeVolunteering);
  return (
    <SubSection title="Frivillig arbeid">
      {items.map((v) => (
        <div key={v.id} className={cardClass}>
          <RemoveBtn onClick={() => remove(v.id)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Organisasjon</Label><input className={inputClass} value={v.organization} onChange={(e) => update(v.id, { organization: e.target.value })} /></div>
            <div className="space-y-1"><Label>Rolle</Label><input className={inputClass} value={v.role} onChange={(e) => update(v.id, { role: e.target.value })} /></div>
            <div className="space-y-1"><Label>Start</Label><input className={inputClass} value={v.startDate} onChange={(e) => update(v.id, { startDate: e.target.value })} /></div>
            <div className="space-y-1"><Label>Slutt</Label><input className={inputClass} value={v.current ? "Nå" : v.endDate} disabled={v.current} onChange={(e) => update(v.id, { endDate: e.target.value })} /></div>
            <div className="col-span-2 space-y-1"><Label>Beskrivelse</Label><LexicalEditor value={v.description} onChange={(val) => update(v.id, { description: val })} placeholder="Beskriv ditt bidrag..." /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}><Plus className="size-4" /> Legg til frivillig arbeid</button>
    </SubSection>
  );
}

function AwardsSubForm() {
  const items = useResumeStore((s) => s.data.awards);
  const add = useResumeStore((s) => s.addAward);
  const update = useResumeStore((s) => s.updateAward);
  const remove = useResumeStore((s) => s.removeAward);
  return (
    <SubSection title="Priser og utmerkelser">
      {items.map((a) => (
        <div key={a.id} className={cardClass}>
          <RemoveBtn onClick={() => remove(a.id)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Tittel</Label><input className={inputClass} value={a.title} onChange={(e) => update(a.id, { title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Utsteder</Label><input className={inputClass} value={a.issuer} onChange={(e) => update(a.id, { issuer: e.target.value })} /></div>
            <div className="space-y-1"><Label>Dato</Label><input className={inputClass} value={a.date} onChange={(e) => update(a.id, { date: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}><Plus className="size-4" /> Legg til pris</button>
    </SubSection>
  );
}

function PublicationsSubForm() {
  const items = useResumeStore((s) => s.data.publications);
  const add = useResumeStore((s) => s.addPublication);
  const update = useResumeStore((s) => s.updatePublication);
  const remove = useResumeStore((s) => s.removePublication);
  return (
    <SubSection title="Publikasjoner">
      {items.map((p) => (
        <div key={p.id} className={cardClass}>
          <RemoveBtn onClick={() => remove(p.id)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Tittel</Label><input className={inputClass} value={p.title} onChange={(e) => update(p.id, { title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Utgiver</Label><input className={inputClass} value={p.publisher} onChange={(e) => update(p.id, { publisher: e.target.value })} /></div>
            <div className="space-y-1"><Label>Dato</Label><input className={inputClass} value={p.date} onChange={(e) => update(p.id, { date: e.target.value })} /></div>
            <div className="space-y-1"><Label>URL</Label><input className={inputClass} value={p.url} placeholder="https://..." onChange={(e) => update(p.id, { url: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}><Plus className="size-4" /> Legg til publikasjon</button>
    </SubSection>
  );
}

function ReferencesSubForm() {
  const items = useResumeStore((s) => s.data.references);
  const add = useResumeStore((s) => s.addReference);
  const update = useResumeStore((s) => s.updateReference);
  const remove = useResumeStore((s) => s.removeReference);
  return (
    <SubSection title="Referanser">
      {items.map((r) => (
        <div key={r.id} className={cardClass}>
          <RemoveBtn onClick={() => remove(r.id)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Navn</Label><input className={inputClass} value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Tittel</Label><input className={inputClass} value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Selskap</Label><input className={inputClass} value={r.company} onChange={(e) => update(r.id, { company: e.target.value })} /></div>
            <div className="space-y-1"><Label>Relasjon</Label><input className={inputClass} value={r.relationship} placeholder="F.eks. Leder" onChange={(e) => update(r.id, { relationship: e.target.value })} /></div>
            <div className="space-y-1"><Label>E-post</Label><input className={inputClass} value={r.email} onChange={(e) => update(r.id, { email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Telefon</Label><input className={inputClass} value={r.phone} onChange={(e) => update(r.id, { phone: e.target.value })} /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className={addBtnClass}><Plus className="size-4" /> Legg til referanse</button>
    </SubSection>
  );
}

function InterestsSubForm() {
  const interests = useResumeStore((s) => s.data.interests);
  const updateInterests = useResumeStore((s) => s.updateInterests);
  const [input, setInput] = useState(interests.join(", "));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    updateInterests(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
  };
  return (
    <SubSection title="Interesser">
      <input className={inputClass} value={input} onChange={handleChange} placeholder="F.eks: Fjelltur, Fotografi, Sjakk" />
    </SubSection>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 pt-6 border-t border-neutral-200">
      <h4 className="text-base font-semibold text-neutral-800 mb-4">{title}</h4>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/* ─── Design & Export form ────────────────────────────────── */

export function DesignExportForm() {
  const data = useResumeStore((s) => s.data);
  const resumes = useResumeStore((s) => s.resumes);
  const activeResumeId = useResumeStore((s) => s.activeResumeId);
  const setTemplate = useResumeStore((s) => s.setTemplate);
  const setColorPalette = useResumeStore((s) => s.setColorPalette);
  const setFontPair = useResumeStore((s) => s.setFontPair);
  const setLocale = useResumeStore((s) => s.setLocale);
  const setShowIcons = useResumeStore((s) => s.setShowSectionIcons);
  const setDatePos = useResumeStore((s) => s.setDatePosition);
  const setSectionOrder = useResumeStore((s) => s.setSectionOrder);
  const replaceData = useResumeStore((s) => s.replaceData);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [jobAd, setJobAd] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobUrlLoading, setJobUrlLoading] = useState(false);
  const [jobUrlError, setJobUrlError] = useState<string | null>(null);
  const [jobSource, setJobSource] = useState<{
    title: string | null;
    companyName: string | null;
    source: string | null;
  } | null>(null);
  const [draggingKey, setDraggingKey] = useState<SectionKey | null>(null);
  const [versions, setVersions] = useState<Array<{ id: string; versionNum: number; templateId: string; createdAt: string; content: ResumeData }>>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionActionLoading, setVersionActionLoading] = useState(false);

  const currentTemplate = getTemplate(data.templateId);
  const activeResumeMeta = resumes.find((resume) => resume.id === activeResumeId);
  const atsAnalysis = jobAd.trim() ? analyzeAtsMatch(data, jobAd) : null;

  useEffect(() => {
    let cancelled = false;

    async function loadVersions() {
      if (!activeResumeId) {
        setVersions([]);
        return;
      }

      setVersionsLoading(true);
      try {
        const res = await fetch(`/api/resume-versions?resumeId=${encodeURIComponent(activeResumeId)}`);
        const payload = await res.json();
        if (!cancelled) {
          setVersions((payload.versions ?? []) as Array<{ id: string; versionNum: number; templateId: string; createdAt: string; content: ResumeData }>);
        }
      } catch {
        if (!cancelled) setVersions([]);
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    }

    loadVersions();
    return () => {
      cancelled = true;
    };
  }, [activeResumeId]);

  async function fetchJobFromUrl() {
    const url = jobUrl.trim();
    if (!url) return;
    setJobUrlLoading(true);
    setJobUrlError(null);
    try {
      const res = await fetch("/api/ai/parse-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Kunne ikke hente stillingen");
      }
      const data = await res.json() as {
        title?: string | null;
        companyName?: string | null;
        source?: string | null;
        jobDescription?: string | null;
      };
      if (data.jobDescription) {
        setJobAd(data.jobDescription);
        setJobSource({
          title: data.title ?? null,
          companyName: data.companyName ?? null,
          source: data.source ?? null,
        });
      } else {
        setJobUrlError("Fant ingen stillingstekst på siden");
      }
    } catch (err) {
      setJobUrlError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setJobUrlLoading(false);
    }
  }

  function reorderSection(targetKey: SectionKey) {
    if (!draggingKey || draggingKey === targetKey) return;
    const next = [...data.sectionOrder];
    const from = next.indexOf(draggingKey);
    const to = next.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, draggingKey);
    setSectionOrder(next);
  }

  function moveSection(key: SectionKey, direction: -1 | 1) {
    const currentIndex = data.sectionOrder.indexOf(key);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= data.sectionOrder.length) return;
    const next = [...data.sectionOrder];
    [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
    setSectionOrder(next);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Design & Eksport</h3>
        <p className="text-sm text-neutral-500">Velg mal, farger og skrifttype. CV-en oppdateres i sanntid.</p>
      </div>

      {/* Template selection */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><Layout className="size-4" /> Mal</h4>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTemplate(t.id);
                // Reset to template defaults if current palette/font isn't supported
                if (!t.supportedColorPalettes.includes(data.colorPalette)) setColorPalette(t.defaultColorPalette);
                if (!t.supportedFontPairs.includes(data.fontPair)) setFontPair(t.defaultFontPair);
              }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                data.templateId === t.id
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <div className="text-sm font-semibold text-neutral-800">{t.name}</div>
              <div className="text-xs text-neutral-500 mt-1">{t.description}</div>
              <div className="mt-2 flex gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  t.category === "ats" ? "bg-green-100 text-green-700" :
                  t.category === "modern" ? "bg-indigo-100 text-indigo-700" :
                  t.category === "executive" ? "bg-amber-100 text-amber-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {t.category === "ats" ? "ATS-vennlig" : t.category === "modern" ? "Moderne" : t.category === "executive" ? "Executive" : "Akademisk"}
                </span>
                {t.hasSidebar && <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">Sidebar</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Color palette */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><Palette className="size-4" /> Fargepalett</h4>
        <div className="flex flex-wrap gap-3">
          {COLOR_PALETTES.filter((p) => currentTemplate.supportedColorPalettes.includes(p.id)).map((p) => (
            <button
              key={p.id}
              onClick={() => setColorPalette(p.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                data.colorPalette === p.id ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <div className="flex gap-1">
                <div className="size-4 rounded-full" style={{ backgroundColor: p.primary }} />
                <div className="size-4 rounded-full" style={{ backgroundColor: p.headerBg }} />
                <div className="size-4 rounded-full" style={{ backgroundColor: p.dot }} />
              </div>
              <span className="text-xs font-medium text-neutral-700">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font pair */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><Type className="size-4" /> Typografi</h4>
        <div className="flex flex-wrap gap-3">
          {FONT_PAIRS.filter((f) => currentTemplate.supportedFontPairs.includes(f.id)).map((f) => (
            <button
              key={f.id}
              onClick={() => setFontPair(f.id)}
              className={`px-4 py-2 rounded-lg border-2 transition-all ${
                data.fontPair === f.id ? "border-indigo-500 bg-indigo-50" : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <span className="text-xs font-medium text-neutral-700">{f.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><Globe className="size-4" /> Språk</h4>
          <select className={inputClass} value={data.locale} onChange={(e) => setLocale(e.target.value as "no" | "en")}>
            <option value="no">Norsk</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-neutral-700">Datoplassering</h4>
          <select className={inputClass} value={data.datePosition} onChange={(e) => setDatePos(e.target.value as "left" | "right")}>
            <option value="right">Høyre</option>
            <option value="left">Venstre</option>
          </select>
        </div>
      </div>

      {/* Icon toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200">
        <span className="text-sm font-medium text-neutral-700">Vis seksjonsikoner</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={data.showSectionIcons} onChange={(e) => setShowIcons(e.target.checked)} />
          <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
        </label>
      </div>

      {/* Section ordering */}
      <div className="space-y-4 p-5 rounded-2xl border border-neutral-200 bg-white">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><ArrowDownUp className="size-4" /> Seksjonsrekkefølge</h4>
          <p className="text-xs text-neutral-500">Dra seksjoner for å endre rekkefølgen i CV-en. Skjulte seksjoner blir med i listen, men vises ikke før de er slått på.</p>
        </div>
        <div className="space-y-2">
          {data.sectionOrder.map((key, index) => (
            <div
              key={key}
              draggable
              onDragStart={() => setDraggingKey(key)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorderSection(key)}
              onDragEnd={() => setDraggingKey(null)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${draggingKey === key ? "border-indigo-300 bg-indigo-50" : "border-neutral-200 bg-neutral-50/70"}`}
            >
              <GripVertical className="size-4 text-neutral-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-800">{SECTION_LABELS[key][data.locale]}</div>
                <div className="text-[11px] text-neutral-500">{data.sectionVisibility[key] ? "Synlig i CV" : "Skjult akkurat nå"}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveSection(key, -1)} disabled={index === 0} className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 disabled:opacity-40">
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" onClick={() => moveSection(key, 1)} disabled={index === data.sectionOrder.length - 1} className="p-2 rounded-lg border border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800 disabled:opacity-40">
                  <ChevronDown className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ATS analysis */}
      <div className="space-y-4 p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-emerald-900 flex items-center gap-2"><Target className="size-4" /> ATS-score & nøkkelordanalyse</h4>
          <p className="text-xs text-emerald-800/70">Lim inn hele stillingsannonsen, eller hent direkte fra URL (FINN.no, LinkedIn, NAV, Webcruiter m.fl).</p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-emerald-900/80">Hent fra URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  fetchJobFromUrl();
                }
              }}
              placeholder="https://www.finn.no/job/..."
              className={`${inputClass} bg-white flex-1`}
              disabled={jobUrlLoading}
            />
            <button
              type="button"
              onClick={fetchJobFromUrl}
              disabled={jobUrlLoading || !jobUrl.trim()}
              className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {jobUrlLoading ? "Henter…" : "Hent"}
            </button>
          </div>
          {jobUrlError && (
            <p className="text-xs text-red-700">{jobUrlError}</p>
          )}
          {jobSource && !jobUrlError && (
            <p className="text-xs text-emerald-800/80">
              Hentet: <span className="font-semibold">{jobSource.title ?? "stilling"}</span>
              {jobSource.companyName ? ` hos ${jobSource.companyName}` : ""}
              {jobSource.source ? ` (${jobSource.source})` : ""}
            </p>
          )}
        </div>

        <div className="relative">
          <div className="absolute -top-2 left-3 bg-emerald-50 px-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Stillingstekst
          </div>
          <textarea
            value={jobAd}
            onChange={(e) => setJobAd(e.target.value)}
            rows={7}
            className={`${inputClass} resize-y bg-white`}
            placeholder="Lim inn hele stillingsannonsen her, eller bruk URL-feltet over."
          />
        </div>

        {atsAnalysis && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between rounded-2xl bg-white border border-emerald-100 p-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Matchscore</div>
                <div className="text-3xl font-extrabold text-emerald-950">{atsAnalysis.score}%</div>
              </div>
              <div className="flex-1">
                <div className="h-3 rounded-full bg-emerald-100 overflow-hidden">
                  <div className="h-full bg-linear-to-r from-emerald-500 to-teal-500" style={{ width: `${atsAnalysis.score}%` }} />
                </div>
                <div className="mt-2 text-xs text-neutral-600">{atsAnalysis.summary[0] ?? "Legg til mer innhold for å få analyse."}</div>
              </div>
            </div>

            {atsAnalysis.suggestedRole && (
              <div className="rounded-xl border border-white/70 bg-white/70 p-4 text-sm text-neutral-700">
                <span className="font-semibold text-neutral-900">Foreslått tittel:</span> {atsAnalysis.suggestedRole}
              </div>
            )}

            {atsAnalysis.recommendedTemplateId && (
              <button
                type="button"
                onClick={() => setTemplate(atsAnalysis.recommendedTemplateId!)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                <Sparkles className="size-4" />
                Bytt til ATS-mal
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/70 bg-white/70 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Treff i CV-en</div>
                <div className="flex flex-wrap gap-2">
                  {atsAnalysis.matchedKeywords.length > 0 ? atsAnalysis.matchedKeywords.map((keyword) => (
                    <span key={keyword} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">{keyword}</span>
                  )) : <span className="text-xs text-neutral-500">Ingen tydelige treff ennå.</span>}
                </div>
              </div>
              <div className="rounded-xl border border-white/70 bg-white/70 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700">Mangler / vurder å nevne</div>
                <div className="flex flex-wrap gap-2">
                  {atsAnalysis.missingKeywords.length > 0 ? atsAnalysis.missingKeywords.slice(0, 8).map((keyword) => (
                    <span key={keyword} className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">{keyword}</span>
                  )) : <span className="text-xs text-neutral-500">Ser bra ut — få manglende nøkkelord.</span>}
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-neutral-700">
              {atsAnalysis.summary.slice(1).map((item) => (
                <li key={item} className="rounded-xl border border-white/70 bg-white/70 px-4 py-3">{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Version history */}
      <div className="space-y-4 p-5 rounded-2xl border border-neutral-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2"><Download className="size-4" /> Dokumentversjoner</h4>
            <p className="text-xs text-neutral-500 mt-1">Lagre snapshots av {activeResumeMeta?.name ?? "aktiv CV"} før du gjør større endringer, og gjenopprett en eldre versjon ved behov.</p>
          </div>
          <button
            type="button"
            disabled={versionActionLoading}
            onClick={async () => {
              setVersionActionLoading(true);
              try {
                const res = await fetch("/api/resume-versions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    resumeId: activeResumeId,
                    title: activeResumeMeta?.name ?? "Min CV",
                    templateId: data.templateId,
                    content: data,
                  }),
                });
                const payload = await res.json();
                if (res.ok && payload.version) {
                  setVersions((current) => [payload.version, ...current]);
                }
              } finally {
                setVersionActionLoading(false);
              }
            }}
            className="shrink-0 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {versionActionLoading ? "Lagrer…" : "Lagre snapshot"}
          </button>
        </div>

        {versionsLoading ? (
          <div className="text-sm text-neutral-500">Laster versjoner…</div>
        ) : versions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
            Ingen snapshots ennå. Lagre den første versjonen for å kunne rulle tilbake senere.
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div key={version.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-800">Versjon {version.versionNum}</div>
                  <div className="text-xs text-neutral-500">{new Date(version.createdAt).toLocaleString("nb-NO")} · Mal: {getTemplate(version.templateId).name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => replaceData(version.content)}
                  className="self-start md:self-auto px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  Gjenopprett denne
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <div className="space-y-4 p-6 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50">
        <h4 className="text-base font-bold text-indigo-800 flex items-center gap-2"><Download className="size-5" /> Eksporter</h4>
        <p className="text-sm text-indigo-700/70">
          Bruk nettleserens print-funksjon for å lagre som PDF. Fjern &quot;Headers and footers&quot; og sett marginer til &quot;None&quot;.
        </p>
        <button
          onClick={() => {
            const el = document.getElementById("cv-print-output");
            el?.classList.remove("continuous");
            const prev = document.title;
            const { contact, role } = useResumeStore.getState().data;
            const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
            document.title = ["CV", name, role].filter(Boolean).join(" – ");
            const restore = () => { document.title = prev; window.removeEventListener("afterprint", restore); };
            window.addEventListener("afterprint", restore);
            requestAnimationFrame(() => window.print());
          }}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          <Download className="size-4" /> Lagre som PDF (A4-sider)
        </button>
        <button
          onClick={() => {
            const el = document.getElementById("cv-print-output");
            if (!el) return;

            el.classList.add("continuous");

            // ── Measure real content height ──
            // 1. Show element off-screen at print width
            el.style.cssText = "display:block !important;position:fixed;left:-9999px;top:0;width:210mm;visibility:hidden;z-index:-1;";

            // 2. Collapse ALL constraints on .a4-page so content flows naturally
            const pages = el.querySelectorAll<HTMLElement>(".a4-page");
            const savedStyles: string[] = [];
            pages.forEach((p, i) => {
              savedStyles[i] = p.getAttribute("style") || "";
              p.style.cssText = "width:210mm;min-height:0 !important;height:auto !important;overflow:visible !important;padding:15mm !important;";
            });

            // 3. Also collapse the table wrapper
            const table = el.querySelector<HTMLElement>(".print-table");
            const thead = el.querySelector<HTMLElement>(".print-table thead");
            const tfoot = el.querySelector<HTMLElement>(".print-table tfoot");
            if (table) table.style.cssText = "display:block !important;";
            if (thead) thead.style.cssText = "display:none !important;";
            if (tfoot) tfoot.style.cssText = "display:none !important;";
            const tbodyCells = el.querySelectorAll<HTMLElement>(".print-table tbody, .print-table tbody tr, .print-table tbody td");
            tbodyCells.forEach((c) => { c.style.cssText = "display:block !important;"; });

            // 4. Force reflow and measure
            void el.offsetHeight;
            const contentHeight = el.scrollHeight;

            // 5. Restore everything
            pages.forEach((p, i) => {
              p.setAttribute("style", savedStyles[i]);
            });
            if (table) table.style.cssText = "";
            if (thead) thead.style.cssText = "";
            if (tfoot) tfoot.style.cssText = "";
            tbodyCells.forEach((c) => { c.style.cssText = ""; });
            el.style.cssText = "";

            // 6. Inject @page with measured height + small buffer
            const pageH = contentHeight + 20;
            const style = document.createElement("style");
            style.id = "cv-continuous-page-size";
            style.textContent = [
              `@media print {`,
              `  @page { size: 210mm ${pageH}px !important; margin: 0 !important; }`,
              `  .a4-page { min-height: 0 !important; overflow: visible !important; height: auto !important; }`,
              `}`,
            ].join("\n");
            document.head.appendChild(style);

            const cleanup = () => {
              el.classList.remove("continuous");
              style.remove();
              window.removeEventListener("afterprint", cleanup);
            };
            window.addEventListener("afterprint", cleanup);

            const prev = document.title;
            const { contact, role } = useResumeStore.getState().data;
            const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
            document.title = ["CV", name, role].filter(Boolean).join(" – ");
            const restoreTitle = () => { document.title = prev; window.removeEventListener("afterprint", restoreTitle); };
            window.addEventListener("afterprint", restoreTitle);

            requestAnimationFrame(() => window.print());
          }}
          className="w-full py-3 bg-white text-indigo-700 font-semibold rounded-xl border-2 border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
        >
          <Download className="size-4" /> Lagre som PDF (én lang side)
        </button>

        {/* Server-side PDF generation */}
        <div className="border-t border-indigo-200 pt-4 mt-2">
          <p className="text-xs text-indigo-600/70 mb-2">
            Automatisk PDF uten print-dialog — genereres på serveren.
          </p>
          <button
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                const res = await fetch("/api/pdf", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ data: useResumeStore.getState().data }),
                });
                if (!res.ok) throw new Error("PDF-generering feilet");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const disposition = res.headers.get("content-disposition") ?? "";
                const match = disposition.match(/filename="?(.+?)"?$/);
                a.download = match?.[1] ? decodeURIComponent(match[1]) : "CV.pdf";
                a.href = url;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error(err);
                alert("Kunne ikke generere PDF. Prøv igjen.");
              } finally {
                setPdfLoading(false);
              }
            }}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Download className="size-4" />
            {pdfLoading ? "Genererer…" : "Last ned PDF (automatisk)"}
          </button>
        </div>
      </div>
    </div>
  );
}
