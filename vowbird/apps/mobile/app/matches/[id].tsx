import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { MoodFeed } from "../../components/MoodFeed";
import { VibeCheckFeed } from "../../components/VibeCheckFeed";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { publicVibeAppUrl, publicVibeWebUrl } from "../../lib/share";
import { colors, styles } from "../../lib/theme";

type Person = {
  id: string;
  username: string;
  displayName: string;
  tagline?: string | null;
};

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["match", id],
    queryFn: () =>
      api<{
        match: {
          id: string;
          status: string;
          matchMode: string;
          partner: Person;
          initiatedBy: Person;
          vow: { title: string; id: string };
        };
        leaderboard: Array<{
          user: { displayName: string };
          currentStreak: number;
          completionPercentage: number;
        }>;
        leaderboardEnabled: boolean;
        noJudgementZone: boolean;
        vibesPublic?: boolean;
        vibeLeaderboardEnabled?: boolean;
        isVowOwner: boolean;
      }>(`/matches/${id}`),
  });

  const match = data?.match;
  const youInitiated = match?.initiatedBy.id === user?.id;

  async function endMatch() {
    await api(`/matches/${id}/end`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["matches"] });
    router.back();
  }

  async function rematch() {
    try {
      await api(`/matches/${id}/rematch`, { method: "POST" });
      router.replace("/(tabs)/matches");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function toggleSetting(field: "noJudgementZone" | "leaderboardEnabled", value: boolean) {
    if (!match) return;
    await api(`/vows/${match.vow.id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    qc.invalidateQueries({ queryKey: ["match", id] });
  }

  async function toggleVibeSetting(
    field: "vibesPublic" | "vibeLeaderboardEnabled",
    value: boolean
  ) {
    await api(`/matches/${id}/vibe-settings`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    qc.invalidateQueries({ queryKey: ["match", id] });
    qc.invalidateQueries({ queryKey: ["vibes", { partnerMatchId: id }] });
  }

  async function sharePublicVibes() {
    if (!id || !match) return;
    const web = publicVibeWebUrl(id);
    await Share.share({
      message: `Our accountability vibes on Vowbird (${match.vow.title})\n${web}\n\nOpen in app: ${publicVibeAppUrl(id)}`,
      title: "Public Vibe Check",
      url: web,
    });
  }

  return (
    <ScrollView style={styles.screen}>
      {match && (
        <>
          <Text style={styles.badge}>{match.matchMode} match</Text>
          {data?.noJudgementZone ? (
            <Text style={[styles.badge, { marginTop: 8 }]}>No judgement</Text>
          ) : null}
          <Text style={styles.title}>Partner match</Text>
          <Text style={styles.subtitle}>Vow: {match.vow.title}</Text>
          {youInitiated ? (
            <Text style={{ color: colors.muted, marginBottom: 12 }}>
              You started the earlier match request.
            </Text>
          ) : null}

          <View style={styles.card}>
            <TouchableOpacity onPress={() => router.push(`/u/${match.partner.username}`)}>
              <Text style={{ fontWeight: "700", fontSize: 18, color: colors.navy }}>
                {match.partner.displayName}
              </Text>
            </TouchableOpacity>
            {match.partner.tagline ? (
              <Text style={{ color: colors.muted, marginTop: 4 }}>{match.partner.tagline}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.btnPrimary, { marginTop: 12 }]}
              onPress={() =>
                router.push(
                  `/letters/new?partnerMatchId=${id}&recipientId=${match.partner.id}&vowId=${match.vow.id}&type=PARTNER_LETTER`
                )
              }
            >
              <Text style={styles.btnPrimaryText}>Write partner letter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => router.push(`/messages/${match.partner.id}`)}
            >
              <Text style={styles.btnSecondaryText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() =>
                router.push(
                  `/report?userId=${match.partner.id}&name=${encodeURIComponent(match.partner.displayName)}`
                )
              }
            >
              <Text style={styles.btnSecondaryText}>Report / block</Text>
            </TouchableOpacity>
          </View>

          {data?.isVowOwner && (
            <View style={styles.card}>
              <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8 }}>
                Partner settings
              </Text>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => toggleSetting("noJudgementZone", !data.noJudgementZone)}
              >
                <Text style={styles.btnSecondaryText}>
                  No judgement zone: {data.noJudgementZone ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => toggleSetting("leaderboardEnabled", !data.leaderboardEnabled)}
              >
                <Text style={styles.btnSecondaryText}>
                  Leaderboard: {data.leaderboardEnabled ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.card}>
            <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8 }}>
              Vibe Check settings
            </Text>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => toggleVibeSetting("vibesPublic", !data?.vibesPublic)}
            >
              <Text style={styles.btnSecondaryText}>
                Public duo vibes: {data?.vibesPublic ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
            {data?.vibesPublic ? (
              <>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => router.push(`/vibe/${id}`)}
                >
                  <Text style={styles.btnSecondaryText}>Open public vibe page</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={sharePublicVibes}>
                  <Text style={styles.btnSecondaryText}>Share public vibe link</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() =>
                toggleVibeSetting(
                  "vibeLeaderboardEnabled",
                  !(data?.vibeLeaderboardEnabled ?? true)
                )
              }
            >
              <Text style={styles.btnSecondaryText}>
                Vibe leaderboard: {data?.vibeLeaderboardEnabled === false ? "OFF" : "ON"}
              </Text>
            </TouchableOpacity>
          </View>

          {data?.leaderboardEnabled ? (
            <View style={styles.card}>
              <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8 }}>
                Partner leaderboard
              </Text>
              {(data.leaderboard?.length ?? 0) === 0 && (
                <Text style={{ color: colors.muted }}>Appears once progress is tracked.</Text>
              )}
              {(data.leaderboard || []).map((l, i) => (
                <Text key={i} style={{ marginTop: 6, color: colors.navy }}>
                  #{i + 1} {l.user.displayName} · 🔥 {l.currentStreak} · {l.completionPercentage}%
                </Text>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.muted, marginBottom: 12 }}>
              Partner leaderboard is turned off.
            </Text>
          )}

          <VibeCheckFeed context={{ partnerMatchId: id! }} />
          <MoodFeed context={{ partnerMatchId: id! }} />

          <TouchableOpacity style={styles.btnSecondary} onPress={rematch}>
            <Text style={styles.btnSecondaryText}>Rematch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("End match?", "", [
                { text: "Cancel" },
                { text: "End", style: "destructive", onPress: endMatch },
              ])
            }
          >
            <Text style={{ color: "#dc2626", marginTop: 16, marginBottom: 40, textAlign: "center" }}>
              End match
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
