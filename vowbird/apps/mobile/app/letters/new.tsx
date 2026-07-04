import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function NewLetterScreen() {
  const [form, setForm] = useState({ type: "FUTURE_SELF", subject: "", body: "" });

  async function send(sendNow: boolean) {
    try {
      const data = await api<{ letter: { id: string } }>("/letters", { method: "POST", body: JSON.stringify(form) });
      if (sendNow) await api(`/letters/${data.letter.id}/send`, { method: "POST" });
      router.replace(`/letters/${data.letter.id}`);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <TextInput style={styles.input} placeholder="Subject" value={form.subject} onChangeText={(v) => setForm({ ...form, subject: v })} />
      <TextInput style={[styles.input, { minHeight: 160, textAlignVertical: "top" }]} placeholder="Write thoughtfully..." multiline value={form.body} onChangeText={(v) => setForm({ ...form, body: v })} />
      <TouchableOpacity style={styles.btnSecondary} onPress={() => send(false)}>
        <Text style={styles.btnSecondaryText}>Save draft</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => send(true)}>
        <Text style={styles.btnPrimaryText}>Send letter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
