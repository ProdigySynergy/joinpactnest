import { FastifyInstance } from "fastify";
import {
  adminHideContentSchema,
  adminUpdateReportSchema,
  adminUpdateUserSchema,
  zodErrorToMessage,
} from "@vowbird/shared";
import { sanitizeUser } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";

export async function adminRoutes(app: FastifyInstance) {
  const adminPreHandler = [authenticate, requireAdmin];

  app.get("/admin/stats", { preHandler: adminPreHandler }, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalUsers,
      activeUsers,
      activeVows,
      activePacts,
      activeMatches,
      checkInsToday,
      lettersSentThisWeek,
      openReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isSuspended: false } }),
      prisma.vow.count({ where: { status: "ACTIVE" } }),
      prisma.pact.count({ where: { status: "ACTIVE" } }),
      prisma.partnerMatch.count({ where: { status: "ACTIVE" } }),
      prisma.checkIn.count({ where: { checkInDate: { gte: today }, status: "COMPLETED" } }),
      prisma.letter.count({ where: { status: "SENT", sentAt: { gte: weekAgo } } }),
      prisma.report.count({ where: { status: "OPEN" } }),
    ]);

    return {
      stats: {
        totalUsers,
        activeUsers,
        activeVows,
        activePacts,
        activeMatches,
        checkInsToday,
        lettersSentThisWeek,
        openReports,
      },
    };
  });

  app.get("/admin/users", { preHandler: adminPreHandler }, async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return { users: users.map(sanitizeUser) };
  });

  app.patch("/admin/users/:id", { preHandler: adminPreHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = adminUpdateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const user = await prisma.user.update({ where: { id }, data: parsed.data });
    return { user: sanitizeUser(user) };
  });

  app.get("/admin/reports", { preHandler: adminPreHandler }, async () => {
    const reports = await prisma.report.findMany({
      include: {
        reporter: true,
        reportedUser: true,
        comments: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return { reports };
  });

  app.patch("/admin/reports/:id", { preHandler: adminPreHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = adminUpdateReportSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const report = await prisma.report.update({
      where: { id },
      data: { status: parsed.data.status },
    });
    return { report };
  });

  app.patch("/admin/content/hide", { preHandler: adminPreHandler }, async (request, reply) => {
    const parsed = adminHideContentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const { type, id } = parsed.data;
    if (type === "post") {
      await prisma.roomPost.update({ where: { id }, data: { hiddenAt: new Date() } });
    } else if (type === "checkIn") {
      await prisma.checkIn.delete({ where: { id } });
    } else if (type === "letter") {
      await prisma.letter.delete({ where: { id } });
    }

    return { success: true };
  });

  app.patch("/admin/content/unhide", { preHandler: adminPreHandler }, async (request, reply) => {
    const parsed = adminHideContentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    if (parsed.data.type === "post") {
      await prisma.roomPost.update({
        where: { id: parsed.data.id },
        data: { hiddenAt: null },
      });
    }

    return { success: true };
  });

  app.post("/admin/matches/:id/end", { preHandler: adminPreHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const match = await prisma.partnerMatch.update({
      where: { id },
      data: { status: "ENDED", endedAt: new Date() },
    });
    return { match };
  });
}
