import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

export default function VowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: vowData } = useQuery({
    queryKey: ["vow", id],
    queryFn: () => api<{ vow: { title: string; reason: string | null } }>(`/vows/${id}`),
  });
  const { data: progress } = useQuery({
    queryKey: ["vow-progress", id],
    queryFn: () => api<{ progress: { currentStreak: number; completionPercentage: number } }>(`/vows/${id}/progress`),
  });

  async function checkIn() {
    try {
      await api("/check-ins", {
        method: "POST",
        body: JSON.stringify({ vowId: id, note, checkInDate: new Date().toISOString().slice(0, 10), status: "COMPLETED" }),
      });
      setNote("");
      qc.invalidateQueries({ queryKey: ["vow-progress", id] });
      Alert.alert("Done", "Checked in!");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>{vowData?.vow.title}</Text>
      {vowData?.vow.reason && <Text style={styles.subtitle}>{vowData.vow.reason}</Text>}
      <Text style={styles.streak}>🔥 Streak: {progress?.progress.currentStreak ?? 0} · {progress?.progress.completionPercentage ?? 0}% this week</Text>
      <TextInput style={styles.input} placeholder="Check-in note" value={note} onChangeText={setNote} />
      <TouchableOpacity style={styles.btnPrimary} onPress={checkIn}>
        <Text style={styles.btnPrimaryText}>Check in</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => router.push(`/(tabs)/matches?vowId=${id}`)}
      >
        <Text style={styles.btnSecondaryText}>Find partner</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => router.push(`/letters/new?vowId=${id}&type=FUTURE_SELF`)}
      >
        <Text style={styles.btnSecondaryText}>Write letter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
