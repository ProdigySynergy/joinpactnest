"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { TONE_OPTIONS } from "@vowbird/shared";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

type Candidate = {
  user: {
    id: string;
    username: string;
    displayName: string;
    tagline?: string | null;
    bio?: string | null;
  };
  source: "queue" | "similar_vow" | "other_category";
  theirVow: { id: string; title: string; category?: string };
  alreadyInvited: boolean;
};

function MatchesPageInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const prefillVowId = searchParams.get("vowId") || "";

  const [vowId, setVowId] = useState(prefillVowId);
  const [tone, setTone] = useState("Gentle");
  const [mode, setMode] = useState("EITHER");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (prefillVowId) setVowId(prefillVowId);
  }, [prefillVowId]);

  const { data: vows } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string }> }>("/vows"),
  });

  const { data: requests } = useQuery({
    queryKey: ["partner-requests"],
    queryFn: () =>
      api<{
        requests: Array<{
          id: string;
          status: string;
          tonePreference: string;
          targetUser: { displayName: string } | null;
          vow: { title: string };
        }>;
      }>("/partner-requests/me"),
  });

  const { data: incoming } = useQuery({
    queryKey: ["partner-requests-incoming"],
    queryFn: () =>
      api<{
        requests: Array<{
          id: string;
          tonePreference: string;
          vow: { title: string; category: string };
          fromUser: { id: string; username: string; displayName: string; tagline?: string | null };
        }>;
      }>("/partner-requests/incoming"),
  });

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () =>
      api<{
        matches: Array<{ id: string; status: string; partner: { displayName: string }; vow: { title: string } }>;
      }>("/matches/me"),
  });

  const { data: discover } = useQuery({
    queryKey: ["partners-discover", vowId],
    queryFn: () =>
      api<{
        candidates: Candidate[];
        vowHasPartner: boolean;
        usedOtherCategories?: boolean;
      }>(`/partners/discover?vowId=${encodeURIComponent(vowId)}`),
    enabled: Boolean(vowId),
  });

  async function requestAutoMatch(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/partner-requests", {
        method: "POST",
        body: JSON.stringify({ vowId, tonePreference: tone, profileModePreference: mode }),
      });
      setMsg("Joined the auto-match queue.");
      qc.invalidateQueries({ queryKey: ["partner-requests"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["partners-discover", vowId] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function inviteCandidate(targetUserId: string) {
    setMsg("");
    try {
      await api("/partner-requests", {
        method: "POST",
        body: JSON.stringify({
          vowId,
          tonePreference: tone,
          profileModePreference: mode,
          targetUserId,
        }),
      });
      setMsg("Invite sent.");
      qc.invalidateQueries({ queryKey: ["partner-requests"] });
      qc.invalidateQueries({ queryKey: ["partners-discover", vowId] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function acceptInvite(id: string) {
    setMsg("");
    try {
      await api(`/partner-requests/${id}/accept`, { method: "POST", body: "{}" });
      setMsg("Partner invite accepted.");
      qc.invalidateQueries({ queryKey: ["partner-requests-incoming"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function declineInvite(id: string) {
    setMsg("");
    try {
      await api(`/partner-requests/${id}/decline`, { method: "POST", body: "{}" });
      setMsg("Invite declined.");
      qc.invalidateQueries({ queryKey: ["partner-requests-incoming"] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function cancelRequest(id: string) {
    setMsg("");
    try {
      await api(`/partner-requests/${id}/cancel`, { method: "POST", body: "{}" });
      qc.invalidateQueries({ queryKey: ["partner-requests"] });
      qc.invalidateQueries({ queryKey: ["partners-discover", vowId] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  const activeVows = vows?.vows.filter((v) => v.status === "ACTIVE") || [];
  const waiting = requests?.requests.filter((r) => r.status === "WAITING" || r.status === "PENDING") || [];

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Accountability partners</h1>
      {msg && <p className="mb-4 text-sm text-sage">{msg}</p>}

      {(incoming?.requests.length ?? 0) > 0 && (
        <section className="card mb-8 space-y-4">
          <h2 className="font-semibold">Incoming invites</h2>
          {incoming!.requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-navy/10 p-3">
              <p className="font-medium">
                <Link href={`/u/${r.fromUser.username}`} className="text-gold hover:underline">
                  {r.fromUser.displayName}
                </Link>{" "}
                · {r.vow.title}
              </p>
              {r.fromUser.tagline && <p className="mt-1 text-sm text-navy/60">{r.fromUser.tagline}</p>}
              <p className="mt-1 text-xs text-navy/45">
                {r.vow.category} · prefers {r.tonePreference}
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" className="btn-primary" onClick={() => acceptInvite(r.id)}>
                  Accept
                </button>
                <button type="button" className="btn-secondary" onClick={() => declineInvite(r.id)}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <form onSubmit={requestAutoMatch} className="card mb-8 space-y-4">
        <h2 className="font-semibold">Find a partner</h2>
        <p className="text-sm text-navy/60">
          One active partner per vow. Browse people below or join the auto-match queue.
        </p>
        <select className="input" value={vowId} onChange={(e) => setVowId(e.target.value)} required>
          <option value="">Select a vow</option>
          {activeVows.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
        <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
          {TONE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="EITHER">Either mode</option>
          <option value="VEILED">Veiled only</option>
          <option value="OPEN">Open only</option>
        </select>
        <button type="submit" className="btn-primary" disabled={!vowId || discover?.vowHasPartner}>
          Join auto-match queue
        </button>
        {discover?.vowHasPartner && (
          <p className="text-sm text-navy/60">This vow already has an active partner.</p>
        )}
      </form>

      {vowId && !discover?.vowHasPartner && (
        <section className="card mb-8">
          <h2 className="font-semibold">Discover</h2>
          <p className="mt-1 text-sm text-navy/60">
            {discover?.usedOtherCategories
              ? "No one in your category right now — showing people from other categories."
              : "People with a matching category & frequency — invite someone directly."}
          </p>
          <div className="mt-4 space-y-3">
            {(discover?.candidates || []).length === 0 && (
              <p className="text-sm text-navy/50">No candidates yet. Try the auto-match queue.</p>
            )}
            {(discover?.candidates || []).map((c) => (
              <div
                key={c.user.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-navy/10 p-3"
              >
                <div>
                  <Link href={`/u/${c.user.username}`} className="font-medium text-gold hover:underline">
                    {c.user.displayName}
                  </Link>
                  {c.user.tagline && <p className="text-sm text-navy/60">{c.user.tagline}</p>}
                  <p className="mt-1 text-xs text-navy/45">
                    {c.source === "queue"
                      ? "In queue"
                      : c.source === "other_category"
                        ? `Other category${c.theirVow.category ? ` · ${c.theirVow.category}` : ""}`
                        : "Similar vow"}{" "}
                    · {c.theirVow.title}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={c.alreadyInvited}
                  onClick={() => inviteCandidate(c.user.id)}
                >
                  {c.alreadyInvited ? "Invited" : "Request partner"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="font-semibold">Waiting / pending</h2>
          <div className="mt-4 space-y-3">
            {waiting.length === 0 && <p className="text-sm text-navy/50">None</p>}
            {waiting.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-2 text-sm">
                <span>
                  {r.vow.title} · {r.status === "PENDING" && r.targetUser ? `→ ${r.targetUser.displayName}` : "auto queue"}{" "}
                  · {r.tonePreference}
                </span>
                <button type="button" className="text-xs text-red-600" onClick={() => cancelRequest(r.id)}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold">Active matches</h2>
          <div className="mt-4 space-y-2">
            {(matches?.matches.filter((m) => m.status === "ACTIVE") || []).map((m) => (
              <Link key={m.id} href={`/matches/${m.id}`} className="block text-gold hover:underline">
                {m.partner.displayName} · {m.vow.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function MatchesPage() {
  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Suspense fallback={<p className="text-navy/60">Loading…</p>}>
          <MatchesPageInner />
        </Suspense>
      </main>
    </RequireAuth>
  );
}
