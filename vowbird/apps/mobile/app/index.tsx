import { Redirect, router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth-context";
import { colors, styles } from "../lib/theme";
import { BRAND } from "@vowbird/shared";

export default function Onboarding() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.muted }}>Loading...</Text>
      </View>
    );
  }

  if (user) return <Redirect href="/(tabs)" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.navy }}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <Text style={{ color: colors.gold, fontSize: 40, marginBottom: 8 }}>🐦</Text>
        <Text style={{ color: colors.cream, fontSize: 32, fontWeight: "700", lineHeight: 40 }}>
          {BRAND.tagline}
        </Text>
        <Text style={{ color: "rgba(245,240,230,0.8)", fontSize: 16, marginTop: 16, lineHeight: 24 }}>
          Match with accountability partners, check in daily, send letters, and build streaks.
        </Text>
      </View>
      <View style={{ padding: 24, gap: 12 }}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/(auth)/register")}>
          <Text style={styles.btnPrimaryText}>Start your first vow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.btnSecondaryText}>Log in</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
