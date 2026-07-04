import bcrypt from "bcryptjs";
import { formatDisplayName } from "@vowbird/shared";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sanitizeUser(user: {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  profileMode: string;
  anonymousAlias: string | null;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string;
  preferredCheckInTime: string;
  plan: string;
  isSuspended: boolean;
  createdAt: Date;
}) {
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
    timezone: user.timezone,
    preferredCheckInTime: user.preferredCheckInTime,
    plan: user.plan,
    isSuspended: user.isSuspended,
    displayName: formatDisplayName(user),
    createdAt: user.createdAt,
  };
}

export function sanitizeUserForOthers(
  user: {
    id: string;
    name: string;
    username: string;
    profileMode: string;
    anonymousAlias: string | null;
    avatarUrl: string | null;
    bio: string | null;
    timezone: string;
  },
  viewerProfileMode?: string
) {
  const isVeiled = user.profileMode === "VEILED";
  return {
    id: user.id,
    username: isVeiled ? user.username : user.username,
    profileMode: user.profileMode,
    displayName: formatDisplayName(user),
    avatarUrl: isVeiled ? null : user.avatarUrl,
    bio: isVeiled ? null : user.bio,
    timezone: user.timezone,
  };
}
