import { FastifyInstance } from "fastify";
import { createVowSchema, parseDateOnly, updateVowSchema } from "@vowbird/shared";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canCreateVow } from "../services/matching";
import { assertNotSuspended } from "../services/safety";

export async function vowRoutes(app: FastifyInstance) {
  app.post("/vows", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const parsed = createVowSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const canCreate = await canCreateVow(request.userId!);
    if (!canCreate) {
      return reply.status(403).send({
        error: "Free plan limit: 3 active vows. Upgrade to Plus for unlimited vows.",
      });
    }

    const data = parsed.data;
    const vow = await prisma.vow.create({
      data: {
        userId: request.userId!,
        title: data.title,
        reason: data.reason,
        category: data.category as never,
        frequencyType: data.frequencyType,
        targetCountPerWeek: data.targetCountPerWeek,
        startDate: parseDateOnly(data.startDate),
        endDate: data.endDate ? parseDateOnly(data.endDate) : null,
        visibility: data.visibility,
        noJudgementZone: data.noJudgementZone,
        leaderboardEnabled: data.leaderboardEnabled,
      },
    });
    return reply.status(201).send({ vow });
  });

  app.get("/vows", { preHandler: authenticate }, async (request) => {
    const vows = await prisma.vow.findMany({
      where: { userId: request.userId! },
      orderBy: { createdAt: "desc" },
    });
    return { vows };
  });

  app.get("/vows/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const vow = await prisma.vow.findUnique({ where: { id } });
    if (!vow || vow.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }
    return { vow };
  });

  app.patch("/vows/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateVowSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const existing = await prisma.vow.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }

    const data = parsed.data;
    const vow = await prisma.vow.update({
      where: { id },
      data: {
        title: data.title,
        reason: data.reason,
        category: data.category as never | undefined,
        frequencyType: data.frequencyType,
        targetCountPerWeek: data.targetCountPerWeek,
        visibility: data.visibility,
        noJudgementZone: data.noJudgementZone,
        leaderboardEnabled: data.leaderboardEnabled,
        startDate: data.startDate ? parseDateOnly(data.startDate) : undefined,
        endDate: data.endDate ? parseDateOnly(data.endDate) : data.endDate === null ? null : undefined,
      },
    });
    return { vow };
  });

  app.delete("/vows/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.vow.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }
    await prisma.vow.update({ where: { id }, data: { status: "CANCELLED" } });
    return { success: true };
  });

  app.post("/vows/:id/pause", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.vow.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }
    const vow = await prisma.vow.update({ where: { id }, data: { status: "PAUSED" } });
    return { vow };
  });

  app.post("/vows/:id/complete", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.vow.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.userId) {
      return reply.status(404).send({ error: "Vow not found" });
    }
    const vow = await prisma.vow.update({ where: { id }, data: { status: "COMPLETED" } });
    return { vow };
  });
}
