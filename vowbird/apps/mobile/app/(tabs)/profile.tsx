import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../../lib/auth-context";
import { colors, styles } from "../../lib/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>{user?.displayName}</Text>
      <Text style={styles.subtitle}>{user?.email}</Text>
      {user?.username ? (
        <Text style={{ color: colors.muted, marginBottom: 8 }}>@{user.username}</Text>
      ) : null}
      <Text style={styles.subtitle}>Mode: {user?.profileMode}</Text>
      {user?.username ? (
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push(`/u/${user.username}`)}>
          <Text style={styles.btnSecondaryText}>My public profile</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push("/settings")}>
        <Text style={styles.btnPrimaryText}>Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/messages")}>
        <Text style={styles.btnSecondaryText}>Messages</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/pacters")}>
        <Text style={styles.btnSecondaryText}>Pactered</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/report")}>
        <Text style={styles.btnSecondaryText}>Safety</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btnSecondary, { marginTop: 24 }]}
        onPress={async () => {
          await logout();
          router.replace("/");
        }}
      >
        <Text style={{ color: "#dc2626", fontWeight: "600" }}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
