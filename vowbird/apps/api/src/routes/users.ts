import { FastifyInstance } from "fastify";
import { profileModeSchema, updateProfileSchema, zodErrorToMessage } from "@vowbird/shared";
import { sanitizePublicProfile, sanitizeUser } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { getUserOverallProgress } from "../services/progress";
import { getPacterRelation } from "../services/pacters";
import { saveUpload } from "../services/upload";

async function buildProfileStats(userId: string) {
  const [activeVows, completedVows, activePacts, activeMatches, totalCheckIns, vowProgress] =
    await Promise.all([
      prisma.vow.count({ where: { userId, status: "ACTIVE" } }),
      prisma.vow.count({ where: { userId, status: "COMPLETED" } }),
      prisma.pactMember.count({ where: { userId, leftAt: null } }),
      prisma.partnerMatch.count({
        where: {
          status: "ACTIVE",
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      }),
      prisma.checkIn.count({ where: { userId, status: "COMPLETED" } }),
      getUserOverallProgress(userId),
    ]);

  const bestStreak = vowProgress.reduce((max, v) => Math.max(max, v.currentStreak, v.longestStreak), 0);
  const avgWeeklyCompletion =
    vowProgress.length === 0
      ? 0
      : Math.round(
          vowProgress.reduce((sum, v) => sum + v.completionPercentage, 0) / vowProgress.length
        );

  return {
    activeVows,
    completedVows,
    activePacts,
    activeMatches,
    totalCheckIns,
    bestStreak,
    avgWeeklyCompletion,
    activeVowProgress: vowProgress.slice(0, 5).map((v) => ({
      vowId: v.vowId,
      title: v.title,
      currentStreak: v.currentStreak,
      completionPercentage: v.completionPercentage,
    })),
  };
}

export async function userRoutes(app: FastifyInstance) {
  app.get("/users/me", { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    return { user: sanitizeUser(user) };
  });

  app.patch("/users/me", { preHandler: authenticate }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const user = await prisma.user.update({
      where: { id: request.userId! },
      data: parsed.data,
    });
    return { user: sanitizeUser(user) };
  });

  app.patch("/users/me/profile-mode", { preHandler: authenticate }, async (request, reply) => {
    const parsed = profileModeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const user = await prisma.user.update({
      where: { id: request.userId! },
      data: {
        profileMode: parsed.data.profileMode,
        anonymousAlias:
          parsed.data.profileMode === "VEILED"
            ? parsed.data.anonymousAlias || undefined
            : null,
      },
    });
    return { user: sanitizeUser(user) };
  });

  app.post("/users/me/avatar", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    if (user.profileMode !== "OPEN") {
      return reply.status(400).send({ error: "Avatar upload only available in Open Mode" });
    }

    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "No file uploaded" });

    const buffer = await file.toBuffer();
    try {
      const { url } = await saveUpload(user.id, buffer, file.mimetype, "avatar");
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: url },
      });
      return { user: sanitizeUser(updated) };
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }
  });

  app.get("/users/:username/profile", { preHandler: authenticate }, async (request, reply) => {
    const { username } = request.params as { username: string };
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.isSuspended) {
      return reply.status(404).send({ error: "Profile not found" });
    }

    const stats = await buildProfileStats(user.id);
    const isSelf = user.id === request.userId;

    const profile = sanitizePublicProfile(user);
    const publicStats =
      user.profileMode === "VEILED" && !isSelf
        ? {
            ...stats,
            activeVowProgress: stats.activeVowProgress.map((v) => ({
              ...v,
              title: "Active vow",
            })),
          }
        : stats;

    const relation = isSelf
      ? { isSelf: true as const }
      : await getPacterRelation(request.userId!, user.id);

    return {
      profile,
      stats: publicStats,
      isSelf,
      relation,
    };
  });
}
