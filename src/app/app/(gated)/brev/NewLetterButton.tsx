"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconClose, IconPlus } from "@/components/ui/Icons";
import { Modal } from "@/components/ui/Modal";
import { Pill, SectionLabel } from "@/components/ui/Pill";

export type LetterPickerApp = {
  id: string;
  title: string;
  companyName: string;
  hasLetter: boolean;
};

export function NewLetterButton({ apps }: { apps: LetterPickerApp[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const withoutLetters = apps.filter((a) => !a.hasLetter);
  const withLetters = apps.filter((a) => a.hasLetter);

  function pick(id: string) {
    setOpen(false);
    router.push(`/app/brev/${id}`);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover"
      >
        <IconPlus size={16} />
        Nytt søknadsbrev
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Nytt søknadsbrev"
        panelClassName="bg-bg rounded-3xl w-full max-w-[560px] max-h-[88vh] overflow-hidden flex flex-col border border-black/8 dark:border-white/8"
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/8 dark:border-white/8">
          <div>
            <SectionLabel>Søknadsbrev</SectionLabel>
            <h2 className="text-[20px] font-medium tracking-tight mt-1">
              Velg en stilling
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="size-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center text-ink/60"
            aria-label="Lukk"
          >
            <IconClose size={18} />
          </button>
        </header>

        {apps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-[13px] text-ink/65 leading-relaxed max-w-xs mx-auto mb-6">
              Du har ingen søknader ennå. Et brev kobles alltid til en stilling,
              så opprett en søknad i pipeline først.
            </p>
            <Link
              href="/app/pipeline"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover"
            >
              Åpne pipeline
              <IconArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <p className="text-[13px] text-ink/65 leading-relaxed mb-5">
              Ett brev per søknad. Velg stillingen brevet skal høre til.
            </p>

            {withoutLetters.length > 0 && (
              <section className="mb-6">
                <SectionLabel className="mb-2.5">Mangler brev</SectionLabel>
                <ul className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                  {withoutLetters.map((app) => (
                    <PickerRow key={app.id} app={app} onPick={pick} />
                  ))}
                </ul>
              </section>
            )}

            {withLetters.length > 0 && (
              <section>
                <SectionLabel className="mb-2.5">Har allerede brev</SectionLabel>
                <ul className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                  {withLetters.map((app) => (
                    <PickerRow key={app.id} app={app} onPick={pick} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function PickerRow({
  app,
  onPick,
}: {
  app: LetterPickerApp;
  onPick: (id: string) => void;
}) {
  return (
    <li>
      <button
        onClick={() => onPick(app.id)}
        className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-panel/40 transition-colors"
      >
        <div className="min-w-0">
          <div className="text-[14px] font-medium leading-tight truncate">
            {app.title}
          </div>
          <div className="text-[12px] text-ink/55 mt-1 truncate">
            {app.companyName}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <Pill variant={app.hasLetter ? "muted" : "accent"}>
            {app.hasLetter ? "Har brev" : "Nytt"}
          </Pill>
          <IconArrowRight size={15} className="text-ink/40" />
        </div>
      </button>
    </li>
  );
}
