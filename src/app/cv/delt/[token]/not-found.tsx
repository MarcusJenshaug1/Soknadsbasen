import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-bg text-ink">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Lenken er ikke aktiv</h1>
        <p className="text-ink/70">
          Denne CV-lenken er enten utløpt, tilbakekalt, eller har aldri eksistert.
          Be avsenderen lage en ny lenke.
        </p>
        <Link
          href="/"
          prefetch={true}
          className="inline-block mt-4 text-accent hover:underline"
        >
          Til Søknadsbasen
        </Link>
      </div>
    </main>
  );
}
