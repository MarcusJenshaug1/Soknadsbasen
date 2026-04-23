import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { getRelatedGuides } from "@/lib/guide/loader";
import { formatGuideDate } from "@/lib/guide/format";

export async function RelatedGuides({ slugs }: { slugs: string[] }) {
  if (!slugs || slugs.length === 0) return null;
  const guides = await getRelatedGuides(slugs);
  if (guides.length === 0) return null;

  return (
    <section
      aria-labelledby="related-heading"
      className="border-t border-black/10 pt-12 mt-16"
    >
      <h2
        id="related-heading"
        className="text-[11px] uppercase tracking-[0.2em] text-[#c15a3a] mb-6"
      >
        Les også
      </h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {guides.map((g) => (
          <li key={g.frontmatter.slug}>
            <Link
              href={`/guide/${g.frontmatter.slug}`}
              className="group block border border-black/10 rounded-2xl p-6 hover:border-[#14110e]/30 transition-colors"
            >
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#14110e]/50 mb-2">
                {g.frontmatter.tags?.[0] ?? "Guide"} ·{" "}
                {formatGuideDate(
                  g.frontmatter.updatedAt ?? g.frontmatter.publishedAt,
                )}
              </div>
              <h3 className="text-[17px] md:text-[19px] leading-[1.3] tracking-[-0.015em] font-medium mb-2 group-hover:text-[#c15a3a] transition-colors">
                {g.frontmatter.title}
              </h3>
              <p className="text-[13px] leading-[1.55] text-[#14110e]/65 line-clamp-2">
                {g.frontmatter.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[12px] text-[#c15a3a]">
                Les guiden
                <FiArrowUpRight className="w-3 h-3" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
