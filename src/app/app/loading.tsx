export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#D5592E]">
      <div className="flex flex-col items-center gap-10">
        <svg
          width="96"
          height="96"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
          shapeRendering="geometricPrecision"
          aria-hidden="true"
        >
          <path
            d="M10 3 C25 3 29 7 29 16 C29 25 25 29 16 29 L10 29 L3 22 L3 10 C3 6 5 3 10 3 Z"
            fill="#faf8f5"
          />
          <path d="M3 22 L10 29 L3 29 Z" fill="#eee9df" />
        </svg>
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white"
          role="status"
          aria-label="Laster"
        />
      </div>
    </div>
  );
}
