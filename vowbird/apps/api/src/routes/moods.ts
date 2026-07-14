import {
  ENCOURAGEMENT_LABELS,
  MAX_MOOD_UPDATES_PER_DAY,
  createEncouragementSchema,
  createMoodUpdateSchema,
  zodErrorToMessage,
} from "@vowbird/shared";
import { FastifyInstance } from "fastify";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { logNotification } from "../services/notifications";
import { assertNotSuspended, validateVeiledContent } from "../services/safety";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function canAccessMoodContext(
  userId: string,
  opts: { vowId?: string; pactId?: string; partnerMatchId?: string }
): Promise<{ ok: boolean; error?: string }> {
  if (opts.partnerMatchId) {
    const match = await prisma.partnerMatch.findUnique({ where: { id: opts.partnerMatchId } });
    if (!match || match.status !== "ACTIVE") return { ok: false, error: "Match not found" };
    if (match.userAId !== userId && match.userBId !== userId) {
      return { ok: false, error: "Access denied" };
    }
    return { ok: true };
  }

  if (opts.vowId) {
    const vow = await prisma.vow.findUnique({ where: { id: opts.vowId } });
    if (!vow) return { ok: false, error: "Vow not found" };
    if (vow.userId === userId) return { ok: true };
    const isPartner = await prisma.partnerMatch.findFirst({
      where: {
        vowId: opts.vowId,
        status: "ACTIVE",
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
    if (!isPartner) return { ok: false, error: "Access denied" };
    return { ok: true };
  }

  if (opts.pactId) {
    const member = await prisma.pactMember.findFirst({
      where: { pactId: opts.pactId, userId, leftAt: null },
    });
    if (!member) return { ok: false, error: "Not a pact member" };
    return { ok: true };
  }

  return { ok: false, error: "Invalid context" };
}

export async function moodRoutes(app: FastifyInstance) {
  app.post("/moods", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const parsed = createMoodUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const data = parsed.data;
    const access = await canAccessMoodContext(request.userId!, data);
    if (!access.ok) return reply.status(403).send({ error: access.error });

    if (data.vowId && !data.partnerMatchId) {
      const vow = await prisma.vow.findUnique({ where: { id: data.vowId } });
      if (!vow || vow.userId !== request.userId) {
        return reply.status(403).send({ error: "Only the vow owner can post mood here" });
      }
    }

    if (data.note) {
      const check = validateVeiledContent(data.note, user.profileMode);
      if (!check.ok) return reply.status(400).send({ error: check.message });
    }

    const dayStart = startOfUtcDay();
    const todayCount = await prisma.moodUpdate.count({
      where: { userId: request.userId!, createdAt: { gte: dayStart } },
    });
    if (todayCount >= MAX_MOOD_UPDATES_PER_DAY) {
      return reply.status(429).send({
        error: `Mood update limit reached (${MAX_MOOD_UPDATES_PER_DAY}/day). Try again tomorrow.`,
      });
    }

    const moodUpdate = await prisma.moodUpdate.create({
      data: {
        userId: request.userId!,
        mood: data.mood as never,
        note: data.note,
        vowId: data.vowId,
        pactId: data.pactId,
        partnerMatchId: data.partnerMatchId,
      },
      include: { encouragements: true },
    });

    if (data.partnerMatchId) {
      const match = await prisma.partnerMatch.findUniqueOrThrow({ where: { id: data.partnerMatchId } });
      const partnerId = match.userAId === request.userId ? match.userBId : match.userAId;
      await logNotification(
        partnerId,
        "partnerMood",
        `Your partner is feeling ${data.mood.toLowerCase().replace(/_/g, " ")}`
      );
    } else if (data.pactId) {
      const members = await prisma.pactMember.findMany({
        where: { pactId: data.pactId, leftAt: null, userId: { not: request.userId! } },
      });
      for (const m of members) {
        await logNotification(m.userId, "partnerMood", "A pact member shared their mood");
      }
    } else if (data.vowId) {
      const matches = await prisma.partnerMatch.findMany({
        where: { vowId: data.vowId, status: "ACTIVE" },
      });
      for (const m of matches) {
        const partnerId = m.userAId === request.userId ? m.userBId : m.userAId;
        if (partnerId !== request.userId) {
          await logNotification(
            partnerId,
            "partnerMood",
            `Your partner is feeling ${data.mood.toLowerCase().replace(/_/g, " ")}`
          );
        }
      }
    }

    return reply.status(201).send({ moodUpdate });
  });

  app.get("/moods", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as { vowId?: string; pactId?: string; partnerMatchId?: string };
    if (!q.vowId && !q.pactId && !q.partnerMatchId) {
      return reply.status(400).send({ error: "vowId, pactId, or partnerMatchId query required" });
    }

    const access = await canAccessMoodContext(request.userId!, q);
    if (!access.ok) return reply.status(403).send({ error: access.error });

    const moods = await prisma.moodUpdate.findMany({
      where: {
        vowId: q.vowId,
        pactId: q.pactId,
        partnerMatchId: q.partnerMatchId,
      },
      include: {
        user: true,
        encouragements: { include: { fromUser: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      moods: moods.map((m) => ({
        ...m,
        user: sanitizeUserForOthers(m.user),
        encouragements: m.encouragements.map((e) => ({
          ...e,
          fromUser: sanitizeUserForOthers(e.fromUser),
          stickerLabel:
            ENCOURAGEMENT_LABELS[e.sticker as keyof typeof ENCOURAGEMENT_LABELS] || e.sticker,
        })),
      })),
    };
  });

  app.post("/encouragements", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const parsed = createEncouragementSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const data = parsed.data;
    const moodUpdate = await prisma.moodUpdate.findUnique({
      where: { id: data.moodUpdateId },
    });
    if (!moodUpdate) return reply.status(404).send({ error: "Mood update not found" });
    if (moodUpdate.userId === request.userId) {
      return reply.status(400).send({ error: "You can't cheer your own mood" });
    }

    const access = await canAccessMoodContext(request.userId!, {
      vowId: moodUpdate.vowId || undefined,
      pactId: moodUpdate.pactId || undefined,
      partnerMatchId: moodUpdate.partnerMatchId || undefined,
    });
    if (!access.ok) return reply.status(403).send({ error: access.error });

    if (data.note) {
      const check = validateVeiledContent(data.note, user.profileMode);
      if (!check.ok) return reply.status(400).send({ error: check.message });
    }

    const encouragement = await prisma.encouragement.create({
      data: {
        fromUserId: request.userId!,
        toUserId: moodUpdate.userId,
        moodUpdateId: moodUpdate.id,
        sticker: data.sticker as never,
        note: data.note,
      },
    });

    const label =
      ENCOURAGEMENT_LABELS[data.sticker as keyof typeof ENCOURAGEMENT_LABELS] || data.sticker;
    await logNotification(moodUpdate.userId, "encouragement", `Someone sent you: ${label}`);

    return reply.status(201).send({ encouragement });
  });
}
