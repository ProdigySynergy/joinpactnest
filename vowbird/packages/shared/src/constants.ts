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

export const MOOD_TYPES = [
  "STRUGGLING",
  "OUT_OF_IT",
  "OKAY",
  "FOCUSED",
  "MOTIVATED",
  "PROUD",
] as const;

export const MOOD_LABELS: Record<(typeof MOOD_TYPES)[number], string> = {
  STRUGGLING: "Struggling",
  OUT_OF_IT: "Out of it",
  OKAY: "Okay",
  FOCUSED: "Focused",
  MOTIVATED: "Motivated",
  PROUD: "Proud",
};

/** One-tap cheer chips for partners (optional short note allowed). */
export const ENCOURAGEMENT_STICKERS = [
  "KEEP_GOING",
  "PROUD_OF_YOU",
  "YOUVE_GOT_THIS",
  "ONE_STEP",
  "BREATHING_WITH_YOU",
  "ROOTING_FOR_YOU",
] as const;

export const ENCOURAGEMENT_LABELS: Record<(typeof ENCOURAGEMENT_STICKERS)[number], string> = {
  KEEP_GOING: "Keep going",
  PROUD_OF_YOU: "Proud of you",
  YOUVE_GOT_THIS: "You've got this",
  ONE_STEP: "One step at a time",
  BREATHING_WITH_YOU: "Breathing with you",
  ROOTING_FOR_YOU: "Rooting for you",
};

export const GENDER_OPTIONS = ["MALE", "FEMALE", "FLUID"] as const;

export const GENDER_LABELS: Record<(typeof GENDER_OPTIONS)[number], string> = {
  MALE: "Male",
  FEMALE: "Female",
  FLUID: "Fluid",
};

/** Minimum time between mood shares (any context). */
export const MOOD_UPDATE_COOLDOWN_HOURS = 4;

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
