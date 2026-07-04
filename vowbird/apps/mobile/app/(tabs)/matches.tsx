import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { TONE_OPTIONS } from "@vowbird/shared";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function MatchesTab() {
  const qc = useQueryClient();
  const [vowId, setVowId] = useState("");
  const { data: vows } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string }> }>("/vows"),
  });
  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () => api<{ matches: Array<{ id: string; status: string; partner: { displayName: string }; vow: { title: string } }> }>("/matches/me"),
  });

  async function requestMatch() {
    if (!vowId) return Alert.alert("Select a vow first");
    try {
      await api("/partner-requests", {
        method: "POST",
        body: JSON.stringify({ vowId, tonePreference: TONE_OPTIONS[0], profileModePreference: "EITHER" }),
      });
      qc.invalidateQueries({ queryKey: ["matches"] });
      Alert.alert("Success", "Partner request submitted");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>Request partner</Text>
      {(vows?.vows.filter((v) => v.status === "ACTIVE") || []).map((v) => (
        <TouchableOpacity
          key={v.id}
          style={[styles.card, vowId === v.id && { borderColor: "#d4a853" }]}
          onPress={() => setVowId(v.id)}
        >
          <Text>{v.title}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.btnPrimary} onPress={requestMatch}>
        <Text style={styles.btnPrimaryText}>Find partner</Text>
      </TouchableOpacity>

      <Text style={{ fontWeight: "700", marginTop: 24, marginBottom: 8 }}>Active matches</Text>
      {(matches?.matches.filter((m) => m.status === "ACTIVE") || []).map((m) => (
        <TouchableOpacity key={m.id} style={styles.card} onPress={() => router.push(`/matches/${m.id}`)}>
          <Text style={{ fontWeight: "600" }}>{m.partner.displayName}</Text>
          <Text style={{ color: "#94a3b8" }}>{m.vow.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
