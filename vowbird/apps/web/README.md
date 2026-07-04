# Vowbird Web

Next.js 14 App Router frontend.

## Run locally

From the monorepo root (recommended — starts API + web together):

```bash
pnpm dev
```

Web only:

```bash
pnpm dev:web
```

Open http://localhost:3000

## Prerequisites

- API running at `http://localhost:4000` (see `apps/api/README.md`)
- Root `.env` with `NEXT_PUBLIC_API_URL=http://localhost:4000`

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve production build |
| `pnpm test` | Vitest + Testing Library |
| `pnpm lint` | ESLint + typecheck |

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/register`, `/login` | Auth |
| `/dashboard` | Home dashboard |
| `/vows`, `/vows/new`, `/vows/[id]` | Vow management |
| `/matches`, `/matches/[id]` | Partner matching |
| `/letters`, `/letters/new`, `/letters/[id]` | Letters |
| `/pacts`, `/pacts/new`, `/pacts/[id]` | Pacts & room feed |
| `/settings`, `/safety` | Profile & safety |
| `/pricing` | Pricing placeholder |
| `/admin` | Admin dashboard (admin users only) |

## Production build

```bash
pnpm build
pnpm start
```

Set `NEXT_PUBLIC_API_URL=https://api.vowbird.app` in production.

## Testing

```bash
pnpm test
```

See `../../docs/TESTING.md` for details.
