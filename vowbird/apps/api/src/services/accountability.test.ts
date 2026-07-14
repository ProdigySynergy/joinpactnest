import { describe, expect, it } from "vitest";
import { missMessage } from "./accountability";

describe("missMessage", () => {
  it("returns a call-out when judgement zone is off", () => {
    const result = missMessage({
      noJudgementZone: false,
      displayName: "Alex",
      context: "partner",
    });
    expect(result.type).toBe("callout");
    expect(result.message).toContain("Call-out");
    expect(result.message).toContain("Alex");
  });

  it("returns gentle tone when no judgement zone is on", () => {
    const result = missMessage({
      noJudgementZone: true,
      displayName: "Alex",
      context: "vow",
    });
    expect(result.type).toBe("gentle");
    expect(result.message).not.toContain("Call-out");
  });
});
