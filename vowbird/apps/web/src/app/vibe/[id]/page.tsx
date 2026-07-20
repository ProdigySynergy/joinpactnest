import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicNav } from "@/components/NavBar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type PublicVibePayload = {
  match: {
    id: string;
    vowTitle: string;
    partners: Array<{ displayName: string }>;
  };
  vibes: Array<{
    id: string;
    vibe: string;
    label?: string;
    emoji?: string;
    note: string | null;
    createdAt: string;
    user: { displayName: string };
  }>;
  currentVibes: Array<{
    id: string;
    vibe: string;
    label?: string;
    emoji?: string;
    user: { displayName: string };
  }>;
  vibeLeaderboard: Array<{
    user: { displayName: string };
    vibeCount: number;
    latestLabel: string;
    latestEmoji: string;
  }>;
  vibeLeaderboardEnabled: boolean;
};

async function fetchPublicDuo(id: string): Promise<PublicVibePayload | null> {
  try {
    const res = await fetch(`${API_URL}/public/vibes/matches/${id}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await fetchPublicDuo(params.id);
  if (!data) return { title: "Vibe duo · Vowbird" };
  return {
    title: `${data.match.partners.map((p) => p.displayName).join(" & ")} · Public vibes`,
    description: `Live vibe checks for ${data.match.vowTitle}`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicVibeDuoPage({ params }: Props) {
  const data = await fetchPublicDuo(params.id);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="mb-2 text-sm font-semibold tracking-wide text-gold">Public Vibe Check</p>
        <h1 className="text-3xl font-bold">
          {data.match.partners.map((p) => p.displayName).join(" & ")}
        </h1>
        <p className="mt-2 text-navy/65">Accountability duo for: {data.match.vowTitle}</p>

        {data.currentVibes.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {data.currentVibes.map((row) => (
              <span
                key={row.id}
                className="rounded-full border border-navy/10 bg-white px-3 py-1.5 text-sm"
              >
                {row.user.displayName} · {row.emoji || "✨"} {row.label || row.vibe}
              </span>
            ))}
          </div>
        )}

        {data.vibeLeaderboardEnabled && data.vibeLeaderboard.length > 0 && (
          <div className="card mt-8">
            <h2 className="font-semibold">Most vibes this week</h2>
            <div className="mt-3 space-y-2">
              {data.vibeLeaderboard.map((row, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    #{i + 1} {row.user.displayName} · {row.latestEmoji} {row.latestLabel}
                  </span>
                  <span className="streak">{row.vibeCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card mt-8">
          <h2 className="font-semibold">Recent vibes</h2>
          <div className="mt-4 space-y-3">
            {data.vibes.map((row) => (
              <div key={row.id} className="rounded-xl border border-navy/10 p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">
                    {row.user.displayName} · {row.emoji || "✨"} {row.label || row.vibe}
                  </span>
                  <span className="text-xs text-navy/40">
                    {new Date(row.createdAt).toLocaleString()}
                  </span>
                </div>
                {row.note && <p className="mt-1 text-navy/70">{row.note}</p>}
              </div>
            ))}
            {data.vibes.length === 0 && (
              <p className="text-sm text-navy/50">No vibes posted yet.</p>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-navy/50">
          Want your own duo?{" "}
          <Link href="/register" className="text-gold hover:underline">
            Start on Vowbird
          </Link>
        </p>
      </main>
    </div>
  );
}
