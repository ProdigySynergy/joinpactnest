import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function LettersTab() {
  const { data } = useQuery({
    queryKey: ["letters"],
    queryFn: () => api<{ letters: Array<{ id: string; subject: string; status: string; type: string }> }>("/letters/me"),
  });

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/letters/new")}>
        <Text style={styles.btnPrimaryText}>Write letter</Text>
      </TouchableOpacity>
      {(data?.letters || []).map((l) => (
        <TouchableOpacity key={l.id} style={styles.card} onPress={() => router.push(`/letters/${l.id}`)}>
          <Text style={{ fontWeight: "600" }}>{l.subject}</Text>
          <Text style={{ color: "#94a3b8", marginTop: 4 }}>{l.type} · {l.status}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
