import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { VIBE_EMOJIS, VIBE_LABELS } from "@vowbird/shared";
import { api } from "../../lib/api";
import { publicVibeAppUrl, publicVibeWebUrl } from "../../lib/share";
import { colors, styles } from "../../lib/theme";

type PublicVibePayload = {
  match: {
    id: string;
    vowTitle: string;
    partners: Array<{ displayName: string }>;
  };
  vibes: Array<{
    id: string;
    vibe: string;
    label?: string;
    emoji?: string;
    note: string | null;
    createdAt: string;
    user: { displayName: string };
  }>;
  currentVibes: Array<{
    id: string;
    vibe: string;
    label?: string;
    emoji?: string;
    user: { displayName: string };
  }>;
  vibeLeaderboard: Array<{
    user: { displayName: string };
    vibeCount: number;
    latestLabel: string;
    latestEmoji: string;
  }>;
  vibeLeaderboardEnabled: boolean;
};

export default function PublicVibeDuoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-vibe-duo", id],
    queryFn: () => api<PublicVibePayload>(`/public/vibes/matches/${id}`),
    enabled: !!id,
  });

  async function shareDuo() {
    if (!id || !data) return;
    const web = publicVibeWebUrl(id);
    await Share.share({
      message: `${data.match.partners.map((p) => p.displayName).join(" & ")} · Public vibes on Vowbird\n${web}\n\nOpen in app: ${publicVibeAppUrl(id)}`,
      title: "Public Vibe Check",
      url: web,
    });
  }

  if (isLoading) {
    return (
      <View style={[styles.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <ScrollView style={styles.screen}>
        <Text style={styles.title}>Vibe duo not found</Text>
        <Text style={styles.subtitle}>
          This duo may be private, ended, or the link is invalid.
        </Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/pacts/discover")}>
          <Text style={styles.btnSecondaryText}>Browse explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => refetch()}>
          <Text style={styles.btnSecondaryText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={[styles.badge, { marginBottom: 8 }]}>Public Vibe Check</Text>
      <Text style={styles.title}>
        {data.match.partners.map((p) => p.displayName).join(" & ")}
      </Text>
      <Text style={styles.subtitle}>Accountability duo for: {data.match.vowTitle}</Text>

      <TouchableOpacity style={styles.btnSecondary} onPress={shareDuo}>
        <Text style={styles.btnSecondaryText}>Share public page</Text>
      </TouchableOpacity>

      {data.currentVibes.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 12 }}>
          {data.currentVibes.map((row) => {
            const emoji =
              row.emoji || VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
            const label =
              row.label || VIBE_LABELS[row.vibe as keyof typeof VIBE_LABELS] || row.vibe;
            return (
              <View
                key={row.id}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: "rgba(212,168,83,0.12)",
                }}
              >
                <Text style={{ color: colors.navy, fontSize: 13 }}>
                  {row.user.displayName} · {emoji} {label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {data.vibeLeaderboardEnabled && data.vibeLeaderboard.length > 0 && (
        <View style={styles.card}>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8 }}>
            Most vibes this week
          </Text>
          {data.vibeLeaderboard.map((row, i) => (
            <Text key={i} style={{ color: colors.navy, marginTop: 4 }}>
              #{i + 1} {row.user.displayName} · {row.latestEmoji} {row.latestLabel} ·{" "}
              {row.vibeCount}
            </Text>
          ))}
        </View>
      )}

      <Text style={{ fontWeight: "700", marginTop: 8, marginBottom: 8, color: colors.navy }}>
        Recent vibes
      </Text>
      {data.vibes.length === 0 && (
        <Text style={{ color: colors.muted }}>No vibes posted yet.</Text>
      )}
      {data.vibes.map((row) => {
        const emoji = row.emoji || VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
        const label =
          row.label || VIBE_LABELS[row.vibe as keyof typeof VIBE_LABELS] || row.vibe;
        return (
          <View key={row.id} style={styles.card}>
            <Text style={{ fontWeight: "600", color: colors.navy }}>
              {row.user.displayName} · {emoji} {label}
            </Text>
            {row.note ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{row.note}</Text>
            ) : null}
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
              {new Date(row.createdAt).toLocaleString()}
            </Text>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.btnPrimary, { marginTop: 16, marginBottom: 40 }]}
        onPress={() => router.push("/(auth)/register")}
      >
        <Text style={styles.btnPrimaryText}>Start your own duo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
