import { z } from "zod";
import { REACTION_TYPES, TONE_OPTIONS, VOW_CATEGORIES } from "./constants";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  profileMode: z.enum(["VEILED", "OPEN"]).default("VEILED"),
  timezone: z.string().default("America/New_York"),
  preferredCheckInTime: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  timezone: z.string().optional(),
  preferredCheckInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  anonymousAlias: z.string().min(2).max(50).optional(),
});

export const profileModeSchema = z.object({
  profileMode: z.enum(["VEILED", "OPEN"]),
  anonymousAlias: z.string().min(2).max(50).optional(),
});

export const createVowSchema = z.object({
  title: z.string().min(3).max(200),
  reason: z.string().max(1000).optional(),
  category: z.enum(VOW_CATEGORIES as unknown as [string, ...string[]]),
  frequencyType: z.enum(["DAILY", "WEEKLY"]),
  targetCountPerWeek: z.number().int().min(1).max(7).default(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  visibility: z.enum(["PRIVATE", "PARTNER", "GROUP_PUBLIC"]).default("PRIVATE"),
});

export const updateVowSchema = createVowSchema.partial();

export const createPactSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(VOW_CATEGORIES as unknown as [string, ...string[]]),
  privacy: z.enum(["PUBLIC", "INVITE_ONLY", "PRIVATE"]).default("PUBLIC"),
  profileModeAllowed: z.enum(["VEILED_ONLY", "OPEN_ONLY", "BOTH"]).default("BOTH"),
  frequencyType: z.enum(["DAILY", "WEEKLY"]).default("DAILY"),
  targetCountPerWeek: z.number().int().min(1).max(7).default(7),
  checkInStartTime: z.string().regex(/^\d{2}:\d{2}$/).default("06:00"),
  checkInEndTime: z.string().regex(/^\d{2}:\d{2}$/).default("23:59"),
  startDate: z.string(),
  endDate: z.string().optional(),
});

export const joinByCodeSchema = z.object({
  inviteCode: z.string().min(4).max(20),
  displayModeInPact: z.enum(["VEILED", "OPEN"]).default("VEILED"),
});

export const partnerRequestSchema = z.object({
  vowId: z.string(),
  profileModePreference: z.enum(["VEILED", "OPEN", "EITHER"]).default("EITHER"),
  tonePreference: z.enum(TONE_OPTIONS as unknown as [string, ...string[]]),
});

export const createCheckInSchema = z.object({
  vowId: z.string().optional(),
  pactId: z.string().optional(),
  note: z.string().max(1000).optional(),
  checkInDate: z.string(),
  status: z.enum(["COMPLETED", "MISSED"]).default("COMPLETED"),
}).refine((d) => d.vowId || d.pactId, { message: "vowId or pactId required" });

export const createLetterSchema = z.object({
  type: z.enum(["PARTNER_LETTER", "FUTURE_SELF", "GROUP_REFLECTION"]),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  recipientId: z.string().optional(),
  vowId: z.string().optional(),
  pactId: z.string().optional(),
  partnerMatchId: z.string().optional(),
});

export const updateLetterSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(10000).optional(),
});

export const scheduleLetterSchema = z.object({
  unlockAt: z.string(),
});

export const createRoomPostSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const createReactionSchema = z.object({
  type: z.enum(REACTION_TYPES as unknown as [string, ...string[]]),
  checkInId: z.string().optional(),
  letterId: z.string().optional(),
  postId: z.string().optional(),
}).refine((d) => d.checkInId || d.letterId || d.postId, {
  message: "checkInId, letterId, or postId required",
});

export const createReportSchema = z.object({
  reportedUserId: z.string().optional(),
  postId: z.string().optional(),
  checkInId: z.string().optional(),
  letterId: z.string().optional(),
  reason: z.string().min(3).max(200),
  details: z.string().max(2000).optional(),
});

export const createBlockSchema = z.object({
  blockedUserId: z.string(),
  reason: z.string().max(500).optional(),
});

export const pushTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.enum(["IOS", "ANDROID", "WEB"]),
});

export const notificationPrefsSchema = z.object({
  checkInReminder: z.boolean().optional(),
  partnerCheckedIn: z.boolean().optional(),
  partnerLetter: z.boolean().optional(),
  missedCheckIn: z.boolean().optional(),
  pactEndingSoon: z.boolean().optional(),
  weeklyReflection: z.boolean().optional(),
});

export const adminUpdateUserSchema = z.object({
  isSuspended: z.boolean().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const adminUpdateReportSchema = z.object({
  status: z.enum(["OPEN", "REVIEWED", "ACTION_TAKEN", "DISMISSED"]),
});

export const adminHideContentSchema = z.object({
  type: z.enum(["post", "checkIn", "letter"]),
  id: z.string(),
});
