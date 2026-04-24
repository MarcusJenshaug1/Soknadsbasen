import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import type { GuideCTA } from "@/lib/guide/types";

type Props = {
  cta: GuideCTA;
  variant?: "mid" | "end";
};

export function GuideCTAInline({ cta, variant = "mid" }: Props) {
  const isEnd = variant === "end";
  return (
    <aside
      aria-label="Fra Søknadsbasen"
      className={
        isEnd
          ? "my-12 rounded-2xl bg-ink text-bg p-8 md:p-10"
          : "my-12 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f3ede3]/60 dark:bg-panel/40 p-7 md:p-8"
      }
    >
      <div
        className={
          isEnd
            ? "text-[11px] uppercase tracking-[0.2em] text-accent mb-3"
            : "text-[11px] uppercase tracking-[0.2em] text-accent mb-3"
        }
      >
        Fra Søknadsbasen
      </div>
      <p
        className={
          isEnd
            ? "text-[18px] md:text-[20px] leading-[1.45] font-medium mb-5"
            : "text-[16px] md:text-[18px] leading-[1.5] text-ink font-medium mb-5"
        }
      >
        {cta.text}
      </p>
      <Link
        href={cta.href}
        className={
          isEnd
            ? "inline-flex items-center gap-2 bg-bg text-ink rounded-full px-5 py-2.5 text-[14px] font-medium hover:bg-surface transition-colors"
            : "inline-flex items-center gap-2 bg-ink text-bg rounded-full px-5 py-2.5 text-[14px] font-medium hover:bg-ink/85 transition-colors"
        }
      >
        {cta.label}
        <FiArrowRight className="w-4 h-4" />
      </Link>
    </aside>
  );
}
