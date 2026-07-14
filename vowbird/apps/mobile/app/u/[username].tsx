import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { GENDER_LABELS } from "@vowbird/shared";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

type Relation =
  | { isSelf: true }
  | {
      isSelf: false;
      viaPact: boolean;
      sharedPactCount: number;
      viaRequest: boolean;
      muted: boolean;
      blocked: boolean;
      outgoingRequest: { id: string; status: string } | null;
      incomingRequest: { id: string; status: string } | null;
    };

type ProfileResponse = {
  profile: {
    id: string;
    username: string;
    displayName: string;
    profileMode: string;
    bio: string | null;
    tagline: string | null;
    gender: "MALE" | "FEMALE" | "FLUID" | null;
    memberSince: string;
  };
  stats: {
    activeVows: number;
    completedVows: number;
    activePacts: number;
    activeMatches: number;
    totalCheckIns: number;
    bestStreak: number;
    avgWeeklyCompletion: number;
    activeVowProgress: Array<{
      vowId: string;
      title: string;
      currentStreak: number;
      completionPercentage: number;
    }>;
  };
  isSelf: boolean;
  relation: Relation;
};

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => api<ProfileResponse>(`/users/${encodeURIComponent(username!)}/profile`),
    enabled: !!username,
  });

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["profile", username] });
    await qc.invalidateQueries({ queryKey: ["pacters"] });
    await qc.invalidateQueries({ queryKey: ["pacter-requests"] });
  }

  async function sendPacterRequest() {
    if (!data) return;
    try {
      await api("/pacters/requests", {
        method: "POST",
        body: JSON.stringify({ toUserId: data.profile.id }),
      });
      await refresh();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function acceptIncoming() {
    if (!data || data.relation.isSelf || !data.relation.incomingRequest) return;
    await api(`/pacters/requests/${data.relation.incomingRequest.id}/accept`, { method: "POST" });
    await refresh();
  }

  async function mute() {
    if (!data) return;
    await api("/pacters/mute", { method: "POST", body: JSON.stringify({ mutedUserId: data.profile.id }) });
    await refresh();
  }

  async function unmute() {
    if (!data) return;
    await api(`/pacters/mute/${data.profile.id}`, { method: "DELETE" });
    await refresh();
  }

  const relation = data?.relation;

  return (
    <ScrollView style={styles.screen}>
      {isLoading && <Text style={{ color: colors.muted }}>Loading…</Text>}
      {error && <Text style={{ color: "#dc2626" }}>{(error as Error).message}</Text>}

      {data && (
        <>
          <Text style={{ color: colors.muted }}>@{data.profile.username}</Text>
          <Text style={styles.title}>{data.profile.displayName}</Text>
          {data.profile.tagline ? <Text style={styles.subtitle}>{data.profile.tagline}</Text> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <Text style={styles.badge}>{data.profile.profileMode === "VEILED" ? "Veiled" : "Open"}</Text>
            {data.profile.gender ? (
              <Text style={styles.badge}>{GENDER_LABELS[data.profile.gender]}</Text>
            ) : null}
          </View>
          {data.profile.bio ? <Text style={{ color: colors.navy, marginBottom: 12 }}>{data.profile.bio}</Text> : null}

          {data.isSelf ? (
            <>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/pacters")}>
                <Text style={styles.btnSecondaryText}>Pactered</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/settings")}>
                <Text style={styles.btnSecondaryText}>Edit profile</Text>
              </TouchableOpacity>
            </>
          ) : (
            relation &&
            !relation.isSelf &&
            !relation.blocked && (
              <>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => router.push(`/messages/${data.profile.id}`)}
                >
                  <Text style={styles.btnPrimaryText}>Message</Text>
                </TouchableOpacity>
                {relation.incomingRequest ? (
                  <TouchableOpacity style={styles.btnSecondary} onPress={acceptIncoming}>
                    <Text style={styles.btnSecondaryText}>Accept pacter request</Text>
                  </TouchableOpacity>
                ) : relation.outgoingRequest ? (
                  <Text style={{ color: colors.muted, marginVertical: 8 }}>Pacter request pending</Text>
                ) : !relation.viaRequest ? (
                  <TouchableOpacity style={styles.btnSecondary} onPress={sendPacterRequest}>
                    <Text style={styles.btnSecondaryText}>Add pacter</Text>
                  </TouchableOpacity>
                ) : null}
                {relation.muted ? (
                  <TouchableOpacity style={styles.btnSecondary} onPress={unmute}>
                    <Text style={styles.btnSecondaryText}>Unmute</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.btnSecondary} onPress={mute}>
                    <Text style={styles.btnSecondaryText}>Mute</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() =>
                    router.push(
                      `/report?userId=${data.profile.id}&name=${encodeURIComponent(data.profile.displayName)}`
                    )
                  }
                >
                  <Text style={styles.btnSecondaryText}>Report / block</Text>
                </TouchableOpacity>
              </>
            )
          )}

          <Text style={{ fontWeight: "700", marginTop: 24, marginBottom: 8, color: colors.navy }}>Stats</Text>
          <View style={styles.card}>
            <Text style={{ color: colors.navy }}>
              Vows {data.stats.activeVows} active · {data.stats.completedVows} done
            </Text>
            <Text style={{ color: colors.navy, marginTop: 4 }}>
              Pacts {data.stats.activePacts} · Matches {data.stats.activeMatches}
            </Text>
            <Text style={{ color: colors.navy, marginTop: 4 }}>
              Check-ins {data.stats.totalCheckIns} · Best streak {data.stats.bestStreak}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4 }}>
              Avg weekly {data.stats.avgWeeklyCompletion}%
            </Text>
          </View>

          {data.stats.activeVowProgress.length > 0 && (
            <>
              <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Active momentum</Text>
              {data.stats.activeVowProgress.map((v) => (
                <View key={v.vowId} style={styles.card}>
                  <Text style={{ fontWeight: "600", color: colors.navy }}>{v.title}</Text>
                  <Text style={{ color: colors.gold, marginTop: 4 }}>
                    🔥 {v.currentStreak} · {v.completionPercentage}%
                  </Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
