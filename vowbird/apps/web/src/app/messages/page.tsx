"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  decryptFromSender,
  exportLocalE2eBackup,
  importLocalE2eBackup,
} from "@/lib/e2e";

type Conversation = {
  peer: { id: string; username: string; displayName: string };
  lastMessage: {
    id: string;
    senderId: string;
    ciphertext: string;
    iv: string;
    encrypted: boolean;
    createdAt: string;
  };
};

export default function MessagesPage() {
  const { user } = useAuth();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [backupMsg, setBackupMsg] = useState("");

  const { data } = useQuery({
    queryKey: ["dm-conversations"],
    queryFn: () => api<{ conversations: Conversation[] }>("/messages/conversations"),
  });

  const peerIds = useMemo(
    () => (data?.conversations || []).map((c) => c.peer.id).join(","),
    [data?.conversations]
  );

  useQuery({
    queryKey: ["dm-previews", peerIds, user?.id],
    enabled: !!user && !!data?.conversations?.length,
    queryFn: async () => {
      if (!user || !data) return {};
      const next: Record<string, string> = {};
      for (const c of data.conversations) {
        try {
          if (!c.lastMessage.encrypted) {
            next[c.peer.id] = c.lastMessage.ciphertext;
            continue;
          }
          const otherId = c.lastMessage.senderId === user.id ? c.peer.id : c.lastMessage.senderId;
          const keyRes = await api<{ key: { publicKey: string } }>(`/e2e/keys/${otherId}`);
          const text = await decryptFromSender(
            user.id,
            keyRes.key.publicKey,
            c.lastMessage.ciphertext,
            c.lastMessage.iv
          );
          next[c.peer.id] = text;
        } catch {
          next[c.peer.id] = "[Unable to decrypt on this device]";
        }
      }
      setPreviews(next);
      return next;
    },
  });

  function downloadBackup() {
    if (!user) return;
    const raw = exportLocalE2eBackup(user.id);
    if (!raw) {
      setBackupMsg("No local key to export yet.");
      return;
    }
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vowbird-e2e-backup-${user.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg("Backup downloaded. Keep it private — it unlocks your message history.");
  }

  async function onImportBackup(file: File | null) {
    if (!user || !file) return;
    try {
      const text = await file.text();
      importLocalE2eBackup(user.id, text);
      const parsed = JSON.parse(text) as { publicKey: string };
      await api("/e2e/keys", { method: "PUT", body: JSON.stringify({ publicKey: parsed.publicKey }) });
      setBackupMsg("Key backup restored. Refresh threads if decrypt failed earlier.");
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : "Invalid backup file");
    }
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="mt-2 text-sm text-navy/65">
            Messages are end-to-end encrypted when both of you have keys set up. If someone hasn’t
            opened Vowbird yet, you can still chat — you’ll see a clear notice that those messages
            aren’t encrypted.
          </p>
        </div>

        <div className="card space-y-3 text-sm">
          <h2 className="font-semibold">Device key backup</h2>
          <p className="text-navy/60">
            If you clear site data or switch browsers without a backup, old messages cannot be
            decrypted.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary py-2 text-sm" onClick={downloadBackup}>
              Download key backup
            </button>
            <label className="btn-secondary cursor-pointer py-2 text-sm">
              Restore backup
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => onImportBackup(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          {backupMsg && <p className="text-navy/70">{backupMsg}</p>}
        </div>

        <div className="space-y-3">
          {(data?.conversations || []).map((c) => (
            <Link
              key={c.peer.id}
              href={`/messages/${c.peer.id}`}
              className="card block hover:border-gold"
            >
              <p className="font-semibold">{c.peer.displayName}</p>
              <p className="text-sm text-navy/50">@{c.peer.username}</p>
              <p className="mt-2 truncate text-sm text-navy/70">
                {previews[c.peer.id] || "Encrypted message"}
              </p>
              <p className="mt-1 text-xs text-navy/40">
                {new Date(c.lastMessage.createdAt).toLocaleString()}
              </p>
            </Link>
          ))}
          {(data?.conversations || []).length === 0 && (
            <p className="text-sm text-navy/50">
              No conversations yet. Open a profile and tap Message.
            </p>
          )}
        </div>
      </main>
    </RequireAuth>
  );
}
