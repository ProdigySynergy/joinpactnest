import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Text, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useQuery({
    queryKey: ["match", id],
    queryFn: () => api<{ match: { partner: { displayName: string; id: string }; vow: { title: string }; matchMode: string } }>(`/matches/${id}`),
  });

  async function endMatch() {
    await api(`/matches/${id}/end`, { method: "POST" });
    router.back();
  }

  const match = data?.match;

  return (
    <ScrollView style={styles.screen}>
      {match && (
        <>
          <Text style={styles.title}>{match.partner.displayName}</Text>
          <Text style={styles.subtitle}>{match.matchMode} match · {match.vow.title}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/letters/new")}>
            <Text style={styles.btnPrimaryText}>Write letter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push(`/report?userId=${match.partner.id}`)}>
            <Text style={styles.btnSecondaryText}>Report / block</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert("End match?", "", [{ text: "Cancel" }, { text: "End", onPress: endMatch }])}>
            <Text style={{ color: "#dc2626", marginTop: 16, textAlign: "center" }}>End match</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
