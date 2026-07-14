export const VOW_CATEGORIES = [
  "FITNESS",
  "STUDY",
  "CAREER",
  "FAITH",
  "MONEY",
  "WELLNESS",
  "CREATIVE",
  "BUSINESS",
  "READING",
  "CUSTOM",
] as const;

export const TONE_OPTIONS = [
  "Gentle",
  "Direct",
  "Spiritual",
  "Competitive",
  "Quiet",
  "High-energy",
] as const;

export const REACTION_TYPES = [
  "FIRE",
  "CLAP",
  "HEART",
  "LOCKED_IN",
  "PROUD",
  "KEEP_GOING",
] as const;

export const VEILED_ALIASES = [
  "Quiet Falcon",
  "Blue Lantern",
  "Steady Pine",
  "Morning Runner",
  "Calm Ember",
  "Silver Willow",
  "Bright Sparrow",
  "Night Owl",
  "Golden Tide",
  "Soft Horizon",
] as const;

export const FREE_PLAN_LIMITS = {
  maxActiveVows: 3,
  maxActiveMatches: 1,
} as const;

/** Follow-up comments allowed on an OPEN report before admin responds. */
export const MAX_REPORT_FOLLOW_UPS = 2;

export const BRAND = {
  name: "Vowbird",
  tagline: "Keep your promise with someone beside you.",
  secondaryTagline: "Anonymous accountability partners for people trying to lock in.",
} as const;
