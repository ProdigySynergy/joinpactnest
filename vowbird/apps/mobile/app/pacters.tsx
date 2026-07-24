import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { api } from "../lib/api";
import { colors, styles } from "../lib/theme";

type Person = {
  id: string;
  username: string;
  displayName: string;
  tagline?: string | null;
};

export default function PactersScreen() {
  const qc = useQueryClient();

  const { data: network } = useQuery({
    queryKey: ["pacters"],
    queryFn: () =>
      api<{
        pacters: Array<{
          user: Person;
          viaPact: boolean;
          viaRequest: boolean;
          sharedPactCount: number;
        }>;
      }>("/pacters/me"),
  });

  const { data: requests } = useQuery({
    queryKey: ["pacter-requests"],
    queryFn: () =>
      api<{
        incoming: Array<{ id: string; user: Person; createdAt: string }>;
        outgoing: Array<{ id: string; user: Person; createdAt: string }>;
      }>("/pacters/requests"),
  });

  const { data: muted } = useQuery({
    queryKey: ["pacter-muted"],
    queryFn: () => api<{ muted: Array<{ id: string; user: Person }> }>("/pacters/muted"),
  });

  async function accept(id: string) {
    await api(`/pacters/requests/${id}/accept`, { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["pacter-requests"] });
    qc.invalidateQueries({ queryKey: ["pacters"] });
  }

  async function decline(id: string) {
    await api(`/pacters/requests/${id}/decline`, { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["pacter-requests"] });
  }

  async function cancel(id: string) {
    await api(`/pacters/requests/${id}/cancel`, { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["pacter-requests"] });
  }

  async function mute(userId: string) {
    await api("/pacters/mute", { method: "POST", body: JSON.stringify({ mutedUserId: userId }) });
    qc.invalidateQueries({ queryKey: ["pacters"] });
    qc.invalidateQueries({ queryKey: ["pacter-muted"] });
  }

  async function unmute(userId: string) {
    await api(`/pacters/mute/${userId}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["pacters"] });
    qc.invalidateQueries({ queryKey: ["pacter-muted"] });
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>Pactered</Text>
      <Text style={styles.subtitle}>
        People from shared pacts plus accepted pacters. Mute only hides them here.
      </Text>

      {(requests?.incoming.length || 0) > 0 && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Incoming</Text>
          {requests!.incoming.map((r) => (
            <View key={r.id} style={styles.card}>
              <TouchableOpacity onPress={() => router.push(`/u/${r.user.username}`)}>
                <Text style={{ fontWeight: "600", color: colors.navy }}>{r.user.displayName}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={() => accept(r.id)}>
                  <Text style={styles.btnPrimaryText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnSecondary, { flex: 1, marginTop: 0 }]}
                  onPress={() => decline(r.id)}
                >
                  <Text style={styles.btnSecondaryText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      {(requests?.outgoing.length || 0) > 0 && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Outgoing</Text>
          {requests!.outgoing.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={{ fontWeight: "600", color: colors.navy }}>{r.user.displayName}</Text>
              <TouchableOpacity onPress={() => cancel(r.id)}>
                <Text style={{ color: "#dc2626", marginTop: 8 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Network</Text>
      {(network?.pacters || []).length === 0 && (
        <Text style={{ color: colors.muted }}>No pacters yet.</Text>
      )}
      {(network?.pacters || []).map((p) => (
        <View key={p.user.id} style={styles.card}>
          <TouchableOpacity onPress={() => router.push(`/u/${p.user.username}`)}>
            <Text style={{ fontWeight: "600", color: colors.navy }}>{p.user.displayName}</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
            {p.viaRequest ? "Pactered" : ""}
            {p.viaPact ? ` · ${p.sharedPactCount} shared pact(s)` : ""}
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.btnSecondary, { flex: 1, marginTop: 0 }]}
              onPress={() => router.push(`/messages/${p.user.id}`)}
            >
              <Text style={styles.btnSecondaryText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, { flex: 1, marginTop: 0 }]}
              onPress={() => mute(p.user.id)}
            >
              <Text style={styles.btnSecondaryText}>Mute</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {(muted?.muted.length || 0) > 0 && (
        <>
          <Text style={{ fontWeight: "700", marginTop: 16, marginBottom: 8, color: colors.navy }}>
            Muted
          </Text>
          {muted!.muted.map((m) => (
            <View key={m.id} style={styles.card}>
              <Text style={{ color: colors.navy }}>{m.user.displayName}</Text>
              <TouchableOpacity onPress={() => unmute(m.user.id)}>
                <Text style={{ color: colors.gold, marginTop: 8 }}>Unmute</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
