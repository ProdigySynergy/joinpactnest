# JoinPactNest

This repository contains the **Vowbird** MVP.

## Quick start

All code lives in [`vowbird/`](./vowbird/).

```powershell
cd vowbird
Copy-Item .env.example .env
docker compose up -d mysql
npx pnpm@9.12.0 install
npx pnpm@9.12.0 db:migrate:deploy
npx pnpm@9.12.0 db:seed
npx pnpm@9.12.0 dev
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [vowbird/README.md](./vowbird/README.md) | Main setup & commands |
| [vowbird/docs/TESTING.md](./vowbird/docs/TESTING.md) | Test suites |
| [vowbird/docs/DEPLOYMENT.md](./vowbird/docs/DEPLOYMENT.md) | Production deploy |
| [vowbird/apps/api/README.md](./vowbird/apps/api/README.md) | API |
| [vowbird/apps/web/README.md](./vowbird/apps/web/README.md) | Web app |
| [vowbird/apps/mobile/README.md](./vowbird/apps/mobile/README.md) | Mobile app |

## Tests

```powershell
cd vowbird
npx pnpm@9.12.0 test
```
