import { describe, expect, it } from "vitest";
import {
  formatCategory,
  publicPactAppUrl,
  publicPactWebUrl,
  publicVibeAppUrl,
  publicVibeWebUrl,
} from "./share";

describe("share helpers", () => {
  it("formats category labels", () => {
    expect(formatCategory("FITNESS")).toBe("Fitness");
    expect(formatCategory("CUSTOM")).toBe("Custom");
  });

  it("builds public pact URLs", () => {
    expect(publicPactWebUrl("morning-miles")).toContain("/p/morning-miles");
    expect(publicPactAppUrl("morning-miles")).toBe("vowbird://p/morning-miles");
  });

  it("builds public vibe duo URLs", () => {
    expect(publicVibeWebUrl("match-123")).toContain("/vibe/match-123");
    expect(publicVibeAppUrl("match-123")).toBe("vowbird://vibe/match-123");
  });
});
