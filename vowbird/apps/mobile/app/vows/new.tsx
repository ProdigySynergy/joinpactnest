import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { VOW_CATEGORIES } from "@vowbird/shared";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

const FREQUENCIES = ["DAILY", "WEEKLY"] as const;

export default function NewVowScreen() {
  const [form, setForm] = useState({
    title: "",
    reason: "",
    category: "FITNESS",
    frequencyType: "DAILY" as (typeof FREQUENCIES)[number],
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    noJudgementZone: false,
    leaderboardEnabled: true,
  });

  async function submit() {
    if (!form.title.trim()) return Alert.alert("Title required");
    try {
      const data = await api<{ vow: { id: string } }>("/vows", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          endDate: form.endDate || undefined,
        }),
      });
      router.replace(`/vows/${data.vow.id}`);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={form.title}
        onChangeText={(v) => setForm({ ...form, title: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Why?"
        value={form.reason}
        onChangeText={(v) => setForm({ ...form, reason: v })}
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

      <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.navy }}>Frequency</Text>
      {FREQUENCIES.map((f) => (
        <TouchableOpacity
          key={f}
          style={[styles.card, form.frequencyType === f && { borderColor: colors.gold }]}
          onPress={() => setForm({ ...form, frequencyType: f })}
        >
          <Text style={{ color: colors.navy, fontWeight: "600" }}>{f}</Text>
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
      <TouchableOpacity style={[styles.btnPrimary, { marginBottom: 40 }]} onPress={submit}>
        <Text style={styles.btnPrimaryText}>Create vow</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
