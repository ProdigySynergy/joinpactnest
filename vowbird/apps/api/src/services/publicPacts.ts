import { prisma } from "../lib/prisma";
import { getPactLeaderboard } from "./progress";

function daysBetween(from: Date, to = new Date()): number {
  const ms = startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export type PublicPactSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  frequencyType: string;
  targetCountPerWeek: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  memberCount: number;
  daysLive: number;
  successRate: number;
  avgCompletionPercentage: number;
};

export async function listPublicPacts(limit = 50): Promise<PublicPactSummary[]> {
  const pacts = await prisma.pact.findMany({
    where: { privacy: "PUBLIC", status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Promise.all(
    pacts.map(async (pact) => {
      const memberCount = await prisma.pactMember.count({
        where: { pactId: pact.id, leftAt: null },
      });
      const leaderboard = memberCount > 0 ? await getPactLeaderboard(pact.id) : [];
      const avgCompletionPercentage =
        memberCount === 0
          ? 0
          : Math.round(
              leaderboard.reduce((sum, row) => sum + row.completionPercentage, 0) / memberCount
            );
      const succeeding = leaderboard.filter((row) => row.completionPercentage >= 70).length;
      const successRate =
        memberCount === 0 ? 0 : Math.round((succeeding / memberCount) * 100);

      return {
        id: pact.id,
        title: pact.title,
        slug: pact.slug,
        description: pact.description,
        category: pact.category,
        frequencyType: pact.frequencyType,
        targetCountPerWeek: pact.targetCountPerWeek,
        startDate: pact.startDate.toISOString().slice(0, 10),
        endDate: pact.endDate ? pact.endDate.toISOString().slice(0, 10) : null,
        createdAt: pact.createdAt.toISOString(),
        memberCount,
        daysLive: daysBetween(pact.startDate),
        successRate,
        avgCompletionPercentage,
      };
    })
  );
}

export async function getPublicPactBySlug(slug: string) {
  const pact = await prisma.pact.findFirst({
    where: { slug, privacy: "PUBLIC", status: "ACTIVE" },
  });
  if (!pact) return null;

  const memberCount = await prisma.pactMember.count({
    where: { pactId: pact.id, leftAt: null },
  });
  const leaderboard = memberCount > 0 ? await getPactLeaderboard(pact.id) : [];
  const avgCompletionPercentage =
    memberCount === 0
      ? 0
      : Math.round(
          leaderboard.reduce((sum, row) => sum + row.completionPercentage, 0) / memberCount
        );
  const succeeding = leaderboard.filter((row) => row.completionPercentage >= 70).length;
  const successRate = memberCount === 0 ? 0 : Math.round((succeeding / memberCount) * 100);
  const totalCheckIns = leaderboard.reduce((sum, row) => sum + row.totalCheckIns, 0);
  const activeThisWeek = leaderboard.filter((row) => row.weeklyCompleted > 0).length;
  const topStreak = leaderboard.reduce((max, row) => Math.max(max, row.currentStreak), 0);

  return {
    pact: {
      id: pact.id,
      title: pact.title,
      slug: pact.slug,
      description: pact.description,
      category: pact.category,
      frequencyType: pact.frequencyType,
      targetCountPerWeek: pact.targetCountPerWeek,
      checkInStartTime: pact.checkInStartTime,
      checkInEndTime: pact.checkInEndTime,
      startDate: pact.startDate.toISOString().slice(0, 10),
      endDate: pact.endDate ? pact.endDate.toISOString().slice(0, 10) : null,
      createdAt: pact.createdAt.toISOString(),
    },
    stats: {
      memberCount,
      daysLive: daysBetween(pact.startDate),
      successRate,
      avgCompletionPercentage,
      totalCheckIns,
      activeThisWeek,
      topStreak,
    },
    leaders: pact.leaderboardEnabled
      ? leaderboard.slice(0, 5).map((row) => ({
          displayName: row.user.displayName,
          currentStreak: row.currentStreak,
          completionPercentage: row.completionPercentage,
        }))
      : [],
    leaderboardEnabled: pact.leaderboardEnabled,
  };
}
