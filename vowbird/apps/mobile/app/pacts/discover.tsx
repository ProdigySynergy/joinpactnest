import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function DiscoverPactsScreen() {
  const { data } = useQuery({
    queryKey: ["public-pacts"],
    queryFn: () => api<{ pacts: Array<{ id: string; title: string; description: string | null }> }>("/pacts/public"),
  });

  return (
    <ScrollView style={styles.screen}>
      {(data?.pacts || []).map((p) => (
        <TouchableOpacity key={p.id} style={styles.card} onPress={() => router.push(`/pacts/${p.id}`)}>
          <Text style={{ fontWeight: "600" }}>{p.title}</Text>
          {p.description && <Text style={{ color: "#94a3b8", marginTop: 4 }}>{p.description}</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
