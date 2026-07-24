# In-app notifications (Phase B)

Partner invites and other events are stored in `InAppNotification` and shown in the Alerts inbox.

## API

Authenticated:

- `GET /notifications` — latest 50 + `unreadCount` (`?unreadOnly=1` optional)
- `GET /notifications/unread-count`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`

`logNotification(userId, type, message, href?)` persists a row (and still logs / stubs push).

## Migration

```bash
pnpm db:migrate:deploy
```

- `20260724160000_in_app_notifications`

## UI

- Web: `/notifications` (nav **Alerts** + unread badge)
- Mobile: `/notifications` from Home / Profile
