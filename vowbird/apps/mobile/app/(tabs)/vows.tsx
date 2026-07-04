import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function VowsTab() {
  const { data } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string; category: string }> }>("/vows"),
  });

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/vows/new")}>
        <Text style={styles.btnPrimaryText}>Create vow</Text>
      </TouchableOpacity>
      {(data?.vows || []).map((v) => (
        <TouchableOpacity key={v.id} style={styles.card} onPress={() => router.push(`/vows/${v.id}`)}>
          <Text style={{ fontWeight: "600" }}>{v.title}</Text>
          <Text style={{ color: "#94a3b8", marginTop: 4 }}>{v.category} · {v.status}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
