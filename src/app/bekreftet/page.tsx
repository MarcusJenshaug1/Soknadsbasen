import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo/metadata";
import { Bekreftet } from "./Bekreftet";

export const metadata = buildMetadata({
  path: "/bekreftet",
  title: "E-post bekreftet",
  noindex: true,
});

export default function BekreftetPage() {
  return (
    <Suspense fallback={null}>
      <Bekreftet />
    </Suspense>
  );
}
