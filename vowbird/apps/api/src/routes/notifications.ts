import { FastifyInstance } from "fastify";
import { notificationPrefsSchema, pushTokenSchema, zodErrorToMessage } from "@vowbird/shared";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { ensureNotificationPrefs } from "../services/notifications";

export async function notificationRoutes(app: FastifyInstance) {
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
