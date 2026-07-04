import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp } from "../app";
import type { FastifyInstance } from "fastify";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    notificationPreference: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from "../lib/prisma";

describe("Auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /auth/register rejects invalid payload", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "bad-email", password: "short" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("POST /auth/login rejects unknown credentials", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "missing@example.com", password: "Password123!" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "Invalid email or password" });
  });

  it("GET /auth/me requires authentication", async () => {
    const response = await app.inject({ method: "GET", url: "/auth/me" });
    expect(response.statusCode).toBe(401);
  });
});
