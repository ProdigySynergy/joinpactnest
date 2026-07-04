"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    timezone: user?.timezone || "",
    preferredCheckInTime: user?.preferredCheckInTime || "09:00",
    profileMode: user?.profileMode || "VEILED",
    anonymousAlias: user?.anonymousAlias || "",
  });

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    await api("/users/me", { method: "PATCH", body: JSON.stringify(form) });
    setMsg("Profile updated");
    refresh();
  }

  async function saveMode(e: FormEvent) {
    e.preventDefault();
    await api("/users/me/profile-mode", {
      method: "PATCH",
      body: JSON.stringify({ profileMode: form.profileMode, anonymousAlias: form.anonymousAlias }),
    });
    setMsg("Profile mode updated");
    refresh();
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>
        {msg && <p className="mb-4 text-sm text-sage">{msg}</p>}

        <form onSubmit={saveProfile} className="card mb-6 space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
          <input className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          <input className="input" value={form.preferredCheckInTime} onChange={(e) => setForm({ ...form, preferredCheckInTime: e.target.value })} />
          <button type="submit" className="btn-primary w-full">Save profile</button>
        </form>

        <form onSubmit={saveMode} className="card space-y-4">
          <h2 className="font-semibold">Profile mode</h2>
          <select className="input" value={form.profileMode} onChange={(e) => setForm({ ...form, profileMode: e.target.value })}>
            <option value="VEILED">Veiled (anonymous)</option>
            <option value="OPEN">Open (visible)</option>
          </select>
          {form.profileMode === "VEILED" && (
            <input className="input" placeholder="Anonymous alias" value={form.anonymousAlias} onChange={(e) => setForm({ ...form, anonymousAlias: e.target.value })} />
          )}
          <button type="submit" className="btn-primary w-full">Update mode</button>
        </form>

        <p className="mt-6 text-center text-sm">
          <a href="/safety" className="text-gold hover:underline">Safety & reporting →</a>
        </p>
      </main>
    </RequireAuth>
  );
}
