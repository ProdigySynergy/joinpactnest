import { FastifyInstance } from "fastify";
import { profileModeSchema, updateProfileSchema, zodErrorToMessage } from "@vowbird/shared";
import { sanitizeUser } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { saveUpload } from "../services/upload";

export async function userRoutes(app: FastifyInstance) {
  app.get("/users/me", { preHandler: authenticate }, async (request) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    return { user: sanitizeUser(user) };
  });

  app.patch("/users/me", { preHandler: authenticate }, async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const user = await prisma.user.update({
      where: { id: request.userId! },
      data: parsed.data,
    });
    return { user: sanitizeUser(user) };
  });

  app.patch("/users/me/profile-mode", { preHandler: authenticate }, async (request, reply) => {
    const parsed = profileModeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const user = await prisma.user.update({
      where: { id: request.userId! },
      data: {
        profileMode: parsed.data.profileMode,
        anonymousAlias:
          parsed.data.profileMode === "VEILED"
            ? parsed.data.anonymousAlias || undefined
            : null,
      },
    });
    return { user: sanitizeUser(user) };
  });

  app.post("/users/me/avatar", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    if (user.profileMode !== "OPEN") {
      return reply.status(400).send({ error: "Avatar upload only available in Open Mode" });
    }

    const file = await request.file();
    if (!file) return reply.status(400).send({ error: "No file uploaded" });

    const buffer = await file.toBuffer();
    try {
      const { url } = await saveUpload(user.id, buffer, file.mimetype, "avatar");
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl: url },
      });
      return { user: sanitizeUser(updated) };
    } catch (e) {
      return reply.status(400).send({ error: (e as Error).message });
    }
  });
}
