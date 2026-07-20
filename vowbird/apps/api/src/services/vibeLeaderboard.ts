import { VIBE_EMOJIS, VIBE_LABELS } from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";

function startOfUtcWeek(d = new Date()): Date {
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
}

export async function getVibeLeaderboard(opts: {
  partnerMatchId?: string;
  pactId?: string;
  limit?: number;
}) {
  const weekStart = startOfUtcWeek();
  const vibes = await prisma.vibeCheck.findMany({
    where: {
      partnerMatchId: opts.partnerMatchId,
      pactId: opts.pactId,
      createdAt: { gte: weekStart },
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const byUser = new Map<
    string,
    {
      user: ReturnType<typeof sanitizeUserForOthers>;
      vibeCount: number;
      latestVibe: string;
      latestLabel: string;
      latestEmoji: string;
    }
  >();

  for (const v of vibes) {
    const existing = byUser.get(v.userId);
    const label = VIBE_LABELS[v.vibe as keyof typeof VIBE_LABELS] || v.vibe;
    const emoji = VIBE_EMOJIS[v.vibe as keyof typeof VIBE_EMOJIS] || "✨";
    if (!existing) {
      byUser.set(v.userId, {
        user: sanitizeUserForOthers(v.user),
        vibeCount: 1,
        latestVibe: v.vibe,
        latestLabel: label,
        latestEmoji: emoji,
      });
    } else {
      existing.vibeCount += 1;
    }
  }

  return [...byUser.values()]
    .sort((a, b) => b.vibeCount - a.vibeCount)
    .slice(0, opts.limit ?? 20);
}

export function mapVibeRows<T extends { vibe: string; user: Parameters<typeof sanitizeUserForOthers>[0] }>(
  vibes: T[]
) {
  return vibes.map((v) => ({
    ...v,
    user: sanitizeUserForOthers(v.user),
    label: VIBE_LABELS[v.vibe as keyof typeof VIBE_LABELS] || v.vibe,
    emoji: VIBE_EMOJIS[v.vibe as keyof typeof VIBE_EMOJIS] || "✨",
  }));
}
