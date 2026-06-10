#!/bin/sh
set -e

# Kjør databasemigrasjoner mot prod-DB før appen starter. Bruker DIRECT_URL
# (ikke-pooled) som definert i prisma/schema.prisma.
echo "[entrypoint] prisma migrate deploy"
prisma migrate deploy

echo "[entrypoint] starter Next.js (standalone)"
exec node server.js
