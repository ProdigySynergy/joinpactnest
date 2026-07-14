import { FastifyInstance } from "fastify";
import {
  createPacterRequestSchema,
  mutePacterSchema,
  zodErrorToMessage,
} from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { getPacterRelation, listPacterNetwork } from "../services/pacters";
import { areUsersBlocked, assertNotSuspended } from "../services/safety";

export async function pacterRoutes(app: FastifyInstance) {
  app.get("/pacters/me", { preHandler: authenticate }, async (request) => {
    const pacters = await listPacterNetwork(request.userId!);
    return { pacters };
  });

  app.get("/pacters/requests", { preHandler: authenticate }, async (request) => {
    const [incoming, outgoing] = await Promise.all([
      prisma.pacterRequest.findMany({
        where: { toUserId: request.userId!, status: "PENDING" },
        include: { fromUser: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pacterRequest.findMany({
        where: { fromUserId: request.userId!, status: "PENDING" },
        include: { toUser: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      incoming: incoming.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        user: sanitizeUserForOthers(r.fromUser),
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        user: sanitizeUserForOthers(r.toUser),
      })),
    };
  });

  app.get("/pacters/relation/:userId", { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.isSuspended) {
      return reply.status(404).send({ error: "User not found" });
    }
    const relation = await getPacterRelation(request.userId!, userId);
    return { relation };
  });

  app.post("/pacters/requests", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const parsed = createPacterRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const toUserId = parsed.data.toUserId;
    if (toUserId === request.userId) {
      return reply.status(400).send({ error: "Cannot pacter yourself" });
    }

    const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!toUser || toUser.isSuspended) {
      return reply.status(404).send({ error: "User not found" });
    }

    if (await areUsersBlocked(request.userId!, toUserId)) {
      return reply.status(403).send({ error: "Cannot send pacter request to this user" });
    }

    const reverse = await prisma.pacterRequest.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: toUserId, toUserId: request.userId! },
      },
    });
    if (reverse?.status === "PENDING") {
      const accepted = await prisma.pacterRequest.update({
        where: { id: reverse.id },
        data: { status: "ACCEPTED" },
      });
      return reply.status(200).send({ request: accepted, autoAccepted: true });
    }
    if (reverse?.status === "ACCEPTED") {
      return reply.status(200).send({ request: reverse, alreadyPactered: true });
    }

    const existing = await prisma.pacterRequest.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: request.userId!, toUserId },
      },
    });
    if (existing?.status === "PENDING") {
      return reply.status(200).send({ request: existing });
    }
    if (existing?.status === "ACCEPTED") {
      return reply.status(200).send({ request: existing, alreadyPactered: true });
    }

    const created = await prisma.pacterRequest.upsert({
      where: {
        fromUserId_toUserId: { fromUserId: request.userId!, toUserId },
      },
      create: {
        fromUserId: request.userId!,
        toUserId,
        status: "PENDING",
      },
      update: { status: "PENDING" },
    });

    return reply.status(201).send({ request: created });
  });

  app.post("/pacters/requests/:id/accept", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await prisma.pacterRequest.findUnique({ where: { id } });
    if (!req || req.toUserId !== request.userId) {
      return reply.status(404).send({ error: "Request not found" });
    }
    if (req.status !== "PENDING") {
      return reply.status(400).send({ error: "Request is no longer pending" });
    }
    const updated = await prisma.pacterRequest.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });
    return { request: updated };
  });

  app.post("/pacters/requests/:id/decline", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await prisma.pacterRequest.findUnique({ where: { id } });
    if (!req || req.toUserId !== request.userId) {
      return reply.status(404).send({ error: "Request not found" });
    }
    if (req.status !== "PENDING") {
      return reply.status(400).send({ error: "Request is no longer pending" });
    }
    const updated = await prisma.pacterRequest.update({
      where: { id },
      data: { status: "DECLINED" },
    });
    return { request: updated };
  });

  app.post("/pacters/requests/:id/cancel", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = await prisma.pacterRequest.findUnique({ where: { id } });
    if (!req || req.fromUserId !== request.userId) {
      return reply.status(404).send({ error: "Request not found" });
    }
    if (req.status !== "PENDING") {
      return reply.status(400).send({ error: "Request is no longer pending" });
    }
    const updated = await prisma.pacterRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return { request: updated };
  });

  app.post("/pacters/mute", { preHandler: authenticate }, async (request, reply) => {
    const parsed = mutePacterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }
    if (parsed.data.mutedUserId === request.userId) {
      return reply.status(400).send({ error: "Cannot mute yourself" });
    }

    const mute = await prisma.pacterMute.upsert({
      where: {
        userId_mutedUserId: {
          userId: request.userId!,
          mutedUserId: parsed.data.mutedUserId,
        },
      },
      create: {
        userId: request.userId!,
        mutedUserId: parsed.data.mutedUserId,
      },
      update: {},
    });

    return reply.status(201).send({ mute });
  });

  app.delete("/pacters/mute/:userId", { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const mute = await prisma.pacterMute.findUnique({
      where: {
        userId_mutedUserId: { userId: request.userId!, mutedUserId: userId },
      },
    });
    if (!mute) return reply.status(404).send({ error: "Mute not found" });
    await prisma.pacterMute.delete({ where: { id: mute.id } });
    return { success: true };
  });

  app.get("/pacters/muted", { preHandler: authenticate }, async (request) => {
    const mutes = await prisma.pacterMute.findMany({
      where: { userId: request.userId! },
      include: { mutedUser: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      muted: mutes.map((m) => ({
        id: m.id,
        createdAt: m.createdAt,
        user: sanitizeUserForOthers(m.mutedUser),
      })),
    };
  });
}
