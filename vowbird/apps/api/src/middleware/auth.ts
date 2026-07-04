import { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";

export interface JwtPayload {
  userId: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    userRole?: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const payload = await request.jwtVerify<JwtPayload>();
    request.userId = payload.userId;
    request.userRole = payload.role;

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.isSuspended) {
      return reply.status(403).send({ error: "Account suspended or not found" });
    }
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (request.userRole !== "ADMIN") {
    return reply.status(403).send({ error: "Admin access required" });
  }
}

export async function getCurrentUser(userId: string) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}
