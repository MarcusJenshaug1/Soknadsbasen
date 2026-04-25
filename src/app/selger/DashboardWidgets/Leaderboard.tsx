import { getLeaderboardThisMonth } from "@/lib/sales/metrics";
import { formatNok } from "@/lib/sales/format";
import { WidgetShell, EmptyState } from "./WidgetShell";

const RANK_BG = ["bg-[var(--sales-rank-1)]", "bg-[var(--sales-rank-2)]", "bg-[var(--sales-rank-3)]"];
const RANK_FG = ["text-[#5C3D02]", "text-white", "text-white"];

export async function Leaderboard({ currentUserId }: { currentUserId: string }) {
  const rows = (await getLeaderboardThisMonth()).slice(0, 5);

  if (rows.length === 0) {
    return (
      <WidgetShell title="Leaderboard" href="/selger/leaderboard" cta="Se alle">
        <EmptyState title="Ingen aktive selgere ennå" />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={`Leaderboard ${new Date().toLocaleDateString("nb-NO", { month: "long" })}`} href="/selger/leaderboard" cta="Se alle">
      <ol className="space-y-1">
        {rows.map((row, i) => {
          const isMe = row.userId === currentUserId;
          const quotaPct =
            row.quotaCents > 0 ? Math.round((row.mrrCents / row.quotaCents) * 100) : 0;
          return (
            <li
              key={row.userId}
              className={
                "flex items-center gap-3 px-2 py-1.5 rounded-lg " +
                (isMe ? "bg-black/[0.04] dark:bg-white/[0.05]" : "")
              }
            >
              <span
                className={
                  "w-[18px] h-[18px] rounded-full text-[10px] font-mono font-semibold flex items-center justify-center shrink-0 " +
                  (i < 3
                    ? `${RANK_BG[i]} ${RANK_FG[i]}`
                    : "bg-black/[0.06] dark:bg-white/[0.08] text-ink/55")
                }
              >
                {i + 1}
              </span>
              <span
                className={
                  "flex-1 min-w-0 truncate text-[12px] " +
                  (isMe ? "font-semibold" : "text-ink/75")
                }
              >
                {row.name ?? row.email.split("@")[0]}
                {isMe && <span className="text-ink/55 font-normal"> (deg)</span>}
              </span>
              <span className="text-[11px] text-ink/55 font-mono">{formatNok(row.mrrCents, { compact: true })}</span>
              {row.quotaCents > 0 && (
                <span className="text-[11px] font-mono text-ink/45 w-[36px] text-right">{quotaPct}%</span>
              )}
            </li>
          );
        })}
      </ol>
    </WidgetShell>
  );
}
