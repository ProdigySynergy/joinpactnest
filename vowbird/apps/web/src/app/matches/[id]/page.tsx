"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoodFeed } from "@/components/MoodFeed";
import { NavBar } from "@/components/NavBar";
import { PersonCard } from "@/components/PersonCard";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Person = {
  id: string;
  username: string;
  displayName: string;
  tagline?: string | null;
};

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["match", id],
    queryFn: () =>
      api<{
        match: {
          id: string;
          status: string;
          matchMode: string;
          partner: Person;
          initiatedBy: Person;
          vow: { title: string; id: string; noJudgementZone?: boolean };
        };
        leaderboard: Array<{
          user: { displayName: string };
          currentStreak: number;
          completionPercentage: number;
        }>;
        leaderboardEnabled: boolean;
        noJudgementZone: boolean;
      }>(`/matches/${id}`),
  });

  const match = data?.match;
  const partnerInitiated = match?.initiatedBy.id === match?.partner.id;
  const youInitiated = match?.initiatedBy.id === user?.id;

  async function endMatch() {
    if (!confirm("End this match?")) return;
    await api(`/matches/${id}/end`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["matches"] });
    router.push("/matches");
  }

  async function rematch() {
    await api(`/matches/${id}/rematch`, { method: "POST" });
    router.push("/matches");
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {match && (
          <>
            <div className="card">
              <span className="badge">{match.matchMode} match</span>
              {data?.noJudgementZone && (
                <span className="badge ml-2 border-sage/40 bg-sage/15 text-sage">No judgement</span>
              )}
              <h1 className="mt-3 text-2xl font-bold">Partner match</h1>
              <p className="mt-2 text-navy/70">
                Vow:{" "}
                <Link href={`/vows/${match.vow.id}`} className="text-gold hover:underline">
                  {match.vow.title}
                </Link>
              </p>
              {youInitiated && (
                <p className="mt-2 text-sm text-navy/50">You started the earlier match request.</p>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={rematch} className="btn-secondary">
                  Rematch
                </button>
                <button onClick={endMatch} className="text-sm text-red-600">
                  End match
                </button>
              </div>
            </div>

            <PersonCard
              person={match.partner}
              roleLabel={partnerInitiated ? "Your partner · match initiator" : "Your partner"}
              partnerMatchId={id}
            />

            {data?.leaderboardEnabled && (data.leaderboard?.length ?? 0) > 0 && (
              <div className="card">
                <h2 className="font-semibold">Partner leaderboard</h2>
                <div className="mt-4 space-y-2">
                  {data.leaderboard.map((l, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>
                        #{i + 1} {l.user.displayName}
                      </span>
                      <span className="streak">
                        🔥 {l.currentStreak} · {l.completionPercentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <MoodFeed context={{ partnerMatchId: id }} />
          </>
        )}
      </main>
    </RequireAuth>
  );
}
