"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { MoodFeed } from "@/components/MoodFeed";
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
    queryFn: () =>
      api<{
        vow: {
          id: string;
          title: string;
          reason: string | null;
          status: string;
          category: string;
          startDate: string;
          endDate: string | null;
          noJudgementZone: boolean;
          leaderboardEnabled: boolean;
        };
      }>(`/vows/${id}`),
  });

  const { data: progress } = useQuery({
    queryKey: ["vow-progress", id],
    queryFn: () =>
      api<{ progress: { currentStreak: number; longestStreak: number; completionPercentage: number } }>(
        `/vows/${id}/progress`
      ),
  });

  const { data: checkIns } = useQuery({
    queryKey: ["vow-checkins", id],
    queryFn: () =>
      api<{ checkIns: Array<{ id: string; note: string | null; checkInDate: string; status: string }> }>(
        `/vows/${id}/check-ins`
      ),
  });

  async function checkIn(e: FormEvent, status: "COMPLETED" | "MISSED") {
    e.preventDefault();
    setMsg("");
    try {
      const res = await api<{ accountability?: { type: string; message: string | null } }>("/check-ins", {
        method: "POST",
        body: JSON.stringify({
          vowId: id,
          note: note || undefined,
          checkInDate: new Date().toISOString().slice(0, 10),
          status,
        }),
      });
      setNote("");
      setMsg(
        status === "COMPLETED"
          ? "Checked in!"
          : res.accountability?.message || "Miss recorded"
      );
      qc.invalidateQueries({ queryKey: ["vow-checkins", id] });
      qc.invalidateQueries({ queryKey: ["vow-progress", id] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function toggleSetting(field: "noJudgementZone" | "leaderboardEnabled", value: boolean) {
    await api(`/vows/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    qc.invalidateQueries({ queryKey: ["vow", id] });
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
              {vow.noJudgementZone && (
                <span className="badge ml-2 border-sage/40 bg-sage/15 text-sage">No judgement</span>
              )}
              <h1 className="mt-2 text-3xl font-bold">{vow.title}</h1>
              {vow.reason && <p className="mt-2 text-navy/70">{vow.reason}</p>}
              <p className="mt-2 text-sm text-navy/50">
                Starts {String(vow.startDate).slice(0, 10)}
                {vow.endDate ? ` · Ends ${String(vow.endDate).slice(0, 10)}` : ""}
              </p>
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

            <div className="mb-8 grid gap-6 md:grid-cols-2">
              <form className="card space-y-3">
                <h2 className="font-semibold">Check in today</h2>
                {msg && <p className="text-sm text-sage">{msg}</p>}
                <textarea
                  className="input"
                  placeholder="Optional note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <button type="button" onClick={(e) => checkIn(e, "COMPLETED")} className="btn-primary w-full">
                  Complete check-in
                </button>
                <button type="button" onClick={(e) => checkIn(e, "MISSED")} className="btn-secondary w-full">
                  Mark missed
                </button>
              </form>

              <div className="card space-y-4">
                <h2 className="font-semibold">Actions & settings</h2>
                <div className="flex flex-col gap-2">
                  <Link href="/matches" className="btn-secondary text-center">
                    Find partner
                  </Link>
                  <Link href={`/letters/new?vowId=${id}`} className="btn-secondary text-center">
                    Write letter
                  </Link>
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={vow.noJudgementZone}
                    onChange={(e) => toggleSetting("noJudgementZone", e.target.checked)}
                  />
                  <span>No judgement zone</span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={vow.leaderboardEnabled}
                    onChange={(e) => toggleSetting("leaderboardEnabled", e.target.checked)}
                  />
                  <span>Show leaderboard with partners</span>
                </label>
              </div>
            </div>

            <div className="mb-8">
              <MoodFeed context={{ vowId: id }} />
            </div>

            <div className="card">
              <h2 className="font-semibold">Check-in history</h2>
              <div className="mt-4 space-y-2">
                {(checkIns?.checkIns || []).map((c) => (
                  <div key={c.id} className="rounded-lg border border-navy/10 p-3 text-sm">
                    <span className="font-medium">{String(c.checkInDate).slice(0, 10)}</span>
                    <span className="ml-2 text-navy/50">{c.status}</span>
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
