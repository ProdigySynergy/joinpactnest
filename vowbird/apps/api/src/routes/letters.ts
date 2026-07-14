import { FastifyInstance } from "fastify";
import {
  createLetterSchema,
  scheduleLetterSchema,
  updateLetterSchema,
  zodErrorToMessage,
} from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { logNotification } from "../services/notifications";
import { validateVeiledContent } from "../services/safety";

export async function letterRoutes(app: FastifyInstance) {
  app.post("/letters", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    if (user.isSuspended) {
      return reply.status(403).send({ error: "Account suspended" });
    }

    const parsed = createLetterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const data = parsed.data;
    const contentCheck = validateVeiledContent(`${data.subject} ${data.body}`, user.profileMode);
    if (!contentCheck.ok) {
      return reply.status(400).send({ error: contentCheck.message });
    }

    const letter = await prisma.letter.create({
      data: {
        senderId: request.userId!,
        recipientId: data.recipientId,
        vowId: data.vowId,
        pactId: data.pactId,
        partnerMatchId: data.partnerMatchId,
        type: data.type,
        subject: data.subject,
        body: data.body,
        status: "DRAFT",
      },
    });

    return reply.status(201).send({ letter });
  });

  app.get("/letters/me", { preHandler: authenticate }, async (request) => {
    const letters = await prisma.letter.findMany({
      where: {
        OR: [
          { senderId: request.userId! },
          { recipientId: request.userId! },
        ],
      },
      include: { sender: true, recipient: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      letters: letters.map((l) => ({
        ...l,
        sender: sanitizeUserForOthers(l.sender),
        recipient: l.recipient ? sanitizeUserForOthers(l.recipient) : null,
      })),
    };
  });

  app.get("/letters/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const letter = await prisma.letter.findUnique({
      where: { id },
      include: { sender: true, recipient: true, reactions: true },
    });

    if (!letter) return reply.status(404).send({ error: "Letter not found" });
    if (letter.senderId !== request.userId && letter.recipientId !== request.userId) {
      return reply.status(403).send({ error: "Access denied" });
    }

    if (letter.recipientId === request.userId && !letter.readAt && letter.status === "SENT") {
      await prisma.letter.update({ where: { id }, data: { readAt: new Date() } });
    }

    return {
      letter: {
        ...letter,
        sender: sanitizeUserForOthers(letter.sender),
        recipient: letter.recipient ? sanitizeUserForOthers(letter.recipient) : null,
      },
    };
  });

  app.patch("/letters/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateLetterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const letter = await prisma.letter.findUnique({ where: { id } });
    if (!letter || letter.senderId !== request.userId) {
      return reply.status(404).send({ error: "Letter not found" });
    }
    if (letter.status !== "DRAFT") {
      return reply.status(400).send({ error: "Can only edit drafts" });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: request.userId! } });
    const content = `${parsed.data.subject || letter.subject} ${parsed.data.body || letter.body}`;
    const contentCheck = validateVeiledContent(content, user.profileMode);
    if (!contentCheck.ok) {
      return reply.status(400).send({ error: contentCheck.message });
    }

    const updated = await prisma.letter.update({
      where: { id },
      data: parsed.data,
    });
    return { letter: updated };
  });

  app.post("/letters/:id/send", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const letter = await prisma.letter.findUnique({ where: { id } });
    if (!letter || letter.senderId !== request.userId) {
      return reply.status(404).send({ error: "Letter not found" });
    }

    const updated = await prisma.letter.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    if (updated.recipientId) {
      await logNotification(updated.recipientId, "partnerLetter", "You received a letter!");
    }

    return { letter: updated };
  });

  app.post("/letters/:id/schedule", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = scheduleLetterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const letter = await prisma.letter.findUnique({ where: { id } });
    if (!letter || letter.senderId !== request.userId) {
      return reply.status(404).send({ error: "Letter not found" });
    }

    const updated = await prisma.letter.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        unlockAt: new Date(parsed.data.unlockAt),
      },
    });
    return { letter: updated };
  });

  app.delete("/letters/:id", { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const letter = await prisma.letter.findUnique({ where: { id } });
    if (!letter || letter.senderId !== request.userId) {
      return reply.status(404).send({ error: "Letter not found" });
    }
    await prisma.letter.delete({ where: { id } });
    return { success: true };
  });
}
