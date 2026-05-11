# Hocuspocus collab-server for Søknadsbasen

Realtime Yjs CRDT-server for live CV-redigering. Erstatter den nåværende
Supabase Realtime Broadcast-baserte syncen med sub-100ms WebSocket-basert
delta-sync.

## Arkitektur

```
Browser A ──┐
            │  y-websocket (Yjs deltaer, ~50-300 B per keystroke)
Browser B ──┼─► wss://collab.soknadsbasen.no
            │
            ▼
  Hocuspocus (Hetzner CX22 Falkenstein)
  - onAuthenticate(Supabase JWT)
  - In-memory Y.Doc per active CV
  - Debounce 2s → onStoreDocument
            │
            ▼
  Supabase Postgres (Stockholm)
  - cv_yjs_state.ydoc BYTEA  (sannhets-source for collab)
  - UserData.resumeData TEXT (JSON-projeksjon, samme rad som før)
```

Y.Doc binary er sannheten. JSON-snapshoten skrives debounced i samme
Prisma-transaksjon så ikke-collab-konsumenter (PDF, AI, share-token) ser
konsistent state.

## Lokal kjøring

```bash
cd hocuspocus-server
npm install
cp env.example .env  # fyll inn SUPABASE_URL + DATABASE_URL + DIRECT_URL
npm run dev          # tsx watch — restarter på endring
```

Server lytter på `ws://localhost:1234`. Klient-koden bruker
`NEXT_PUBLIC_HOCUSPOCUS_URL` for å koble til.

## Production-deploy (Hetzner CX22)

### Server-oppsett

Bestill CX22 i `fsn1` (Falkenstein) eller `hel1` (Helsinki) — begge er
EU-sovereign. €4.49/mnd, 20 TB trafikk, 2 vCPU, 4 GB RAM.

```bash
# Som root:
apt update && apt upgrade -y
apt install -y curl ca-certificates gnupg caddy git

# Node 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Bruker for tjenesten (ikke root)
adduser --system --group hocuspocus
mkdir -p /opt/hocuspocus
chown hocuspocus:hocuspocus /opt/hocuspocus
```

### Klone og bygg

```bash
sudo -u hocuspocus -i
cd /opt/hocuspocus
git clone https://github.com/MarcusJenshaug1/Soknadsbasen.git app
cd app/hocuspocus-server
npm ci
npm run build
cat > .env <<'EOF'
PORT=1234
SUPABASE_URL=https://ovefrsgtoxmfziqwdcdj.supabase.co
DATABASE_URL=...   # pgbouncer-pooled
DIRECT_URL=...     # direct connection
EOF
```

### Systemd-service

```bash
# Som root:
cat > /etc/systemd/system/hocuspocus.service <<'EOF'
[Unit]
Description=Søknadsbasen Hocuspocus collab server
After=network.target

[Service]
Type=simple
User=hocuspocus
Group=hocuspocus
WorkingDirectory=/opt/hocuspocus/app/hocuspocus-server
ExecStart=/usr/bin/node dist/server.js
EnvironmentFile=/opt/hocuspocus/app/hocuspocus-server/.env
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now hocuspocus
systemctl status hocuspocus
```

### Caddy reverse-proxy + TLS

```bash
cat > /etc/caddy/Caddyfile <<'EOF'
collab.soknadsbasen.no {
  reverse_proxy localhost:1234

  log {
    output file /var/log/caddy/access.log
    format json
  }
}
EOF

systemctl reload caddy
```

DNS: A-record `collab.soknadsbasen.no` → Hetzner-IP. Caddy henter
Let's Encrypt-sertifikat automatisk.

### Vercel env-variabel

I Vercel-prosjektet for hovedappen, legg til:

```
NEXT_PUBLIC_HOCUSPOCUS_URL=wss://collab.soknadsbasen.no
```

Klienten i `useYjsSync.ts` kobler til denne URLen.

## Overvåkning

- `systemctl status hocuspocus` for tjeneste-status
- `journalctl -u hocuspocus -f` for live-logger
- Caddys access-log under `/var/log/caddy/access.log`
- Hetzner Cloud Console for CPU/RAM/network-metrics

For Sentry-integrasjon (anbefalt): legg til `@sentry/node` i package.json
og init i `src/server.ts`.

## Backup

Y.Doc binary lever i Postgres-tabellen `cv_yjs_state`. Backup-strategien
til Supabase Pro (daglig automatisk backup, 7-dagers retention) dekker
det. Ingen separat backup nødvendig på Hetzner-siden — serveren er
stateless utenom `.env`.

## Migrering fra Supabase Realtime Broadcast

Den nye `useYjsSync`-hooken er drop-in-erstatning for `useCloudSync`.
For å rulle ut gradvis:

1. Deploy Hocuspocus-server til Hetzner
2. Sett `NEXT_PUBLIC_HOCUSPOCUS_URL` i Vercel
3. Bytt `useCloudSync` til `useYjsSync` i `src/app/app/(gated)/cv/page.tsx`
   eller `CvModule`, evt. via feature-flag
4. Klienter som ikke har URL satt faller tilbake til gammel sync

Førstegangs-load for hver bruker seeder Y.Doc fra eksisterende
`UserData.resumeData` via `onLoadDocument`. Ingen manuell migrering trengs.

## Kostnad

- Hetzner CX22 €4.49/mnd
- Domene (collab subdomain på eksisterende søknadsbasen.no) — null ekstra
- Trafikk: typisk 100-500 MB/mnd ved 2-3 concurrent users, godt under
  20 TB-inkludert
