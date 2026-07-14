import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import {
  decryptFromSender,
  exportLocalE2eBackup,
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
      setBackupMsg("No local key to export yet.");
      return;
    }
    await Clipboard.setStringAsync(raw);
    setBackupMsg("Backup copied. Keep it private — it unlocks your message history.");
  }

  async function restoreBackup() {
    if (!user || !backupJson.trim()) return;
    try {
      await importLocalE2eBackup(user.id, backupJson.trim());
      const parsed = JSON.parse(backupJson.trim()) as { publicKey: string };
      await api("/e2e/keys", { method: "PUT", body: JSON.stringify({ publicKey: parsed.publicKey }) });
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

      <View style={styles.card}>
        <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8 }}>Device key backup</Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
          If you lose this device without a backup, old encrypted messages cannot be decrypted.
        </Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={copyBackup}>
          <Text style={styles.btnSecondaryText}>Copy key backup</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { minHeight: 80, textAlignVertical: "top", marginTop: 12 }]}
          placeholder="Paste backup JSON to restore"
          multiline
          value={backupJson}
          onChangeText={setBackupJson}
        />
        <TouchableOpacity style={styles.btnPrimary} onPress={restoreBackup}>
          <Text style={styles.btnPrimaryText}>Restore backup</Text>
        </TouchableOpacity>
        {backupMsg ? (
          <Text style={{ color: colors.sage, marginTop: 8, fontSize: 13 }}>{backupMsg}</Text>
        ) : null}
      </View>

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
