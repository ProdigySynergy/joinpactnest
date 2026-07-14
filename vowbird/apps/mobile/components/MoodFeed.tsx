import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ENCOURAGEMENT_LABELS,
  ENCOURAGEMENT_STICKERS,
  MAX_MOOD_UPDATES_PER_DAY,
  MOOD_LABELS,
  MOOD_TYPES,
  MOOD_UPDATE_COOLDOWN_HOURS,
} from "@vowbird/shared";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { colors, styles } from "../lib/theme";

type MoodRow = {
  id: string;
  mood: string;
  note: string | null;
  createdAt: string;
  user: { id: string; displayName: string };
  encouragements: Array<{
    id: string;
    sticker: string;
    stickerLabel?: string;
    note: string | null;
    fromUser: { displayName: string };
  }>;
};

type Context = { vowId: string } | { pactId: string } | { partnerMatchId: string };

function contextQuery(ctx: Context): string {
  if ("vowId" in ctx) return `vowId=${ctx.vowId}`;
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

export function MoodFeed({ context, canPost = true }: { context: Context; canPost?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mood, setMood] = useState<string>("OKAY");
  const [note, setNote] = useState("");
  const [cheerNote, setCheerNote] = useState<Record<string, string>>({});
  const [now, setNow] = useState(() => Date.now());

  const queryKey = ["moods", context];
  const { data } = useQuery({
    queryKey,
    queryFn: () => api<{ moods: MoodRow[] }>(`/moods?${contextQuery(context)}`),
  });

  const myLatestAt = useMemo(() => {
    const mine = (data?.moods || []).filter((row) => row.user.id === user?.id);
    if (!mine.length) return null;
    return Math.max(...mine.map((row) => new Date(row.createdAt).getTime()));
  }, [data?.moods, user?.id]);

  const cooldownMs = MOOD_UPDATE_COOLDOWN_HOURS * 60 * 60 * 1000;
  const nextAllowedAt = myLatestAt != null ? myLatestAt + cooldownMs : null;
  const remainingMs = nextAllowedAt != null ? nextAllowedAt - now : 0;
  const onCooldown = remainingMs > 0;

  useEffect(() => {
    if (!onCooldown) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [onCooldown]);

  async function postMood() {
    if (onCooldown) {
      return Alert.alert(
        "Cooldown",
        `You can share another mood in ${formatCooldownRemaining(remainingMs)}.`
      );
    }
    try {
      await api("/moods", {
        method: "POST",
        body: JSON.stringify({ mood, note: note || undefined, ...context }),
      });
      setNote("");
      qc.invalidateQueries({ queryKey });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function sendCheer(moodUpdateId: string, sticker: string) {
    try {
      await api("/encouragements", {
        method: "POST",
        body: JSON.stringify({
          moodUpdateId,
          sticker,
          note: cheerNote[moodUpdateId] || undefined,
        }),
      });
      setCheerNote((prev) => ({ ...prev, [moodUpdateId]: "" }));
      qc.invalidateQueries({ queryKey });
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 4 }}>Mood check</Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>
        Share every {MOOD_UPDATE_COOLDOWN_HOURS}h (up to {MAX_MOOD_UPDATES_PER_DAY}/day). Partners can cheer.
      </Text>

      {canPost && (
        <View style={{ borderBottomWidth: 1, borderBottomColor: "rgba(15,23,41,0.08)", paddingBottom: 12, marginBottom: 12 }}>
          {onCooldown && (
            <Text style={{ color: colors.muted, marginBottom: 8, fontSize: 13 }}>
              Available again in {formatCooldownRemaining(remainingMs)}
            </Text>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {MOOD_TYPES.map((m) => (
              <TouchableOpacity
                key={m}
                disabled={onCooldown}
                style={[styles.badge, mood === m && { backgroundColor: "rgba(212,168,83,0.25)" }]}
                onPress={() => setMood(m)}
              >
                <Text style={{ fontSize: 12, color: colors.navy }}>{MOOD_LABELS[m]}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Optional note"
            value={note}
            editable={!onCooldown}
            onChangeText={setNote}
            maxLength={280}
          />
          <TouchableOpacity
            style={[styles.btnSecondary, { marginTop: 0, opacity: onCooldown ? 0.5 : 1 }]}
            disabled={onCooldown}
            onPress={postMood}
          >
            <Text style={styles.btnSecondaryText}>
              {onCooldown ? `Available in ${formatCooldownRemaining(remainingMs)}` : "Share mood"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {(data?.moods || []).map((row) => {
        const mine = row.user.id === user?.id;
        return (
          <View
            key={row.id}
            style={{
              borderWidth: 1,
              borderColor: "rgba(15,23,41,0.1)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "600", color: colors.navy }}>
              {row.user.displayName} · {MOOD_LABELS[row.mood as keyof typeof MOOD_LABELS] || row.mood}
            </Text>
            {row.note ? <Text style={{ color: colors.muted, marginTop: 4 }}>{row.note}</Text> : null}
            <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
              {new Date(row.createdAt).toLocaleString()}
            </Text>
            {row.encouragements.map((e) => (
              <Text key={e.id} style={{ marginTop: 6, fontSize: 13, color: colors.sage }}>
                {e.fromUser.displayName}: {e.stickerLabel || ENCOURAGEMENT_LABELS[e.sticker as keyof typeof ENCOURAGEMENT_LABELS] || e.sticker}
                {e.note ? ` — ${e.note}` : ""}
              </Text>
            ))}
            {!mine && (
              <>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {ENCOURAGEMENT_STICKERS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.badge}
                      onPress={() => sendCheer(row.id, s)}
                    >
                      <Text style={{ fontSize: 11, color: colors.navy }}>
                        {ENCOURAGEMENT_LABELS[s]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={[styles.input, { marginTop: 8, marginBottom: 0 }]}
                  placeholder="Optional cheer note"
                  value={cheerNote[row.id] || ""}
                  onChangeText={(v) => setCheerNote((prev) => ({ ...prev, [row.id]: v }))}
                  maxLength={140}
                />
              </>
            )}
          </View>
        );
      })}
      {(data?.moods || []).length === 0 && (
        <Text style={{ color: colors.muted, fontSize: 13 }}>No mood updates yet.</Text>
      )}
    </View>
  );
}
