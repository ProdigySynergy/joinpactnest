import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { VOW_CATEGORIES } from "@vowbird/shared";
import { api } from "../../lib/api";
import { formatCategory } from "../../lib/share";
import { colors, styles } from "../../lib/theme";

type PublicPactSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string;
  memberCount: number;
  daysLive: number;
  successRate: number;
  noJudgementZone: boolean;
};

type PublicVibeDuo = {
  id: string;
  vowTitle: string;
  partners: Array<{ displayName: string }>;
  latestVibe: {
    label: string;
    note: string | null;
    user: { displayName: string };
  } | null;
};

export default function DiscoverPactsScreen() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-pacts"],
    queryFn: () => api<{ pacts: PublicPactSummary[] }>("/public/pacts"),
  });

  const { data: vibeDuos } = useQuery({
    queryKey: ["public-vibe-duos"],
    queryFn: () => api<{ matches: PublicVibeDuo[] }>("/public/vibes/matches"),
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (data?.pacts || []).filter((p) => {
      if (category && p.category !== category) return false;
      if (!query) return true;
      return (
        p.title.toLowerCase().includes(query) ||
        (p.description || "").toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query)
      );
    });
  }, [data?.pacts, q, category]);

  const filteredDuos = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (vibeDuos?.matches || []).filter((d) => {
      if (!query) return true;
      const names = d.partners.map((p) => p.displayName).join(" ").toLowerCase();
      return names.includes(query) || d.vowTitle.toLowerCase().includes(query);
    });
  }, [vibeDuos?.matches, q]);

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Explore</Text>
      <Text style={styles.subtitle}>
        Public pacts and vibe duos with live momentum.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Search pacts or vibe duos…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {(filteredDuos.length > 0 || (vibeDuos?.matches || []).length > 0) && (
        <>
          <Text style={{ fontWeight: "700", color: colors.navy, marginBottom: 8, fontSize: 17 }}>
            Public vibe duos
          </Text>
          {filteredDuos.length === 0 && q.trim() ? (
            <Text style={{ color: colors.muted, marginBottom: 16 }}>No vibe duos match.</Text>
          ) : null}
          {filteredDuos.map((duo) => (
            <TouchableOpacity
              key={duo.id}
              style={[styles.card, { borderColor: "rgba(212,168,83,0.35)" }]}
              onPress={() => router.push(`/vibe/${duo.id}`)}
            >
              <Text style={[styles.badge, { marginBottom: 6 }]}>✨ Vibe Check</Text>
              <Text style={{ fontWeight: "700", fontSize: 16, color: colors.navy }}>
                {duo.partners.map((p) => p.displayName).join(" & ")}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>{duo.vowTitle}</Text>
              {duo.latestVibe ? (
                <Text style={{ color: colors.navy, marginTop: 8, fontSize: 13 }}>
                  Latest: {duo.latestVibe.user.displayName} · {duo.latestVibe.label}
                  {duo.latestVibe.note ? ` — ${duo.latestVibe.note}` : ""}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text
        style={{
          fontWeight: "700",
          color: colors.navy,
          marginTop: 8,
          marginBottom: 8,
          fontSize: 17,
        }}
      >
        Public pacts
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.badge, !category && { backgroundColor: "rgba(212,168,83,0.25)" }, { marginRight: 8 }]}
          onPress={() => setCategory(null)}
        >
          <Text style={{ fontSize: 12, color: colors.navy }}>All</Text>
        </TouchableOpacity>
        {VOW_CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.badge,
              category === c && { backgroundColor: "rgba(212,168,83,0.25)" },
              { marginRight: 8 },
            ]}
            onPress={() => setCategory(category === c ? null : c)}
          >
            <Text style={{ fontSize: 12, color: colors.navy }}>{formatCategory(c)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && <Text style={{ color: colors.muted }}>Loading…</Text>}
      {error && <Text style={{ color: "#dc2626" }}>{(error as Error).message}</Text>}
      {!isLoading && filtered.length === 0 && (
        <Text style={{ color: colors.muted }}>No public pacts match.</Text>
      )}

      {filtered.map((p) => (
        <TouchableOpacity
          key={p.id}
          style={styles.card}
          onPress={() => router.push(`/p/${p.slug}`)}
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
            <Text style={styles.badge}>{formatCategory(p.category)}</Text>
            {p.noJudgementZone ? (
              <Text style={[styles.badge, { backgroundColor: "rgba(90,143,123,0.2)" }]}>
                No judgement
              </Text>
            ) : null}
          </View>
          <Text style={{ fontWeight: "700", fontSize: 17, color: colors.navy }}>{p.title}</Text>
          {p.description ? (
            <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={2}>
              {p.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
            <Text style={{ color: colors.navy, fontSize: 13 }}>
              <Text style={{ fontWeight: "700" }}>{p.memberCount}</Text> members
            </Text>
            <Text style={{ color: colors.navy, fontSize: 13 }}>
              <Text style={{ fontWeight: "700" }}>{p.successRate}%</Text> on track
            </Text>
            <Text style={{ color: colors.navy, fontSize: 13 }}>
              <Text style={{ fontWeight: "700" }}>{p.daysLive}d</Text> live
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
