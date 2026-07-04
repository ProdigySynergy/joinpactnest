import { describe, expect, it } from "vitest";
import { validateVeiledContent } from "./safety";

describe("validateVeiledContent", () => {
  it("allows safe text in veiled mode", () => {
    const result = validateVeiledContent("You got this!", "VEILED");
    expect(result.ok).toBe(true);
  });

  it("blocks contact info in veiled mode", () => {
    const result = validateVeiledContent("Email me at test@example.com", "VEILED");
    expect(result.ok).toBe(false);
    expect(result.message).toContain("email address");
  });

  it("allows contact info in open mode", () => {
    const result = validateVeiledContent("Email me at test@example.com", "OPEN");
    expect(result.ok).toBe(true);
  });
});
