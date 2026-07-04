# Testing

Vowbird uses [Vitest](https://vitest.dev/) across the monorepo.

## Run all tests

From the repo root:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

Coverage:

```bash
pnpm test:coverage
```

On Windows, if `pnpm` is not installed globally:

```powershell
npx pnpm@9.12.0 test
```

## Package-level tests

| Package | Command | What is covered |
|---------|---------|-----------------|
| `@vowbird/shared` | `pnpm --filter @vowbird/shared test` | Zod schemas, date helpers, contact-info scanner |
| `@vowbird/api` | `pnpm --filter @vowbird/api test` | Health route, auth validation, safety + matching services |
| `@vowbird/web` | `pnpm --filter @vowbird/web test` | API client helpers, sample UI render test |
| `@vowbird/mobile` | `pnpm --filter @vowbird/mobile test` | Theme tokens and layout styles |

## API test notes

- API route tests use Fastify `inject()` — no running server required.
- Database calls are mocked in auth/matching tests so they run without MySQL.
- Integration tests against a real database are optional future work (`RUN_INTEGRATION_TESTS=1`).

## Adding tests

1. Place tests next to source files as `*.test.ts` or `*.test.tsx`.
2. Prefer unit tests for pure logic in `@vowbird/shared`.
3. For new API routes, add Fastify inject tests with mocked Prisma where possible.
4. For web UI, use Testing Library + jsdom.

## CI suggestion

```yaml
- run: pnpm install
- run: pnpm test
- run: pnpm build
```

No Docker/MySQL is required for the current test suite.
