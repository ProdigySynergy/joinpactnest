import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MoodFeed } from "../../components/MoodFeed";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

export default function VowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const { data: vowData } = useQuery({
    queryKey: ["vow", id],
    queryFn: () =>
      api<{
        vow: { title: string; reason: string | null };
        activePartnerMatchId?: string | null;
      }>(`/vows/${id}`),
  });
  const { data: progress } = useQuery({
    queryKey: ["vow-progress", id],
    queryFn: () =>
      api<{ progress: { currentStreak: number; completionPercentage: number } }>(
        `/vows/${id}/progress`
      ),
  });
  const { data: checkIns } = useQuery({
    queryKey: ["vow-checkins", id],
    queryFn: () =>
      api<{
        checkIns: Array<{ id: string; note: string | null; checkInDate: string; status: string }>;
      }>(`/vows/${id}/check-ins`),
  });

  async function checkIn(status: "COMPLETED" | "MISSED") {
    try {
      const data = await api<{ accountability?: { message: string } }>("/check-ins", {
        method: "POST",
        body: JSON.stringify({
          vowId: id,
          note: note || undefined,
          checkInDate: new Date().toISOString().slice(0, 10),
          status,
        }),
      });
      setNote("");
      qc.invalidateQueries({ queryKey: ["vow-progress", id] });
      qc.invalidateQueries({ queryKey: ["vow-checkins", id] });
      Alert.alert(
        status === "COMPLETED" ? "Checked in!" : "Marked missed",
        data.accountability?.message
      );
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{vowData?.vow.title}</Text>
      {vowData?.vow.reason ? <Text style={styles.subtitle}>{vowData.vow.reason}</Text> : null}
      <Text style={styles.streak}>
        🔥 Streak: {progress?.progress.currentStreak ?? 0} ·{" "}
        {progress?.progress.completionPercentage ?? 0}% this week
      </Text>

      {vowData?.activePartnerMatchId ? (
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push(`/matches/${vowData.activePartnerMatchId}`)}
        >
          <Text style={styles.btnSecondaryText}>View partner match</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push(`/(tabs)/matches?vowId=${id}`)}
        >
          <Text style={styles.btnSecondaryText}>Find partner</Text>
        </TouchableOpacity>
      )}

      <TextInput
        style={styles.input}
        placeholder="Check-in note"
        value={note}
        onChangeText={setNote}
      />
      <TouchableOpacity style={styles.btnPrimary} onPress={() => checkIn("COMPLETED")}>
        <Text style={styles.btnPrimaryText}>Check in</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => checkIn("MISSED")}>
        <Text style={styles.btnSecondaryText}>Mark missed</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => router.push(`/vows/checkin?vowId=${id}`)}
      >
        <Text style={styles.btnSecondaryText}>Check in with photo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => router.push(`/letters/new?vowId=${id}&type=FUTURE_SELF`)}
      >
        <Text style={styles.btnSecondaryText}>Write letter</Text>
      </TouchableOpacity>

      <Text style={{ fontWeight: "700", marginTop: 20, marginBottom: 8, color: colors.navy }}>
        Check-in history
      </Text>
      {(checkIns?.checkIns || []).length === 0 && (
        <Text style={{ color: colors.muted }}>No check-ins yet.</Text>
      )}
      {(checkIns?.checkIns || []).map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={{ fontWeight: "600", color: colors.navy }}>
            {c.checkInDate} · {c.status}
          </Text>
          {c.note ? <Text style={{ color: colors.muted, marginTop: 4 }}>{c.note}</Text> : null}
        </View>
      ))}

      <MoodFeed context={{ vowId: id! }} />
    </ScrollView>
  );
}
