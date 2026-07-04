import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { join } from "path";
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
import { runMatching } from "./services/matching";

async function main() {
  const app = Fastify({ logger: true });

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

  await app.listen({ port: env.port, host: env.host });
  app.log.info(`Vowbird API running at http://${env.host}:${env.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
