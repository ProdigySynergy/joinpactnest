# Vowbird

**Keep your promise with someone beside you.**

Vowbird is a cross-platform accountability and anonymous pen-pal app. Match with accountability partners or join small goal-based pacts, check in, send letters, and build streaks.

## Monorepo structure

```
vowbird/
├── apps/
│   ├── api/          # Fastify + Prisma REST API
│   ├── web/          # Next.js web app
│   └── mobile/       # Expo React Native app
├── packages/
│   └── shared/       # Zod schemas, types, constants
├── prisma/           # Schema, migrations, seed
├── docs/             # Deployment & Nginx config
├── scripts/          # Setup helpers
└── uploads/          # Local file storage
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Web | Next.js 14, Tailwind, TanStack Query |
| Mobile | Expo 52, Expo Router, SecureStore |
| API | Fastify, JWT, bcrypt, Zod |
| Database | MySQL 8, Prisma ORM |
| Deploy | Ubuntu, Nginx, PM2 |

## Prerequisites

- Node.js 20+
- pnpm 9+ (or use `npx pnpm@9.12.0` on Windows)
- Docker Desktop (for local MySQL) or MySQL 8 installed locally

## Quick start

### macOS / Linux

```bash
cd joinpactnest/vowbird
cp .env.example .env
docker compose up -d mysql
pnpm install
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

### Windows (PowerShell)

**Option A — Local MySQL (no Docker)** — use this if you already have MySQL installed:

```powershell
cd joinpactnest\vowbird
Copy-Item .env.example .env

# 1. Open MySQL Workbench (or HeidiSQL, etc.)
# 2. Run scripts/setup-mysql-local.sql as root
# 3. Then continue:

npx pnpm@9.12.0 install
npx pnpm@9.12.0 db:migrate:deploy
npx pnpm@9.12.0 db:seed
npx pnpm@9.12.0 dev
```

**Option B — Docker MySQL** — requires Docker Desktop to be running:

```powershell
cd joinpactnest\vowbird
Copy-Item .env.example .env
docker compose up -d mysql
npx pnpm@9.12.0 install
npx pnpm@9.12.0 db:migrate:deploy
npx pnpm@9.12.0 db:seed
npx pnpm@9.12.0 dev
```

```
> vowbird@0.1.0 db:seed C:\Users\sageads\Documents\Dev\Repos\ambitious\joinpactnest\vowbird
> tsx prisma/seed.ts

Seeding Vowbird database...
Seed complete!
Admin: admin@vowbird.app / Admin123!@
Test users: alex@example.com / Password123!
```

#### Docker error: `docker_engine ... cannot find the file specified`

Docker Desktop is not running. Either:

1. **Start Docker Desktop** from the Start menu, wait until it says "Running", then retry `docker compose up -d mysql`, or
2. **Skip Docker** and use local MySQL (Option A above). Your machine already has a `mysql` Windows service — you don't need Docker for development.

### URLs

- Web: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/health

### Run individual apps

| App | Command | README |
|-----|---------|--------|
| API only | `pnpm dev:api` | [apps/api/README.md](apps/api/README.md) |
| Web only | `pnpm dev:web` | [apps/web/README.md](apps/web/README.md) |
| Mobile | `pnpm dev:mobile` | [apps/mobile/README.md](apps/mobile/README.md) |
| Shared lib | `pnpm --filter @vowbird/shared build` | [packages/shared/README.md](packages/shared/README.md) |

### Mobile

```bash
pnpm dev:mobile
```

Set `EXPO_PUBLIC_API_URL` to your machine IP (not localhost) when testing on a physical device.

For EAS builds, see `docs/DEPLOYMENT.md`.

## Seed accounts

| Email | Password | Role |
|-------|----------|------|
| admin@vowbird.app | Admin123!@# | Admin |
| alex@example.com | Password123! | User |
| veiled1@example.com | Password123! | Veiled user |

## Commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace packages |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:migrate:deploy` | Deploy migrations (production) |
| `pnpm db:seed` | Seed sample data |
| `pnpm dev` | Run API + web in parallel |
| `pnpm dev:web` | Next.js only |
| `pnpm dev:api` | Fastify API only |
| `pnpm dev:mobile` | Expo dev server |
| `pnpm build` | Production build (shared + api + web) |
| `pnpm test` | Run all test suites |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage reports |
| `pnpm lint` | Typecheck all packages |

## Testing

Vitest is configured for shared, API, web, and mobile packages. Tests run **without MySQL** (API uses mocked Prisma where needed).

```bash
pnpm test
```

See [docs/TESTING.md](docs/TESTING.md) for package-level commands and how to add tests.

## Features

- **Veiled Mode** — Anonymous accountability with generated aliases
- **Open Mode** — Visible profiles, avatars, public pacts
- **Profiles** — `/u/[username]` with progress, pact/match counts; optional gender (male/female/fluid) + tagline
- **Creators** — Pact owners and match partners shown on pages with profile / letter / report / block actions
- **Pactered** — Network of people from shared pacts + manual pacter requests; mute hides from list only
- **E2E Messages** — Private DMs encrypted in the browser (ECDH P-256 + AES-GCM); server stores ciphertext only
- **Vows** — Personal commitments with daily/weekly check-ins
- **Partner matching** — Auto-queue + discover/direct invites; **one active partner per vow** (free plan also caps 1 match account-wide)
- **Letters** — Partner letters, future-self, group reflections
- **Pacts** — Public, invite-only, and private circles
- **Public pact pages** — Shareable `/p/[slug]` profiles (SEO + social), explore hub at `/explore`
- **Mood check** — Freeform mood updates (4h cooldown · soft 8/day cap); partners send one-tap cheer chips
- **No judgement zone** — Soft misses vs call-outs. Toggle on **pacts** (create/settings); shown on public `/p/[slug]` + explore when on. For partner vows, toggle lives on the **match** page.
- **Leaderboards** — Partner streak board on match page; pact boards on pact pages (on by default)
- **Streaks & progress** — Streak counters and leaderboards
- **Safety** — Report, block, content filtering in Veiled Mode; self-actions (pacter, message, report, block, partner invite, join-to-connect) are blocked in UI and API
- **Admin dashboard** — User moderation, reports, stats

## API overview

Base URL: `http://localhost:4000`

Auth uses JWT Bearer tokens. All protected routes require `Authorization: Bearer <token>`.

See the product spec for the full endpoint list. Key routes:

- `POST /auth/register`, `POST /auth/login`
- `GET/PATCH /users/me`, `GET /users/:username/profile`
- `GET /pacters/me`, `GET/POST /pacters/requests`, `POST /pacters/mute`
- `PUT /e2e/keys`, `GET /e2e/keys/:userId`, `GET /messages/conversations`, `GET /messages/with/:userId`, `POST /messages`
- `GET/POST /vows`, `POST /check-ins`
- `POST /moods`, `GET /moods?vowId|pactId|partnerMatchId=`, `POST /encouragements`
- `POST /partner-requests` (optional `targetUserId` for directed invite), `GET /partner-requests/incoming`, `POST /partner-requests/:id/accept|decline|cancel`
- `GET /partners/discover?vowId=`, `GET /matches/me`, `GET /matches/:id`
- `POST/GET /letters`, `POST/GET /pacts`
- `GET /public/pacts`, `GET /public/pacts/:slug` (no auth — indexed share pages)
- `POST /reports`, `GET /reports/open?reportedUserId=`, `POST /reports/:id/comments` (max 2 follow-ups while OPEN)
- `POST /blocks`, `GET /blocks/me`
- `GET /admin/stats` (admin only)

### E2E messages (assumptions)

- Identity keys: ECDH **P-256**. Private key lives in the browser (`localStorage`); public key is registered via `PUT /e2e/keys`.
- Message content is encrypted client-side with **AES-GCM** derived per peer. API accepts only `ciphertext` + `iv`.
- Clearing site data without a key backup means prior messages cannot be decrypted on that device. Use **Download key backup** on `/messages`.
- Blocked users cannot exchange DMs. Recipient must have an E2E key registered before the first send.

### Mood & accountability (assumptions)

- Mood updates are freeform (any time), capped at **8 per user per UTC day**.
- Encouragement prefers one-tap stickers (`Keep going`, etc.); optional short note (≤140). Longer encouragement still uses Letters.
- `noJudgementZone=true` → gentle miss messages (no harsh call-outs). `false` → call-out notifications to partners/pact members on `MISSED` check-ins.
- `leaderboardEnabled` defaults `true`. For vows, the vow owner toggles judgement/leaderboard on the **partner match** page (not the vow page). For pacts, owners toggle on the pact page; public pages hide leaders when off.
- Each vow may have at most **one active partner match**. Directed invites use `PartnerRequest.status=PENDING` + `targetUserId`; auto-queue uses `WAITING` with no target.
- Vow create accepts labeled **start date** + optional **end date**.

### Public pacts (assumptions)

- Only `privacy=PUBLIC` + `status=ACTIVE` pacts are listed and crawlable.
- Public payloads omit invite codes, emails, and user IDs.
- **On track** = share of members with ≥70% weekly completion.
- Join still requires an account (`POST /pacts/:id/join`).
- Set `NEXT_PUBLIC_SITE_URL` for correct Open Graph / share URLs.

### Safety notes

- Duplicate OPEN reports for the same reporter → reported user return **409**; add a follow-up comment instead.
- Report UI shows the partner display name; user IDs stay in hidden form fields.
- API validation failures return a short user-facing `error` string (not raw Zod JSON). Clients also sanitize any nested error payloads.

## Production deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Ubuntu + Nginx + PM2 + MySQL setup.

Domains:
- Web: `vowbird.app`
- API: `api.vowbird.app`

## Mobile assets

Before your first EAS build, add app icons to `apps/mobile/assets/`:
- `icon.png` (1024×1024)
- `splash-icon.png`
- `adaptive-icon.png`

Or run `npx expo prebuild` to generate defaults.

## License

Private — JoinPactNest / Vowbird MVP
