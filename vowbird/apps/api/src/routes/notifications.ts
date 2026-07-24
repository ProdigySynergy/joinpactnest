import { FastifyInstance } from "fastify";
import { notificationPrefsSchema, pushTokenSchema, zodErrorToMessage } from "@vowbird/shared";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { ensureNotificationPrefs } from "../services/notifications";

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/notifications", { preHandler: authenticate }, async (request) => {
    const { unreadOnly } = request.query as { unreadOnly?: string };
    const where = {
      userId: request.userId!,
      ...(unreadOnly === "1" || unreadOnly === "true" ? { readAt: null } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.inAppNotification.count({
        where: { userId: request.userId!, readAt: null },
      }),
    ]);

    return { notifications, unreadCount };
  });

  app.get("/notifications/unread-count", { preHandler: authenticate }, async (request) => {
    const unreadCount = await prisma.inAppNotification.count({
      where: { userId: request.userId!, readAt: null },
    });
    return { unreadCount };
  });

  app.post("/notifications/read-all", { preHandler: authenticate }, async (request) => {
    const result = await prisma.inAppNotification.updateMany({
      where: { userId: request.userId!, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  });

  app.post("/notifications/:id/read", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.inAppNotification.findUnique({ where: { id } });
    if (!existing || existing.userId !== request.userId) {
      return reply.status(404).send({ error: "Notification not found" });
    }
    const notification = await prisma.inAppNotification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });
    return { notification };
  });

  app.post("/notifications/register-push-token", { preHandler: authenticate }, async (request, reply) => {
    const parsed = pushTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const token = await prisma.pushToken.upsert({
      where: {
        userId_token: {
          userId: request.userId!,
          token: parsed.data.token,
        },
      },
      create: {
        userId: request.userId!,
        token: parsed.data.token,
        platform: parsed.data.platform,
      },
      update: { platform: parsed.data.platform },
    });

    return { pushToken: token };
  });

  app.get("/notifications/preferences", { preHandler: authenticate }, async (request) => {
    const prefs = await ensureNotificationPrefs(request.userId!);
    return { preferences: prefs };
  });

  app.patch("/notifications/preferences", { preHandler: authenticate }, async (request, reply) => {
    const parsed = notificationPrefsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const prefs = await prisma.notificationPreference.update({
      where: { userId: request.userId! },
      data: parsed.data,
    });
    return { preferences: prefs };
  });
}
