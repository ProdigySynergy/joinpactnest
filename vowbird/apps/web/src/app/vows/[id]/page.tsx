"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function VowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const { data: vowData } = useQuery({
    queryKey: ["vow", id],
    queryFn: () => api<{ vow: { id: string; title: string; reason: string | null; status: string; category: string } }>(`/vows/${id}`),
  });

  const { data: progress } = useQuery({
    queryKey: ["vow-progress", id],
    queryFn: () => api<{ progress: { currentStreak: number; longestStreak: number; completionPercentage: number } }>(`/vows/${id}/progress`),
  });

  const { data: checkIns } = useQuery({
    queryKey: ["vow-checkins", id],
    queryFn: () => api<{ checkIns: Array<{ id: string; note: string | null; checkInDate: string; status: string }> }>(`/vows/${id}/check-ins`),
  });

  async function checkIn(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/check-ins", {
        method: "POST",
        body: JSON.stringify({
          vowId: id,
          note,
          checkInDate: new Date().toISOString().slice(0, 10),
          status: "COMPLETED",
        }),
      });
      setNote("");
      setMsg("Checked in!");
      qc.invalidateQueries({ queryKey: ["vow-checkins", id] });
      qc.invalidateQueries({ queryKey: ["vow-progress", id] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  const vow = vowData?.vow;

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {vow && (
          <>
            <div className="mb-6">
              <span className="badge">{vow.category}</span>
              <h1 className="mt-2 text-3xl font-bold">{vow.title}</h1>
              {vow.reason && <p className="mt-2 text-navy/70">{vow.reason}</p>}
            </div>

            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="card text-center">
                <p className="text-sm text-navy/60">Current streak</p>
                <p className="text-3xl font-bold text-gold">🔥 {progress?.progress.currentStreak ?? 0}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-navy/60">Longest streak</p>
                <p className="text-3xl font-bold">{progress?.progress.longestStreak ?? 0}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-navy/60">This week</p>
                <p className="text-3xl font-bold">{progress?.progress.completionPercentage ?? 0}%</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <form onSubmit={checkIn} className="card space-y-3">
                <h2 className="font-semibold">Check in today</h2>
                {msg && <p className="text-sm text-sage">{msg}</p>}
                <textarea className="input" placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                <button type="submit" className="btn-primary w-full">Complete check-in</button>
              </form>

              <div className="card">
                <h2 className="font-semibold">Actions</h2>
                <div className="mt-4 flex flex-col gap-2">
                  <Link href="/matches" className="btn-secondary text-center">Find partner</Link>
                  <Link href={`/letters/new?vowId=${id}`} className="btn-secondary text-center">Write letter</Link>
                </div>
              </div>
            </div>

            <div className="mt-8 card">
              <h2 className="font-semibold">Check-in history</h2>
              <div className="mt-4 space-y-2">
                {(checkIns?.checkIns || []).map((c) => (
                  <div key={c.id} className="rounded-lg border border-navy/10 p-3 text-sm">
                    <span className="font-medium">{c.checkInDate.slice(0, 10)}</span>
                    {c.note && <p className="mt-1 text-navy/70">{c.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </RequireAuth>
  );
}
