"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { decryptFromSender, encryptForRecipient } from "@/lib/e2e";

type WireMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
};

export default function MessageThreadPage() {
  const { userId: peerId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["dm-thread", peerId],
    queryFn: () =>
      api<{
        peer: { id: string; username: string; displayName: string };
        messages: WireMessage[];
      }>(`/messages/with/${peerId}`),
    enabled: !!peerId,
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!user || !data?.messages?.length) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = { ...decrypted };
      for (const m of data.messages) {
        if (next[m.id]) continue;
        try {
          const otherId = m.senderId === user.id ? peerId : m.senderId;
          const keyRes = await api<{ key: { publicKey: string } }>(`/e2e/keys/${otherId}`);
          next[m.id] = await decryptFromSender(user.id, keyRes.key.publicKey, m.ciphertext, m.iv);
        } catch {
          next[m.id] = "[Unable to decrypt on this device]";
        }
      }
      if (!cancelled) setDecrypted(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-decrypt when message ids change
  }, [user?.id, peerId, data?.messages.map((m) => m.id).join(",")]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    setError("");
    try {
      const keyRes = await api<{ key: { publicKey: string } }>(`/e2e/keys/${peerId}`);
      const { ciphertext, iv } = await encryptForRecipient(user.id, keyRes.key.publicKey, text.trim());
      await api("/messages", {
        method: "POST",
        body: JSON.stringify({ recipientId: peerId, ciphertext, iv }),
      });
      setText("");
      await qc.invalidateQueries({ queryKey: ["dm-thread", peerId] });
      await qc.invalidateQueries({ queryKey: ["dm-conversations"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto flex max-w-2xl flex-col px-4 py-8" style={{ minHeight: "70vh" }}>
        <div className="mb-4">
          <Link href="/messages" className="text-sm text-gold hover:underline">
            ← All messages
          </Link>
          {data?.peer && (
            <h1 className="mt-2 text-2xl font-bold">
              <Link href={`/u/${data.peer.username}`} className="hover:text-gold">
                {data.peer.displayName}
              </Link>
            </h1>
          )}
          <p className="text-xs text-navy/50">End-to-end encrypted · server cannot read content</p>
        </div>

        {isLoading && <p className="text-navy/60">Loading…</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-navy/10 bg-white/50 p-4">
          {(data?.messages || []).map((m) => {
            const mine = m.senderId === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? "bg-gold/25 text-navy" : "bg-navy/5 text-navy"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{decrypted[m.id] || "Decrypting…"}</p>
                  <p className="mt-1 text-[10px] text-navy/40">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
          {(data?.messages || []).length === 0 && !isLoading && (
            <p className="text-center text-sm text-navy/50">Say hello — privately.</p>
          )}
        </div>

        <form onSubmit={send} className="mt-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Write an encrypted message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
          />
          <button type="submit" className="btn-primary" disabled={sending || !text.trim()}>
            {sending ? "…" : "Send"}
          </button>
        </form>
      </main>
    </RequireAuth>
  );
}
