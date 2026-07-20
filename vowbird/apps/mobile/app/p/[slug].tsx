import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { VIBE_EMOJIS, VIBE_LABELS } from "@vowbird/shared";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { formatCategory, publicPactAppUrl, publicPactWebUrl } from "../../lib/share";
import { colors, styles } from "../../lib/theme";

type PublicPactProfile = {
  pact: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    category: string;
    frequencyType: string;
    targetCountPerWeek: number;
    noJudgementZone: boolean;
  };
  owner: {
    id: string;
    username: string;
    displayName: string;
    tagline: string | null;
  };
  stats: {
    memberCount: number;
    daysLive: number;
    successRate: number;
    avgCompletionPercentage: number;
    totalCheckIns: number;
    activeThisWeek: number;
    topStreak: number;
  };
  leaders: Array<{
    displayName: string;
    currentStreak: number;
    completionPercentage: number;
  }>;
  leaderboardEnabled: boolean;
};

type PactVibeFeed = {
  currentVibes: Array<{
    id: string;
    label?: string;
    emoji?: string;
    vibe: string;
    user: { displayName: string };
  }>;
  vibeLeaderboard: Array<{
    user: { displayName: string };
    vibeCount: number;
    latestEmoji: string;
    latestLabel: string;
  }>;
  vibeLeaderboardEnabled: boolean;
  vibes: Array<{
    id: string;
    label?: string;
    emoji?: string;
    vibe: string;
    note: string | null;
    createdAt: string;
    user: { displayName: string };
  }>;
};

export default function PublicPactScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["public-pact", slug],
    queryFn: () => api<PublicPactProfile>(`/public/pacts/${encodeURIComponent(slug!)}`),
    enabled: !!slug,
  });

  const { data: postsData } = useQuery({
    queryKey: ["public-pact-posts", slug],
    queryFn: () =>
      api<{ posts: Array<{ id: string; body: string; createdAt: string; author: { displayName: string } }> }>(
        `/public/pacts/${encodeURIComponent(slug!)}/posts`
      ),
    enabled: !!slug,
  });

  const { data: vibeData } = useQuery({
    queryKey: ["public-pact-vibes", slug],
    queryFn: () =>
      api<PactVibeFeed>(`/public/pacts/${encodeURIComponent(slug!)}/vibes`),
    enabled: !!slug,
  });

  async function join() {
    if (!user) {
      Alert.alert("Sign in required", "Create an account or log in to join this pact.", [
        { text: "Cancel" },
        { text: "Log in", onPress: () => router.push("/(auth)/login") },
      ]);
      return;
    }
    if (!data?.pact.id) return;
    try {
      await api(`/pacts/${data.pact.id}/join`, { method: "POST", body: "{}" });
      qc.invalidateQueries({ queryKey: ["pacts"] });
      Alert.alert("Joined!", undefined, [
        { text: "Open pact", onPress: () => router.replace(`/pacts/${data.pact.id}`) },
      ]);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function sharePact() {
    if (!data?.pact.slug) return;
    const web = publicPactWebUrl(data.pact.slug);
    const app = publicPactAppUrl(data.pact.slug);
    await Share.share({
      message: `${data.pact.title} on Vowbird\n${web}\n\nOpen in app: ${app}`,
      title: data.pact.title,
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
        <Text style={styles.title}>Pact not found</Text>
        <Text style={styles.subtitle}>This public pact may be private or no longer active.</Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/pacts/discover")}>
          <Text style={styles.btnSecondaryText}>Browse explore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => refetch()}>
          <Text style={styles.btnSecondaryText}>Retry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const { pact, owner, stats, leaders, leaderboardEnabled } = data;
  const rhythm =
    pact.frequencyType === "DAILY" ? "Daily check-ins" : `${pact.targetCountPerWeek}x per week`;

  return (
    <ScrollView style={styles.screen}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <Text style={styles.badge}>{formatCategory(pact.category)}</Text>
        {pact.noJudgementZone ? (
          <Text style={[styles.badge, { backgroundColor: "rgba(90,143,123,0.2)" }]}>No judgement</Text>
        ) : null}
      </View>
      <Text style={styles.title}>{pact.title}</Text>
      {pact.description ? <Text style={styles.subtitle}>{pact.description}</Text> : null}
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{rhythm}</Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.navy }}>{stats.memberCount}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>members</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.navy }}>{stats.successRate}%</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>on track</Text>
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.navy }}>{stats.daysLive}d</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>live</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.btnPrimary} onPress={join}>
        <Text style={styles.btnPrimaryText}>Join pact</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={sharePact}>
        <Text style={styles.btnSecondaryText}>Share</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.btnSecondary}
        onPress={() => router.push(`/pacts/${pact.id}`)}
      >
        <Text style={styles.btnSecondaryText}>Open in app workspace</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push(`/u/${owner.username}`)}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Created by</Text>
        <Text style={{ fontWeight: "700", color: colors.navy, marginTop: 4 }}>{owner.displayName}</Text>
        {owner.tagline ? <Text style={{ color: colors.muted, marginTop: 4 }}>{owner.tagline}</Text> : null}
      </TouchableOpacity>

      {leaderboardEnabled && leaders.length > 0 && (
        <View style={styles.card}>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8 }}>Leaders</Text>
          {leaders.map((l, i) => (
            <Text key={i} style={{ color: colors.navy, marginTop: 4 }}>
              #{i + 1} {l.displayName} · 🔥 {l.currentStreak} · {l.completionPercentage}%
            </Text>
          ))}
        </View>
      )}

      {vibeData &&
        (vibeData.vibes.length > 0 || vibeData.currentVibes.length > 0) && (
          <>
            <Text style={{ fontWeight: "700", marginTop: 8, marginBottom: 4, color: colors.navy }}>
              Live vibe checks
            </Text>
            <Text style={{ color: colors.muted, marginBottom: 8, fontSize: 13 }}>
              What members are up to right now.
            </Text>
            {vibeData.currentVibes.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {vibeData.currentVibes.map((row) => {
                  const emoji =
                    row.emoji || VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
                  const label =
                    row.label ||
                    VIBE_LABELS[row.vibe as keyof typeof VIBE_LABELS] ||
                    row.vibe;
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
            {vibeData.vibeLeaderboardEnabled && vibeData.vibeLeaderboard.length > 0 && (
              <View style={styles.card}>
                <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8 }}>
                  Most vibes this week
                </Text>
                {vibeData.vibeLeaderboard.slice(0, 5).map((row, i) => (
                  <Text key={i} style={{ color: colors.navy, marginTop: 4 }}>
                    #{i + 1} {row.user.displayName} · {row.latestEmoji} {row.latestLabel} ·{" "}
                    {row.vibeCount}
                  </Text>
                ))}
              </View>
            )}
            {vibeData.vibes.slice(0, 8).map((row) => {
              const emoji =
                row.emoji || VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
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
          </>
        )}

      <Text style={{ fontWeight: "700", marginTop: 8, marginBottom: 8, color: colors.navy }}>
        Recent posts
      </Text>
      {(postsData?.posts || []).length === 0 && (
        <Text style={{ color: colors.muted, marginBottom: 24 }}>No public posts yet.</Text>
      )}
      {(postsData?.posts || []).slice(0, 10).map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={{ fontWeight: "600", color: colors.navy }}>{p.author.displayName}</Text>
          <Text style={{ color: colors.navy, marginTop: 4 }}>{p.body}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            {new Date(p.createdAt).toLocaleString()}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
