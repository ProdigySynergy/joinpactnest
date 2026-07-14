import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { decryptFromSender, encryptForRecipient } from "../../lib/e2e";
import { colors, styles } from "../../lib/theme";

type WireMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
  iv: string;
  encrypted: boolean;
  createdAt: string;
};

export default function MessageThreadScreen() {
  const { userId: peerId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});

  const messagingSelf = Boolean(user && peerId === user.id);

  const { data, isLoading } = useQuery({
    queryKey: ["dm-thread", peerId],
    queryFn: () =>
      api<{
        peer: { id: string; username: string; displayName: string };
        peerHasE2eKey: boolean;
        messages: WireMessage[];
      }>(`/messages/with/${peerId}`),
    enabled: !!peerId && !messagingSelf,
    refetchInterval: 8000,
  });

  const usePlaintext = data ? !data.peerHasE2eKey : false;
  const messageIds = (data?.messages || []).map((m) => m.id).join(",");

  useEffect(() => {
    if (!user || !data?.messages?.length) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = { ...decrypted };
      for (const m of data.messages) {
        if (next[m.id]) continue;
        if (!m.encrypted) {
          next[m.id] = m.ciphertext;
          continue;
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, peerId, messageIds]);

  async function send() {
    if (!user || !text.trim() || !peerId) return;
    setSending(true);
    try {
      if (usePlaintext) {
        await api("/messages", {
          method: "POST",
          body: JSON.stringify({ recipientId: peerId, body: text.trim() }),
        });
      } else {
        const keyRes = await api<{ key: { publicKey: string } }>(`/e2e/keys/${peerId}`);
        const { ciphertext, iv } = await encryptForRecipient(
          user.id,
          keyRes.key.publicKey,
          text.trim()
        );
        await api("/messages", {
          method: "POST",
          body: JSON.stringify({ recipientId: peerId, ciphertext, iv }),
        });
      }
      setText("");
      await qc.invalidateQueries({ queryKey: ["dm-thread", peerId] });
      await qc.invalidateQueries({ queryKey: ["dm-conversations"] });
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  if (messagingSelf) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>That’s you</Text>
        <Text style={styles.subtitle}>You can’t message yourself.</Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
          <Text style={styles.btnSecondaryText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView style={{ flex: 1, padding: 20 }} keyboardShouldPersistTaps="handled">
        {data?.peer && (
          <TouchableOpacity onPress={() => router.push(`/u/${data.peer.username}`)}>
            <Text style={[styles.title, { fontSize: 22 }]}>{data.peer.displayName}</Text>
          </TouchableOpacity>
        )}
        {usePlaintext ? (
          <View
            style={{
              backgroundColor: "#fff8e6",
              borderColor: "#f0c36d",
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.navy }}>Not end-to-end encrypted yet</Text>
            <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
              They haven’t set up secure messaging. Messages are readable by the server until they do.
            </Text>
          </View>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
            End-to-end encrypted · server cannot read content
          </Text>
        )}

        {isLoading && <ActivityIndicator color={colors.gold} />}
        {(data?.messages || []).map((m) => {
          const mine = m.senderId === user?.id;
          return (
            <View
              key={m.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                backgroundColor: mine ? "rgba(212,168,83,0.25)" : "rgba(15,23,41,0.06)",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 8,
                maxWidth: "80%",
              }}
            >
              <Text style={{ color: colors.navy }}>
                {decrypted[m.id] || (m.encrypted ? "Decrypting…" : m.ciphertext)}
              </Text>
              {!m.encrypted && (
                <Text style={{ fontSize: 10, color: "#b45309", marginTop: 4 }}>UNENCRYPTED</Text>
              )}
              <Text style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>
                {new Date(m.createdAt).toLocaleString()}
              </Text>
            </View>
          );
        })}
        {(data?.messages || []).length === 0 && !isLoading && (
          <Text style={{ textAlign: "center", color: colors.muted }}>Say hello — privately.</Text>
        )}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          padding: 12,
          borderTopWidth: 1,
          borderTopColor: "rgba(15,23,41,0.1)",
          backgroundColor: colors.cream,
        }}
      >
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder={usePlaintext ? "Write a message…" : "Encrypted message…"}
          value={text}
          onChangeText={setText}
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.btnPrimary, { paddingHorizontal: 20, opacity: sending || !text.trim() ? 0.5 : 1 }]}
          disabled={sending || !text.trim()}
          onPress={send}
        >
          <Text style={styles.btnPrimaryText}>{sending ? "…" : "Send"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
