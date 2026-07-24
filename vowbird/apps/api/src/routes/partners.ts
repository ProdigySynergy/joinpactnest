import { FastifyInstance } from "fastify";
import { partnerRequestSchema, zodErrorToMessage } from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canCreateMatch, runMatching, vowHasActivePartner } from "../services/matching";
import { logNotification } from "../services/notifications";
import { calculateVowProgress } from "../services/progress";
import { areUsersBlocked, assertNotSuspended } from "../services/safety";

export async function partnerRoutes(app: FastifyInstance) {
  app.post("/partner-requests", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const parsed = partnerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const canMatch = await canCreateMatch(request.userId!);
    if (!canMatch) {
      return reply.status(403).send({
        error: "Free plan limit: 1 active partner match.",
      });
    }

    const vow = await prisma.vow.findUnique({ where: { id: parsed.data.vowId } });
    if (!vow || vow.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }
    if (vow.status !== "ACTIVE") {
      return reply.status(400).send({ error: "Vow must be active" });
    }

    if (await vowHasActivePartner(vow.id)) {
      return reply.status(409).send({ error: "This vow already has an active partner" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const targetUserId = parsed.data.targetUserId;

    if (targetUserId) {
      if (targetUserId === request.userId) {
        return reply.status(400).send({ error: "Cannot partner with yourself" });
      }

      const target = await prisma.user.findUnique({ where: { id: targetUserId } });
      if (!target || target.isSuspended) {
        return reply.status(404).send({ error: "User not found" });
      }

      if (await areUsersBlocked(request.userId!, targetUserId)) {
        return reply.status(403).send({ error: "Cannot request this user" });
      }

      const existingPending = await prisma.partnerRequest.findFirst({
        where: {
          userId: request.userId!,
          vowId: vow.id,
          targetUserId,
          status: "PENDING",
        },
      });
      if (existingPending) {
        return reply.status(409).send({ error: "Invite already pending for this person" });
      }

      const partnerRequest = await prisma.partnerRequest.create({
        data: {
          userId: request.userId!,
          vowId: vow.id,
          targetUserId,
          category: vow.category,
          frequencyType: vow.frequencyType,
          timezone: user.timezone,
          preferredCheckInTime: user.preferredCheckInTime,
          profileModePreference: parsed.data.profileModePreference,
          tonePreference: parsed.data.tonePreference,
          status: "PENDING",
        },
      });

      await logNotification(
        targetUserId,
        "partnerInvite",
        `${user.displayName} invited you to partner on “${vow.title}”`,
        "/matches"
      );

      return reply.status(201).send({ partnerRequest });
    }

    const existing = await prisma.partnerRequest.findFirst({
      where: { userId: request.userId!, vowId: vow.id, status: "WAITING", targetUserId: null },
    });
    if (existing) {
      return reply.status(409).send({ error: "Already waiting for a match on this vow" });
    }

    const partnerRequest = await prisma.partnerRequest.create({
      data: {
        userId: request.userId!,
        vowId: vow.id,
        category: vow.category,
        frequencyType: vow.frequencyType,
        timezone: user.timezone,
        preferredCheckInTime: user.preferredCheckInTime,
        profileModePreference: parsed.data.profileModePreference,
        tonePreference: parsed.data.tonePreference,
        status: "WAITING",
      },
    });

    await runMatching();

    return reply.status(201).send({ partnerRequest });
  });

  app.get("/partner-requests/me", { preHandler: authenticate }, async (request) => {
    const requests = await prisma.partnerRequest.findMany({
      where: { userId: request.userId! },
      include: { vow: true, targetUser: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      requests: requests.map((r) => ({
        ...r,
        targetUser: r.targetUser ? sanitizeUserForOthers(r.targetUser) : null,
      })),
    };
  });

  app.get("/partner-requests/incoming", { preHandler: authenticate }, async (request) => {
    const requests = await prisma.partnerRequest.findMany({
      where: { targetUserId: request.userId!, status: "PENDING" },
      include: { vow: true, user: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      requests: requests.map((r) => ({
        id: r.id,
        status: r.status,
        tonePreference: r.tonePreference,
        category: r.category,
        frequencyType: r.frequencyType,
        createdAt: r.createdAt,
        vow: { id: r.vow.id, title: r.vow.title, category: r.vow.category },
        fromUser: sanitizeUserForOthers(r.user),
      })),
    };
  });

  app.post("/partner-requests/:id/accept", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const { id } = request.params as { id: string };
    const req = await prisma.partnerRequest.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!req || req.targetUserId !== request.userId || req.status !== "PENDING") {
      return reply.status(404).send({ error: "Invite not found" });
    }

    if (await vowHasActivePartner(req.vowId)) {
      return reply.status(409).send({ error: "That vow already has an active partner" });
    }
    if (!(await canCreateMatch(req.userId)) || !(await canCreateMatch(request.userId!))) {
      return reply.status(403).send({ error: "Free plan limit: 1 active partner match." });
    }
    if (await areUsersBlocked(req.userId, request.userId!)) {
      return reply.status(403).send({ error: "Cannot accept this invite" });
    }

    const matchMode =
      req.user.profileMode === "VEILED" ||
      (await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } })).profileMode === "VEILED"
        ? "VEILED"
        : "OPEN";

    const [match] = await prisma.$transaction([
      prisma.partnerMatch.create({
        data: {
          vowId: req.vowId,
          userAId: req.userId,
          userBId: request.userId!,
          matchMode,
        },
      }),
      prisma.partnerRequest.update({
        where: { id: req.id },
        data: { status: "MATCHED" },
      }),
      // Clear auto-queue for this vow if any
      prisma.partnerRequest.updateMany({
        where: { vowId: req.vowId, status: "WAITING", targetUserId: null },
        data: { status: "CANCELLED" },
      }),
    ]);

    const accepter = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    await logNotification(
      req.userId,
      "partnerInviteAccepted",
      `${accepter.displayName} accepted your partner invite`,
      "/matches"
    );

    return { match };
  });

  app.post("/partner-requests/:id/decline", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await prisma.partnerRequest.findUnique({ where: { id } });
    if (!req || req.targetUserId !== request.userId || req.status !== "PENDING") {
      return reply.status(404).send({ error: "Invite not found" });
    }
    const updated = await prisma.partnerRequest.update({
      where: { id },
      data: { status: "DECLINED" },
    });
    return { partnerRequest: updated };
  });

  app.post("/partner-requests/:id/cancel", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await prisma.partnerRequest.findUnique({ where: { id } });
    if (!req || req.userId !== request.userId) {
      return reply.status(404).send({ error: "Request not found" });
    }
    if (req.status !== "WAITING" && req.status !== "PENDING") {
      return reply.status(400).send({ error: "Request cannot be cancelled" });
    }
    const updated = await prisma.partnerRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return { partnerRequest: updated };
  });

  app.post("/partner-requests/run-matching", { preHandler: authenticate }, async (request, reply) => {
    if (request.userRole !== "ADMIN") {
      return reply.status(403).send({ error: "Admin only" });
    }
    const result = await runMatching();
    return result;
  });

  /** Discover candidates for a vow: same category first; if none, other categories. */
  app.get("/partners/discover", { preHandler: authenticate }, async (request, reply) => {
    const { vowId } = request.query as { vowId?: string };
    if (!vowId) return reply.status(400).send({ error: "vowId required" });

    const vow = await prisma.vow.findUnique({ where: { id: vowId } });
    if (!vow || vow.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }

    if (await vowHasActivePartner(vow.id)) {
      return { candidates: [], vowHasPartner: true, usedOtherCategories: false };
    }

    const blocked = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: request.userId! }, { blockedUserId: request.userId! }],
      },
    });
    const blockedIds = new Set(
      blocked
        .flatMap((b) => [b.blockerId, b.blockedUserId])
        .filter((id) => id !== request.userId)
    );

    const pendingOutgoing = await prisma.partnerRequest.findMany({
      where: {
        userId: request.userId!,
        vowId: vow.id,
        status: "PENDING",
        targetUserId: { not: null },
      },
      select: { targetUserId: true },
    });
    const pendingTargetIds = new Set(pendingOutgoing.map((r) => r.targetUserId!).filter(Boolean));

    type Candidate = {
      user: ReturnType<typeof sanitizeUserForOthers>;
      source: "queue" | "similar_vow" | "other_category";
      theirVow: { id: string; title: string; category: string };
      alreadyInvited: boolean;
    };

    const byUser = new Map<string, Candidate>();

    async function loadCandidates(opts: {
      matchCategory: boolean;
      take: number;
    }) {
      const categoryFilter = opts.matchCategory
        ? { category: vow.category }
        : { category: { not: vow.category } };

      const waitingPeers = await prisma.partnerRequest.findMany({
        where: {
          status: "WAITING",
          targetUserId: null,
          frequencyType: vow.frequencyType,
          userId: { not: request.userId! },
          ...categoryFilter,
        },
        include: { user: true, vow: true },
        orderBy: { createdAt: "asc" },
        take: opts.take,
      });

      const similarVowUsers = await prisma.vow.findMany({
        where: {
          status: "ACTIVE",
          frequencyType: vow.frequencyType,
          userId: { not: request.userId! },
          ...categoryFilter,
        },
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: opts.take,
      });

      const candidateVowIds = [
        ...waitingPeers.map((p) => p.vowId),
        ...similarVowUsers.map((v) => v.id),
      ];
      const vowedWithPartner = new Set(
        (
          await prisma.partnerMatch.findMany({
            where: { vowId: { in: candidateVowIds }, status: "ACTIVE" },
            select: { vowId: true },
          })
        ).map((m) => m.vowId)
      );

      for (const peer of waitingPeers) {
        if (byUser.has(peer.userId)) continue;
        if (blockedIds.has(peer.userId) || peer.user.isSuspended) continue;
        if (vowedWithPartner.has(peer.vowId)) continue;
        byUser.set(peer.userId, {
          user: sanitizeUserForOthers(peer.user),
          source: opts.matchCategory ? "queue" : "other_category",
          theirVow: {
            id: peer.vow.id,
            title: peer.vow.title,
            category: peer.vow.category,
          },
          alreadyInvited: pendingTargetIds.has(peer.userId),
        });
      }

      for (const v of similarVowUsers) {
        if (byUser.has(v.userId)) continue;
        if (blockedIds.has(v.userId) || v.user.isSuspended) continue;
        if (vowedWithPartner.has(v.id)) continue;
        byUser.set(v.userId, {
          user: sanitizeUserForOthers(v.user),
          source: opts.matchCategory ? "similar_vow" : "other_category",
          theirVow: { id: v.id, title: v.title, category: v.category },
          alreadyInvited: pendingTargetIds.has(v.userId),
        });
      }
    }

    await loadCandidates({ matchCategory: true, take: 40 });
    let usedOtherCategories = false;
    if (byUser.size === 0) {
      await loadCandidates({ matchCategory: false, take: 40 });
      usedOtherCategories = byUser.size > 0;
    }

    return {
      candidates: Array.from(byUser.values()).slice(0, 30),
      vowHasPartner: false,
      usedOtherCategories,
    };
  });

  app.get("/matches/me", { preHandler: authenticate }, async (request) => {
    const matches = await prisma.partnerMatch.findMany({
      where: {
        OR: [{ userAId: request.userId! }, { userBId: request.userId! }],
      },
      include: {
        vow: true,
        userA: true,
        userB: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      matches: matches.map((m) => {
        const partner = m.userAId === request.userId ? m.userB : m.userA;
        return {
          ...m,
          partner: sanitizeUserForOthers(partner),
          userA: sanitizeUserForOthers(m.userA),
          userB: sanitizeUserForOthers(m.userB),
        };
      }),
    };
  });

  app.get("/matches/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const match = await prisma.partnerMatch.findUnique({
      where: { id },
      include: { vow: true, userA: true, userB: true },
    });

    if (!match) return reply.status(404).send({ error: "Match not found" });
    if (match.userAId !== request.userId && match.userBId !== request.userId) {
      return reply.status(403).send({ error: "Not your match" });
    }

    const partner = match.userAId === request.userId ? match.userB : match.userA;
    const isVowOwner = match.vow.userId === request.userId;

    let leaderboard: Array<{
      user: ReturnType<typeof sanitizeUserForOthers>;
      currentStreak: number;
      completionPercentage: number;
    }> = [];

    if (match.vow.leaderboardEnabled) {
      const aProgress = await calculateVowProgress(match.vowId, match.userAId);
      const bProgress = await calculateVowProgress(match.vowId, match.userBId);
      leaderboard = [
        {
          user: sanitizeUserForOthers(match.userA),
          currentStreak: aProgress.currentStreak,
          completionPercentage: aProgress.completionPercentage,
        },
        {
          user: sanitizeUserForOthers(match.userB),
          currentStreak: bProgress.currentStreak,
          completionPercentage: bProgress.completionPercentage,
        },
      ].sort((x, y) => y.currentStreak - x.currentStreak || y.completionPercentage - x.completionPercentage);
    }

    return {
      match: {
        ...match,
        partner: sanitizeUserForOthers(partner),
        initiatedBy: sanitizeUserForOthers(match.userA),
        userA: sanitizeUserForOthers(match.userA),
        userB: sanitizeUserForOthers(match.userB),
      },
      leaderboard,
      leaderboardEnabled: match.vow.leaderboardEnabled,
      noJudgementZone: match.vow.noJudgementZone,
      vibesPublic: match.vibesPublic,
      vibeLeaderboardEnabled: match.vibeLeaderboardEnabled,
      isVowOwner,
    };
  });

  app.post("/matches/:id/end", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const match = await prisma.partnerMatch.findUnique({ where: { id } });
    if (!match) return reply.status(404).send({ error: "Match not found" });
    if (match.userAId !== request.userId && match.userBId !== request.userId) {
      return reply.status(403).send({ error: "Not your match" });
    }

    const updated = await prisma.partnerMatch.update({
      where: { id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    return { match: updated };
  });

  app.post("/matches/:id/rematch", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const match = await prisma.partnerMatch.findUnique({ where: { id } });
    if (!match) return reply.status(404).send({ error: "Match not found" });
    if (match.userAId !== request.userId && match.userBId !== request.userId) {
      return reply.status(403).send({ error: "Not your match" });
    }

    await prisma.partnerMatch.update({
      where: { id },
      data: { status: "ENDED", endedAt: new Date() },
    });

    if (match.vowId && !(await canCreateMatch(request.userId!))) {
      return { partnerRequest: null, message: "Match ended. Free plan limit reached for a new request." };
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const vow = await prisma.vow.findUniqueOrThrow({ where: { id: match.vowId } });

    // Only the vow owner can re-queue on this vow
    if (vow.userId !== request.userId) {
      return { partnerRequest: null, message: "Match ended." };
    }

    const partnerRequest = await prisma.partnerRequest.create({
      data: {
        userId: request.userId!,
        vowId: vow.id,
        category: vow.category,
        frequencyType: vow.frequencyType,
        timezone: user.timezone,
        preferredCheckInTime: user.preferredCheckInTime,
        profileModePreference: "EITHER",
        tonePreference: "Gentle",
        status: "WAITING",
      },
    });

    await runMatching();

    return { partnerRequest };
  });
}
