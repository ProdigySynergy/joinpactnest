import { FastifyInstance } from "fastify";
import {
  createPactSchema,
  generateInviteCode,
  joinByCodeSchema,
  parseDateOnly,
  slugify,
  updatePactSettingsSchema,
  zodErrorToMessage,
} from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { getPactLeaderboard } from "../services/progress";
import { assertNotSuspended } from "../services/safety";

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let attempt = 0;
  while (await prisma.pact.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${slugify(base)}-${attempt}`;
  }
  return slug;
}

async function uniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  while (await prisma.pact.findUnique({ where: { inviteCode: code } })) {
    code = generateInviteCode();
  }
  return code;
}

export async function pactRoutes(app: FastifyInstance) {
  app.post("/pacts", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const parsed = createPactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const data = parsed.data;
    const slug = await uniqueSlug(data.title);
    const inviteCode = await uniqueInviteCode();

    const pact = await prisma.pact.create({
      data: {
        ownerId: request.userId!,
        title: data.title,
        slug,
        description: data.description,
        category: data.category as never,
        privacy: data.privacy,
        profileModeAllowed: data.profileModeAllowed,
        frequencyType: data.frequencyType,
        targetCountPerWeek: data.targetCountPerWeek,
        checkInStartTime: data.checkInStartTime,
        checkInEndTime: data.checkInEndTime,
        startDate: parseDateOnly(data.startDate),
        endDate: data.endDate ? parseDateOnly(data.endDate) : null,
        inviteCode,
        noJudgementZone: data.noJudgementZone,
        leaderboardEnabled: data.leaderboardEnabled,
        members: {
          create: {
            userId: request.userId!,
            role: "OWNER",
            displayModeInPact: "OPEN",
          },
        },
      },
      include: { members: true },
    });

    return reply.status(201).send({ pact });
  });

  app.get("/pacts", { preHandler: authenticate }, async (request) => {
    const memberships = await prisma.pactMember.findMany({
      where: { userId: request.userId!, leftAt: null },
      include: { pact: true },
      orderBy: { joinedAt: "desc" },
    });
    return { pacts: memberships.map((m) => ({ ...m.pact, memberRole: m.role })) };
  });

  app.get("/pacts/public", { preHandler: authenticate }, async () => {
    const pacts = await prisma.pact.findMany({
      where: { privacy: "PUBLIC", status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        privacy: true,
        frequencyType: true,
        startDate: true,
        createdAt: true,
      },
    });
    return { pacts };
  });

  app.get("/pacts/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pact = await prisma.pact.findUnique({
      where: { id },
      include: {
        owner: true,
        members: {
          where: { leftAt: null },
          include: { user: true },
        },
      },
    });

    if (!pact) return reply.status(404).send({ error: "Pact not found" });

    const isMember = pact.members.some((m) => m.userId === request.userId);
    if (pact.privacy === "PRIVATE" && !isMember && pact.ownerId !== request.userId) {
      return reply.status(403).send({ error: "Private pact" });
    }

    const leaderboard = pact.leaderboardEnabled ? await getPactLeaderboard(id) : [];
    const { owner, members, ...pactFields } = pact;

    return {
      pact: {
        ...pactFields,
        owner: sanitizeUserForOthers(owner),
        members: members.map((m) => ({
          ...m,
          user: sanitizeUserForOthers(m.user),
        })),
      },
      leaderboard,
      leaderboardEnabled: pact.leaderboardEnabled,
      vibeLeaderboardEnabled: pact.vibeLeaderboardEnabled,
    };
  });

  app.patch("/pacts/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pact = await prisma.pact.findUnique({ where: { id } });
    if (!pact || pact.ownerId !== request.userId) {
      return reply.status(404).send({ error: "Pact not found" });
    }

    const parsed = updatePactSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const data = parsed.data;
    const updated = await prisma.pact.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        noJudgementZone: data.noJudgementZone,
        leaderboardEnabled: data.leaderboardEnabled,
        vibeLeaderboardEnabled: data.vibeLeaderboardEnabled,
        endDate:
          data.endDate === undefined
            ? undefined
            : data.endDate === null
              ? null
              : parseDateOnly(data.endDate),
      },
    });
    return { pact: updated };
  });

  app.delete("/pacts/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const pact = await prisma.pact.findUnique({ where: { id } });
    if (!pact || pact.ownerId !== request.userId) {
      return reply.status(404).send({ error: "Pact not found" });
    }
    await prisma.pact.update({ where: { id }, data: { status: "CANCELLED" } });
    return { success: true };
  });

  app.post("/pacts/:id/join", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as { displayModeInPact?: "VEILED" | "OPEN" };

    const pact = await prisma.pact.findUnique({ where: { id } });
    if (!pact || pact.status !== "ACTIVE") {
      return reply.status(404).send({ error: "Pact not found" });
    }
    if (pact.privacy === "PRIVATE") {
      return reply.status(403).send({ error: "Invite required for this pact" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const displayMode = body.displayModeInPact || user.profileMode;

    const member = await prisma.pactMember.upsert({
      where: { pactId_userId: { pactId: id, userId: request.userId! } },
      create: {
        pactId: id,
        userId: request.userId!,
        displayModeInPact: displayMode,
      },
      update: { leftAt: null, displayModeInPact: displayMode },
    });

    return { member };
  });

  app.post("/pacts/join-by-code", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const parsed = joinByCodeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const pact = await prisma.pact.findUnique({
      where: { inviteCode: parsed.data.inviteCode.toUpperCase() },
    });
    if (!pact || pact.status !== "ACTIVE") {
      return reply.status(404).send({ error: "Invalid invite code" });
    }

    const member = await prisma.pactMember.upsert({
      where: { pactId_userId: { pactId: pact.id, userId: request.userId! } },
      create: {
        pactId: pact.id,
        userId: request.userId!,
        displayModeInPact: parsed.data.displayModeInPact,
      },
      update: { leftAt: null, displayModeInPact: parsed.data.displayModeInPact },
    });

    return { pact, member };
  });

  app.post("/pacts/:id/leave", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await prisma.pactMember.findUnique({
      where: { pactId_userId: { pactId: id, userId: request.userId! } },
    });
    if (!member) return reply.status(404).send({ error: "Not a member" });

    await prisma.pactMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });
    return { success: true };
  });
}
