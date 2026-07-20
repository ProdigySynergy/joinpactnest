import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

export default function PactsTab() {
  const qc = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");

  const { data: mine } = useQuery({
    queryKey: ["pacts"],
    queryFn: () => api<{ pacts: Array<{ id: string; title: string; privacy: string }> }>("/pacts"),
  });

  async function joinByCode() {
    if (inviteCode.trim().length < 4) {
      return Alert.alert("Enter a valid invite code");
    }
    try {
      const data = await api<{ pact: { id: string } }>("/pacts/join-by-code", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      });
      setInviteCode("");
      qc.invalidateQueries({ queryKey: ["pacts"] });
      const pactId = data.pact.id;
      Alert.alert("Joined!", undefined, [
        {
          text: "Open pact",
          onPress: () => {
            if (pactId) router.push(`/pacts/${pactId}`);
          },
        },
        { text: "OK" },
      ]);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/pacts/new")}>
        <Text style={styles.btnPrimaryText}>Create pact</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/pacts/discover")}>
        <Text style={styles.btnSecondaryText}>Explore</Text>
      </TouchableOpacity>

      <Text style={{ fontWeight: "700", marginTop: 20, marginBottom: 8, color: colors.navy }}>
        Join with invite code
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Invite code"
        autoCapitalize="characters"
        value={inviteCode}
        onChangeText={setInviteCode}
      />
      <TouchableOpacity style={styles.btnSecondary} onPress={joinByCode}>
        <Text style={styles.btnSecondaryText}>Join by code</Text>
      </TouchableOpacity>

      <Text style={{ fontWeight: "700", marginTop: 24, marginBottom: 8, color: colors.navy }}>My pacts</Text>
      {(mine?.pacts || []).map((p) => (
        <TouchableOpacity key={p.id} style={styles.card} onPress={() => router.push(`/pacts/${p.id}`)}>
          <Text style={{ fontWeight: "600", color: colors.navy }}>{p.title}</Text>
          <Text style={{ color: colors.muted }}>{p.privacy}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
