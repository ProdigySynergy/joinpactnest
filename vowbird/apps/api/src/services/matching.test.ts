import { describe, expect, it, vi } from "vitest";
import { canCreateVow, runMatching } from "./matching";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    vow: { count: vi.fn() },
    partnerRequest: { findMany: vi.fn(), update: vi.fn() },
    partnerMatch: { create: vi.fn(), count: vi.fn() },
    block: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../lib/prisma";

describe("canCreateVow", () => {
  it("allows unlimited vows for plus users", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: "PLUS" } as never);
    await expect(canCreateVow("user-1")).resolves.toBe(true);
  });

  it("enforces free plan vow limit", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: "FREE" } as never);
    vi.mocked(prisma.vow.count).mockResolvedValue(3);
    await expect(canCreateVow("user-1")).resolves.toBe(false);
  });
});

describe("runMatching", () => {
  it("returns zero when no waiting requests", async () => {
    vi.mocked(prisma.partnerRequest.findMany).mockResolvedValue([]);
    await expect(runMatching()).resolves.toEqual({ matched: 0 });
  });
});
