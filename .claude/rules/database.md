---
paths:
  - "prisma/**"
  - "supabase/migrations/**"
---

# Database Migrations

Project uses Prisma 6 against Supabase Postgres (Stockholm) via pgBouncer. `DATABASE_URL` must include `pgbouncer=true&connection_limit=1` for serverless.

- **Never modify an existing migration.** Always create a new migration for changes. Existing migrations may have already run in production.
- Every migration must be reversible. Implement both up/forward and down/rollback.
- Test migrations in both directions before committing.
- Migration filenames are ordered by timestamp prefix. New migrations go at the end.
- Never use raw SQL when Prisma provides a method for the operation.
- Never seed production data in migration files. Use dedicated seed files.
- Never drop columns or tables without first confirming the data is no longer needed.
- Add indexes in their own migration, not bundled with schema changes. Easier to roll back independently.
- Prisma client is a singleton (see `src/lib/prisma.ts`). Never instantiate `new PrismaClient()` ad-hoc.
- Always `select` only the fields used. Never `findMany` without `select` — returns heavy JSON blobs.
- Combine related fetches via nested `include`/`select` instead of two `findUnique` round-trips.
