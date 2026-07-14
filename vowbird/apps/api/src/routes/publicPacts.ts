import { FastifyInstance } from "fastify";
import { getPublicPactBySlug, listPublicPactPosts, listPublicPacts } from "../services/publicPacts";

export async function publicPactRoutes(app: FastifyInstance) {
  app.get("/public/pacts", async () => {
    const pacts = await listPublicPacts();
    return { pacts };
  });

  app.get("/public/pacts/:slug/posts", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const data = await listPublicPactPosts(slug);
    if (!data) {
      return reply.status(404).send({ error: "Public pact not found" });
    }
    return data;
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
