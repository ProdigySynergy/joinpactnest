export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return fallback;
  return raw;
}

export type PublicPactProfile = {
  pact: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    category: string;
    frequencyType: string;
    targetCountPerWeek: number;
    checkInStartTime: string;
    checkInEndTime: string;
    startDate: string;
    endDate: string | null;
    createdAt: string;
  };
  owner: {
    id: string;
    username: string;
    displayName: string;
    tagline: string | null;
    profileMode: string;
  };
  stats: {
    memberCount: number;
    daysLive: number;
    successRate: number;
    avgCompletionPercentage: number;
    totalCheckIns: number;
    activeThisWeek: number;
    topStreak: number;
  };
  leaders: Array<{
    displayName: string;
    currentStreak: number;
    completionPercentage: number;
  }>;
};

export type PublicPactListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  memberCount: number;
  daysLive: number;
  successRate: number;
  avgCompletionPercentage: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchPublicPact(slug: string): Promise<PublicPactProfile | null> {
  const res = await fetch(`${API_URL}/public/pacts/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load public pact");
  return res.json();
}

export async function fetchPublicPactList(): Promise<PublicPactListItem[]> {
  const res = await fetch(`${API_URL}/public/pacts`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error("Failed to load public pacts");
  const data = (await res.json()) as { pacts: PublicPactListItem[] };
  return data.pacts;
}

export function publicPactShareUrl(slug: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${site.replace(/\/$/, "")}/p/${slug}`;
}

export function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
