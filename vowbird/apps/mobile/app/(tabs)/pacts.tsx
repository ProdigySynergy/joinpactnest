import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function PactsTab() {
  const { data: mine } = useQuery({
    queryKey: ["pacts"],
    queryFn: () => api<{ pacts: Array<{ id: string; title: string; privacy: string }> }>("/pacts"),
  });

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/pacts/discover")}>
        <Text style={styles.btnSecondaryText}>Discover public pacts</Text>
      </TouchableOpacity>
      {(mine?.pacts || []).map((p) => (
        <TouchableOpacity key={p.id} style={styles.card} onPress={() => router.push(`/pacts/${p.id}`)}>
          <Text style={{ fontWeight: "600" }}>{p.title}</Text>
          <Text style={{ color: "#94a3b8" }}>{p.privacy}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
