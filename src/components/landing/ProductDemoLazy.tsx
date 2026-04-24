"use client";

import dynamic from "next/dynamic";

const ProductDemo = dynamic(() => import("./ProductDemo"), {
  ssr: false,
  loading: () => <ProductDemoSkeleton />,
});

function ProductDemoSkeleton() {
  return (
    <section
      aria-label="Produktdemo"
      className="max-w-[1200px] mx-auto px-5 md:px-10 pb-20 md:pb-32"
    >
      <div className="bg-panel rounded-[24px] md:rounded-[32px] p-5 md:p-10">
        <div className="flex items-center justify-between mb-6 md:mb-8">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/45 dark:text-[#f0ece6]/45">
            CV
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#14110e]/45 hidden md:block">
            Live demo
          </span>
        </div>
        <div className="min-h-[420px] md:min-h-[480px] bg-surface rounded-2xl border border-black/5 dark:border-white/5 p-5 md:p-8">
          <div className="h-3 w-24 rounded-full bg-[#14110e]/10 dark:bg-[#f0ece6]/10 mb-5" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl border border-black/10 dark:border-white/10 bg-bg"
              />
            ))}
          </div>
        </div>
        <div className="mt-6 md:mt-8 min-h-[44px]" />
      </div>
    </section>
  );
}

export default ProductDemo;
