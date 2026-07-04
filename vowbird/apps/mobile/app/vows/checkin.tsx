import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { api, getToken, API_URL } from "../../lib/api";
import { styles } from "../../lib/theme";

export default function CheckInScreen() {
  const [vowId, setVowId] = useState("");
  const [note, setNote] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { data: vows } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string }> }>("/vows"),
  });

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled) setImageUri(result.assets[0]!.uri);
  }

  async function submit() {
    if (!vowId) return Alert.alert("Select a vow");
    try {
      if (imageUri) {
        const token = await getToken();
        const form = new FormData();
        form.append("vowId", vowId);
        form.append("note", note);
        form.append("checkInDate", new Date().toISOString().slice(0, 10));
        form.append("status", "COMPLETED");
        form.append("proof", { uri: imageUri, name: "proof.jpg", type: "image/jpeg" } as never);
        const res = await fetch(`${API_URL}/check-ins`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!res.ok) throw new Error("Upload failed");
      } else {
        await api("/check-ins", {
          method: "POST",
          body: JSON.stringify({ vowId, note, checkInDate: new Date().toISOString().slice(0, 10), status: "COMPLETED" }),
        });
      }
      Alert.alert("Success", "Checked in!");
      setNote("");
      setImageUri(null);
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>Select vow</Text>
      {(vows?.vows.filter((v) => v.status === "ACTIVE") || []).map((v) => (
        <TouchableOpacity key={v.id} style={[styles.card, vowId === v.id && { borderColor: "#d4a853" }]} onPress={() => setVowId(v.id)}>
          <Text>{v.title}</Text>
        </TouchableOpacity>
      ))}
      <TextInput style={styles.input} placeholder="Note (optional)" value={note} onChangeText={setNote} multiline />
      <TouchableOpacity style={styles.btnSecondary} onPress={pickImage}>
        <Text style={styles.btnSecondaryText}>{imageUri ? "Change proof photo" : "Add proof photo"}</Text>
      </TouchableOpacity>
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: "100%", height: 200, borderRadius: 12, marginBottom: 12 }} />}
      <TouchableOpacity style={styles.btnPrimary} onPress={submit}>
        <Text style={styles.btnPrimaryText}>Complete check-in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
