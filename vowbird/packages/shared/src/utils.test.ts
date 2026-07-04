import { describe, expect, it } from "vitest";
import {
  createVowSchema,
  loginSchema,
  registerSchema,
} from "./schemas";
import {
  formatDisplayName,
  generateInviteCode,
  getWeekStart,
  parseDateOnly,
  scanForContactInfo,
  slugify,
  toDateString,
} from "./utils";

describe("scanForContactInfo", () => {
  it("detects email, phone, social, and address patterns", () => {
    expect(scanForContactInfo("reach me at test@example.com")).toContain("email address");
    expect(scanForContactInfo("call 555-123-4567")).toContain("phone number");
    expect(scanForContactInfo("find me @someuser")).toContain("social handle");
    expect(scanForContactInfo("123 Main Street")).toContain("physical address");
  });

  it("returns empty for safe text", () => {
    expect(scanForContactInfo("Great check-in today!")).toEqual([]);
  });

  it("detects multiple issues in one message", () => {
    const issues = scanForContactInfo("Email me at a@b.com or call 555-123-4567");
    expect(issues).toContain("email address");
    expect(issues).toContain("phone number");
  });
});

describe("slugify", () => {
  it("normalizes titles into URL slugs", () => {
    expect(slugify("Morning Runners Club!!")).toBe("morning-runners-club");
  });
});

describe("generateInviteCode", () => {
  it("returns an 8-character uppercase code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });
});

describe("formatDisplayName", () => {
  it("uses alias in veiled mode", () => {
    expect(
      formatDisplayName({
        profileMode: "VEILED",
        name: "Real Name",
        anonymousAlias: "Quiet Falcon",
        username: "user1",
      })
    ).toBe("Quiet Falcon");
  });

  it("uses real name in open mode", () => {
    expect(
      formatDisplayName({
        profileMode: "OPEN",
        name: "Alex Rivera",
        anonymousAlias: null,
        username: "alex_r",
      })
    ).toBe("Alex Rivera");
  });
});

describe("date helpers", () => {
  it("parses and formats date-only strings", () => {
    const date = parseDateOnly("2026-07-04");
    expect(toDateString(date)).toBe("2026-07-04");
  });

  it("returns Monday as week start", () => {
    const wednesday = parseDateOnly("2026-07-08");
    expect(toDateString(getWeekStart(wednesday))).toBe("2026-07-06");
  });
});

describe("Zod schemas", () => {
  it("validates register payload", () => {
    const result = registerSchema.safeParse({
      name: "Alex",
      username: "alex_r",
      email: "alex@example.com",
      password: "Password123!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid login payload", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
  });

  it("requires vow title and category", () => {
    const result = createVowSchema.safeParse({
      title: "Read daily",
      category: "READING",
      frequencyType: "DAILY",
      startDate: "2026-07-04",
    });
    expect(result.success).toBe(true);
  });
});
