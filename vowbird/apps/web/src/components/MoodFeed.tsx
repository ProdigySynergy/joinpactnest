"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ENCOURAGEMENT_LABELS,
  ENCOURAGEMENT_STICKERS,
  MAX_MOOD_UPDATES_PER_DAY,
  MOOD_LABELS,
  MOOD_TYPES,
  MOOD_UPDATE_COOLDOWN_HOURS,
} from "@vowbird/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type MoodRow = {
  id: string;
  mood: string;
  note: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
  encouragements: Array<{
    id: string;
    sticker: string;
    stickerLabel?: string;
    note: string | null;
    fromUser: { displayName: string };
  }>;
};

type Context =
  | { vowId: string }
  | { pactId: string }
  | { partnerMatchId: string };

function contextQuery(ctx: Context): string {
  if ("vowId" in ctx) return `vowId=${ctx.vowId}`;
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

export function MoodFeed({ context, canPost = true }: { context: Context; canPost?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mood, setMood] = useState<string>("OKAY");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [cheerNote, setCheerNote] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());

  const queryKey = ["moods", context];
  const { data } = useQuery({
    queryKey,
    queryFn: () => api<{ moods: MoodRow[] }>(`/moods?${contextQuery(context)}`),
  });

  const myLatestAt = useMemo(() => {
    const mine = (data?.moods || []).filter((row) => row.user.id === user?.id);
    if (!mine.length) return null;
    return Math.max(...mine.map((row) => new Date(row.createdAt).getTime()));
  }, [data?.moods, user?.id]);

  const cooldownMs = MOOD_UPDATE_COOLDOWN_HOURS * 60 * 60 * 1000;
  const nextAllowedAt = myLatestAt != null ? myLatestAt + cooldownMs : null;
  const remainingMs = nextAllowedAt != null ? nextAllowedAt - now : 0;
  const onCooldown = remainingMs > 0;

  useEffect(() => {
    if (!onCooldown) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [onCooldown]);

  async function postMood(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    if (onCooldown) {
      setError(
        `You can share another mood in ${formatCooldownRemaining(remainingMs)} (${MOOD_UPDATE_COOLDOWN_HOURS}h between updates).`
      );
      return;
    }
    try {
      await api("/moods", {
        method: "POST",
        body: JSON.stringify({ mood, note: note || undefined, ...context }),
      });
      setNote("");
      setMsg("Mood shared");
      qc.invalidateQueries({ queryKey });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function sendCheer(moodUpdateId: string, sticker: string) {
    setMsg("");
    setError("");
    try {
      await api("/encouragements", {
        method: "POST",
        body: JSON.stringify({
          moodUpdateId,
          sticker,
          note: cheerNote[moodUpdateId] || undefined,
        }),
      });
      setCheerNote((prev) => ({ ...prev, [moodUpdateId]: "" }));
      qc.invalidateQueries({ queryKey });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-semibold">Mood check</h2>
      <p className="text-sm text-navy/60">
        Share how you&apos;re doing — once every {MOOD_UPDATE_COOLDOWN_HOURS} hours (up to{" "}
        {MAX_MOOD_UPDATES_PER_DAY}/day). Partners can send a quick cheer.
      </p>
      {msg && <p className="text-sm text-sage">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {canPost && (
        <form onSubmit={postMood} className="space-y-3 border-b border-navy/10 pb-4">
          {onCooldown && (
            <p className="rounded-xl border border-navy/10 bg-navy/5 px-3 py-2 text-sm text-navy/70">
              Give your last check-in room to breathe. You can share again in{" "}
              <span className="font-medium text-navy">{formatCooldownRemaining(remainingMs)}</span>.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {MOOD_TYPES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood(m)}
                disabled={onCooldown}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  mood === m ? "border-gold bg-gold/20 font-medium" : "border-navy/15"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {MOOD_LABELS[m]}
              </button>
            ))}
          </div>
          <input
            className="input"
            placeholder="Optional note (what's going on?)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={280}
            disabled={onCooldown}
          />
          <button type="submit" className="btn-secondary w-full" disabled={onCooldown}>
            {onCooldown ? `Available in ${formatCooldownRemaining(remainingMs)}` : "Share mood"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {(data?.moods || []).map((row) => {
          const mine = row.user.id === user?.id;
          return (
            <div key={row.id} className="rounded-lg border border-navy/10 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {row.user.displayName} ·{" "}
                  <span className="text-gold">
                    {MOOD_LABELS[row.mood as keyof typeof MOOD_LABELS] || row.mood}
                  </span>
                </p>
                <time className="text-xs text-navy/45">{new Date(row.createdAt).toLocaleString()}</time>
              </div>
              {row.note && <p className="mt-1 text-sm text-navy/70">{row.note}</p>}

              {row.encouragements.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {row.encouragements.map((e) => (
                    <li key={e.id} className="text-xs text-navy/60">
                      <span className="font-medium text-navy/80">{e.fromUser.displayName}</span>
                      {" → "}
                      {e.stickerLabel || ENCOURAGEMENT_LABELS[e.sticker as keyof typeof ENCOURAGEMENT_LABELS] || e.sticker}
                      {e.note ? `: ${e.note}` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {!mine && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {ENCOURAGEMENT_STICKERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => sendCheer(row.id, s)}
                        className="rounded-md border border-navy/15 bg-cream px-2 py-1 text-xs hover:border-gold"
                      >
                        {ENCOURAGEMENT_LABELS[s]}
                      </button>
                    ))}
                  </div>
                  <input
                    className="input py-1.5 text-sm"
                    placeholder="Optional short note with cheer"
                    value={cheerNote[row.id] || ""}
                    onChange={(e) => setCheerNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    maxLength={140}
                  />
                </div>
              )}
            </div>
          );
        })}
        {(data?.moods || []).length === 0 && (
          <p className="text-sm text-navy/50">No moods yet today.</p>
        )}
      </div>
    </div>
  );
}
