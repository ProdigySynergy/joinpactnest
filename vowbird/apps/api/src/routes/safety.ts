import { FastifyInstance } from "fastify";
import { createBlockSchema, createReportSchema } from "@vowbird/shared";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

export async function safetyRoutes(app: FastifyInstance) {
  app.post("/reports", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: request.userId!,
        reportedUserId: parsed.data.reportedUserId,
        postId: parsed.data.postId,
        checkInId: parsed.data.checkInId,
        letterId: parsed.data.letterId,
        reason: parsed.data.reason,
        details: parsed.data.details,
      },
    });

    return reply.status(201).send({ report });
  });

  app.post("/blocks", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createBlockSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    if (parsed.data.blockedUserId === request.userId) {
      return reply.status(400).send({ error: "Cannot block yourself" });
    }

    const block = await prisma.block.upsert({
      where: {
        blockerId_blockedUserId: {
          blockerId: request.userId!,
          blockedUserId: parsed.data.blockedUserId,
        },
      },
      create: {
        blockerId: request.userId!,
        blockedUserId: parsed.data.blockedUserId,
        reason: parsed.data.reason,
      },
      update: { reason: parsed.data.reason },
    });

    const matches = await prisma.partnerMatch.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { userAId: request.userId!, userBId: parsed.data.blockedUserId },
          { userAId: parsed.data.blockedUserId, userBId: request.userId! },
        ],
      },
    });

    for (const m of matches) {
      await prisma.partnerMatch.update({
        where: { id: m.id },
        data: { status: "BLOCKED", endedAt: new Date() },
      });
    }

    return reply.status(201).send({ block });
  });

  app.get("/blocks/me", { preHandler: authenticate }, async (request) => {
    const blocks = await prisma.block.findMany({
      where: { blockerId: request.userId! },
      include: { blockedUser: true },
    });
    return { blocks };
  });

  app.delete("/blocks/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const block = await prisma.block.findUnique({ where: { id } });
    if (!block || block.blockerId !== request.userId) {
      return reply.status(404).send({ error: "Block not found" });
    }
    await prisma.block.delete({ where: { id } });
    return { success: true };
  });
}
