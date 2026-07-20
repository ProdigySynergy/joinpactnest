import {
  MAX_VIBE_CHECKS_PER_DAY,
  VIBE_LABELS,
  VIBE_UPDATE_COOLDOWN_MINUTES,
  createVibeCheckSchema,
  updateMatchVibeSettingsSchema,
  zodErrorToMessage,
} from "@vowbird/shared";
import { FastifyInstance } from "fastify";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { logNotification } from "../services/notifications";
import { assertNotSuspended, validateVeiledContent } from "../services/safety";
import { getVibeLeaderboard, mapVibeRows } from "../services/vibeLeaderboard";

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function canAccessVibeContext(
  userId: string,
  opts: { pactId?: string; partnerMatchId?: string }
): Promise<{ ok: boolean; error?: string; vibeLeaderboardEnabled?: boolean }> {
  if (opts.partnerMatchId) {
    const match = await prisma.partnerMatch.findUnique({ where: { id: opts.partnerMatchId } });
    if (!match || match.status !== "ACTIVE") return { ok: false, error: "Match not found" };
    if (match.userAId !== userId && match.userBId !== userId) {
      return { ok: false, error: "Access denied" };
    }
    return { ok: true, vibeLeaderboardEnabled: match.vibeLeaderboardEnabled };
  }

  if (opts.pactId) {
    const member = await prisma.pactMember.findFirst({
      where: { pactId: opts.pactId, userId, leftAt: null },
      include: { pact: true },
    });
    if (!member) return { ok: false, error: "Not a pact member" };
    return { ok: true, vibeLeaderboardEnabled: member.pact.vibeLeaderboardEnabled };
  }

  return { ok: false, error: "Invalid context" };
}

function serializeVibeFeed(
  vibes: Array<{
    id: string;
    userId: string;
    vibe: string;
    note: string | null;
    createdAt: Date;
    user: Parameters<typeof sanitizeUserForOthers>[0];
  }>
) {
  const mapped = mapVibeRows(vibes);
  const latestByUser = new Map<string, (typeof mapped)[number]>();
  for (const v of mapped) {
    if (!latestByUser.has(v.userId)) latestByUser.set(v.userId, v);
  }
  return {
    vibes: mapped,
    currentVibes: [...latestByUser.values()],
  };
}

export async function vibeRoutes(app: FastifyInstance) {
  app.post("/vibes", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const parsed = createVibeCheckSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const data = parsed.data;
    const access = await canAccessVibeContext(request.userId!, data);
    if (!access.ok) return reply.status(403).send({ error: access.error });

    if (data.note) {
      const check = validateVeiledContent(data.note, user.profileMode);
      if (!check.ok) return reply.status(400).send({ error: check.message });
    }

    const dayStart = startOfUtcDay();
    const todayCount = await prisma.vibeCheck.count({
      where: { userId: request.userId!, createdAt: { gte: dayStart } },
    });
    if (todayCount >= MAX_VIBE_CHECKS_PER_DAY) {
      return reply.status(429).send({
        error: `Vibe Check limit reached (${MAX_VIBE_CHECKS_PER_DAY}/day). Come back tomorrow.`,
      });
    }

    const latest = await prisma.vibeCheck.findFirst({
      where: { userId: request.userId! },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (latest) {
      const cooldownMs = VIBE_UPDATE_COOLDOWN_MINUTES * 60 * 1000;
      const elapsed = Date.now() - latest.createdAt.getTime();
      if (elapsed < cooldownMs) {
        const nextAllowedAt = new Date(latest.createdAt.getTime() + cooldownMs);
        const minsLeft = Math.ceil((cooldownMs - elapsed) / 60_000);
        return reply.status(429).send({
          error: `Easy there — drop another vibe in about ${minsLeft} min.`,
          nextAllowedAt: nextAllowedAt.toISOString(),
        });
      }
    }

    const vibeCheck = await prisma.vibeCheck.create({
      data: {
        userId: request.userId!,
        vibe: data.vibe as never,
        note: data.note,
        pactId: data.pactId,
        partnerMatchId: data.partnerMatchId,
      },
    });

    const label = VIBE_LABELS[data.vibe as keyof typeof VIBE_LABELS] || data.vibe;

    if (data.partnerMatchId) {
      const match = await prisma.partnerMatch.findUniqueOrThrow({
        where: { id: data.partnerMatchId },
      });
      const partnerId = match.userAId === request.userId ? match.userBId : match.userAId;
      await logNotification(partnerId, "partnerVibe", `Your partner's vibe: ${label}`);
    } else if (data.pactId) {
      const members = await prisma.pactMember.findMany({
        where: { pactId: data.pactId, leftAt: null, userId: { not: request.userId! } },
        take: 20,
      });
      for (const m of members) {
        await logNotification(m.userId, "partnerVibe", `Pact vibe check: ${label}`);
      }
    }

    return reply.status(201).send({ vibeCheck });
  });

  app.get("/vibes", { preHandler: authenticate }, async (request, reply) => {
    const q = request.query as { pactId?: string; partnerMatchId?: string };
    if (!q.pactId && !q.partnerMatchId) {
      return reply.status(400).send({ error: "pactId or partnerMatchId query required" });
    }

    const access = await canAccessVibeContext(request.userId!, q);
    if (!access.ok) return reply.status(403).send({ error: access.error });

    const vibes = await prisma.vibeCheck.findMany({
      where: {
        pactId: q.pactId,
        partnerMatchId: q.partnerMatchId,
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

      const feed = serializeVibeFeed(vibes);
    const vibeLeaderboard = access.vibeLeaderboardEnabled
      ? await getVibeLeaderboard({
          partnerMatchId: q.partnerMatchId,
          pactId: q.pactId,
        })
      : [];

    return {
      ...feed,
      vibeLeaderboard,
      vibeLeaderboardEnabled: !!access.vibeLeaderboardEnabled,
    };
  });

  app.patch("/matches/:id/vibe-settings", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateMatchVibeSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const match = await prisma.partnerMatch.findUnique({ where: { id } });
    if (!match || match.status !== "ACTIVE") {
      return reply.status(404).send({ error: "Match not found" });
    }
    if (match.userAId !== request.userId && match.userBId !== request.userId) {
      return reply.status(403).send({ error: "Not your match" });
    }

    const updated = await prisma.partnerMatch.update({
      where: { id },
      data: {
        vibesPublic: parsed.data.vibesPublic,
        vibeLeaderboardEnabled: parsed.data.vibeLeaderboardEnabled,
      },
    });

    return {
      match: {
        id: updated.id,
        vibesPublic: updated.vibesPublic,
        vibeLeaderboardEnabled: updated.vibeLeaderboardEnabled,
      },
    };
  });

  /** Public duo vibe feed — only when vibesPublic is on. */
  app.get("/public/vibes/matches/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const match = await prisma.partnerMatch.findUnique({
      where: { id },
      include: { userA: true, userB: true, vow: true },
    });
    if (!match || match.status !== "ACTIVE" || !match.vibesPublic) {
      return reply.status(404).send({ error: "Public vibe duo not found" });
    }

    const vibes = await prisma.vibeCheck.findMany({
      where: { partnerMatchId: id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const feed = serializeVibeFeed(vibes);
    const vibeLeaderboard = match.vibeLeaderboardEnabled
      ? await getVibeLeaderboard({ partnerMatchId: id })
      : [];

    return {
      match: {
        id: match.id,
        matchMode: match.matchMode,
        vowTitle: match.vow.title,
        partners: [sanitizeUserForOthers(match.userA), sanitizeUserForOthers(match.userB)],
      },
      ...feed,
      vibeLeaderboard,
      vibeLeaderboardEnabled: match.vibeLeaderboardEnabled,
    };
  });

  /** Browse recently active public vibe duos. */
  app.get("/public/vibes/matches", async () => {
    const matches = await prisma.partnerMatch.findMany({
      where: { vibesPublic: true, status: "ACTIVE" },
      include: {
        userA: true,
        userB: true,
        vow: true,
        vibeChecks: { orderBy: { createdAt: "desc" }, take: 1, include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return {
      matches: matches.map((m) => {
        const latest = m.vibeChecks[0];
        return {
          id: m.id,
          vowTitle: m.vow.title,
          partners: [sanitizeUserForOthers(m.userA), sanitizeUserForOthers(m.userB)],
          latestVibe: latest
            ? {
                vibe: latest.vibe,
                label: VIBE_LABELS[latest.vibe as keyof typeof VIBE_LABELS] || latest.vibe,
                note: latest.note,
                createdAt: latest.createdAt,
                user: sanitizeUserForOthers(latest.user),
              }
            : null,
        };
      }),
    };
  });

  /** Public pact room vibes (PUBLIC privacy only). */
  app.get("/public/pacts/:slug/vibes", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const pact = await prisma.pact.findUnique({ where: { slug } });
    if (!pact || pact.privacy !== "PUBLIC" || pact.status !== "ACTIVE") {
      return reply.status(404).send({ error: "Public pact not found" });
    }

    const vibes = await prisma.vibeCheck.findMany({
      where: { pactId: pact.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const feed = serializeVibeFeed(vibes);
    const vibeLeaderboard = pact.vibeLeaderboardEnabled
      ? await getVibeLeaderboard({ pactId: pact.id })
      : [];

    return {
      pact: { id: pact.id, slug: pact.slug, title: pact.title },
      ...feed,
      vibeLeaderboard,
      vibeLeaderboardEnabled: pact.vibeLeaderboardEnabled,
    };
  });
}
