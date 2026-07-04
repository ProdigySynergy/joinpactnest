"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function PactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [postBody, setPostBody] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [msg, setMsg] = useState("");

  const { data } = useQuery({
    queryKey: ["pact", id],
    queryFn: () => api<{
      pact: { id: string; title: string; description: string | null; inviteCode: string; privacy: string; members: Array<{ user: { displayName: string } }> };
      leaderboard: Array<{ user: { displayName: string }; currentStreak: number; completionPercentage: number }>;
    }>(`/pacts/${id}`),
  });

  const { data: posts } = useQuery({
    queryKey: ["pact-posts", id],
    queryFn: () => api<{ posts: Array<{ id: string; body: string; user: { displayName: string }; createdAt: string }> }>(`/pacts/${id}/posts`),
    enabled: !!data,
  });

  async function joinPact() {
    try {
      await api(`/pacts/${id}/join`, { method: "POST", body: JSON.stringify({}) });
      setMsg("Joined pact!");
      qc.invalidateQueries({ queryKey: ["pact", id] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function joinByCode(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/pacts/join-by-code", { method: "POST", body: JSON.stringify({ inviteCode }) });
      setMsg("Joined by code!");
      qc.invalidateQueries({ queryKey: ["pact", id] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function postUpdate(e: FormEvent) {
    e.preventDefault();
    await api(`/pacts/${id}/posts`, { method: "POST", body: JSON.stringify({ body: postBody }) });
    setPostBody("");
    qc.invalidateQueries({ queryKey: ["pact-posts", id] });
  }

  const pact = data?.pact;

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {pact && (
          <>
            <div className="mb-6">
              <span className="badge">{pact.privacy}</span>
              <h1 className="mt-2 text-3xl font-bold">{pact.title}</h1>
              {pact.description && <p className="mt-2 text-navy/70">{pact.description}</p>}
              {msg && <p className="mt-2 text-sm text-sage">{msg}</p>}
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              <button onClick={joinPact} className="btn-primary">Join pact</button>
              <form onSubmit={joinByCode} className="flex gap-2">
                <input className="input py-2" placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
                <button type="submit" className="btn-secondary">Join by code</button>
              </form>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="card">
                <h2 className="font-semibold">Room feed</h2>
                <form onSubmit={postUpdate} className="mt-4 space-y-2">
                  <textarea className="input" placeholder="Share an update..." value={postBody} onChange={(e) => setPostBody(e.target.value)} rows={2} />
                  <button type="submit" className="btn-secondary w-full">Post</button>
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
                <div className="mt-4 space-y-2">
                  {(data?.leaderboard || []).map((l, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{l.user.displayName}</span>
                      <span className="streak">🔥 {l.currentStreak} · {l.completionPercentage}%</span>
                    </div>
                  ))}
                </div>
                <h3 className="mt-6 font-semibold">Members ({pact.members.length})</h3>
                <div className="mt-2 space-y-1">
                  {pact.members.map((m, i) => (
                    <p key={i} className="text-sm">{m.user.displayName}</p>
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
