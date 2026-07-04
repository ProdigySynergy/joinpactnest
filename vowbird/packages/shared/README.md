# @vowbird/shared

Shared TypeScript package: Zod schemas, constants, types, and utilities used by API, web, and mobile.

## Build

```bash
pnpm build
```

Outputs to `dist/`. Other packages import via workspace alias `@vowbird/shared`.

## Run tests

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## Contents

| Module | Purpose |
|--------|---------|
| `schemas.ts` | Zod validation for API payloads |
| `constants.ts` | Categories, tones, brand copy, plan limits |
| `utils.ts` | Slugify, contact scanner, date helpers |
| `types.ts` | Shared TypeScript interfaces |

## Usage

```typescript
import { registerSchema, BRAND, scanForContactInfo } from "@vowbird/shared";
```

After changing shared code, rebuild before running API/web:

```bash
pnpm build
```
