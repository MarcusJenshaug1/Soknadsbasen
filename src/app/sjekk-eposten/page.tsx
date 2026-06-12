import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo/metadata";
import { SjekkEposten } from "./SjekkEposten";

export const metadata = buildMetadata({
  path: "/sjekk-eposten",
  title: "Sjekk e-posten din",
  noindex: true,
});

export default function SjekkEpostenPage() {
  return (
    <Suspense fallback={null}>
      <SjekkEposten />
    </Suspense>
  );
}
