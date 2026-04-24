import Link from "next/link";
import { NyPromoForm } from "./NyPromoForm";

export default function NyPromoPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/promo" className="text-[13px] text-ink/50 hover:text-ink">← Rabattkoder</Link>
      </div>
      <h1 className="text-[22px] font-semibold mb-8">Ny rabattkode</h1>
      <NyPromoForm />
    </div>
  );
}
