# Vowbird Mobile

Expo React Native app (iOS + Android from one codebase).

## Run locally

From the monorepo root:

```bash
pnpm dev:mobile
```

Or from this directory:

```bash
pnpm dev
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator (macOS only)
- Scan QR code with Expo Go on a physical device

## API connection

Set in root `.env`:

```
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000
```

Use your machine's local IP — not `localhost` — when testing on a phone.

Example: `http://192.168.1.42:4000`

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Expo dev server |
| `pnpm android` | Open Android |
| `pnpm ios` | Open iOS |
| `pnpm test` | Vitest unit tests |
| `pnpm lint` | Typecheck |

## Screens

- Onboarding, register, login
- Home dashboard, vows, check-in flow
- Partner matching, match detail
- Letters inbox & compose
- Pact discovery, detail, room feed
- Profile, report/block

## EAS builds

```bash
npm i -g eas-cli
eas login
eas init   # set project ID in app.json
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Set `EXPO_PUBLIC_API_URL=https://api.vowbird.app` in EAS secrets for production.

Replace placeholder icons in `assets/` before store submission.

See `../../docs/DEPLOYMENT.md` for full deployment guide.

## Testing

```bash
pnpm test
```
