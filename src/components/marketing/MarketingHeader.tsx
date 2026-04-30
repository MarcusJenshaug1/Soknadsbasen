import { Logo } from "@/components/ui/Logo";
import { HeaderCTA } from "./LandingCTAs";
import { MarketingHeaderNav } from "./MarketingHeaderNav";

export function MarketingHeader() {
  return (
    <header className="md:sticky md:top-0 md:z-40 border-b border-black/[0.04] bg-[#faf8f5]/90 md:backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-5 md:pt-7 pb-4 flex items-center gap-6">
        <Logo href="/" />
        <MarketingHeaderNav />
        <div className="hidden md:flex items-center gap-2 ml-auto">
          <HeaderCTA />
        </div>
      </div>
    </header>
  );
}
