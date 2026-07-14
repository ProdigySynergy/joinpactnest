import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { VOW_CATEGORIES } from "@vowbird/shared";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

const PRIVACY_OPTIONS = [
  { value: "PUBLIC", label: "Public" },
  { value: "INVITE_ONLY", label: "Invite only" },
  { value: "PRIVATE", label: "Private circle" },
] as const;

export default function NewPactScreen() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "FITNESS",
    privacy: "PUBLIC",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    noJudgementZone: false,
    leaderboardEnabled: true,
  });

  async function submit() {
    if (!form.title.trim()) return Alert.alert("Title required");
    try {
      const data = await api<{ pact: { id: string } }>("/pacts", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          endDate: form.endDate || undefined,
        }),
      });
      router.replace(`/pacts/${data.pact.id}`);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <TextInput
        style={styles.input}
        placeholder="Pact title"
        value={form.title}
        onChangeText={(v) => setForm({ ...form, title: v })}
      />
      <TextInput
        style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
        placeholder="Description"
        multiline
        value={form.description}
        onChangeText={(v) => setForm({ ...form, description: v })}
      />

      <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.navy }}>Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {VOW_CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.badge, form.category === c && { backgroundColor: "rgba(212,168,83,0.25)" }]}
            onPress={() => setForm({ ...form, category: c })}
          >
            <Text style={{ fontSize: 12, color: colors.navy }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.navy }}>Privacy</Text>
      {PRIVACY_OPTIONS.map((p) => (
        <TouchableOpacity
          key={p.value}
          style={[styles.card, form.privacy === p.value && { borderColor: colors.gold }]}
          onPress={() => setForm({ ...form, privacy: p.value })}
        >
          <Text style={{ fontWeight: "600", color: colors.navy }}>{p.label}</Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={styles.input}
        placeholder="Start date YYYY-MM-DD"
        value={form.startDate}
        onChangeText={(v) => setForm({ ...form, startDate: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="End date (optional)"
        value={form.endDate}
        onChangeText={(v) => setForm({ ...form, endDate: v })}
      />

      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => setForm({ ...form, noJudgementZone: !form.noJudgementZone })}
      >
        <Text style={styles.btnSecondaryText}>
          No judgement zone: {form.noJudgementZone ? "ON" : "OFF"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => setForm({ ...form, leaderboardEnabled: !form.leaderboardEnabled })}
      >
        <Text style={styles.btnSecondaryText}>
          Leaderboard: {form.leaderboardEnabled ? "ON" : "OFF"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16, marginBottom: 40 }]} onPress={submit}>
        <Text style={styles.btnPrimaryText}>Create pact</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
