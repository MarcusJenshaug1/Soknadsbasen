import { buildMetadata } from "@/lib/seo/metadata";
import { PitchDeck } from "./PitchDeck";
import { NAV_SLIDES } from "./slides";

export const metadata = buildMetadata({
  path: "/pitch/nav",
  title: "Pitch — NAV",
  description: "Søknadsbasen pilot-forslag til NAV.",
  noindex: true,
});

export default function PitchNavPage() {
  return <PitchDeck slides={NAV_SLIDES} />;
}
