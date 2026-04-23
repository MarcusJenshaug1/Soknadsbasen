export function Prose({ html }: { html: string }) {
  if (!html) return null;
  return (
    <div
      className="
        text-[16px] leading-[1.75] text-[#14110e]/85
        [&_h2]:text-[26px] [&_h2]:md:text-[30px] [&_h2]:leading-[1.2]
        [&_h2]:tracking-[-0.02em] [&_h2]:font-medium [&_h2]:text-[#14110e]
        [&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:scroll-mt-24
        [&_h3]:text-[20px] [&_h3]:md:text-[22px] [&_h3]:leading-[1.3]
        [&_h3]:tracking-[-0.015em] [&_h3]:font-medium [&_h3]:text-[#14110e]
        [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:scroll-mt-24
        [&_p]:mb-5
        [&_ul]:mb-6 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2
        [&_ol]:mb-6 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2
        [&_li]:marker:text-[#c15a3a]/60
        [&_a]:text-[#c15a3a] [&_a]:underline-offset-2 hover:[&_a]:underline
        [&_strong]:text-[#14110e] [&_strong]:font-medium
        [&_em]:italic
        [&_blockquote]:border-l-2 [&_blockquote]:border-[#c15a3a]/40
        [&_blockquote]:pl-5 [&_blockquote]:my-6 [&_blockquote]:text-[#14110e]/70
        [&_blockquote]:italic
        [&_code]:text-[13px] [&_code]:bg-black/[0.04] [&_code]:px-1.5
        [&_code]:py-0.5 [&_code]:rounded
        [&_table]:w-full [&_table]:my-7 [&_table]:border-collapse
        [&_table]:text-[14px]
        [&_th]:text-left [&_th]:py-2.5 [&_th]:pr-4 [&_th]:border-b
        [&_th]:border-black/15 [&_th]:font-medium
        [&_td]:py-2.5 [&_td]:pr-4 [&_td]:border-b [&_td]:border-black/8
        [&_td]:align-top
        [&_hr]:my-10 [&_hr]:border-black/10
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
