# Vowbird API

Fastify REST API with Prisma + MySQL.

## Run locally

From the monorepo root:

```bash
cp .env.example .env
docker compose up -d mysql
pnpm install
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev:api
```

Or from this directory:

```bash
pnpm dev
```

API base URL: http://localhost:4000  
Health check: http://localhost:4000/health

## Environment

Uses root `.env`:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | mysql://vowbird:... | Prisma connection |
| `JWT_SECRET` | (required) | Auth token signing |
| `API_PORT` | 4000 | Listen port |
| `CORS_ORIGIN` | http://localhost:3000 | Allowed web origins |
| `UPLOAD_DIR` | ./uploads | Local file storage |

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start with hot reload (`tsx watch`) |
| `pnpm build` | Compile to `dist/` |
| `pnpm start` | Run compiled server |
| `pnpm test` | Run Vitest suite |
| `pnpm lint` | Typecheck |

## Production

```bash
pnpm build
node dist/index.js
```

See `../../docs/DEPLOYMENT.md` for Ubuntu + PM2 setup.

## Testing

```bash
pnpm test
pnpm test:watch
```

Tests use Fastify inject and mocked Prisma — no database required.
