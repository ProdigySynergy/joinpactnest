import bcrypt from "bcryptjs";
import { formatDisplayName } from "@vowbird/shared";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

type SanitizableUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  profileMode: string;
  anonymousAlias: string | null;
  avatarUrl: string | null;
  bio: string | null;
  tagline: string | null;
  gender: string | null;
  timezone: string;
  preferredCheckInTime: string;
  plan: string;
  isSuspended: boolean;
  createdAt: Date;
};

export function sanitizeUser(user: SanitizableUser) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    profileMode: user.profileMode,
    anonymousAlias: user.anonymousAlias,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    tagline: user.tagline,
    gender: user.gender,
    timezone: user.timezone,
    preferredCheckInTime: user.preferredCheckInTime,
    plan: user.plan,
    isSuspended: user.isSuspended,
    displayName: formatDisplayName(user),
    createdAt: user.createdAt,
  };
}

export function sanitizeUserForOthers(user: {
  id: string;
  name: string;
  username: string;
  profileMode: string;
  anonymousAlias: string | null;
  avatarUrl: string | null;
  bio: string | null;
  tagline?: string | null;
  gender?: string | null;
  timezone: string;
}) {
  const isVeiled = user.profileMode === "VEILED";
  return {
    id: user.id,
    username: user.username,
    profileMode: user.profileMode,
    displayName: formatDisplayName(user),
    avatarUrl: isVeiled ? null : user.avatarUrl,
    bio: isVeiled ? null : user.bio,
    tagline: isVeiled ? null : user.tagline ?? null,
    gender: isVeiled ? null : user.gender ?? null,
    timezone: user.timezone,
  };
}

/** Public profile card — respects Veiled mode privacy. */
export function sanitizePublicProfile(user: {
  id: string;
  name: string;
  username: string;
  profileMode: string;
  anonymousAlias: string | null;
  avatarUrl: string | null;
  bio: string | null;
  tagline: string | null;
  gender: string | null;
  timezone: string;
  createdAt: Date;
}) {
  const isVeiled = user.profileMode === "VEILED";
  return {
    id: user.id,
    username: user.username,
    profileMode: user.profileMode,
    displayName: formatDisplayName(user),
    avatarUrl: isVeiled ? null : user.avatarUrl,
    bio: isVeiled ? null : user.bio,
    tagline: isVeiled ? null : user.tagline,
    gender: isVeiled ? null : user.gender,
    timezone: user.timezone,
    memberSince: user.createdAt,
  };
}
