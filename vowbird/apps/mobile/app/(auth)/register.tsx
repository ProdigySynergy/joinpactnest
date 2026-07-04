import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../lib/auth-context";
import { styles } from "../../lib/theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    profileMode: "VEILED",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    preferredCheckInTime: "09:00",
  });

  async function handleRegister() {
    try {
      await register(form);
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>Create account</Text>
      <TextInput style={styles.input} placeholder="Name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
      <TextInput style={styles.input} placeholder="Username" autoCapitalize="none" value={form.username} onChangeText={(v) => setForm({ ...form, username: v })} />
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        {(["VEILED", "OPEN"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.btnSecondary, { flex: 1, backgroundColor: form.profileMode === m ? "#d4a85333" : "#fff" }]}
            onPress={() => setForm({ ...form, profileMode: m })}
          >
            <Text style={styles.btnSecondaryText}>{m === "VEILED" ? "Veiled" : "Open"}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.btnPrimary} onPress={handleRegister}>
        <Text style={styles.btnPrimaryText}>Create account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
