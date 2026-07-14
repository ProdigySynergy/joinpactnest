import { FastifyInstance } from "fastify";
import {
  sendDirectMessageSchema,
  upsertE2eKeySchema,
  zodErrorToMessage,
} from "@vowbird/shared";
import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { areUsersBlocked, assertNotSuspended } from "../services/safety";

export async function messageRoutes(app: FastifyInstance) {
  app.put("/e2e/keys", { preHandler: authenticate }, async (request, reply) => {
    const parsed = upsertE2eKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const key = await prisma.e2eKey.upsert({
      where: { userId: request.userId! },
      create: { userId: request.userId!, publicKey: parsed.data.publicKey },
      update: { publicKey: parsed.data.publicKey },
    });

    return { key: { userId: key.userId, publicKey: key.publicKey, updatedAt: key.updatedAt } };
  });

  app.get("/e2e/keys/me", { preHandler: authenticate }, async (request) => {
    const key = await prisma.e2eKey.findUnique({ where: { userId: request.userId! } });
    return { key: key ? { userId: key.userId, publicKey: key.publicKey } : null };
  });

  app.get("/e2e/keys/:userId", { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const key = await prisma.e2eKey.findUnique({ where: { userId } });
    if (!key) return reply.status(404).send({ error: "Recipient has not enabled E2E messaging yet" });
    return { key: { userId: key.userId, publicKey: key.publicKey } };
  });

  app.get("/messages/conversations", { preHandler: authenticate }, async (request) => {
    const me = request.userId!;
    const recent = await prisma.directMessage.findMany({
      where: { OR: [{ senderId: me }, { recipientId: me }] },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { sender: true, recipient: true },
    });

    const seen = new Set<string>();
    const conversations: Array<{
      peer: ReturnType<typeof sanitizeUserForOthers>;
      lastMessage: { id: string; senderId: string; ciphertext: string; iv: string; createdAt: Date };
    }> = [];

    for (const msg of recent) {
      const peerId = msg.senderId === me ? msg.recipientId : msg.senderId;
      if (seen.has(peerId)) continue;
      seen.add(peerId);
      const peerUser = msg.senderId === me ? msg.recipient : msg.sender;
      conversations.push({
        peer: sanitizeUserForOthers(peerUser),
        lastMessage: {
          id: msg.id,
          senderId: msg.senderId,
          ciphertext: msg.ciphertext,
          iv: msg.iv,
          createdAt: msg.createdAt,
        },
      });
    }

    return { conversations };
  });

  app.get("/messages/with/:userId", { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const me = request.userId!;
    if (userId === me) return reply.status(400).send({ error: "Cannot message yourself" });

    const peer = await prisma.user.findUnique({ where: { id: userId } });
    if (!peer || peer.isSuspended) return reply.status(404).send({ error: "User not found" });
    if (await areUsersBlocked(me, userId)) {
      return reply.status(403).send({ error: "Messaging unavailable with this user" });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me, recipientId: userId },
          { senderId: userId, recipientId: me },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return {
      peer: sanitizeUserForOthers(peer),
      messages: messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        ciphertext: m.ciphertext,
        iv: m.iv,
        createdAt: m.createdAt,
      })),
    };
  });

  app.post("/messages", { preHandler: authenticate }, async (request, reply) => {
    await assertNotSuspended(request.userId!);
    const parsed = sendDirectMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: zodErrorToMessage(parsed.error) });
    }

    const { recipientId, ciphertext, iv } = parsed.data;
    if (recipientId === request.userId) {
      return reply.status(400).send({ error: "Cannot message yourself" });
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient || recipient.isSuspended) {
      return reply.status(404).send({ error: "User not found" });
    }
    if (await areUsersBlocked(request.userId!, recipientId)) {
      return reply.status(403).send({ error: "Messaging unavailable with this user" });
    }

    const recipientKey = await prisma.e2eKey.findUnique({ where: { userId: recipientId } });
    if (!recipientKey) {
      return reply.status(400).send({ error: "Recipient has not enabled E2E messaging yet" });
    }

    const senderKey = await prisma.e2eKey.findUnique({ where: { userId: request.userId! } });
    if (!senderKey) {
      return reply.status(400).send({ error: "Set up your E2E key before sending messages" });
    }

    const message = await prisma.directMessage.create({
      data: {
        senderId: request.userId!,
        recipientId,
        ciphertext,
        iv,
      },
    });

    return reply.status(201).send({
      message: {
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        ciphertext: message.ciphertext,
        iv: message.iv,
        createdAt: message.createdAt,
      },
    });
  });
}
