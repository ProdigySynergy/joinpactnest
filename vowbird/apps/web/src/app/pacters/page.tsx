"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

type Person = {
  id: string;
  username: string;
  displayName: string;
  tagline?: string | null;
};

export default function PactersPage() {
  const qc = useQueryClient();

  const { data: network } = useQuery({
    queryKey: ["pacters"],
    queryFn: () =>
      api<{
        pacters: Array<{
          user: Person;
          viaPact: boolean;
          viaRequest: boolean;
          sharedPactCount: number;
        }>;
      }>("/pacters/me"),
  });

  const { data: requests } = useQuery({
    queryKey: ["pacter-requests"],
    queryFn: () =>
      api<{
        incoming: Array<{ id: string; user: Person; createdAt: string }>;
        outgoing: Array<{ id: string; user: Person; createdAt: string }>;
      }>("/pacters/requests"),
  });

  const { data: muted } = useQuery({
    queryKey: ["pacter-muted"],
    queryFn: () =>
      api<{ muted: Array<{ id: string; user: Person }> }>("/pacters/muted"),
  });

  async function accept(id: string) {
    await api(`/pacters/requests/${id}/accept`, { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["pacter-requests"] });
    qc.invalidateQueries({ queryKey: ["pacters"] });
  }

  async function decline(id: string) {
    await api(`/pacters/requests/${id}/decline`, { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["pacter-requests"] });
  }

  async function cancel(id: string) {
    await api(`/pacters/requests/${id}/cancel`, { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["pacter-requests"] });
  }

  async function mute(userId: string) {
    await api("/pacters/mute", {
      method: "POST",
      body: JSON.stringify({ mutedUserId: userId }),
    });
    qc.invalidateQueries({ queryKey: ["pacters"] });
    qc.invalidateQueries({ queryKey: ["pacter-muted"] });
  }

  async function unmute(userId: string) {
    await api(`/pacters/mute/${userId}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["pacters"] });
    qc.invalidateQueries({ queryKey: ["pacter-muted"] });
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Pactered</h1>
          <p className="mt-2 text-navy/65">
            People you share pacts with, plus anyone you&apos;ve accepted as a pacter.
            Mute only hides them here — it doesn&apos;t leave a pact.
          </p>
        </div>

        {(requests?.incoming.length || 0) > 0 && (
          <section className="card space-y-3">
            <h2 className="font-semibold">Incoming requests</h2>
            {requests!.incoming.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/u/${r.user.username}`} className="font-medium hover:text-gold">
                  {r.user.displayName}
                </Link>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary py-2 text-sm" onClick={() => accept(r.id)}>
                    Accept
                  </button>
                  <button type="button" className="btn-secondary py-2 text-sm" onClick={() => decline(r.id)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {(requests?.outgoing.length || 0) > 0 && (
          <section className="card space-y-3">
            <h2 className="font-semibold">Outgoing requests</h2>
            {requests!.outgoing.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/u/${r.user.username}`} className="font-medium hover:text-gold">
                  {r.user.displayName}
                </Link>
                <button type="button" className="btn-secondary py-2 text-sm" onClick={() => cancel(r.id)}>
                  Cancel
                </button>
              </div>
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-3 font-semibold">Your network</h2>
          <div className="space-y-3">
            {(network?.pacters || []).map((p) => (
              <div key={p.user.id} className="card flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Link href={`/u/${p.user.username}`} className="font-semibold hover:text-gold">
                    {p.user.displayName}
                  </Link>
                  <p className="text-sm text-navy/50">@{p.user.username}</p>
                  <p className="mt-1 text-xs text-navy/45">
                    {p.viaPact && (
                      <span>
                        Shared pacts: {p.sharedPactCount}
                        {p.viaRequest ? " · " : ""}
                      </span>
                    )}
                    {p.viaRequest && <span>Manual pacter</span>}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm text-navy/50 hover:text-red-600"
                  onClick={() => mute(p.user.id)}
                >
                  Mute
                </button>
              </div>
            ))}
            {(network?.pacters || []).length === 0 && (
              <p className="text-sm text-navy/50">
                No pacters yet. Join a public pact or send a request from someone&apos;s profile.
              </p>
            )}
          </div>
        </section>

        {(muted?.muted.length || 0) > 0 && (
          <section className="card space-y-3">
            <h2 className="font-semibold">Muted</h2>
            <p className="text-sm text-navy/55">
              Hidden from this list only. You still share any pacts you&apos;re both in.
            </p>
            {muted!.muted.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/u/${m.user.username}`} className="font-medium hover:text-gold">
                  {m.user.displayName}
                </Link>
                <button type="button" className="btn-secondary py-2 text-sm" onClick={() => unmute(m.user.id)}>
                  Unmute
                </button>
              </div>
            ))}
          </section>
        )}
      </main>
    </RequireAuth>
  );
}
