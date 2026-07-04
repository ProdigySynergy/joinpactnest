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
        json: async () => ({ error: "Unauthorized" }),
      })
    );

    await expect(api("/auth/me")).rejects.toThrow("Unauthorized");
    vi.unstubAllGlobals();
  });
});
