import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-8 bg-bg text-ink">
      <div className="max-w-md text-center space-y-4">
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="text-2xl font-semibold">Fant ikke siden</h1>
        <p className="text-ink/70">
          Siden du leter etter finnes ikke, eller har blitt flyttet. Sjekk
          adressen, eller gå tilbake til forsiden.
        </p>
        <div className="pt-2">
          <LinkButton href="/">Til forsiden</LinkButton>
        </div>
      </div>
    </main>
  );
}
