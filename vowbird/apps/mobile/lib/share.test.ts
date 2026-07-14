import { describe, expect, it } from "vitest";
import { formatCategory, publicPactAppUrl, publicPactWebUrl } from "./share";

describe("share helpers", () => {
  it("formats category labels", () => {
    expect(formatCategory("FITNESS")).toBe("Fitness");
    expect(formatCategory("CUSTOM")).toBe("Custom");
  });

  it("builds public pact URLs", () => {
    expect(publicPactWebUrl("morning-miles")).toContain("/p/morning-miles");
    expect(publicPactAppUrl("morning-miles")).toBe("vowbird://p/morning-miles");
  });
});
