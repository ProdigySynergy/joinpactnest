"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GENDER_LABELS } from "@vowbird/shared";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

type ProfileResponse = {
  profile: {
    id: string;
    username: string;
    displayName: string;
    profileMode: string;
    avatarUrl: string | null;
    bio: string | null;
    tagline: string | null;
    gender: "MALE" | "FEMALE" | "FLUID" | null;
    timezone: string;
    memberSince: string;
  };
  stats: {
    activeVows: number;
    completedVows: number;
    activePacts: number;
    activeMatches: number;
    totalCheckIns: number;
    bestStreak: number;
    avgWeeklyCompletion: number;
    activeVowProgress: Array<{
      vowId: string;
      title: string;
      currentStreak: number;
      completionPercentage: number;
    }>;
  };
  isSelf: boolean;
};

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => api<ProfileResponse>(`/users/${encodeURIComponent(username)}/profile`),
    enabled: !!username,
  });

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {isLoading && <p className="text-navy/60">Loading profile...</p>}
        {error && <p className="text-red-600">{(error as Error).message}</p>}

        {data && (
          <>
            <div className="card mb-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-navy/50">@{data.profile.username}</p>
                  <h1 className="mt-1 text-3xl font-bold">{data.profile.displayName}</h1>
                  {data.profile.tagline && (
                    <p className="mt-2 text-lg text-navy/70">{data.profile.tagline}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-navy/55">
                    <span className="badge">{data.profile.profileMode === "VEILED" ? "Veiled" : "Open"}</span>
                    {data.profile.gender && (
                      <span className="badge">
                        {GENDER_LABELS[data.profile.gender]}
                      </span>
                    )}
                    <span>
                      Member since {new Date(data.profile.memberSince).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {data.isSelf && (
                  <Link href="/settings" className="btn-secondary py-2 text-sm">
                    Edit profile
                  </Link>
                )}
              </div>
              {data.profile.bio && (
                <p className="mt-4 whitespace-pre-wrap text-navy/75">{data.profile.bio}</p>
              )}
            </div>

            <h2 className="mb-3 text-xl font-semibold">Progress so far</h2>
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Active vows", value: data.stats.activeVows },
                { label: "Pacts", value: data.stats.activePacts },
                { label: "Matches", value: data.stats.activeMatches },
                { label: "Check-ins", value: data.stats.totalCheckIns },
                { label: "Best streak", value: data.stats.bestStreak },
                { label: "Avg week", value: `${data.stats.avgWeeklyCompletion}%` },
                { label: "Completed vows", value: data.stats.completedVows },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-navy/10 bg-white/80 p-4 text-center">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-navy/50">{stat.label}</p>
                </div>
              ))}
            </div>

            {data.stats.activeVowProgress.length > 0 && (
              <div className="card">
                <h2 className="font-semibold">Active momentum</h2>
                <ul className="mt-4 space-y-3">
                  {data.stats.activeVowProgress.map((v) => (
                    <li key={v.vowId} className="flex items-center justify-between gap-3 text-sm">
                      {data.isSelf || data.profile.profileMode === "OPEN" ? (
                        <Link href={`/vows/${v.vowId}`} className="font-medium text-navy hover:text-gold">
                          {v.title}
                        </Link>
                      ) : (
                        <span className="font-medium">{v.title}</span>
                      )}
                      <span className="streak">
                        🔥 {v.currentStreak} · {v.completionPercentage}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </RequireAuth>
  );
}
