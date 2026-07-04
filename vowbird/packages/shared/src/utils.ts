const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SOCIAL_PATTERN = /@[a-zA-Z0-9_]{2,}|(?:instagram|twitter|snapchat|tiktok|facebook|telegram|whatsapp|discord)\.?\s*(?:me|com|app)?/gi;
const ADDRESS_PATTERN = /\d+\s+[a-zA-Z0-9\s,.-]+(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|way|court|ct|apt|suite|unit)\b/gi;

function matchesPattern(pattern: RegExp, text: string): boolean {
  return new RegExp(pattern.source, pattern.flags).test(text);
}

export function scanForContactInfo(text: string): string[] {
  const issues: string[] = [];
  if (matchesPattern(EMAIL_PATTERN, text)) issues.push("email address");
  if (matchesPattern(PHONE_PATTERN, text)) issues.push("phone number");
  if (matchesPattern(SOCIAL_PATTERN, text)) issues.push("social handle");
  if (matchesPattern(ADDRESS_PATTERN, text)) issues.push("physical address");
  return issues;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function pickRandomAlias(aliases: readonly string[]): string {
  return aliases[Math.floor(Math.random() * aliases.length)]!;
}

export function formatDisplayName(user: {
  profileMode: string;
  name: string;
  anonymousAlias: string | null;
  username: string;
}): string {
  if (user.profileMode === "VEILED") {
    return user.anonymousAlias || user.username;
  }
  return user.name;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y!, m! - 1, d);
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getWeekStart(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}
