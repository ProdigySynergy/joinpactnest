import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { colors, styles } from "../../lib/theme";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: vows } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string }> }>("/vows"),
  });
  const { data: progress } = useQuery({
    queryKey: ["progress"],
    queryFn: () => api<{ progress: Array<{ title: string; currentStreak: number }> }>("/progress/me"),
  });

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.subtitle}>Hello, {user?.displayName}</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={() => router.push("/vows/new")}>
          <Text style={styles.btnPrimaryText}>New vow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnSecondary, { flex: 1 }]} onPress={() => router.push("/vows/checkin")}>
          <Text style={styles.btnSecondaryText}>Check in</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Active vows</Text>
      {(vows?.vows.filter((v) => v.status === "ACTIVE") || []).map((v) => (
        <TouchableOpacity key={v.id} style={styles.card} onPress={() => router.push(`/vows/${v.id}`)}>
          <Text style={{ fontWeight: "600", color: colors.navy }}>{v.title}</Text>
        </TouchableOpacity>
      ))}

      <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 8, color: colors.navy }}>Streaks</Text>
      {(progress?.progress || []).slice(0, 3).map((p, i) => (
        <View key={i} style={styles.card}>
          <Text style={{ color: colors.navy }}>{p.title} <Text style={styles.streak}>🔥 {p.currentStreak}</Text></Text>
        </View>
      ))}
    </ScrollView>
  );
}
