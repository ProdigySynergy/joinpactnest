import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatUserFacingApiError, zodErrorToMessage } from "./errors";

describe("formatUserFacingApiError", () => {
  it("formats zod flatten invite code errors", () => {
    const msg = formatUserFacingApiError({
      formErrors: [],
      fieldErrors: { inviteCode: ["String must contain at least 4 character(s)"] },
    });
    expect(msg).toBe("Enter a valid invite code");
  });

  it("unwraps { error: ... } payloads", () => {
    expect(formatUserFacingApiError({ error: "Private pact" })).toBe("Private pact");
  });

  it("parses stringified JSON flatten", () => {
    const raw = JSON.stringify({
      formErrors: [],
      fieldErrors: { inviteCode: ["String must contain at least 4 character(s)"] },
    });
    expect(formatUserFacingApiError(raw)).toBe("Enter a valid invite code");
  });
});

describe("zodErrorToMessage", () => {
  it("returns a readable string from ZodError", () => {
    const schema = z.object({ inviteCode: z.string().min(4) });
    const parsed = schema.safeParse({ inviteCode: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(zodErrorToMessage(parsed.error)).toBe("Enter a valid invite code");
    }
  });
});
