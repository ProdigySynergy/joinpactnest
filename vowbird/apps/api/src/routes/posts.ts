import { FastifyInstance } from "fastify";
import { createRoomPostSchema, zodErrorToMessage } from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { validateVeiledContent } from "../services/safety";

export async function postRoutes(app: FastifyInstance) {
  app.post("/pacts/:id/posts", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    if (user.isSuspended) {
      return reply.status(403).send({ error: "Account suspended" });
    }

    const { id } = request.params as { id: string };
    const member = await prisma.pactMember.findFirst({
      where: { pactId: id, userId: request.userId!, leftAt: null },
    });
    if (!member) return reply.status(403).send({ error: "Not a member" });

    const parsed = createRoomPostSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const check = validateVeiledContent(parsed.data.body, member.displayModeInPact);
    if (!check.ok) return reply.status(400).send({ error: check.message });

    const post = await prisma.roomPost.create({
      data: {
        pactId: id,
        userId: request.userId!,
        body: parsed.data.body,
      },
      include: { user: true },
    });

    return reply.status(201).send({
      post: { ...post, user: sanitizeUserForOthers(post.user) },
    });
  });

  app.get("/pacts/:id/posts", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const member = await prisma.pactMember.findFirst({
      where: { pactId: id, userId: request.userId!, leftAt: null },
    });
    if (!member) return reply.status(403).send({ error: "Not a member" });

    const posts = await prisma.roomPost.findMany({
      where: { pactId: id, hiddenAt: null },
      include: { user: true, reactions: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      posts: posts.map((p) => ({
        ...p,
        user: sanitizeUserForOthers(p.user),
      })),
    };
  });

  app.delete("/posts/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const post = await prisma.roomPost.findUnique({ where: { id } });
    if (!post) return reply.status(404).send({ error: "Post not found" });
    if (post.userId !== request.userId && request.userRole !== "ADMIN") {
      return reply.status(403).send({ error: "Not your post" });
    }
    await prisma.roomPost.delete({ where: { id } });
    return { success: true };
  });
}
