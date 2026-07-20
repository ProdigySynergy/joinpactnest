type PactVibeFeed = {
  currentVibes: Array<{
    id: string;
    label?: string;
    emoji?: string;
    vibe: string;
    user: { displayName: string };
  }>;
  vibeLeaderboard: Array<{
    user: { displayName: string };
    vibeCount: number;
    latestEmoji: string;
    latestLabel: string;
  }>;
  vibeLeaderboardEnabled: boolean;
  vibes: Array<{
    id: string;
    label?: string;
    emoji?: string;
    vibe: string;
    note: string | null;
    createdAt: string;
    user: { displayName: string };
  }>;
};

export async function fetchPublicPactVibes(slug: string): Promise<PactVibeFeed | null> {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    const res = await fetch(`${base}/public/pacts/${slug}/vibes`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function PublicPactVibes({ data }: { data: PactVibeFeed }) {
  if (!data.vibes.length && !data.currentVibes.length) return null;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h2 className="mb-2 text-2xl font-bold">Live vibe checks</h2>
      <p className="mb-6 text-navy/65">What members are up to right now.</p>

      {data.currentVibes.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
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
        <div className="mb-6 rounded-2xl border border-navy/10 bg-white/70 p-4">
          <h3 className="font-semibold">Most vibes this week</h3>
          <div className="mt-3 space-y-2">
            {data.vibeLeaderboard.slice(0, 5).map((row, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  #{i + 1} {row.user.displayName} · {row.latestEmoji} {row.latestLabel}
                </span>
                <span className="font-semibold text-gold">{row.vibeCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.vibes.slice(0, 8).map((row) => (
          <div key={row.id} className="rounded-xl border border-navy/10 bg-white/70 p-3 text-sm">
            <p className="font-medium">
              {row.user.displayName} · {row.emoji || "✨"} {row.label || row.vibe}
            </p>
            {row.note && <p className="mt-1 text-navy/70">{row.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
