/**
 * Public share / deep-link URL helpers for Vowbird mobile.
 * Custom scheme: vowbird://… — HTTPS: https://vowbird.app/…
 */

const SITE_URL =
  process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://vowbird.app";

export function publicPactWebUrl(slug: string): string {
  return `${SITE_URL}/p/${encodeURIComponent(slug)}`;
}

export function publicProfileWebUrl(username: string): string {
  return `${SITE_URL}/u/${encodeURIComponent(username)}`;
}

export function publicPactAppUrl(slug: string): string {
  return `vowbird://p/${encodeURIComponent(slug)}`;
}

export function publicVibeWebUrl(matchId: string): string {
  return `${SITE_URL}/vibe/${encodeURIComponent(matchId)}`;
}

export function publicVibeAppUrl(matchId: string): string {
  return `vowbird://vibe/${encodeURIComponent(matchId)}`;
}

/** Humanize API category enum for display. */
export function formatCategory(category: string): string {
  if (!category) return category;
  return category.charAt(0) + category.slice(1).toLowerCase().replace(/_/g, " ");
}
