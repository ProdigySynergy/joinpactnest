import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Share, Text, TextInput, TouchableOpacity } from "react-native";
import { MoodFeed } from "../../components/MoodFeed";
import { VibeCheckFeed } from "../../components/VibeCheckFeed";
import { useAuth } from "../../lib/auth-context";
import { api } from "../../lib/api";
import { publicPactAppUrl, publicPactWebUrl } from "../../lib/share";
import { colors, styles } from "../../lib/theme";

export default function PactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [postBody, setPostBody] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const { data } = useQuery({
    queryKey: ["pact", id],
    queryFn: () =>
      api<{
        pact: {
          title: string;
          description: string | null;
          inviteCode: string;
          privacy: string;
          slug?: string;
          ownerId: string;
          members: Array<{ user: { id: string; displayName: string } }>;
        };
        leaderboard: Array<{ user: { displayName: string }; currentStreak: number }>;
      }>(`/pacts/${id}`),
  });

  const pact = data?.pact;
  const isOwner = Boolean(pact && user?.id === pact.ownerId);
  const isMember = Boolean(pact && user && pact.members.some((m) => m.user.id === user.id));
  const canJoin = Boolean(pact && user && !isOwner && !isMember);

  async function join() {
    try {
      await api(`/pacts/${id}/join`, { method: "POST", body: "{}" });
      Alert.alert("Joined!");
      qc.invalidateQueries({ queryKey: ["pact", id] });
      qc.invalidateQueries({ queryKey: ["pacts"] });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function joinByCode() {
    if (inviteCode.trim().length < 4) {
      return Alert.alert("Enter a valid invite code");
    }
    try {
      await api("/pacts/join-by-code", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      });
      setInviteCode("");
      Alert.alert("Joined by code!");
      qc.invalidateQueries({ queryKey: ["pact", id] });
      qc.invalidateQueries({ queryKey: ["pacts"] });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function post() {
    await api(`/pacts/${id}/posts`, { method: "POST", body: JSON.stringify({ body: postBody }) });
    setPostBody("");
    router.push(`/pacts/feed?pactId=${id}`);
  }

  async function sharePublic() {
    if (!pact?.slug || pact.privacy !== "PUBLIC") return;
    const web = publicPactWebUrl(pact.slug);
    await Share.share({
      message: `${pact.title} on Vowbird\n${web}\n\nOpen in app: ${publicPactAppUrl(pact.slug)}`,
      title: pact.title,
      url: web,
    });
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{pact?.title}</Text>
      {pact?.description ? <Text style={styles.subtitle}>{pact.description}</Text> : null}
      {pact?.privacy ? (
        <Text style={[styles.badge, { marginBottom: 12 }]}>{pact.privacy}</Text>
      ) : null}
      {pact?.privacy === "PUBLIC" && pact.slug ? (
        <>
          <TouchableOpacity style={styles.btnSecondary} onPress={sharePublic}>
            <Text style={styles.btnSecondaryText}>Share public page</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push(`/p/${pact.slug}`)}
          >
            <Text style={styles.btnSecondaryText}>View public page</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {canJoin && pact?.privacy === "PUBLIC" && (
        <TouchableOpacity style={styles.btnPrimary} onPress={join}>
          <Text style={styles.btnPrimaryText}>Join pact</Text>
        </TouchableOpacity>
      )}

      {canJoin && pact?.privacy === "PRIVATE" && (
        <>
          <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.navy }}>Invite code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter invite code"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={joinByCode}>
            <Text style={styles.btnPrimaryText}>Join by code</Text>
          </TouchableOpacity>
        </>
      )}

      {canJoin && pact?.privacy === "INVITE_ONLY" && (
        <TouchableOpacity style={styles.btnPrimary} onPress={join}>
          <Text style={styles.btnPrimaryText}>Join pact</Text>
        </TouchableOpacity>
      )}

      {isOwner && (pact?.privacy === "PRIVATE" || pact?.privacy === "INVITE_ONLY") && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            Alert.alert("Invite code", pact.inviteCode);
          }}
        >
          <Text style={{ color: colors.muted, marginBottom: 4 }}>Share this invite code</Text>
          <Text style={{ fontWeight: "700", fontSize: 20, letterSpacing: 2, color: colors.navy }}>
            {pact.inviteCode}
          </Text>
        </TouchableOpacity>
      )}

      {(isOwner || isMember) && (
        <>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push(`/pacts/feed?pactId=${id}`)}
          >
            <Text style={styles.btnSecondaryText}>Room feed</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Post an update..."
            value={postBody}
            onChangeText={setPostBody}
          />
          <TouchableOpacity style={styles.btnSecondary} onPress={post}>
            <Text style={styles.btnSecondaryText}>Post</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={{ fontWeight: "700", marginTop: 16, color: colors.navy }}>Leaderboard</Text>
      {(data?.leaderboard || []).map((l, i) => (
        <Text key={i} style={{ marginTop: 8, color: colors.navy }}>
          {l.user.displayName} 🔥 {l.currentStreak}
        </Text>
      ))}

      {(isOwner || isMember) && id ? (
        <>
          <VibeCheckFeed context={{ pactId: id }} />
          <MoodFeed context={{ pactId: id }} />
        </>
      ) : null}
    </ScrollView>
  );
}
