// Speiler suksess-sidens faste mørke, sentrerte layout så det ikke blir tom
// skjerm mens Stripe + Prisma hentes per request (siden er force-dynamic).
export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#14110e] text-[#faf8f5]">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-[560px] w-full text-center space-y-6">
          <div className="h-3 w-32 mx-auto rounded-full bg-white/10 animate-pulse" />
          <div className="h-10 w-72 mx-auto rounded-lg bg-white/10 animate-pulse" />
          <div className="h-4 w-80 mx-auto rounded bg-white/10 animate-pulse" />
          <div className="h-40 w-full rounded-3xl bg-white/[0.06] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
