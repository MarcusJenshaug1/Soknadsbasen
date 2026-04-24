import { cn } from "@/lib/cn";

export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
}

export function PasswordStrength({ score }: { score: 0 | 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex gap-1 mt-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            "h-0.5 flex-1 rounded-full transition-colors",
            i < score ? "bg-[#D5592E]" : "bg-black/10",
          )}
        />
      ))}
    </div>
  );
}
