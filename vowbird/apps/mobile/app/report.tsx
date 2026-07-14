import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth-context";
import { colors, styles } from "../lib/theme";

type ReportComment = { id: string; body: string; createdAt: string };
type OpenReport = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  comments: ReportComment[];
};

export default function ReportScreen() {
  const params = useLocalSearchParams<{ userId?: string; name?: string; reportUser?: string; blockUser?: string }>();
  const { user } = useAuth();
  const targetId = params.reportUser || params.userId || "";
  const blockIdParam = params.blockUser || targetId;
  const targetingSelf = !!user && (targetId === user.id || blockIdParam === user.id);

  const [reportUserId] = useState(targetingSelf ? "" : targetId);
  const [blockUserId, setBlockUserId] = useState(targetingSelf ? "" : blockIdParam);
  const [displayName, setDisplayName] = useState(params.name || "");
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [openReport, setOpenReport] = useState<OpenReport | null>(null);
  const [maxFollowUps, setMaxFollowUps] = useState(2);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const lookupId = reportUserId || blockIdParam;

  useQuery({
    queryKey: ["open-report", lookupId],
    enabled: !!lookupId && !targetingSelf,
    queryFn: async () => {
      const data = await api<{
        reportedUser: { id: string; displayName: string };
        report: OpenReport | null;
        maxFollowUps: number;
      }>(`/reports/open?reportedUserId=${encodeURIComponent(lookupId)}`);
      setDisplayName(data.reportedUser.displayName);
      setMaxFollowUps(data.maxFollowUps);
      if (reportUserId && data.report) {
        setOpenReport(data.report);
        setReportSubmitted(true);
      }
      return data;
    },
  });

  useEffect(() => {
    if (params.name) setDisplayName(params.name);
  }, [params.name]);

  async function submitReport() {
    try {
      const data = await api<{ report: OpenReport; maxFollowUps: number }>("/reports", {
        method: "POST",
        body: JSON.stringify({
          reportedUserId: reportUserId || undefined,
          reason,
          details: details || undefined,
        }),
      });
      setOpenReport(data.report);
      setMaxFollowUps(data.maxFollowUps);
      setReportSubmitted(true);
      Alert.alert("Submitted", "Report submitted for review.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit";
      if (message.includes("already have an open report")) {
        setReportSubmitted(true);
        Alert.alert("Open report exists", message);
        try {
          const data = await api<{ report: OpenReport | null; maxFollowUps: number }>(
            `/reports/open?reportedUserId=${encodeURIComponent(reportUserId)}`
          );
          if (data.report) setOpenReport(data.report);
          setMaxFollowUps(data.maxFollowUps);
        } catch {
          /* ignore */
        }
      } else {
        Alert.alert("Error", message);
      }
    }
  }

  async function submitFollowUp() {
    if (!openReport) return;
    try {
      const data = await api<{ report: OpenReport; maxFollowUps: number }>(
        `/reports/${openReport.id}/comments`,
        { method: "POST", body: JSON.stringify({ body: followUp }) }
      );
      setOpenReport(data.report);
      setMaxFollowUps(data.maxFollowUps);
      setFollowUp("");
      Alert.alert("Added", "Follow-up added to your report.");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  async function submitBlock() {
    try {
      await api("/blocks", {
        method: "POST",
        body: JSON.stringify({ blockedUserId: blockUserId, reason: details || undefined }),
      });
      Alert.alert("Blocked", "User blocked. You will not be matched again.");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  }

  const followUpsLeft = openReport
    ? Math.max(0, maxFollowUps - openReport.comments.length)
    : maxFollowUps;

  if (targetingSelf) {
    return (
      <ScrollView style={styles.screen}>
        <Text style={styles.title}>That’s you</Text>
        <Text style={styles.subtitle}>You can’t report or block your own account.</Text>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push("/settings")}>
          <Text style={styles.btnSecondaryText}>Go to settings</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Safety</Text>
      {displayName ? (
        <Text style={styles.subtitle}>About: {displayName}</Text>
      ) : (
        <Text style={styles.subtitle}>Report or block someone who crossed a line.</Text>
      )}

      {reportSubmitted && openReport ? (
        <View style={[styles.card, { borderColor: "#fecaca" }]}>
          <Text style={{ fontWeight: "700", color: "#991b1b" }}>Report received</Text>
          <Text style={{ color: colors.navy, marginTop: 8 }}>Reason: {openReport.reason}</Text>
          {openReport.details ? (
            <Text style={{ color: colors.muted, marginTop: 4 }}>{openReport.details}</Text>
          ) : null}
          {openReport.comments.map((c) => (
            <Text key={c.id} style={{ color: colors.muted, marginTop: 8, fontSize: 13 }}>
              Follow-up: {c.body}
            </Text>
          ))}
          {followUpsLeft > 0 && (
            <>
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder={`Follow-up (${followUpsLeft} left)`}
                value={followUp}
                onChangeText={setFollowUp}
              />
              <TouchableOpacity style={styles.btnSecondary} onPress={submitFollowUp}>
                <Text style={styles.btnSecondaryText}>Add follow-up</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <>
          {!reportUserId && (
            <Text style={{ color: colors.muted, marginBottom: 8 }}>
              Open a profile or match and use Report to prefill the person.
            </Text>
          )}
          <TextInput
            style={styles.input}
            placeholder="Reason"
            value={reason}
            onChangeText={setReason}
          />
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]}
            placeholder="Details (optional)"
            multiline
            value={details}
            onChangeText={setDetails}
          />
          <TouchableOpacity
            style={[styles.btnPrimary, { opacity: !reportUserId || !reason.trim() ? 0.5 : 1 }]}
            disabled={!reportUserId || !reason.trim()}
            onPress={submitReport}
          >
            <Text style={styles.btnPrimaryText}>Submit report</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={{ fontWeight: "700", marginTop: 28, marginBottom: 8, color: colors.navy }}>Block</Text>
      <TextInput
        style={styles.input}
        placeholder="User ID to block"
        value={blockUserId}
        onChangeText={setBlockUserId}
      />
      <TouchableOpacity
        style={[styles.btnSecondary, { opacity: !blockUserId ? 0.5 : 1 }]}
        disabled={!blockUserId}
        onPress={submitBlock}
      >
        <Text style={styles.btnSecondaryText}>Block user</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
