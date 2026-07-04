import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function LetterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useQuery({
    queryKey: ["letter", id],
    queryFn: () => api<{ letter: { subject: string; body: string; status: string } }>(`/letters/${id}`),
  });

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>{data?.letter.subject}</Text>
      <Text style={{ marginTop: 16, lineHeight: 24, color: "#0f1729" }}>{data?.letter.body}</Text>
    </ScrollView>
  );
}
