import Image from "next/image";
import Link from "next/link";
import { FiArrowLeft, FiMail, FiExternalLink } from "react-icons/fi";
import { Logo } from "@/components/ui/Logo";
import { buildMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;

export const metadata = buildMetadata({
  path: "/om",
  title: "Om Marcus Jenshaug",
  description:
    "Marcus Jenshaug er fullstack-utvikler i Oslo som lager Søknadsbasen. Les mer om hvem som står bak og hvorfor.",
});

const TECH = [
  "Next.js",
  "TypeScript",
  "React",
  "Supabase",
  "Prisma",
  "Tailwind CSS",
  "Node.js",
  "Azure",
  "AWS",
];

const PROJECTS = [
  {
    name: "Søknadsbasen",
    period: "2026–",
    desc: "CV-bygger og jobbsøkersporer. Gir deg mer kontroll enn et regneark.",
    href: "/",
  },
  {
    name: "Klink",
    period: "2026–",
    desc: "Norsk drikkespill-webapp med egne spillpakker.",
    href: null,
  },
  {
    name: "Eiendomsavtaler.no",
    period: "2024–2026",
    desc: "Markedsplass for næringseiendom. Arkitektur, kode, infrastruktur, sikkerhet og deploy.",
    href: null,
  },
];

export default function OmPage() {
  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e]">
      <header className="max-w-[820px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-4 flex items-center justify-between">
        <Logo href="/" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#14110e]/65 hover:text-[#14110e]"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          Tilbake
        </Link>
      </header>

      <main className="max-w-[820px] mx-auto px-5 md:px-10 pb-24">
        <div className="pt-10 mb-14">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#D5592E] mb-4">
            Om
          </div>

          <div className="flex flex-col sm:flex-row gap-8 sm:gap-12 items-start">
            {/* Portrait */}
            <div className="shrink-0">
              <Image
                src="/portrett.jpg"
                alt="Marcus Jenshaug, fullstack-utvikler og grunnlegger av Søknadsbasen"
                width={240}
                height={240}
                priority
                className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-full object-cover object-top"
              />
            </div>

            {/* Intro */}
            <div>
              <h1 className="text-[32px] md:text-[48px] leading-[1.05] tracking-[-0.03em] font-medium mb-3">
                Marcus Jenshaug
              </h1>
              <p className="text-[15px] text-[#14110e]/65 mb-4">
                Fullstack-utvikler · Oslo
              </p>
              <p className="text-[16px] md:text-[17px] leading-[1.65] text-[#14110e]/80 max-w-[52ch]">
                Jeg jobber til daglig som fullstack-utvikler i Redi AS og
                bygger webapplikasjoner med Next.js, TypeScript og Supabase.
                Søknadsbasen er et sideprosjekt jeg lagde fordi jeg ville ha
                et verktøy som er bedre enn et regneark til å holde styr på
                jobbsøkingen.
              </p>
            </div>
          </div>
        </div>

        {/* Tech */}
        <section className="mb-14">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/45 mb-4">
            Teknologi
          </h2>
          <div className="flex flex-wrap gap-2">
            {TECH.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full text-[12px] bg-black/5 text-[#14110e]/70"
              >
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section className="mb-14">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/45 mb-6">
            Prosjekter
          </h2>
          <div className="space-y-0">
            {PROJECTS.map((p) => (
              <div
                key={p.name}
                className="border-t border-black/10 py-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"
              >
                <div>
                  {p.href ? (
                    <Link
                      href={p.href}
                      className="text-[15px] font-medium hover:text-[#D5592E] transition-colors inline-flex items-center gap-1.5"
                    >
                      {p.name}
                      <FiExternalLink className="w-3 h-3 opacity-50" />
                    </Link>
                  ) : (
                    <span className="text-[15px] font-medium">{p.name}</span>
                  )}
                  <p className="text-[13px] text-[#14110e]/60 mt-1">{p.desc}</p>
                </div>
                <span className="text-[12px] text-[#14110e]/40 shrink-0 sm:pt-0.5">
                  {p.period}
                </span>
              </div>
            ))}
            <div className="border-t border-black/10" />
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-[#14110e]/45 mb-4">
            Kontakt
          </h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://marcusjenshaug.no"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] hover:bg-[#14110e]/85 transition-colors"
            >
              <FiExternalLink className="w-3.5 h-3.5" />
              marcusjenshaug.no
            </a>
            <a
              href="mailto:marcus@jenshaug.no"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/12 text-[13px] hover:bg-black/4 transition-colors"
            >
              <FiMail className="w-3.5 h-3.5" />
              marcus@jenshaug.no
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10">
        <div className="max-w-[820px] mx-auto px-5 md:px-10 py-8 flex flex-wrap items-center justify-between text-[12px] text-[#14110e]/55 gap-4">
          <span>© 2026 Søknadsbasen</span>
          <span className="flex items-center gap-3">
            <Link href="/guide" className="hover:text-[#14110e]">
              Guide
            </Link>
            <span className="text-[#14110e]/25">·</span>
            <Link href="/personvern" className="hover:text-[#14110e]">
              Personvern
            </Link>
            <span className="text-[#14110e]/25">·</span>
            <Link href="/vilkar" className="hover:text-[#14110e]">
              Vilkår
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
