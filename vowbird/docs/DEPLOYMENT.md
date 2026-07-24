# Vowbird Deployment Guide

Production targets:
- Web: `https://vowbird.app`
- API: `https://api.vowbird.app`

## Server requirements

- Ubuntu 22.04+ LTS
- Node.js 20 LTS
- MySQL 8
- Nginx
- PM2
- pnpm 9

## 1. MySQL setup

```sql
CREATE DATABASE vowbird CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'vowbird'@'localhost' IDENTIFIED BY 'your-strong-password';
GRANT ALL PRIVILEGES ON vowbird.* TO 'vowbird'@'localhost';
FLUSH PRIVILEGES;
```

Set `DATABASE_URL` in `.env`:

```
DATABASE_URL="mysql://vowbird:your-strong-password@localhost:3306/vowbird"
```

## 2. Clone and build

```bash
cd /var/www/vowbird
cp .env.example .env
# Edit .env with production secrets

pnpm install
pnpm --filter @vowbird/shared build   # required before seed/API (shared has no dist until built)
pnpm db:migrate:deploy
pnpm db:seed                          # also builds @vowbird/shared automatically
pnpm build                            # bakes NEXT_PUBLIC_* from root `.env` into the web client
```

> **Note:** `db:seed` imports `@vowbird/shared`. If you see `Cannot find module .../@vowbird/shared/dist/index.js`, run `pnpm --filter @vowbird/shared build` first (or just re-run `pnpm db:seed`, which builds shared for you).
>
> **Web API URL:** `NEXT_PUBLIC_API_URL` is compiled into the browser bundle. After changing it in root `.env`, you **must** rebuild web (`pnpm --filter @vowbird/web build`) and restart the process on port 3000. If Network tab still shows `localhost:4000`, the old build is still running.
>
> **Same-domain API (Apache):** if the public API is `https://yourdomain.com/api`, proxy `/api/` to the Fastify port and strip the prefix:
> ```apache
> ProxyPass        /api/ http://127.0.0.1:4000/
> ProxyPassReverse /api/ http://127.0.0.1:4000/
> ```
> Then `curl https://yourdomain.com/api/health` must return JSON (not a Next.js 404 page).

## 3. Uploads directory

```bash
mkdir -p uploads/avatars uploads/proofs
chown -R www-data:www-data uploads
chmod -R 755 uploads
```

## 4. PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## 5. Nginx

Copy `docs/nginx.conf` to `/etc/nginx/sites-available/vowbird` and enable:

```bash
sudo ln -s /etc/nginx/sites-available/vowbird /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL (Let's Encrypt)

```bash
sudo certbot --nginx -d vowbird.app -d api.vowbird.app
```

## 7. Mobile EAS builds

```bash
cd apps/mobile
npm i -g eas-cli
eas login
eas init
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Set `EXPO_PUBLIC_API_URL=https://api.vowbird.app` in EAS secrets or `.env`.
Optional: `EXPO_PUBLIC_SITE_URL=https://vowbird.app` for share links.

### Deep links

- Custom scheme: `vowbird://p/{slug}`, `vowbird://u/{username}` (works without store config).
- HTTPS App Links / Universal Links for `https://vowbird.app/p/*` and `/u/*` are declared in `apps/mobile/app.json`.
- Before store release, host:
  - `https://vowbird.app/.well-known/apple-app-site-association`
  - `https://vowbird.app/.well-known/assetlinks.json`
  for team ID / SHA-256 fingerprints from EAS / Play Console.

## Environment variables (production)

| Variable | Example |
|----------|---------|
| DATABASE_URL | mysql://... |
| JWT_SECRET | long random string |
| API_PUBLIC_URL | https://api.vowbird.app |
| CORS_ORIGIN | https://vowbird.app |
| NEXT_PUBLIC_API_URL | https://api.vowbird.app |

After pulling schema changes (e.g. in-app notifications), run `pnpm db:migrate:deploy` before restarting the API. See `docs/NOTIFICATIONS.md`.
