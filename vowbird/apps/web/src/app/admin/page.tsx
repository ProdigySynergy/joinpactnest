"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (user && user.role !== "ADMIN") router.replace("/dashboard");
  }, [user, router]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api<{ stats: Record<string, number> }>("/admin/stats"),
    enabled: user?.role === "ADMIN",
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => api<{ reports: Array<{ id: string; reason: string; status: string; reportedUserId: string | null }> }>("/admin/reports"),
    enabled: user?.role === "ADMIN",
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<{ users: Array<{ id: string; email: string; displayName: string; isSuspended: boolean }> }>("/admin/users"),
    enabled: user?.role === "ADMIN",
  });

  async function suspendUser(id: string, suspend: boolean) {
    await api(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ isSuspended: suspend }),
    });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function updateReport(id: string, status: string) {
    await api(`/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  if (user?.role !== "ADMIN") return null;

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">Admin Dashboard</h1>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats && Object.entries(stats.stats).map(([k, v]) => (
            <div key={k} className="card text-center">
              <p className="text-sm text-navy/60">{k.replace(/([A-Z])/g, " $1")}</p>
              <p className="text-2xl font-bold text-gold">{v}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="card">
            <h2 className="font-semibold">Open reports</h2>
            <div className="mt-4 space-y-3">
              {(reports?.reports.filter((r) => r.status === "OPEN") || []).map((r) => (
                <div key={r.id} className="rounded-lg border border-navy/10 p-3 text-sm">
                  <p className="font-medium">{r.reason}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => updateReport(r.id, "ACTION_TAKEN")} className="text-xs text-gold">Action taken</button>
                    <button onClick={() => updateReport(r.id, "DISMISSED")} className="text-xs text-navy/50">Dismiss</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold">Users</h2>
            <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {(users?.users || []).slice(0, 20).map((u) => (
                <div key={u.id} className="flex items-center justify-between text-sm">
                  <span>{u.displayName} ({u.email})</span>
                  <button
                    onClick={() => suspendUser(u.id, !u.isSuspended)}
                    className={`text-xs ${u.isSuspended ? "text-sage" : "text-red-600"}`}
                  >
                    {u.isSuspended ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
