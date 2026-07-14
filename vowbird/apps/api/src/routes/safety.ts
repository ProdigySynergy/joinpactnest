import { FastifyInstance } from "fastify";
import {
  MAX_REPORT_FOLLOW_UPS,
  createBlockSchema,
  createReportCommentSchema,
  createReportSchema,
  formatDisplayName,
  zodErrorToMessage,
} from "@vowbird/shared";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

export async function safetyRoutes(app: FastifyInstance) {
  app.get("/reports/open", { preHandler: authenticate }, async (request, reply) => {
    const { reportedUserId } = request.query as { reportedUserId?: string };
    if (!reportedUserId) {
      return reply.status(400).send({ error: "reportedUserId is required" });
    }

    const reportedUser = await prisma.user.findUnique({ where: { id: reportedUserId } });
    if (!reportedUser) {
      return reply.status(404).send({ error: "User not found" });
    }

    const report = await prisma.report.findFirst({
      where: {
        reporterId: request.userId!,
        reportedUserId,
        status: "OPEN",
      },
      include: {
        comments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      reportedUser: {
        id: reportedUser.id,
        displayName: formatDisplayName(reportedUser),
      },
      report,
      maxFollowUps: MAX_REPORT_FOLLOW_UPS,
    };
  });

  app.post("/reports", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    if (parsed.data.reportedUserId) {
      if (parsed.data.reportedUserId === request.userId) {
        return reply.status(400).send({ error: "Cannot report yourself" });
      }

      const existing = await prisma.report.findFirst({
        where: {
          reporterId: request.userId!,
          reportedUserId: parsed.data.reportedUserId,
          status: "OPEN",
        },
        include: { comments: { orderBy: { createdAt: "asc" } } },
      });

      if (existing) {
        return reply.status(409).send({
          error: "You already have an open report for this user. Add a follow-up comment instead.",
          report: existing,
          maxFollowUps: MAX_REPORT_FOLLOW_UPS,
        });
      }
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
      include: { comments: true },
    });

    return reply.status(201).send({ report, maxFollowUps: MAX_REPORT_FOLLOW_UPS });
  });

  app.post("/reports/:id/comments", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = createReportCommentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: { comments: true },
    });

    if (!report || report.reporterId !== request.userId) {
      return reply.status(404).send({ error: "Report not found" });
    }

    if (report.status !== "OPEN") {
      return reply.status(400).send({ error: "This report is closed. You cannot add more comments." });
    }

    if (report.comments.length >= MAX_REPORT_FOLLOW_UPS) {
      return reply.status(400).send({
        error: `You can only add up to ${MAX_REPORT_FOLLOW_UPS} follow-up comments while waiting for review.`,
      });
    }

    const comment = await prisma.reportComment.create({
      data: {
        reportId: report.id,
        authorId: request.userId!,
        body: parsed.data.body,
      },
    });

    const updated = await prisma.report.findUnique({
      where: { id: report.id },
      include: { comments: { orderBy: { createdAt: "asc" } } },
    });

    return reply.status(201).send({ comment, report: updated, maxFollowUps: MAX_REPORT_FOLLOW_UPS });
  });

  app.post("/blocks", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createBlockSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
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
