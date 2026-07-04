import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import type { FastifyInstance } from "fastify";

describe("API health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns ok", async () => {
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", service: "vowbird-api" });
  });
});
