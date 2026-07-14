/** System tone for misses based on no-judgement zone. */

export function missMessage(opts: {
  noJudgementZone: boolean;
  displayName: string;
  context: "vow" | "pact" | "partner";
}): { type: "callout" | "gentle" | "silent"; message: string | null } {
  if (opts.noJudgementZone) {
    return {
      type: "gentle",
      message:
        opts.context === "partner"
          ? "Your partner had a hard day on their vow. A quiet cheer can go a long way."
          : "Missed today — no shame. One soft restart is enough.",
    };
  }

  return {
    type: "callout",
    message:
      opts.context === "partner"
        ? `Call-out: ${opts.displayName} missed today's check-in. Hold them accountable.`
        : opts.context === "pact"
          ? `Call-out: ${opts.displayName} missed the pact check-in. The circle notices.`
          : `Call-out: you missed today's vow. Your partners will see this.`,
  };
}

export function systemToneForZone(noJudgementZone: boolean): "soft" | "accountable" {
  return noJudgementZone ? "soft" : "accountable";
}
