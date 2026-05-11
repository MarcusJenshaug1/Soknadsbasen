type Props = {
  score: number;
  color: string;
  size?: number;
  stroke?: number;
  showOutOf?: boolean;
};

export function AtsScoreRing({
  score,
  color,
  size = 64,
  stroke = 6,
  showOutOf = false,
}: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const fontSize = size >= 80 ? 26 : 20;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`ATS-score ${score} av 100`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-black/10 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="leading-none font-medium tracking-[-0.04em]"
          style={{ color, fontSize }}
        >
          {clamped}
        </span>
        {showOutOf && (
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#14110e]/45 dark:text-[#f0ece6]/45 mt-0.5">
            / 100
          </span>
        )}
      </div>
    </div>
  );
}
