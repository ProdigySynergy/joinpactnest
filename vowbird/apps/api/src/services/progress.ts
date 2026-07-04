import { FrequencyType } from "@prisma/client";
import { getWeekStart, parseDateOnly, startOfDay, toDateString } from "@vowbird/shared";
import { prisma } from "../lib/prisma";

export async function calculateVowProgress(vowId: string, userId: string) {
  const vow = await prisma.vow.findUniqueOrThrow({ where: { id: vowId } });
  const checkIns = await prisma.checkIn.findMany({
    where: { vowId, userId, status: "COMPLETED" },
    orderBy: { checkInDate: "asc" },
  });

  const dates = checkIns.map((c) => toDateString(c.checkInDate));
  const uniqueDates = [...new Set(dates)].sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  if (vow.frequencyType === "DAILY") {
    const today = startOfDay(new Date());
    let cursor = today;
    while (uniqueDates.includes(toDateString(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = parseDateOnly(uniqueDates[i - 1]!);
        const curr = parseDateOnly(uniqueDates[i]!);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }
  } else {
    const weekMap = new Map<string, number>();
    for (const d of uniqueDates) {
      const weekKey = toDateString(getWeekStart(parseDateOnly(d)));
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    }
    const weeks = [...weekMap.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    for (const [, count] of weeks) {
      if (count >= vow.targetCountPerWeek) currentStreak++;
      else break;
    }
    for (const count of weekMap.values()) {
      if (count >= vow.targetCountPerWeek) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
  }

  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weeklyCompleted = checkIns.filter(
    (c) => c.checkInDate >= weekStart && c.checkInDate < weekEnd
  ).length;

  const weeklyTarget =
    vow.frequencyType === "DAILY" ? 7 : vow.targetCountPerWeek;

  return {
    currentStreak,
    longestStreak,
    weeklyCompleted,
    weeklyTarget,
    completionPercentage: Math.min(100, Math.round((weeklyCompleted / weeklyTarget) * 100)),
    totalCheckIns: checkIns.length,
  };
}

export async function calculatePactProgress(pactId: string, userId: string) {
  const pact = await prisma.pact.findUniqueOrThrow({ where: { id: pactId } });
  const checkIns = await prisma.checkIn.findMany({
    where: { pactId, userId, status: "COMPLETED" },
    orderBy: { checkInDate: "asc" },
  });

  const dates = [...new Set(checkIns.map((c) => toDateString(c.checkInDate)))].sort();
  let currentStreak = 0;
  const today = startOfDay(new Date());
  let cursor = today;
  while (dates.includes(toDateString(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weeklyCompleted = checkIns.filter(
    (c) => c.checkInDate >= weekStart && c.checkInDate < weekEnd
  ).length;
  const weeklyTarget =
    pact.frequencyType === FrequencyType.DAILY ? 7 : pact.targetCountPerWeek;

  return {
    currentStreak,
    longestStreak: currentStreak,
    weeklyCompleted,
    weeklyTarget,
    completionPercentage: Math.min(100, Math.round((weeklyCompleted / weeklyTarget) * 100)),
    totalCheckIns: checkIns.length,
  };
}

export async function getPactLeaderboard(pactId: string) {
  const members = await prisma.pactMember.findMany({
    where: { pactId, leftAt: null },
    include: { user: true },
  });

  const results = await Promise.all(
    members.map(async (m) => {
      const progress = await calculatePactProgress(pactId, m.userId);
      return {
        user: {
          id: m.user.id,
          displayName:
            m.displayModeInPact === "VEILED"
              ? m.user.anonymousAlias || m.user.username
              : m.user.name,
          profileMode: m.displayModeInPact,
        },
        ...progress,
      };
    })
  );

  return results.sort(
    (a, b) =>
      b.completionPercentage - a.completionPercentage ||
      b.currentStreak - a.currentStreak
  );
}

export async function getUserOverallProgress(userId: string) {
  const vows = await prisma.vow.findMany({
    where: { userId, status: "ACTIVE" },
  });

  const vowProgress = await Promise.all(
    vows.map(async (v) => ({
      vowId: v.id,
      title: v.title,
      ...(await calculateVowProgress(v.id, userId)),
    }))
  );

  return vowProgress;
}
