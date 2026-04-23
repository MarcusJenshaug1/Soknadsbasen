import { SectionLabel } from "@/components/ui/Pill";

export function PlaceholderPage({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-12 py-6 md:py-10">
      <SectionLabel className="mb-3">{label}</SectionLabel>
      <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-4">
        {title}
      </h1>
      <p className="text-[14px] text-[#14110e]/65 max-w-lg">{body}</p>
    </div>
  );
}
