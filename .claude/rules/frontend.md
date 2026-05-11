---
paths:
  - "src/app/**"
  - "src/components/**"
  - "**/*.tsx"
  - "**/*.css"
---

# Frontend

Stack: Next.js 16 App Router, React 19, Tailwind 4, Lucide icons, Framer Motion, Zustand. Lexical for rich-text editing (dynamic-import only, never SSR).

## Design Tokens

Tokens live in `src/lib/design-tokens.ts` and `src/app/globals.css`. Never hardcode raw values in components, reference the token.

## Component Framework (project's actual choices)

| Category | Use |
|---|---|
| CSS | Tailwind 4 + `tailwind-merge` + `clsx` via `src/lib/cn.ts` |
| Icons | `lucide-react` — named imports only |
| Animation | Framer Motion (dynamic import for heavy panels) |
| State | Zustand. `persist` middleware only when state must survive reload |
| Forms/DnD | `@dnd-kit/*` for drag-and-drop |
| Editor | `@lexical/*` — always `next/dynamic` with `ssr: false` |

## Layout

- CSS Grid for 2D, Flexbox for 1D. Use `gap`, not margin hacks.
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`.
- Mobile-first. Touch targets: minimum 44x44px.

## Accessibility (non-negotiable)

- All interactive elements keyboard-accessible.
- Images: meaningful `alt` text. Decorative: `alt=""`.
- Form inputs: associated `<label>` or `aria-label`.
- Contrast: 4.5:1 normal text, 3:1 large text.
- Visible focus indicators. Never `outline: none` without replacement.
- Color never the sole indicator.
- `aria-live` for dynamic content. Respect `prefers-reduced-motion` and `prefers-color-scheme`.

## Performance (see AGENTS.md for full perf rules)

- `<Link prefetch={true}>` in sidebar/tab-bar nav. Default prefetch skips `force-dynamic` routes.
- Heavy editor components → `next/dynamic` with `Skeleton` fallback.
- `lucide-react` — named imports only, never default/wildcard.
- Images: `loading="lazy"` below fold, explicit `width`/`height`.
- Animations: `transform` and `opacity` only.
- Large lists: virtualize at 100+ items.
- Norsk tekst: aldri em-dash, bruk komma.
