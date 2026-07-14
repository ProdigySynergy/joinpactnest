import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { TONE_OPTIONS } from "@vowbird/shared";
import { api } from "../../lib/api";
import { colors, styles } from "../../lib/theme";

type Candidate = {
  user: {
    id: string;
    username: string;
    displayName: string;
    tagline?: string | null;
  };
  source: "queue" | "similar_vow";
  theirVow: { id: string; title: string };
  alreadyInvited: boolean;
};

export default function MatchesTab() {
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ vowId?: string }>();
  const [vowId, setVowId] = useState(params.vowId || "");
  const [tone, setTone] = useState<(typeof TONE_OPTIONS)[number]>(TONE_OPTIONS[0]);
  const [mode, setMode] = useState("EITHER");

  useEffect(() => {
    if (params.vowId) setVowId(params.vowId);
  }, [params.vowId]);

  const { data: vows } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string }> }>("/vows"),
  });

  const { data: requests } = useQuery({
    queryKey: ["partner-requests"],
    queryFn: () =>
      api<{
        requests: Array<{
          id: string;
          status: string;
          tonePreference: string;
          targetUser: { displayName: string } | null;
          vow: { title: string };
        }>;
      }>("/partner-requests/me"),
  });

  const { data: incoming } = useQuery({
    queryKey: ["partner-requests-incoming"],
    queryFn: () =>
      api<{
        requests: Array<{
          id: string;
          tonePreference: string;
          vow: { title: string; category: string };
          fromUser: { id: string; username: string; displayName: string; tagline?: string | null };
        }>;
      }>("/partner-requests/incoming"),
  });

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: () =>
      api<{
        matches: Array<{
          id: string;
          status: string;
          partner: { displayName: string };
          vow: { title: string };
        }>;
      }>("/matches/me"),
  });

  const { data: discover } = useQuery({
    queryKey: ["partners-discover", vowId],
    queryFn: () =>
      api<{ candidates: Candidate[]; vowHasPartner: boolean }>(
        `/partners/discover?vowId=${encodeURIComponent(vowId)}`
      ),
    enabled: Boolean(vowId),
  });

  async function requestAutoMatch() {
    if (!vowId) return Alert.alert("Select a vow first");
    try {
      await api("/partner-requests", {
        method: "POST",
        body: JSON.stringify({ vowId, tonePreference: tone, profileModePreference: mode }),
      });
      qc.invalidateQueries({ queryKey: ["partner-requests"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["partners-discover", vowId] });
      Alert.alert("Joined the auto-match queue");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function inviteCandidate(targetUserId: string) {
    try {
      await api("/partner-requests", {
        method: "POST",
        body: JSON.stringify({
          vowId,
          tonePreference: tone,
          profileModePreference: mode,
          targetUserId,
        }),
      });
      qc.invalidateQueries({ queryKey: ["partner-requests"] });
      qc.invalidateQueries({ queryKey: ["partners-discover", vowId] });
      Alert.alert("Invite sent");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function acceptInvite(id: string) {
    try {
      await api(`/partner-requests/${id}/accept`, { method: "POST" });
      qc.invalidateQueries({ queryKey: ["partner-requests-incoming"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      Alert.alert("Partner invite accepted");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function declineInvite(id: string) {
    await api(`/partner-requests/${id}/decline`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["partner-requests-incoming"] });
  }

  async function cancelRequest(id: string) {
    await api(`/partner-requests/${id}/cancel`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["partner-requests"] });
    qc.invalidateQueries({ queryKey: ["partners-discover", vowId] });
  }

  const activeVows = vows?.vows.filter((v) => v.status === "ACTIVE") || [];
  const waiting =
    requests?.requests.filter((r) => r.status === "WAITING" || r.status === "PENDING") || [];

  return (
    <ScrollView style={styles.screen}>
      {(incoming?.requests.length ?? 0) > 0 && (
        <>
          <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Incoming invites</Text>
          {incoming!.requests.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={{ fontWeight: "600", color: colors.navy }}>{r.fromUser.displayName}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {r.vow.title} · prefers {r.tonePreference}
              </Text>
              {r.fromUser.tagline ? (
                <Text style={{ color: colors.muted, marginTop: 4 }}>{r.fromUser.tagline}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={() => acceptInvite(r.id)}>
                  <Text style={styles.btnPrimaryText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnSecondary, { flex: 1, marginTop: 0 }]}
                  onPress={() => declineInvite(r.id)}
                >
                  <Text style={styles.btnSecondaryText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Find a partner</Text>
      <Text style={{ color: colors.muted, marginBottom: 12, fontSize: 14 }}>
        One active partner per vow. Browse people below or join the auto-match queue.
      </Text>

      {activeVows.map((v) => (
        <TouchableOpacity
          key={v.id}
          style={[styles.card, vowId === v.id && { borderColor: colors.gold }]}
          onPress={() => setVowId(v.id)}
        >
          <Text style={{ color: colors.navy }}>{v.title}</Text>
        </TouchableOpacity>
      ))}

      <Text style={{ fontWeight: "600", marginTop: 8, marginBottom: 8, color: colors.navy }}>Tone</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {TONE_OPTIONS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.badge, tone === t && { backgroundColor: "rgba(212,168,83,0.25)" }]}
            onPress={() => setTone(t)}
          >
            <Text style={{ fontSize: 12, color: colors.navy }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.navy }}>Mode preference</Text>
      {(["EITHER", "VEILED", "OPEN"] as const).map((m) => (
        <TouchableOpacity
          key={m}
          style={[styles.card, mode === m && { borderColor: colors.gold }]}
          onPress={() => setMode(m)}
        >
          <Text style={{ color: colors.navy }}>{m === "EITHER" ? "Either mode" : m}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.btnPrimary, { opacity: !vowId || discover?.vowHasPartner ? 0.5 : 1 }]}
        disabled={!vowId || Boolean(discover?.vowHasPartner)}
        onPress={requestAutoMatch}
      >
        <Text style={styles.btnPrimaryText}>Join auto-match queue</Text>
      </TouchableOpacity>
      {discover?.vowHasPartner && (
        <Text style={{ color: colors.muted, marginTop: 8 }}>This vow already has an active partner.</Text>
      )}

      {vowId && !discover?.vowHasPartner && (
        <>
          <Text style={{ fontWeight: "700", marginTop: 24, marginBottom: 8, color: colors.navy }}>
            Discover
          </Text>
          {(discover?.candidates || []).length === 0 && (
            <Text style={{ color: colors.muted }}>No candidates yet. Try the auto-match queue.</Text>
          )}
          {(discover?.candidates || []).map((c) => (
            <View key={c.user.id} style={styles.card}>
              <Text style={{ fontWeight: "600", color: colors.navy }}>{c.user.displayName}</Text>
              {c.user.tagline ? (
                <Text style={{ color: colors.muted, marginTop: 4 }}>{c.user.tagline}</Text>
              ) : null}
              <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
                {c.source === "queue" ? "In queue" : "Similar vow"} · {c.theirVow.title}
              </Text>
              <TouchableOpacity
                style={[styles.btnSecondary, { opacity: c.alreadyInvited ? 0.5 : 1 }]}
                disabled={c.alreadyInvited}
                onPress={() => inviteCandidate(c.user.id)}
              >
                <Text style={styles.btnSecondaryText}>
                  {c.alreadyInvited ? "Invited" : "Request partner"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={{ fontWeight: "700", marginTop: 24, marginBottom: 8, color: colors.navy }}>
        Waiting / pending
      </Text>
      {waiting.length === 0 && <Text style={{ color: colors.muted }}>None</Text>}
      {waiting.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={{ color: colors.navy }}>
            {r.vow.title} ·{" "}
            {r.status === "PENDING" && r.targetUser ? `→ ${r.targetUser.displayName}` : "auto queue"} ·{" "}
            {r.tonePreference}
          </Text>
          <TouchableOpacity onPress={() => cancelRequest(r.id)}>
            <Text style={{ color: "#dc2626", marginTop: 8 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={{ fontWeight: "700", marginTop: 24, marginBottom: 8, color: colors.navy }}>
        Active matches
      </Text>
      {(matches?.matches.filter((m) => m.status === "ACTIVE") || []).map((m) => (
        <TouchableOpacity key={m.id} style={styles.card} onPress={() => router.push(`/matches/${m.id}`)}>
          <Text style={{ fontWeight: "600", color: colors.navy }}>{m.partner.displayName}</Text>
          <Text style={{ color: colors.muted }}>{m.vow.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
