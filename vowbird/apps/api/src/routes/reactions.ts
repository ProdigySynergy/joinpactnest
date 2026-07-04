import { FastifyInstance } from "fastify";
import { createReactionSchema } from "@vowbird/shared";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

export async function reactionRoutes(app: FastifyInstance) {
  app.post("/reactions", { preHandler: authenticate }, async (request, reply) => {
    const parsed = createReactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const data = parsed.data;
    const reaction = await prisma.reaction.create({
      data: {
        userId: request.userId!,
        type: data.type as never,
        checkInId: data.checkInId,
        letterId: data.letterId,
        postId: data.postId,
      },
    });

    return reply.status(201).send({ reaction });
  });

  app.delete("/reactions/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const reaction = await prisma.reaction.findUnique({ where: { id } });
    if (!reaction) return reply.status(404).send({ error: "Reaction not found" });
    if (reaction.userId !== request.userId) {
      return reply.status(403).send({ error: "Not your reaction" });
    }
    await prisma.reaction.delete({ where: { id } });
    return { success: true };
  });
}
