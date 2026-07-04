import { FastifyInstance } from "fastify";
import { partnerRequestSchema } from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canCreateMatch, runMatching } from "../services/matching";
import { assertNotSuspended } from "../services/safety";

export async function partnerRoutes(app: FastifyInstance) {
  app.post("/partner-requests", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const parsed = partnerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
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

    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });

    const existing = await prisma.partnerRequest.findFirst({
      where: { userId: request.userId!, vowId: vow.id, status: "WAITING" },
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
      },
    });

    await runMatching();

    return reply.status(201).send({ partnerRequest });
  });

  app.get("/partner-requests/me", { preHandler: authenticate }, async (request) => {
    const requests = await prisma.partnerRequest.findMany({
      where: { userId: request.userId! },
      include: { vow: true },
      orderBy: { createdAt: "desc" },
    });
    return { requests };
  });

  app.post("/partner-requests/:id/cancel", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await prisma.partnerRequest.findUnique({ where: { id } });
    if (!req || req.userId !== request.userId) {
      return reply.status(404).send({ error: "Request not found" });
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
    return {
      match: {
        ...match,
        partner: sanitizeUserForOthers(partner),
        userA: sanitizeUserForOthers(match.userA),
        userB: sanitizeUserForOthers(match.userB),
      },
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

    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const vow = await prisma.vow.findUniqueOrThrow({ where: { id: match.vowId } });

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
      },
    });

    await runMatching();

    return { partnerRequest };
  });
}
