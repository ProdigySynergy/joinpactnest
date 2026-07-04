import { FREE_PLAN_LIMITS } from "@vowbird/shared";
import { prisma } from "../lib/prisma";
import { areUsersBlocked } from "./safety";

export async function runMatching(): Promise<{ matched: number }> {
  const waiting = await prisma.partnerRequest.findMany({
    where: { status: "WAITING" },
    include: { user: true, vow: true },
    orderBy: { createdAt: "asc" },
  });

  let matched = 0;
  const used = new Set<string>();

  for (let i = 0; i < waiting.length; i++) {
    const reqA = waiting[i]!;
    if (used.has(reqA.id) || reqA.user.isSuspended) continue;

    for (let j = i + 1; j < waiting.length; j++) {
      const reqB = waiting[j]!;
      if (used.has(reqB.id) || reqB.user.isSuspended) continue;
      if (reqA.userId === reqB.userId) continue;

      const blocked = await areUsersBlocked(reqA.userId, reqB.userId);
      if (blocked) continue;

      if (reqA.category !== reqB.category) continue;
      if (reqA.frequencyType !== reqB.frequencyType) continue;

      const modeCompatible =
        reqA.profileModePreference === "EITHER" ||
        reqB.profileModePreference === "EITHER" ||
        reqA.profileModePreference === reqB.profileModePreference ||
        (reqA.user.profileMode === reqB.user.profileMode);

      if (!modeCompatible) continue;

      const matchMode =
        reqA.user.profileMode === "VEILED" || reqB.user.profileMode === "VEILED"
          ? "VEILED"
          : "OPEN";

      await prisma.$transaction([
        prisma.partnerMatch.create({
          data: {
            vowId: reqA.vowId,
            userAId: reqA.userId,
            userBId: reqB.userId,
            matchMode,
          },
        }),
        prisma.partnerRequest.update({
          where: { id: reqA.id },
          data: { status: "MATCHED" },
        }),
        prisma.partnerRequest.update({
          where: { id: reqB.id },
          data: { status: "MATCHED" },
        }),
      ]);

      used.add(reqA.id);
      used.add(reqB.id);
      matched++;
      break;
    }
  }

  return { matched };
}

export async function canCreateMatch(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  if (user.plan === "PLUS") return true;

  const activeMatches = await prisma.partnerMatch.count({
    where: {
      status: "ACTIVE",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
  });

  return activeMatches < FREE_PLAN_LIMITS.maxActiveMatches;
}

export async function canCreateVow(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;
  if (user.plan === "PLUS") return true;

  const activeVows = await prisma.vow.count({
    where: { userId, status: "ACTIVE" },
  });

  return activeVows < FREE_PLAN_LIMITS.maxActiveVows;
}
