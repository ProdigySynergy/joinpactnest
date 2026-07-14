import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import {
  decryptFromSender,
  exportLocalE2eBackup,
  hasLocalE2eKey,
  importLocalE2eBackup,
} from "../../lib/e2e";
import { colors, styles } from "../../lib/theme";

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

export default function MessagesScreen() {
  const { user } = useAuth();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [backupJson, setBackupJson] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [backupOpen, setBackupOpen] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  const { data } = useQuery({
    queryKey: ["dm-conversations"],
    queryFn: () => api<{ conversations: Conversation[] }>("/messages/conversations"),
  });

  useQuery({
    queryKey: ["e2e-has-key", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const ok = await hasLocalE2eKey(user!.id);
      setHasKey(ok);
      return ok;
    },
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
          next[c.peer.id] = await decryptFromSender(
            user.id,
            keyRes.key.publicKey,
            c.lastMessage.ciphertext,
            c.lastMessage.iv
          );
        } catch {
          next[c.peer.id] = "[Unable to decrypt on this device]";
        }
      }
      setPreviews(next);
      return next;
    },
  });

  async function copyBackup() {
    if (!user) return;
    const raw = await exportLocalE2eBackup(user.id);
    if (!raw) {
      setBackupMsg("No local key to export yet. Open Messages once online so a key can be created.");
      return;
    }
    await Clipboard.setStringAsync(raw);
    setBackupMsg("Backup copied. Store it somewhere private (password manager or encrypted note).");
  }

  async function shareBackup() {
    if (!user) return;
    const raw = await exportLocalE2eBackup(user.id);
    if (!raw) {
      setBackupMsg("No local key to export yet.");
      return;
    }
    await Share.share({
      message: raw,
      title: "Vowbird E2E key backup",
    });
    setBackupMsg("Share sheet opened. Only send this to yourself on a device you trust.");
  }

  async function pasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      setBackupMsg("Clipboard is empty.");
      return;
    }
    setBackupJson(text.trim());
    setBackupMsg("Pasted from clipboard. Review, then restore.");
  }

  function confirmRestore() {
    if (!user || !backupJson.trim()) return;
    Alert.alert(
      "Replace device key?",
      "Restoring overwrites the key on this device. You won’t decrypt messages sealed with the previous local key.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Restore", style: "destructive", onPress: restoreBackup },
      ]
    );
  }

  async function restoreBackup() {
    if (!user || !backupJson.trim()) return;
    try {
      await importLocalE2eBackup(user.id, backupJson.trim());
      const parsed = JSON.parse(backupJson.trim()) as { publicKey: string };
      await api("/e2e/keys", { method: "PUT", body: JSON.stringify({ publicKey: parsed.publicKey }) });
      setHasKey(true);
      setBackupMsg("Key backup restored. Re-open threads if decrypt failed earlier.");
      setBackupJson("");
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : "Invalid backup");
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>
        End-to-end encrypted when both of you have keys. Otherwise you’ll see a clear notice.
      </Text>

      <TouchableOpacity style={styles.card} onPress={() => setBackupOpen((o) => !o)}>
        <Text style={{ fontWeight: "700", color: colors.navy }}>
          Device key backup {backupOpen ? "▾" : "▸"}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
          {hasKey === false
            ? "No local key yet — it’ll be created automatically."
            : "Back up so you can read history after switching devices."}
        </Text>
      </TouchableOpacity>

      {backupOpen && (
        <View style={styles.card}>
          <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
            This file unlocks your encrypted history. Never post it publicly. Prefer a password
            manager over chat apps.
          </Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={copyBackup}>
            <Text style={styles.btnSecondaryText}>Copy backup</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={shareBackup}>
            <Text style={styles.btnSecondaryText}>Share backup…</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={pasteFromClipboard}>
            <Text style={styles.btnSecondaryText}>Paste from clipboard</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: "top", marginTop: 12 }]}
            placeholder="Backup JSON"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            value={backupJson}
            onChangeText={setBackupJson}
          />
          <TouchableOpacity
            style={[styles.btnPrimary, { opacity: !backupJson.trim() ? 0.5 : 1 }]}
            disabled={!backupJson.trim()}
            onPress={confirmRestore}
          >
            <Text style={styles.btnPrimaryText}>Restore backup</Text>
          </TouchableOpacity>
          {backupMsg ? (
            <Text style={{ color: colors.sage, marginTop: 8, fontSize: 13 }}>{backupMsg}</Text>
          ) : null}
        </View>
      )}

      <Text style={{ fontWeight: "700", marginTop: 8, marginBottom: 8, color: colors.navy }}>
        Conversations
      </Text>
      {(data?.conversations || []).length === 0 && (
        <Text style={{ color: colors.muted }}>No messages yet. Start from someone’s profile.</Text>
      )}
      {(data?.conversations || []).map((c) => (
        <TouchableOpacity
          key={c.peer.id}
          style={styles.card}
          onPress={() => router.push(`/messages/${c.peer.id}`)}
        >
          <Text style={{ fontWeight: "600", color: colors.navy }}>{c.peer.displayName}</Text>
          <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={1}>
            {previews[c.peer.id] || (c.lastMessage.encrypted ? "Decrypting…" : c.lastMessage.ciphertext)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
