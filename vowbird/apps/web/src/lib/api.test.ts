import { afterEach, describe, expect, it, vi } from "vitest";
import { clearToken, getToken, setToken } from "./api";

describe("web api auth storage", () => {
  afterEach(() => {
    clearToken();
  });

  it("stores and clears JWT in localStorage", () => {
    expect(getToken()).toBeNull();
    setToken("test-token");
    expect(getToken()).toBe("test-token");
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe("api client", () => {
  it("throws readable errors from failed requests", async () => {
    const { api } = await import("./api");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
        json: async () => ({ error: "Unauthorized" }),
      })
    );

    await expect(api("/auth/me")).rejects.toThrow("Unauthorized");
    vi.unstubAllGlobals();
  });

  it("omits Content-Type when body is empty (Fastify-safe POSTs)", async () => {
    const { api } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api("/partner-requests/x/accept", { method: "POST" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBeUndefined();
    vi.unstubAllGlobals();
  });
});
