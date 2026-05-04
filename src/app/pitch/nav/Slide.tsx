import type { PitchSlide } from "./slides";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-ink/55">
      <span className="w-1 h-1 rounded-full bg-accent" />
      {children}
      <span className="w-1 h-1 rounded-full bg-accent" />
    </span>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[clamp(36px,6.5vw,104px)] leading-[0.95] tracking-[-0.045em] font-medium text-balance">
      {children}
    </h1>
  );
}

function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[clamp(18px,1.9vw,26px)] leading-[1.45] text-ink/70 max-w-[780px] text-balance">
      {children}
    </p>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[clamp(15px,1.2vw,18px)] leading-[1.65] text-ink/65 max-w-[760px]">
      {children}
    </p>
  );
}

export function Slide({ slide }: { slide: PitchSlide }) {
  switch (slide.layout) {
    case "cover":
      return (
        <div className="w-full max-w-[1100px] flex flex-col gap-10 md:gap-12">
          {slide.eyebrow && <Eyebrow>{slide.eyebrow}</Eyebrow>}
          <Title>{slide.title}</Title>
          {slide.lede && <Lede>{slide.lede}</Lede>}
          {slide.footer && (
            <div className="text-[11px] tracking-[0.18em] uppercase text-ink/50 font-mono">
              {slide.footer}
            </div>
          )}
        </div>
      );

    case "stat-row":
      return (
        <div className="w-full max-w-[1100px] flex flex-col gap-10 md:gap-12">
          {slide.eyebrow && <Eyebrow>{slide.eyebrow}</Eyebrow>}
          <Title>{slide.title}</Title>
          {slide.lede && <Lede>{slide.lede}</Lede>}
          {slide.body && <Body>{slide.body}</Body>}
        </div>
      );

    case "numbered":
      return (
        <div className="w-full max-w-[1100px] flex flex-col gap-10 md:gap-14">
          {slide.eyebrow && <Eyebrow>{slide.eyebrow}</Eyebrow>}
          <Title>{slide.title}</Title>
          {slide.items && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
              {slide.items.map((item, i) => (
                <li key={i} className="flex items-start gap-5">
                  <span className="text-[clamp(28px,3vw,44px)] font-medium tracking-[-0.03em] text-accent leading-none shrink-0">
                    {item.label ?? String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[clamp(15px,1.25vw,19px)] leading-[1.5] text-ink/85 pt-1">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );

    case "bullets":
      return (
        <div className="w-full max-w-[1100px] flex flex-col gap-9 md:gap-12">
          {slide.eyebrow && <Eyebrow>{slide.eyebrow}</Eyebrow>}
          <Title>{slide.title}</Title>
          {slide.lede && <Lede>{slide.lede}</Lede>}
          {slide.items && (
            <ul className="flex flex-col gap-4 max-w-[820px]">
              {slide.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-[clamp(15px,1.25vw,20px)] leading-[1.55] text-ink/85"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2.5 shrink-0" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          )}
          {slide.body && <Body>{slide.body}</Body>}
        </div>
      );

    case "closing":
      return (
        <div className="w-full max-w-[1100px] flex flex-col gap-12 md:gap-16">
          <Title>{slide.title}</Title>
          {slide.items && (
            <div className="flex flex-col gap-3">
              {slide.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {item.label && (
                    <span className="text-[11px] tracking-[0.18em] uppercase text-ink/50">
                      {item.label}
                    </span>
                  )}
                  <span className="text-[clamp(18px,1.6vw,26px)] font-mono text-ink/90">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
  }
}
