"use client";

// Global error boundary: erstatter HELE root-layouten ved feil og må rendre
// <html>/<body> selv. Den KAN importere globals.css, men holdes bevisst
// selvstendig med inline-styles: er krasjet i CSS/chunk-lasting skal
// fallbacken fortsatt rendre. Branded twin: src/components/ErrorFallback.tsx.

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error boundary]", error);
  }, [error]);

  return (
    <html lang="no">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#faf8f5",
          color: "#14110e",
        }}
      >
        <main style={{ maxWidth: "28rem", textAlign: "center" }}>
          <AlertTriangle
            aria-hidden="true"
            width={40}
            height={40}
            color="#D5592E"
            style={{ display: "block", margin: "0 auto 16px" }}
          />
          <h1 style={{ fontSize: "22px", margin: "0 0 8px", fontWeight: 600 }}>
            Noe gikk galt
          </h1>
          <p style={{ fontSize: "14px", margin: "0 0 20px", color: "#14110eb3" }}>
            Vi klarte ikke å laste siden. Prøv på nytt, eller gå tilbake til
            forsiden. Vedvarer feilen, ta kontakt med oss.
          </p>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                padding: "10px 20px",
                borderRadius: "999px",
                background: "#D5592E",
                color: "#faf8f5",
                border: "none",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Prøv igjen
            </button>
            {/* Hard navigasjon (full reload) er bevisst: global-error har erstattet
                root-layouten, så router-konteksten kan være korrupt. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "10px 20px",
                borderRadius: "999px",
                background: "transparent",
                color: "#14110e",
                border: "1px solid #14110e26",
                fontSize: "14px",
                textDecoration: "none",
              }}
            >
              Til forsiden
            </a>
          </div>
          {error.digest ? (
            <p style={{ fontSize: "12px", margin: "16px 0 0", color: "#14110e73" }}>
              Referanse: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
