"use client";

// MIDLERTIDIG GLOBAL DEBUG-BOUNDARY (lagt inn 2026-05-11 for å fange
// /app/cv-krasjet). Denne erstatter HELE root-layouten ved feil — inkludert
// <html> og <body> — så den må selv rendre disse. Fjern når feilen er
// identifisert.

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error("[global-error boundary]", error);
  }, [error]);

  const details = [
    `URL: ${typeof window !== "undefined" ? window.location.href : "(ssr)"}`,
    `UA: ${typeof navigator !== "undefined" ? navigator.userAgent : "(ssr)"}`,
    `Time: ${new Date().toISOString()}`,
    `Name: ${error.name}`,
    `Message: ${error.message}`,
    error.digest ? `Digest: ${error.digest}` : null,
    "",
    "Stack:",
    error.stack ?? "(no stack)",
  ]
    .filter((l) => l !== null)
    .join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = details;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <html lang="no">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          padding: "20px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#faf8f5",
          color: "#14110e",
        }}
      >
        <h1 style={{ fontSize: "20px", margin: "0 0 8px", fontWeight: 600 }}>
          Noe krasjet (global)
        </h1>
        <p style={{ fontSize: "13px", margin: "0 0 16px", color: "#14110e99" }}>
          Midlertidig debug-side. Trykk &quot;Kopier feil&quot; og lim inn til
          Marcus.
        </p>

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={copy}
            style={{
              padding: "10px 16px",
              borderRadius: "999px",
              background: "#D5592E",
              color: "#faf8f5",
              border: "none",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Kopiert" : "Kopier feil"}
          </button>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 16px",
              borderRadius: "999px",
              background: "transparent",
              color: "#14110e",
              border: "1px solid #14110e26",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Prøv igjen
          </button>
          <a
            href="/"
            style={{
              padding: "10px 16px",
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

        <pre
          style={{
            background: "#fff",
            border: "1px solid #14110e1a",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "12px",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowX: "auto",
            margin: 0,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          }}
        >
          {details}
        </pre>
      </body>
    </html>
  );
}
