import { QuickViewModal } from "@/components/jobb/QuickViewModal";
import { QuickViewContent } from "@/components/jobb/detail/QuickViewContent";
import { getJobBySlug } from "@/lib/jobs/get-job";

/**
 * Intercepted /jobb/[slug]: kortklikk i listen åpner detaljinnholdet i et
 * overlegg uten å forlate listen. Direktelenke/refresh/crawler treffer aldri
 * denne — de får full side fra [slug]/page.tsx. URL-en er ekte /jobb/[slug]
 * begge veier, så delte lenker fungerer uendret.
 */
export default async function InterceptedJobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getJobBySlug(slug);

  return (
    <QuickViewModal ariaLabel={job?.title ?? "Stilling"}>
      <QuickViewContent slug={slug} />
    </QuickViewModal>
  );
}
