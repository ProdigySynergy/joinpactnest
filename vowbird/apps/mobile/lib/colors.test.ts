import { describe, expect, it } from "vitest";
import { colors } from "./colors";

describe("mobile brand colors", () => {
  it("defines core palette", () => {
    expect(colors.navy).toBe("#0f1729");
    expect(colors.gold).toBe("#d4a853");
    expect(colors.cream).toBe("#f5f0e6");
    expect(colors.sage).toBe("#5a8f7b");
  });
});
