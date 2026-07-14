import { FastifyInstance } from "fastify";
import { createCheckInSchema, parseDateOnly, zodErrorToMessage } from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import {
  calculatePactProgress,
  calculateVowProgress,
  getPactLeaderboard,
  getUserOverallProgress,
} from "../services/progress";
import { validateVeiledContent } from "../services/safety";
import { saveUpload } from "../services/upload";
import { logNotification } from "../services/notifications";
import { missMessage } from "../services/accountability";

export async function checkInRoutes(app: FastifyInstance) {
  app.post("/check-ins", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    if (user.isSuspended) {
      return reply.status(403).send({ error: "Account suspended" });
    }

    const contentType = request.headers["content-type"] || "";
    let proofImageUrl: string | undefined;
    let payload: Record<string, string> = {};

    if (contentType.includes("multipart/form-data")) {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "proof") {
          const buffer = await part.toBuffer();
          const result = await saveUpload(user.id, buffer, part.mimetype, "proof");
          proofImageUrl = result.url;
        } else if (part.type === "field") {
          payload[part.fieldname] = part.value as string;
        }
      }
    } else {
      payload = request.body as Record<string, string>;
    }

    const parsed = createCheckInSchema.safeParse(payload);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const data = parsed.data;
    if (data.note) {
      const check = validateVeiledContent(data.note, user.profileMode);
      if (!check.ok) return reply.status(400).send({ error: check.message });
    }

    if (data.vowId) {
      const vow = await prisma.vow.findUnique({ where: { id: data.vowId } });
      if (!vow || vow.userId !== request.userId) {
        return reply.status(404).send({ error: "Vow not found" });
      }
    }

    if (data.pactId) {
      const member = await prisma.pactMember.findFirst({
        where: { pactId: data.pactId, userId: request.userId!, leftAt: null },
      });
      if (!member) return reply.status(403).send({ error: "Not a pact member" });
    }

    try {
      const checkIn = await prisma.checkIn.create({
        data: {
          userId: request.userId!,
          vowId: data.vowId,
          pactId: data.pactId,
          note: data.note,
          proofImageUrl,
          checkInDate: parseDateOnly(data.checkInDate),
          status: data.status,
        },
      });

      let accountability: ReturnType<typeof missMessage> | null = null;
      const displayName =
        user.profileMode === "VEILED" ? user.anonymousAlias || "Partner" : user.name;

      if (data.status === "MISSED") {
        if (data.vowId) {
          const vow = await prisma.vow.findUniqueOrThrow({ where: { id: data.vowId } });
          accountability = missMessage({
            noJudgementZone: vow.noJudgementZone,
            displayName,
            context: "vow",
          });
          const matches = await prisma.partnerMatch.findMany({
            where: { vowId: data.vowId, status: "ACTIVE" },
          });
          for (const m of matches) {
            const partnerId = m.userAId === request.userId ? m.userBId : m.userAId;
            const partnerMsg = missMessage({
              noJudgementZone: vow.noJudgementZone,
              displayName,
              context: "partner",
            });
            if (partnerMsg.message) {
              await logNotification(partnerId, partnerMsg.type, partnerMsg.message);
            }
          }
          if (accountability.message) {
            await logNotification(request.userId!, accountability.type, accountability.message);
          }
        } else if (data.pactId) {
          const pact = await prisma.pact.findUniqueOrThrow({ where: { id: data.pactId } });
          accountability = missMessage({
            noJudgementZone: pact.noJudgementZone,
            displayName,
            context: "pact",
          });
          const members = await prisma.pactMember.findMany({
            where: { pactId: data.pactId, leftAt: null, userId: { not: request.userId! } },
          });
          for (const m of members) {
            if (accountability.message) {
              await logNotification(m.userId, accountability.type, accountability.message);
            }
          }
        }
      } else {
        const matches = await prisma.partnerMatch.findMany({
          where: {
            status: "ACTIVE",
            OR: [{ userAId: request.userId! }, { userBId: request.userId! }],
          },
        });
        for (const m of matches) {
          const partnerId = m.userAId === request.userId ? m.userBId : m.userAId;
          await logNotification(partnerId, "partnerCheckedIn", "Your partner checked in!");
        }
      }

      return reply.status(201).send({ checkIn, accountability });
    } catch {
      return reply.status(409).send({ error: "Check-in already exists for this date" });
    }
  });

  app.get("/check-ins/me", { preHandler: authenticate }, async (request) => {
    const checkIns = await prisma.checkIn.findMany({
      where: { userId: request.userId! },
      include: { vow: true, pact: true, reactions: true },
      orderBy: { checkInDate: "desc" },
      take: 100,
    });
    return { checkIns };
  });

  app.get("/vows/:id/check-ins", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const vow = await prisma.vow.findUnique({ where: { id } });
    if (!vow) return reply.status(404).send({ error: "Vow not found" });

    const isOwner = vow.userId === request.userId;
    const isPartner = await prisma.partnerMatch.findFirst({
      where: {
        vowId: id,
        status: "ACTIVE",
        OR: [{ userAId: request.userId! }, { userBId: request.userId! }],
      },
    });

    if (!isOwner && !isPartner) {
      return reply.status(403).send({ error: "Access denied" });
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { vowId: id },
      include: { user: true, reactions: true },
      orderBy: { checkInDate: "desc" },
    });

    return {
      checkIns: checkIns.map((c) => ({
        ...c,
        user: sanitizeUserForOthers(c.user),
      })),
    };
  });

  app.get("/pacts/:id/check-ins", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await prisma.pactMember.findFirst({
      where: { pactId: id, userId: request.userId!, leftAt: null },
    });
    if (!member) return reply.status(403).send({ error: "Not a member" });

    const checkIns = await prisma.checkIn.findMany({
      where: { pactId: id },
      include: { user: true, reactions: true },
      orderBy: { checkInDate: "desc" },
    });

    return {
      checkIns: checkIns.map((c) => ({
        ...c,
        user: sanitizeUserForOthers(c.user),
      })),
    };
  });

  app.get("/progress/me", { preHandler: authenticate }, async (request) => {
    const progress = await getUserOverallProgress(request.userId!);
    return { progress };
  });

  app.get("/vows/:id/progress", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const vow = await prisma.vow.findUnique({ where: { id } });
    if (!vow || vow.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }
    const progress = await calculateVowProgress(id, request.userId!);
    return { progress };
  });

  app.get("/pacts/:id/progress", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await prisma.pactMember.findFirst({
      where: { pactId: id, userId: request.userId!, leftAt: null },
    });
    if (!member) return reply.status(403).send({ error: "Not a member" });

    const progress = await calculatePactProgress(id, request.userId!);
    const pact = await prisma.pact.findUniqueOrThrow({ where: { id } });
    const leaderboard = pact.leaderboardEnabled ? await getPactLeaderboard(id) : [];
    return { progress, leaderboard, leaderboardEnabled: pact.leaderboardEnabled };
  });
}
