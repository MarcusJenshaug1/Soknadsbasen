---
paths:
  - "src/app/api/**"
  - "src/lib/auth.ts"
  - "src/lib/access.ts"
  - "src/lib/auth-request.ts"
  - "src/lib/linkedin/**"
  - "src/lib/stripe.ts"
  - "src/middleware.ts"
---

# Security

- Validate all user input at the system boundary. Never trust request parameters.
- Use Prisma's parameterised query API. Never concatenate user input into SQL or shell commands.
- Sanitize output to prevent XSS. Use framework-provided escaping.
- Authentication tokens must be short-lived. Store refresh tokens server-side only.
- Never log secrets, tokens, passwords, or PII.
- Use constant-time comparison for secrets and tokens.
- Set appropriate CORS, CSP, and security headers.
- Rate-limit authentication endpoints.
- Server-side gating uses `getSessionWithAccess()` from `src/lib/auth.ts`. Never reimplement auth logic per route.
