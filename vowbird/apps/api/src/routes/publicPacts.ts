import { FastifyInstance } from "fastify";
import { getPublicPactBySlug, listPublicPacts } from "../services/publicPacts";

export async function publicPactRoutes(app: FastifyInstance) {
  app.get("/public/pacts", async () => {
    const pacts = await listPublicPacts();
    return { pacts };
  });

  app.get("/public/pacts/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const profile = await getPublicPactBySlug(slug);
    if (!profile) {
      return reply.status(404).send({ error: "Public pact not found" });
    }
    return profile;
  });
}
