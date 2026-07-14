import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { env } from "./lib/env";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { vowRoutes } from "./routes/vows";
import { pactRoutes } from "./routes/pacts";
import { partnerRoutes } from "./routes/partners";
import { checkInRoutes } from "./routes/checkins";
import { letterRoutes } from "./routes/letters";
import { postRoutes } from "./routes/posts";
import { reactionRoutes } from "./routes/reactions";
import { safetyRoutes } from "./routes/safety";
import { notificationRoutes } from "./routes/notifications";
import { adminRoutes } from "./routes/admin";
import { publicPactRoutes } from "./routes/publicPacts";
import { runMatching } from "./services/matching";

export interface BuildAppOptions {
  enableScheduler?: boolean;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { enableScheduler = false, logger = false } = options;
  const app = Fastify({ logger });

  await app.register(cors, { origin: env.corsOrigin, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(jwt, { secret: env.jwtSecret });
  await app.register(multipart, {
    limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  });
  await app.register(fastifyStatic, {
    root: env.uploadDir,
    prefix: "/uploads/",
    decorateReply: false,
  });

  app.get("/health", async () => ({ status: "ok", service: "vowbird-api" }));

  await app.register(publicPactRoutes);
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(vowRoutes);
  await app.register(pactRoutes);
  await app.register(partnerRoutes);
  await app.register(checkInRoutes);
  await app.register(letterRoutes);
  await app.register(postRoutes);
  await app.register(reactionRoutes);
  await app.register(safetyRoutes);
  await app.register(notificationRoutes);
  await app.register(adminRoutes);

  if (enableScheduler) {
    setInterval(async () => {
      try {
        const result = await runMatching();
        if (result.matched > 0) {
          app.log.info(`Auto-matching: ${result.matched} new matches`);
        }
      } catch (e) {
        app.log.error(e);
      }
    }, 60_000);
  }

  return app;
}
