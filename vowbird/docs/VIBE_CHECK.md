# Vibe Check

**Drop what you're up to — cheesy, real, and accountable.**

Vibe Check is a lightweight activity status layer on top of existing partner matches and pacts. It does **not** replace moods, check-ins, letters, or room posts.

## Phase 1 — private vibes

| Context | Who sees it | UI |
|---------|-------------|-----|
| Partner match | Only the two matched partners | Match detail |
| Pact room | Pact members | Pact detail |

## Phase 2 — public duos + vibe leaderboards

| Feature | Details |
|---------|---------|
| **Public duo vibes** | Either partner can turn on `vibesPublic`. Anyone can view `/vibe/[matchId]` and Explore lists the duo. |
| **Vibe leaderboard** | Optional “Most vibes this week” on matches, pacts, and public pages (`vibeLeaderboardEnabled`). |
| **Public pact vibes** | PUBLIC pacts expose live vibes on `/p/[slug]` via `GET /public/pacts/:slug/vibes`. |

Defaults stay private: `vibesPublic=false`, vibe leaderboards `true`.

## Presets

Driving · At the gym · Studying · Working · Cooking · Out & about · Drinks · Resting · Locked in · Custom

## Limits

- 15 minutes between vibe drops
- 24 vibes per UTC day
- Veiled Mode still filters contact info in notes

## API

Authenticated:

- `POST /vibes` — `{ vibe, note?, partnerMatchId? \| pactId? }`
- `GET /vibes?partnerMatchId=` or `?pactId=` — `vibes`, `currentVibes`, `vibeLeaderboard`
- `PATCH /matches/:id/vibe-settings` — `{ vibesPublic?, vibeLeaderboardEnabled? }`
- `PATCH /pacts/:id` — includes `vibeLeaderboardEnabled`

Public:

- `GET /public/vibes/matches` — browse public duos
- `GET /public/vibes/matches/:id` — public duo feed
- `GET /public/pacts/:slug/vibes` — public pact vibes

## Migrations

```bash
pnpm db:migrate:deploy
```

- `20260720010000_vibe_check`
- `20260720020000_vibe_check_phase2`
