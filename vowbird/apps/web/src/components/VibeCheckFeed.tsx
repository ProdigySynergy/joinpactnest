"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MAX_VIBE_CHECKS_PER_DAY,
  VIBE_EMOJIS,
  VIBE_LABELS,
  VIBE_TYPES,
  VIBE_UPDATE_COOLDOWN_MINUTES,
} from "@vowbird/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type VibeRow = {
  id: string;
  vibe: string;
  label?: string;
  note: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
};

type VibeLeader = {
  user: { displayName: string };
  vibeCount: number;
  latestLabel: string;
  latestEmoji: string;
};

type Context = { pactId: string } | { partnerMatchId: string };

function contextQuery(ctx: Context): string {
  if ("pactId" in ctx) return `pactId=${ctx.pactId}`;
  return `partnerMatchId=${ctx.partnerMatchId}`;
}

function formatCooldownRemaining(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function VibeCheckFeed({
  context,
  canPost = true,
}: {
  context: Context;
  canPost?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [vibe, setVibe] = useState<string>("LOCKED_IN");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const queryKey = ["vibes", context];
  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      api<{
        vibes: VibeRow[];
        currentVibes: VibeRow[];
        vibeLeaderboard?: VibeLeader[];
        vibeLeaderboardEnabled?: boolean;
      }>(`/vibes?${contextQuery(context)}`),
  });

  const myLatestAt = useMemo(() => {
    const mine = (data?.vibes || []).filter((row) => row.user.id === user?.id);
    if (!mine.length) return null;
    return Math.max(...mine.map((row) => new Date(row.createdAt).getTime()));
  }, [data?.vibes, user?.id]);

  const cooldownMs = VIBE_UPDATE_COOLDOWN_MINUTES * 60 * 1000;
  const nextAllowedAt = myLatestAt != null ? myLatestAt + cooldownMs : null;
  const remainingMs = nextAllowedAt != null ? nextAllowedAt - now : 0;
  const onCooldown = remainingMs > 0;

  useEffect(() => {
    if (!onCooldown) return;
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [onCooldown]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    if (onCooldown) {
      setError(`You can drop another vibe in ${formatCooldownRemaining(remainingMs)}.`);
      return;
    }
    try {
      await api("/vibes", {
        method: "POST",
        body: JSON.stringify({ vibe, note: note || undefined, ...context }),
      });
      setNote("");
      setMsg("Vibe dropped ✨");
      qc.invalidateQueries({ queryKey });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="card border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-navy">Vibe Check</h2>
          <p className="mt-1 text-sm text-navy/60">
            Drop what you&apos;re up to — cheesy, real, and accountable.
          </p>
        </div>
        <span className="badge bg-gold/20 text-navy">✨ Live</span>
      </div>

      {(data?.currentVibes || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data!.currentVibes.map((row) => {
            const emoji = VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
            const label = row.label || VIBE_LABELS[row.vibe as keyof typeof VIBE_LABELS] || row.vibe;
            return (
              <div
                key={row.id}
                className="rounded-full border border-navy/10 bg-white px-3 py-1.5 text-sm"
              >
                <span className="font-medium">{row.user.displayName}</span>
                <span className="text-navy/50"> · </span>
                <span>
                  {emoji} {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {canPost && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {VIBE_TYPES.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVibe(v)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  vibe === v ? "border-gold bg-gold/20 font-medium" : "border-navy/15 hover:border-gold/50"
                }`}
              >
                {VIBE_EMOJIS[v]} {VIBE_LABELS[v]}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder={vibe === "CUSTOM" ? "What's the vibe?" : "Optional note (optional flex)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {msg && <p className="text-sm text-sage">{msg}</p>}
          <button type="submit" className="btn-primary w-full" disabled={onCooldown}>
            {onCooldown
              ? `Available in ${formatCooldownRemaining(remainingMs)}`
              : "Drop vibe check"}
          </button>
          <p className="text-xs text-navy/40">
            Up to {MAX_VIBE_CHECKS_PER_DAY}/day · {VIBE_UPDATE_COOLDOWN_MINUTES} min between vibes
          </p>
        </form>
      )}

      {(data?.vibeLeaderboardEnabled && (data.vibeLeaderboard?.length ?? 0) > 0) && (
        <div className="mt-4 rounded-xl border border-navy/10 bg-white/80 p-3">
          <h3 className="text-sm font-semibold text-navy">Most vibes this week</h3>
          <div className="mt-2 space-y-1.5">
            {data!.vibeLeaderboard!.map((row, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  #{i + 1} {row.user.displayName}
                  <span className="text-navy/50">
                    {" "}
                    · {row.latestEmoji} {row.latestLabel}
                  </span>
                </span>
                <span className="streak">{row.vibeCount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-2 border-t border-navy/10 pt-4">
        <h3 className="text-sm font-medium text-navy/70">Recent vibes</h3>
        {(data?.vibes || []).slice(0, 12).map((row) => {
          const emoji = VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
          const label = row.label || VIBE_LABELS[row.vibe as keyof typeof VIBE_LABELS] || row.vibe;
          return (
            <div key={row.id} className="rounded-xl border border-navy/10 bg-white/70 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium">
                  {row.user.displayName} · {emoji} {label}
                </span>
                <span className="shrink-0 text-xs text-navy/40">
                  {new Date(row.createdAt).toLocaleString()}
                </span>
              </div>
              {row.note && <p className="mt-1 text-navy/70">{row.note}</p>}
            </div>
          );
        })}
        {(data?.vibes || []).length === 0 && (
          <p className="text-sm text-navy/50">No vibes yet. Be the first to drop one.</p>
        )}
      </div>
    </div>
  );
}
