export interface PublicUser {
  id: string;
  username: string;
  profileMode: "VEILED" | "OPEN";
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  timezone: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser & {
    email: string;
    role: string;
    plan: string;
    preferredCheckInTime: string;
    anonymousAlias: string | null;
  };
}

export interface ProgressStats {
  currentStreak: number;
  longestStreak: number;
  weeklyCompleted: number;
  weeklyTarget: number;
  completionPercentage: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activeVows: number;
  activePacts: number;
  activeMatches: number;
  checkInsToday: number;
  lettersSentThisWeek: number;
  openReports: number;
}
