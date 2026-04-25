export default function SelgerLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 rounded-md bg-black/5 dark:bg-white/5 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[88px] rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[220px] rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
