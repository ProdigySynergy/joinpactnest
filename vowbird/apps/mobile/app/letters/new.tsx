import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

const LETTER_TYPES = [
  { value: "FUTURE_SELF", label: "Future self" },
  { value: "PARTNER_LETTER", label: "Partner letter" },
  { value: "GROUP_REFLECTION", label: "Group reflection" },
] as const;

export default function NewLetterScreen() {
  const params = useLocalSearchParams<{
    partnerMatchId?: string;
    recipientId?: string;
    vowId?: string;
    type?: string;
  }>();
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: params.partnerMatchId ? "PARTNER_LETTER" : params.type || "FUTURE_SELF",
    subject: "",
    body: "",
    recipientId: params.recipientId || "",
    vowId: params.vowId || "",
    partnerMatchId: params.partnerMatchId || "",
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      type: params.partnerMatchId ? "PARTNER_LETTER" : params.type || f.type,
      recipientId: params.recipientId || f.recipientId,
      vowId: params.vowId || f.vowId,
      partnerMatchId: params.partnerMatchId || f.partnerMatchId,
    }));
  }, [params.partnerMatchId, params.recipientId, params.vowId, params.type]);

  useEffect(() => {
    if (user && form.recipientId === user.id) {
      setForm((f) => ({ ...f, recipientId: "" }));
      Alert.alert("You can’t address a letter to yourself.");
    }
  }, [user, form.recipientId]);

  async function send(sendNow: boolean) {
    try {
      const payload: Record<string, string> = {
        type: form.type,
        subject: form.subject,
        body: form.body,
      };
      if (form.recipientId) payload.recipientId = form.recipientId;
      if (form.vowId) payload.vowId = form.vowId;
      if (form.partnerMatchId) payload.partnerMatchId = form.partnerMatchId;

      const data = await api<{ letter: { id: string } }>("/letters", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (sendNow) await api(`/letters/${data.letter.id}/send`, { method: "POST" });
      router.replace(`/letters/${data.letter.id}`);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.navy }}>Letter type</Text>
      {LETTER_TYPES.map((t) => (
        <TouchableOpacity
          key={t.value}
          style={[styles.card, form.type === t.value && { borderColor: colors.gold }]}
          onPress={() => setForm({ ...form, type: t.value })}
        >
          <Text style={{ color: colors.navy, fontWeight: "600" }}>{t.label}</Text>
        </TouchableOpacity>
      ))}

      {form.partnerMatchId ? (
        <Text style={{ color: colors.muted, marginBottom: 12 }}>Linked to partner match</Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Subject"
        value={form.subject}
        onChangeText={(v) => setForm({ ...form, subject: v })}
      />
      <TextInput
        style={[styles.input, { minHeight: 160, textAlignVertical: "top" }]}
        placeholder="Write thoughtfully..."
        multiline
        value={form.body}
        onChangeText={(v) => setForm({ ...form, body: v })}
      />
      <TouchableOpacity style={styles.btnSecondary} onPress={() => send(false)}>
        <Text style={styles.btnSecondaryText}>Save draft</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => send(true)}>
        <Text style={styles.btnPrimaryText}>Send letter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
