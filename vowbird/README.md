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
- pnpm 9+
- Docker (for local MySQL) or MySQL 8 installed locally

## Quick start

```bash
cd joinpactnest/vowbird

# Copy environment file
cp .env.example .env

# Start MySQL
docker compose up -d mysql

# Install dependencies
pnpm install

# Run migrations & seed
pnpm db:migrate
pnpm db:seed

# Start API + web
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Health: http://localhost:4000/health

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
| `pnpm lint` | Typecheck all packages |

## Features

- **Veiled Mode** — Anonymous accountability with generated aliases
- **Open Mode** — Visible profiles, avatars, public pacts
- **Vows** — Personal commitments with daily/weekly check-ins
- **Partner matching** — Goal-based matching (not swiping)
- **Letters** — Partner letters, future-self, group reflections
- **Pacts** — Public, invite-only, and private circles
- **Streaks & progress** — Streak counters and pact leaderboards
- **Safety** — Report, block, content filtering in Veiled Mode
- **Admin dashboard** — User moderation, reports, stats

## API overview

Base URL: `http://localhost:4000`

Auth uses JWT Bearer tokens. All protected routes require `Authorization: Bearer <token>`.

See the product spec for the full endpoint list. Key routes:

- `POST /auth/register`, `POST /auth/login`
- `GET/POST /vows`, `POST /check-ins`
- `POST /partner-requests`, `GET /matches/me`
- `POST/GET /letters`, `POST/GET /pacts`
- `POST /reports`, `POST /blocks`
- `GET /admin/stats` (admin only)

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
