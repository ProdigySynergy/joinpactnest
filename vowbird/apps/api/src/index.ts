import { buildApp } from "./app";
import { env } from "./lib/env";

async function main() {
  const app = await buildApp({ enableScheduler: true, logger: true });
  await app.listen({ port: env.port, host: env.host });
  app.log.info(`Vowbird API running at http://${env.host}:${env.port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
