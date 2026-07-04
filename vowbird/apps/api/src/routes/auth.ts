import { FastifyInstance } from "fastify";
import {
  loginSchema,
  pickRandomAlias,
  registerSchema,
  VEILED_ALIASES,
} from "@vowbird/shared";
import { hashPassword, sanitizeUser, verifyPassword } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { ensureNotificationPrefs } from "../services/notifications";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", {
    config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const data = parsed.data;
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) {
      return reply.status(409).send({ error: "Email or username already in use" });
    }

    const passwordHash = await hashPassword(data.password);
    const anonymousAlias =
      data.profileMode === "VEILED"
        ? pickRandomAlias(VEILED_ALIASES)
        : null;

    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        passwordHash,
        profileMode: data.profileMode,
        anonymousAlias,
        timezone: data.timezone,
        preferredCheckInTime: data.preferredCheckInTime,
      },
    });

    await ensureNotificationPrefs(user.id);

    const token = app.jwt.sign({ userId: user.id, role: user.role });
    return reply.status(201).send({ token, user: sanitizeUser(user) });
  });

  app.post("/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.status(401).send({ error: "Invalid email or password" });
    }
    if (user.isSuspended) {
      return reply.status(403).send({ error: "Account suspended" });
    }

    const token = app.jwt.sign({ userId: user.id, role: user.role });
    return { token, user: sanitizeUser(user) };
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    return { user: sanitizeUser(user) };
  });

  app.post("/auth/logout", { preHandler: authenticate }, async () => {
    return { success: true };
  });
}
