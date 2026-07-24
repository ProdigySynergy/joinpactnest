"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { data: vows } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string; category: string }> }>("/vows"),
  });

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () => api<{ matches: Array<{ id: string; status: string; partner: { displayName: string } }> }>("/matches/me"),
  });

  const { data: progress } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api<{ progress: Array<{ title: string; currentStreak: number; completionPercentage: number }> }>("/progress/me"),
  });

  const { data: incoming } = useQuery({
    queryKey: ["partner-requests-incoming"],
    queryFn: () =>
      api<{
        requests: Array<{
          id: string;
          vow: { title: string };
          fromUser: { displayName: string };
        }>;
      }>("/partner-requests/incoming"),
    refetchInterval: 30_000,
  });

  const inviteCount = incoming?.requests.length ?? 0;

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-navy/70">Your vows, streaks, and accountability at a glance.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/vows/new" className="btn-primary">New vow</Link>
            <Link href="/matches" className="btn-secondary">Find partner</Link>
          </div>
        </div>

        {inviteCount > 0 && (
          <div className="card mb-6 border-gold/40 bg-gold/10">
            <p className="font-semibold text-navy">
              You have {inviteCount} partner invite{inviteCount === 1 ? "" : "s"} waiting
            </p>
            <ul className="mt-2 space-y-1 text-sm text-navy/70">
              {incoming!.requests.slice(0, 3).map((r) => (
                <li key={r.id}>
                  {r.fromUser.displayName} · {r.vow.title}
                </li>
              ))}
            </ul>
            <Link href="/matches" className="mt-3 inline-block text-sm font-medium text-gold hover:underline">
              Review on Partners →
            </Link>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="card md:col-span-2">
            <h2 className="font-semibold">Active vows</h2>
            <div className="mt-4 space-y-3">
              {(vows?.vows.filter((v) => v.status === "ACTIVE") || []).map((v) => (
                <Link key={v.id} href={`/vows/${v.id}`} className="block rounded-xl border border-navy/10 p-4 hover:border-gold">
                  <div className="flex justify-between">
                    <span className="font-medium">{v.title}</span>
                    <span className="badge">{v.category}</span>
                  </div>
                </Link>
              ))}
              {!vows?.vows.length && <p className="text-navy/50">No vows yet. Create your first one!</p>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h2 className="font-semibold">Streaks</h2>
              <div className="mt-4 space-y-2">
                {(progress?.progress || []).slice(0, 3).map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{p.title}</span>
                    <span className="streak">🔥 {p.currentStreak}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold">Partners</h2>
              <div className="mt-4 space-y-2">
                {(matches?.matches.filter((m) => m.status === "ACTIVE") || []).map((m) => (
                  <Link key={m.id} href={`/matches/${m.id}`} className="block text-sm text-gold hover:underline">
                    {m.partner.displayName}
                  </Link>
                ))}
                {!matches?.matches.length && (
                  <Link href="/matches" className="text-sm text-gold hover:underline">Request a partner →</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
