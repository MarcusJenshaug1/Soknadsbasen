"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { Slide } from "./Slide";
import type { PitchSlide } from "./slides";

const SWIPE_THRESHOLD = 50;
const CONTROLS_FADE_MS = 2200;

type Props = { slides: PitchSlide[] };

export function PitchDeck({ slides }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const total = slides.length;
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  const goTo = useCallback(
    (index: number) => {
      setCurrent((prev) => {
        const next = Math.max(0, Math.min(total - 1, index));
        setDirection(next >= prev ? 1 : -1);
        return next;
      });
    },
    [total],
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
        case "l":
          e.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
        case "h":
          e.preventDefault();
          prev();
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(total - 1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev, goTo, total, toggleFullscreen]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    if (isFullscreen) {
      fadeTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_FADE_MS);
    }
  }, [isFullscreen]);

  useEffect(() => {
    showControls();
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, [showControls, current, isFullscreen]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    if (clientX - left > width / 2) next();
    else prev();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  const slide = slides[current];
  const progress = ((current + 1) / total) * 100;
  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.08 } }
    : {
        initial: { opacity: 0, x: direction * 32 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: direction * -32 },
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-bg text-ink overflow-hidden select-none"
      onMouseMove={showControls}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isFullscreen && (
        <Link
          href="/"
          prefetch
          aria-label="Avslutt presentasjon"
          className={`absolute top-5 right-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-surface/70 backdrop-blur px-3 py-1.5 text-[12px] text-ink/70 hover:text-ink hover:border-black/25 dark:hover:border-white/25 transition-colors ${
            controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <X className="w-3.5 h-3.5" />
          Avslutt
        </Link>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={slide.id}
          {...motionProps}
          className="absolute inset-0 flex items-center justify-center px-6 sm:px-12 md:px-20 lg:px-24"
        >
          <Slide slide={slide} />
        </motion.div>
      </AnimatePresence>

      <div
        className={`absolute inset-x-0 bottom-0 z-10 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[2px] w-full bg-black/5 dark:bg-white/5">
          <div
            className="h-full bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-4 px-5 sm:px-8 py-4">
          <div className="text-[11px] tracking-[0.2em] uppercase text-ink/50 font-mono">
            {String(current + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              disabled={current === 0}
              aria-label="Forrige slide"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-black/15 dark:border-white/15 text-ink hover:border-black/30 dark:hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={current === total - 1}
              aria-label="Neste slide"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-black/15 dark:border-white/15 text-ink hover:border-black/30 dark:hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Avslutt fullskjerm" : "Start fullskjerm"}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-black/15 dark:border-white/15 text-ink hover:border-black/30 dark:hover:border-white/30 transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
