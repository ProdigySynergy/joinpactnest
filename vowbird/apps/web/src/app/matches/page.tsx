"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { TONE_OPTIONS } from "@vowbird/shared";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function MatchesPage() {
  const qc = useQueryClient();
  const [vowId, setVowId] = useState("");
  const [tone, setTone] = useState("Gentle");
  const [mode, setMode] = useState("EITHER");
  const [msg, setMsg] = useState("");

  const { data: vows } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string }> }>("/vows"),
  });

  const { data: requests } = useQuery({
    queryKey: ["partner-requests"],
    queryFn: () => api<{ requests: Array<{ id: string; status: string; tonePreference: string; vow: { title: string } }> }>("/partner-requests/me"),
  });

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () => api<{ matches: Array<{ id: string; status: string; partner: { displayName: string }; vow: { title: string } }> }>("/matches/me"),
  });

  async function requestPartner(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/partner-requests", {
        method: "POST",
        body: JSON.stringify({ vowId, tonePreference: tone, profileModePreference: mode }),
      });
      setMsg("Request submitted! Matching runs automatically.");
      qc.invalidateQueries({ queryKey: ["partner-requests"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Accountability partners</h1>

        <form onSubmit={requestPartner} className="card mb-8 space-y-4">
          <h2 className="font-semibold">Request a partner</h2>
          {msg && <p className="text-sm text-sage">{msg}</p>}
          <select className="input" value={vowId} onChange={(e) => setVowId(e.target.value)} required>
            <option value="">Select a vow</option>
            {(vows?.vows.filter((v) => v.status === "ACTIVE") || []).map((v) => (
              <option key={v.id} value={v.id}>{v.title}</option>
            ))}
          </select>
          <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="EITHER">Either mode</option>
            <option value="VEILED">Veiled only</option>
            <option value="OPEN">Open only</option>
          </select>
          <button type="submit" className="btn-primary">Request match</button>
        </form>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h2 className="font-semibold">Waiting</h2>
            <div className="mt-4 space-y-2">
              {(requests?.requests.filter((r) => r.status === "WAITING") || []).map((r) => (
                <p key={r.id} className="text-sm">{r.vow.title} · {r.tonePreference}</p>
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
      </main>
    </RequireAuth>
  );
}
