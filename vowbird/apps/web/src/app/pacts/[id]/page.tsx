"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { MoodFeed } from "@/components/MoodFeed";
import { VibeCheckFeed } from "@/components/VibeCheckFeed";
import { NavBar } from "@/components/NavBar";
import { PersonCard } from "@/components/PersonCard";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function PactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [postBody, setPostBody] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const { data } = useQuery({
    queryKey: ["pact", id],
    queryFn: () =>
      api<{
        pact: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          inviteCode: string;
          privacy: string;
          ownerId: string;
          noJudgementZone: boolean;
          leaderboardEnabled: boolean;
          vibeLeaderboardEnabled?: boolean;
          owner: {
            id: string;
            username: string;
            displayName: string;
            tagline?: string | null;
          };
          members: Array<{
            user: { id: string; username: string; displayName: string; tagline?: string | null };
          }>;
        };
        leaderboard: Array<{
          user: { displayName: string };
          currentStreak: number;
          completionPercentage: number;
        }>;
        leaderboardEnabled: boolean;
      }>(`/pacts/${id}`),
  });

  const { data: posts } = useQuery({
    queryKey: ["pact-posts", id],
    queryFn: () =>
      api<{ posts: Array<{ id: string; body: string; user: { displayName: string }; createdAt: string }> }>(
        `/pacts/${id}/posts`
      ),
    enabled: !!data,
  });

  async function joinPact() {
    setError("");
    setMsg("");
    try {
      await api(`/pacts/${id}/join`, { method: "POST", body: JSON.stringify({}) });
      setMsg("Joined pact!");
      qc.invalidateQueries({ queryKey: ["pact", id] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function joinByCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (inviteCode.trim().length < 4) {
      setError("Enter a valid invite code");
      return;
    }
    try {
      await api("/pacts/join-by-code", { method: "POST", body: JSON.stringify({ inviteCode }) });
      setMsg("Joined by code!");
      qc.invalidateQueries({ queryKey: ["pact", id] });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function postUpdate(e: FormEvent) {
    e.preventDefault();
    await api(`/pacts/${id}/posts`, { method: "POST", body: JSON.stringify({ body: postBody }) });
    setPostBody("");
    qc.invalidateQueries({ queryKey: ["pact-posts", id] });
  }

  async function toggleSetting(
    field: "noJudgementZone" | "leaderboardEnabled" | "vibeLeaderboardEnabled",
    value: boolean
  ) {
    await api(`/pacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    qc.invalidateQueries({ queryKey: ["pact", id] });
    if (field === "vibeLeaderboardEnabled") {
      qc.invalidateQueries({ queryKey: ["vibes", { pactId: id }] });
    }
  }

  const pact = data?.pact;
  const isOwner = Boolean(pact && user?.id === pact.ownerId);
  const isMember = Boolean(
    pact && user && pact.members.some((m) => m.user.id === user.id)
  );
  const canJoin = Boolean(pact && user && !isOwner && !isMember);

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {pact && (
          <>
            <div className="mb-6">
              <span className="badge">{pact.privacy}</span>
              {pact.noJudgementZone && (
                <span className="badge ml-2 border-sage/40 bg-sage/15 text-sage">No judgement</span>
              )}
              <h1 className="mt-2 text-3xl font-bold">{pact.title}</h1>
              {pact.description && <p className="mt-2 text-navy/70">{pact.description}</p>}
              {(isOwner || isMember) && (
                <p className="mt-2 text-sm text-navy/50">
                  {isOwner ? "You’re the creator of this pact." : "You’re in this pact."}
                </p>
              )}
              {pact.privacy === "PUBLIC" && (
                <p className="mt-2 text-sm">
                  <Link href={`/p/${pact.slug}`} className="text-gold hover:underline">
                    Open public share page →
                  </Link>
                </p>
              )}
              {msg && <p className="mt-2 text-sm text-sage">{msg}</p>}
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            <div className="mb-6">
              <PersonCard
                person={pact.owner}
                roleLabel="Pact creator"
                isSelf={user?.id === pact.owner.id}
              />
            </div>

            {canJoin && (
              <div className="mb-6 flex flex-wrap gap-3">
                {pact.privacy !== "PRIVATE" && (
                  <button onClick={joinPact} className="btn-primary">
                    Join pact
                  </button>
                )}
                {pact.privacy === "PRIVATE" && (
                  <form onSubmit={joinByCode} className="flex flex-wrap gap-2">
                    <input
                      className="input py-2"
                      placeholder="Invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                    />
                    <button type="submit" className="btn-secondary">
                      Join with invite code
                    </button>
                  </form>
                )}
              </div>
            )}

            {isOwner && (pact.privacy === "PRIVATE" || pact.privacy === "INVITE_ONLY") && (
              <div className="card mb-6">
                <p className="text-sm text-navy/60">Invite code (share with people you trust)</p>
                <p className="mt-1 font-mono text-lg font-semibold tracking-wide">{pact.inviteCode}</p>
              </div>
            )}

            {isOwner && (
              <div className="card mb-6 flex flex-wrap gap-6">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={pact.noJudgementZone}
                    onChange={(e) => toggleSetting("noJudgementZone", e.target.checked)}
                  />
                  <span>No judgement zone</span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={pact.leaderboardEnabled}
                    onChange={(e) => toggleSetting("leaderboardEnabled", e.target.checked)}
                  />
                  <span>Show streak leaderboard</span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={pact.vibeLeaderboardEnabled !== false}
                    onChange={(e) => toggleSetting("vibeLeaderboardEnabled", e.target.checked)}
                  />
                  <span>Show vibe leaderboard</span>
                </label>
              </div>
            )}

            <div className="mb-6 space-y-6">
              <VibeCheckFeed context={{ pactId: id }} />
              <MoodFeed context={{ pactId: id }} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="card">
                <h2 className="font-semibold">Room feed</h2>
                <form onSubmit={postUpdate} className="mt-4 space-y-2">
                  <textarea
                    className="input"
                    placeholder="Share an update..."
                    value={postBody}
                    onChange={(e) => setPostBody(e.target.value)}
                    rows={2}
                  />
                  <button type="submit" className="btn-secondary w-full">
                    Post
                  </button>
                </form>
                <div className="mt-4 space-y-3">
                  {(posts?.posts || []).map((p) => (
                    <div key={p.id} className="rounded-lg border border-navy/10 p-3">
                      <p className="text-sm font-medium">{p.user.displayName}</p>
                      <p className="mt-1 text-sm">{p.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="font-semibold">Leaderboard</h2>
                {data?.leaderboardEnabled ? (
                  <div className="mt-4 space-y-2">
                    {(data?.leaderboard || []).map((l, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{l.user.displayName}</span>
                        <span className="streak">
                          🔥 {l.currentStreak} · {l.completionPercentage}%
                        </span>
                      </div>
                    ))}
                    {(data?.leaderboard || []).length === 0 && (
                      <p className="text-sm text-navy/50">No rankings yet.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-navy/50">Leaderboard is turned off for this pact.</p>
                )}
                <h3 className="mt-6 font-semibold">Members ({pact.members.length})</h3>
                <div className="mt-2 space-y-2">
                  {pact.members.map((m) => (
                    <Link
                      key={m.user.id}
                      href={`/u/${m.user.username}`}
                      className="block text-sm text-navy hover:text-gold"
                    >
                      {m.user.displayName}
                      <span className="text-navy/45"> @{m.user.username}</span>
                      {m.user.id === pact.owner.id && (
                        <span className="ml-2 text-xs uppercase tracking-wide text-gold">creator</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </RequireAuth>
  );
}
