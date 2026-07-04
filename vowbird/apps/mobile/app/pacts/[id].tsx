import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function PactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [postBody, setPostBody] = useState("");

  const { data } = useQuery({
    queryKey: ["pact", id],
    queryFn: () => api<{ pact: { title: string; description: string | null; inviteCode: string }; leaderboard: Array<{ user: { displayName: string }; currentStreak: number }> }>(`/pacts/${id}`),
  });

  async function join() {
    try {
      await api(`/pacts/${id}/join`, { method: "POST", body: "{}" });
      Alert.alert("Joined!");
      qc.invalidateQueries({ queryKey: ["pact", id] });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function post() {
    await api(`/pacts/${id}/posts`, { method: "POST", body: JSON.stringify({ body: postBody }) });
    setPostBody("");
    router.push(`/pacts/feed?pactId=${id}`);
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>{data?.pact.title}</Text>
      {data?.pact.description && <Text style={styles.subtitle}>{data.pact.description}</Text>}
      <TouchableOpacity style={styles.btnPrimary} onPress={join}>
        <Text style={styles.btnPrimaryText}>Join pact</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push(`/pacts/feed?pactId=${id}`)}>
        <Text style={styles.btnSecondaryText}>Room feed</Text>
      </TouchableOpacity>
      <TextInput style={styles.input} placeholder="Post an update..." value={postBody} onChangeText={setPostBody} />
      <TouchableOpacity style={styles.btnSecondary} onPress={post}>
        <Text style={styles.btnSecondaryText}>Post</Text>
      </TouchableOpacity>
      <Text style={{ fontWeight: "700", marginTop: 16 }}>Leaderboard</Text>
      {(data?.leaderboard || []).map((l, i) => (
        <Text key={i} style={{ marginTop: 8 }}>{l.user.displayName} 🔥 {l.currentStreak}</Text>
      ))}
    </ScrollView>
  );
}
