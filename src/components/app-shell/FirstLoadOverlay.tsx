"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { AppLoader } from "./AppLoader";

let dismissedOnce = false;

export function FirstLoadOverlay() {
  const authLoading = useAuthStore((s) => s.loading);
  const [show, setShow] = useState(!dismissedOnce);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!show || authLoading) return;

    let cancelled = false;
    const onReady = () => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        setFading(true);
        setTimeout(() => {
          if (cancelled) return;
          dismissedOnce = true;
          setShow(false);
        }, 300);
      });
    };

    if (document.readyState === "complete") {
      onReady();
    } else {
      window.addEventListener("load", onReady, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", onReady);
    };
  }, [show, authLoading]);

  if (!show) return null;
  return (
    <AppLoader
      className={fading ? "opacity-0 transition-opacity duration-300 pointer-events-none" : ""}
    />
  );
}
