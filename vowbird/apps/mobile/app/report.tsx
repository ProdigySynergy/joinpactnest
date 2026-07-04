import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { api } from "../lib/api";
import { styles } from "../lib/theme";

export default function ReportScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [reportUserId, setReportUserId] = useState(userId || "");
  const [reason, setReason] = useState("");
  const [blockUserId, setBlockUserId] = useState(userId || "");

  async function report() {
    await api("/reports", { method: "POST", body: JSON.stringify({ reportedUserId: reportUserId, reason }) });
    Alert.alert("Submitted", "Report submitted for review.");
  }

  async function block() {
    await api("/blocks", { method: "POST", body: JSON.stringify({ blockedUserId: blockUserId }) });
    Alert.alert("Blocked", "User blocked.");
  }

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>Safety</Text>
      <TextInput style={styles.input} placeholder="User ID to report" value={reportUserId} onChangeText={setReportUserId} />
      <TextInput style={styles.input} placeholder="Reason" value={reason} onChangeText={setReason} />
      <TouchableOpacity style={styles.btnPrimary} onPress={report}>
        <Text style={styles.btnPrimaryText}>Submit report</Text>
      </TouchableOpacity>
      <TextInput style={[styles.input, { marginTop: 24 }]} placeholder="User ID to block" value={blockUserId} onChangeText={setBlockUserId} />
      <TouchableOpacity style={styles.btnSecondary} onPress={block}>
        <Text style={styles.btnSecondaryText}>Block user</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
