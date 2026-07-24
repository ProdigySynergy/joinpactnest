import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { api } from "../lib/api";
import { colors, styles } from "../lib/theme";

type InAppNotification = {
  id: string;
  type: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

function mapHrefToRoute(href: string | null): string | null {
  if (!href) return null;
  if (href === "/matches") return "/(tabs)/matches";
  if (href.startsWith("/matches/")) return `/matches/${href.split("/")[2]}`;
  if (href === "/letters") return "/(tabs)/letters";
  if (href.startsWith("/pacts/")) return href;
  if (href === "/pacts") return "/(tabs)/pacts";
  return null;
}

export default function NotificationsScreen() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api<{ notifications: InAppNotification[]; unreadCount: number }>("/notifications"),
    refetchInterval: 30_000,
  });

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  }

  async function markAllRead() {
    await api("/notifications/read-all", { method: "POST", body: "{}" });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-unread"] });
  }

  const list = data?.notifications || [];
  const unread = data?.unreadCount ?? 0;

  return (
    <ScrollView style={styles.screen}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.subtitle}>
        {unread > 0 ? `${unread} unread` : "You're all caught up"}
      </Text>

      {unread > 0 && (
        <TouchableOpacity style={styles.btnSecondary} onPress={markAllRead}>
          <Text style={styles.btnSecondaryText}>Mark all read</Text>
        </TouchableOpacity>
      )}

      {isLoading && <ActivityIndicator color={colors.gold} style={{ marginTop: 24 }} />}

      {!isLoading && list.length === 0 && (
        <Text style={{ color: colors.muted, marginTop: 16 }}>No notifications yet.</Text>
      )}

      {list.map((n) => (
        <TouchableOpacity
          key={n.id}
          style={[
            styles.card,
            !n.readAt ? { borderColor: "rgba(212,168,83,0.45)" } : null,
          ]}
          onPress={async () => {
            if (!n.readAt) await markRead(n.id);
            const route = mapHrefToRoute(n.href);
            if (route) router.push(route as never);
          }}
        >
          <Text style={{ fontWeight: n.readAt ? "500" : "700", color: colors.navy }}>
            {n.message}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>
            {new Date(n.createdAt).toLocaleString()}
            {!n.readAt ? " · Unread" : ""}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
