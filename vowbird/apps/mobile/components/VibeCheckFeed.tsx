import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MAX_VIBE_CHECKS_PER_DAY,
  VIBE_EMOJIS,
  VIBE_LABELS,
  VIBE_TYPES,
  VIBE_UPDATE_COOLDOWN_MINUTES,
} from "@vowbird/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { colors, styles } from "../lib/theme";

type VibeRow = {
  id: string;
  vibe: string;
  label?: string;
  note: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
};

type Context = { pactId: string } | { partnerMatchId: string };

function contextQuery(ctx: Context): string {
  if ("pactId" in ctx) return `pactId=${ctx.pactId}`;
  return `partnerMatchId=${ctx.partnerMatchId}`;
}

function formatCooldownRemaining(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function VibeCheckFeed({
  context,
  canPost = true,
}: {
  context: Context;
  canPost?: boolean;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [vibe, setVibe] = useState<string>("LOCKED_IN");
  const [note, setNote] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const queryKey = ["vibes", context];
  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      api<{
        vibes: VibeRow[];
        currentVibes: VibeRow[];
        vibeLeaderboard?: Array<{
          user: { displayName: string };
          vibeCount: number;
          latestLabel: string;
          latestEmoji: string;
        }>;
        vibeLeaderboardEnabled?: boolean;
      }>(`/vibes?${contextQuery(context)}`),
  });

  const myLatestAt = useMemo(() => {
    const mine = (data?.vibes || []).filter((row) => row.user.id === user?.id);
    if (!mine.length) return null;
    return Math.max(...mine.map((row) => new Date(row.createdAt).getTime()));
  }, [data?.vibes, user?.id]);

  const cooldownMs = VIBE_UPDATE_COOLDOWN_MINUTES * 60 * 1000;
  const nextAllowedAt = myLatestAt != null ? myLatestAt + cooldownMs : null;
  const remainingMs = nextAllowedAt != null ? nextAllowedAt - now : 0;
  const onCooldown = remainingMs > 0;

  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [onCooldown]);

  async function submit() {
    if (onCooldown) {
      Alert.alert("Cooldown", `Drop another vibe in ${formatCooldownRemaining(remainingMs)}.`);
      return;
    }
    try {
      await api("/vibes", {
        method: "POST",
        body: JSON.stringify({ vibe, note: note || undefined, ...context }),
      });
      setNote("");
      qc.invalidateQueries({ queryKey });
      Alert.alert("Dropped", "Vibe check sent ✨");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <View style={[styles.card, { borderColor: "rgba(212,168,83,0.35)" }]}>
      <Text style={{ fontWeight: "700", color: colors.navy, fontSize: 16 }}>Vibe Check</Text>
      <Text style={{ color: colors.muted, marginTop: 4, fontSize: 13 }}>
        What are you up to right now?
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
        {(data?.currentVibes || []).map((row) => {
          const emoji = VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
          const label = row.label || VIBE_LABELS[row.vibe as keyof typeof VIBE_LABELS] || row.vibe;
          return (
            <View
              key={row.id}
              style={{
                marginRight: 8,
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
      </ScrollView>

      {canPost && (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {VIBE_TYPES.map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setVibe(v)}
                style={[
                  styles.badge,
                  vibe === v && { backgroundColor: "rgba(212,168,83,0.25)" },
                ]}
              >
                <Text style={{ fontSize: 12, color: colors.navy }}>
                  {VIBE_EMOJIS[v]} {VIBE_LABELS[v]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            placeholder={vibe === "CUSTOM" ? "What's the vibe?" : "Optional note"}
            value={note}
            onChangeText={setNote}
            maxLength={280}
          />
          <TouchableOpacity
            style={[styles.btnPrimary, onCooldown && { opacity: 0.5 }]}
            onPress={submit}
            disabled={onCooldown}
          >
            <Text style={styles.btnPrimaryText}>
              {onCooldown
                ? `Available in ${formatCooldownRemaining(remainingMs)}`
                : "Drop vibe check"}
            </Text>
          </TouchableOpacity>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            Up to {MAX_VIBE_CHECKS_PER_DAY}/day · {VIBE_UPDATE_COOLDOWN_MINUTES} min between vibes
          </Text>
        </>
      )}

      {data?.vibeLeaderboardEnabled && (data.vibeLeaderboard?.length ?? 0) > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "600", color: colors.navy, marginBottom: 6 }}>
            Most vibes this week
          </Text>
          {data!.vibeLeaderboard!.map((row, i) => (
            <Text key={i} style={{ color: colors.navy, marginBottom: 4, fontSize: 13 }}>
              #{i + 1} {row.user.displayName} · {row.latestEmoji} {row.latestLabel} · {row.vibeCount}
            </Text>
          ))}
        </View>
      )}

      <Text style={{ fontWeight: "600", marginTop: 16, marginBottom: 8, color: colors.navy }}>
        Recent vibes
      </Text>
      {(data?.vibes || []).slice(0, 10).map((row) => {
        const emoji = VIBE_EMOJIS[row.vibe as keyof typeof VIBE_EMOJIS] || "✨";
        const label = row.label || VIBE_LABELS[row.vibe as keyof typeof VIBE_LABELS] || row.vibe;
        return (
          <View key={row.id} style={{ marginBottom: 10 }}>
            <Text style={{ color: colors.navy, fontWeight: "600" }}>
              {row.user.displayName} · {emoji} {label}
            </Text>
            {row.note ? <Text style={{ color: colors.muted, marginTop: 2 }}>{row.note}</Text> : null}
          </View>
        );
      })}
      {(data?.vibes || []).length === 0 && (
        <Text style={{ color: colors.muted, fontSize: 13 }}>No vibes yet.</Text>
      )}
    </View>
  );
}
