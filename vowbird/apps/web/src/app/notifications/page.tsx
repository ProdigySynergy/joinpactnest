"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

type InAppNotification = {
  id: string;
  type: string;
  message: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function NotificationsPage() {
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
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="mt-1 text-sm text-navy/60">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          {unread > 0 && (
            <button type="button" className="btn-secondary" onClick={markAllRead}>
              Mark all read
            </button>
          )}
        </div>

        {isLoading && <p className="text-navy/50">Loading…</p>}

        <div className="space-y-3">
          {!isLoading && list.length === 0 && (
            <p className="text-sm text-navy/50">No notifications yet.</p>
          )}
          {list.map((n) => {
            const body = (
              <div
                className={`card ${n.readAt ? "opacity-70" : "border-gold/30 bg-gold/5"}`}
              >
                <p className="font-medium text-navy">{n.message}</p>
                <p className="mt-1 text-xs text-navy/45">
                  {new Date(n.createdAt).toLocaleString()}
                  {!n.readAt ? " · Unread" : ""}
                </p>
              </div>
            );

            if (n.href) {
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => {
                    if (!n.readAt) void markRead(n.id);
                  }}
                  className="block"
                >
                  {body}
                </Link>
              );
            }

            return (
              <button
                key={n.id}
                type="button"
                className="block w-full text-left"
                onClick={() => {
                  if (!n.readAt) void markRead(n.id);
                }}
              >
                {body}
              </button>
            );
          })}
        </div>
      </main>
    </RequireAuth>
  );
}
