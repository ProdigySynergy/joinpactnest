import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GENDER_LABELS, GENDER_OPTIONS } from "@vowbird/shared";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { colors, styles } from "../lib/theme";
import { router } from "expo-router";

export default function SettingsScreen() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    name: "",
    bio: "",
    tagline: "",
    gender: "" as "" | "MALE" | "FEMALE" | "FLUID",
    timezone: "",
    preferredCheckInTime: "09:00",
    profileMode: "VEILED",
    anonymousAlias: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      bio: user.bio || "",
      tagline: user.tagline || "",
      gender: (user.gender as "" | "MALE" | "FEMALE" | "FLUID") || "",
      timezone: user.timezone || "",
      preferredCheckInTime: user.preferredCheckInTime || "09:00",
      profileMode: user.profileMode || "VEILED",
      anonymousAlias: user.anonymousAlias || "",
    });
  }, [user]);

  async function saveProfile() {
    try {
      await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          bio: form.bio,
          tagline: form.tagline.trim() ? form.tagline.trim() : null,
          gender: form.gender || null,
          timezone: form.timezone,
          preferredCheckInTime: form.preferredCheckInTime,
        }),
      });
      await refresh();
      Alert.alert("Profile updated");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function saveMode() {
    try {
      await api("/users/me/profile-mode", {
        method: "PATCH",
        body: JSON.stringify({
          profileMode: form.profileMode,
          anonymousAlias: form.anonymousAlias,
        }),
      });
      await refresh();
      Alert.alert("Profile mode updated");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      {user?.username ? (
        <Text style={{ color: colors.muted, marginBottom: 16 }}>@{user.username}</Text>
      ) : null}

      <Text style={{ fontWeight: "700", marginBottom: 8, color: colors.navy }}>Profile</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={form.name}
        onChangeText={(v) => setForm({ ...form, name: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Tagline (optional)"
        value={form.tagline}
        onChangeText={(v) => setForm({ ...form, tagline: v })}
        maxLength={120}
      />
      <Text style={{ fontWeight: "600", marginBottom: 8, color: colors.navy }}>Gender (optional)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.badge, !form.gender && { backgroundColor: "rgba(212,168,83,0.25)" }]}
          onPress={() => setForm({ ...form, gender: "" })}
        >
          <Text style={{ fontSize: 12, color: colors.navy }}>None</Text>
        </TouchableOpacity>
        {GENDER_OPTIONS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.badge, form.gender === g && { backgroundColor: "rgba(212,168,83,0.25)" }]}
            onPress={() => setForm({ ...form, gender: g })}
          >
            <Text style={{ fontSize: 12, color: colors.navy }}>{GENDER_LABELS[g]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
        placeholder="Bio"
        multiline
        value={form.bio}
        onChangeText={(v) => setForm({ ...form, bio: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Timezone"
        value={form.timezone}
        onChangeText={(v) => setForm({ ...form, timezone: v })}
      />
      <TextInput
        style={styles.input}
        placeholder="Preferred check-in time (HH:MM)"
        value={form.preferredCheckInTime}
        onChangeText={(v) => setForm({ ...form, preferredCheckInTime: v })}
      />
      <TouchableOpacity style={styles.btnPrimary} onPress={saveProfile}>
        <Text style={styles.btnPrimaryText}>Save profile</Text>
      </TouchableOpacity>

      <Text style={{ fontWeight: "700", marginTop: 28, marginBottom: 8, color: colors.navy }}>
        Profile mode
      </Text>
      {(["VEILED", "OPEN"] as const).map((m) => (
        <TouchableOpacity
          key={m}
          style={[styles.card, form.profileMode === m && { borderColor: colors.gold }]}
          onPress={() => setForm({ ...form, profileMode: m })}
        >
          <Text style={{ color: colors.navy, fontWeight: "600" }}>
            {m === "VEILED" ? "Veiled (anonymous)" : "Open (visible)"}
          </Text>
        </TouchableOpacity>
      ))}
      {form.profileMode === "VEILED" && (
        <TextInput
          style={styles.input}
          placeholder="Anonymous alias"
          value={form.anonymousAlias}
          onChangeText={(v) => setForm({ ...form, anonymousAlias: v })}
        />
      )}
      <TouchableOpacity style={styles.btnPrimary} onPress={saveMode}>
        <Text style={styles.btnPrimaryText}>Update mode</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btnSecondary, { marginBottom: 40 }]} onPress={() => router.push("/report")}>
        <Text style={styles.btnSecondaryText}>Safety & reporting</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
