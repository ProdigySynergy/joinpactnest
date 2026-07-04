import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { VOW_CATEGORIES } from "@vowbird/shared";
import { api } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function NewVowScreen() {
  const [form, setForm] = useState({
    title: "",
    reason: "",
    category: "FITNESS",
    frequencyType: "DAILY",
    startDate: new Date().toISOString().slice(0, 10),
  });

  async function submit() {
    try {
      const data = await api<{ vow: { id: string } }>("/vows", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.replace(`/vows/${data.vow.id}`);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
      <TextInput style={styles.input} placeholder="Why?" value={form.reason} onChangeText={(v) => setForm({ ...form, reason: v })} />
      <TouchableOpacity style={styles.btnPrimary} onPress={submit}>
        <Text style={styles.btnPrimaryText}>Create vow</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
