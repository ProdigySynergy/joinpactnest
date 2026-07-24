import { prisma } from "../lib/prisma";

export async function logNotification(
  userId: string,
  type: string,
  message: string,
  href?: string | null
) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  const notification = await prisma.inAppNotification.create({
    data: {
      userId,
      type,
      message,
      href: href || null,
    },
  });

  console.log(`[NOTIFICATION] user=${userId} type=${type} message=${message}`);

  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  if (tokens.length > 0) {
    console.log(`[PUSH] Would send to ${tokens.length} device(s): ${message}`);
  }

  return { logged: true, prefs, tokenCount: tokens.length, notification };
}

export async function ensureNotificationPrefs(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}
