import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    partnerMatch: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    pactMember: { findFirst: vi.fn(), findMany: vi.fn() },
    vibeCheck: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../services/notifications", () => ({
  logNotification: vi.fn(),
}));

vi.mock("../services/safety", () => ({
  assertNotSuspended: vi.fn(),
  validateVeiledContent: vi.fn(() => ({ ok: true })),
}));

import { buildApp } from "../app";
import { prisma } from "../lib/prisma";

describe("Vibe routes", () => {
  let app: FastifyInstance;
  let token: string;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    token = app.jwt.sign({ userId: "user-a", role: "USER" });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-a",
      profileMode: "OPEN",
      isSuspended: false,
    } as never);
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      id: "user-a",
      profileMode: "OPEN",
      isSuspended: false,
    } as never);
  });

  it("GET /vibes requires context", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/vibes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /vibes rejects invalid body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/vibes",
      headers: { authorization: `Bearer ${token}` },
      payload: { vibe: "NOT_A_VIBE" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("POST /vibes creates a partner vibe when allowed", async () => {
    vi.mocked(prisma.partnerMatch.findUnique).mockResolvedValue({
      id: "match-1",
      status: "ACTIVE",
      userAId: "user-a",
      userBId: "user-b",
      vibeLeaderboardEnabled: true,
    } as never);
    vi.mocked(prisma.partnerMatch.findUniqueOrThrow).mockResolvedValue({
      id: "match-1",
      status: "ACTIVE",
      userAId: "user-a",
      userBId: "user-b",
    } as never);
    vi.mocked(prisma.vibeCheck.count).mockResolvedValue(0);
    vi.mocked(prisma.vibeCheck.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.vibeCheck.create).mockResolvedValue({
      id: "vibe-1",
      vibe: "DRIVING",
      userId: "user-a",
      partnerMatchId: "match-1",
    } as never);

    const response = await app.inject({
      method: "POST",
      url: "/vibes",
      headers: { authorization: `Bearer ${token}` },
      payload: { vibe: "DRIVING", partnerMatchId: "match-1", note: "On the road" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().vibeCheck.vibe).toBe("DRIVING");
  });

  it("GET /public/vibes/matches/:id hides private duos", async () => {
    vi.mocked(prisma.partnerMatch.findUnique).mockResolvedValue({
      id: "match-1",
      status: "ACTIVE",
      vibesPublic: false,
    } as never);

    const response = await app.inject({
      method: "GET",
      url: "/public/vibes/matches/match-1",
    });
    expect(response.statusCode).toBe(404);
  });
});
