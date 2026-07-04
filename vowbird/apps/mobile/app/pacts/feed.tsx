import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function RoomFeedScreen() {
  const { pactId } = useLocalSearchParams<{ pactId: string }>();
  const { data } = useQuery({
    queryKey: ["pact-posts", pactId],
    queryFn: () => api<{ posts: Array<{ body: string; user: { displayName: string } }> }>(`/pacts/${pactId}/posts`),
    enabled: !!pactId,
  });

  return (
    <ScrollView style={styles.screen}>
      {(data?.posts || []).map((p, i) => (
        <View key={i} style={styles.card}>
          <Text style={{ fontWeight: "600" }}>{p.user.displayName}</Text>
          <Text style={{ marginTop: 4 }}>{p.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
