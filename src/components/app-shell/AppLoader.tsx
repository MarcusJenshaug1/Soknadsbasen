import { cn } from "@/lib/cn";

export function AppLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-[#D5592E] px-6",
        className,
      )}
      role="status"
      aria-label="Laster Søknadsbasen"
    >
      <div className="flex flex-col items-center gap-6 sm:gap-8">
        <svg
          width="80"
          height="80"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="geometricPrecision"
          aria-hidden="true"
          className="app-loader-logo h-16 w-16 sm:h-20 sm:w-20"
        >
          <path
            d="M10 3 C25 3 29 7 29 16 C29 25 25 29 16 29 L10 29 L3 22 L3 10 C3 6 5 3 10 3 Z"
            fill="#faf8f5"
          />
          <path d="M3 22 L10 29 L3 29 Z" fill="#eee9df" />
        </svg>

        <div className="text-2xl sm:text-3xl font-medium tracking-tight text-[#faf8f5]">
          Søknadsbasen
        </div>

        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="app-loader-dot h-1.5 w-1.5 rounded-full bg-[#faf8f5]" style={{ animationDelay: "0s" }} />
          <span className="app-loader-dot h-1.5 w-1.5 rounded-full bg-[#faf8f5]" style={{ animationDelay: "0.16s" }} />
          <span className="app-loader-dot h-1.5 w-1.5 rounded-full bg-[#faf8f5]" style={{ animationDelay: "0.32s" }} />
        </div>
      </div>
    </div>
  );
}
