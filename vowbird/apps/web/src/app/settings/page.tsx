"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { GENDER_LABELS, GENDER_OPTIONS } from "@vowbird/shared";
import { useAuth } from "@/lib/auth-context";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    bio: "",
    tagline: "",
    gender: "" as "" | "MALE" | "FEMALE" | "FLUID",
    timezone: "",
    preferredCheckInTime: "09:00",
    profileMode: "VEILED",
    anonymousAlias: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      bio: user.bio || "",
      tagline: user.tagline || "",
      gender: (user.gender as "" | "MALE" | "FEMALE" | "FLUID") || "",
      timezone: user.timezone || "",
      preferredCheckInTime: user.preferredCheckInTime || "09:00",
      profileMode: user.profileMode || "VEILED",
      anonymousAlias: user.anonymousAlias || "",
    });
  }, [user]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          bio: form.bio,
          tagline: form.tagline.trim() ? form.tagline.trim() : null,
          gender: form.gender || null,
          timezone: form.timezone,
          preferredCheckInTime: form.preferredCheckInTime,
        }),
      });
      setMsg("Profile updated");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function saveMode(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      await api("/users/me/profile-mode", {
        method: "PATCH",
        body: JSON.stringify({
          profileMode: form.profileMode,
          anonymousAlias: form.anonymousAlias,
        }),
      });
      setMsg("Profile mode updated");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Settings</h1>
        {msg && <p className="mb-4 text-sm text-sage">{msg}</p>}
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {user && (
          <p className="mb-4 text-sm text-navy/60">
            Public profile:{" "}
            <Link href={`/u/${user.username}`} className="text-gold hover:underline">
              /u/{user.username}
            </Link>
          </p>
        )}

        <form onSubmit={saveProfile} className="card mb-6 space-y-4">
          <h2 className="font-semibold">Profile</h2>
          <input
            className="input"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Tagline (optional)"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            maxLength={120}
          />
          <select
            className="input"
            value={form.gender}
            onChange={(e) =>
              setForm({
                ...form,
                gender: e.target.value as "" | "MALE" | "FEMALE" | "FLUID",
              })
            }
          >
            <option value="">Gender (optional)</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {GENDER_LABELS[g]}
              </option>
            ))}
          </select>
          <textarea
            className="input"
            placeholder="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
          />
          <input
            className="input"
            placeholder="Timezone"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          />
          <input
            className="input"
            value={form.preferredCheckInTime}
            onChange={(e) => setForm({ ...form, preferredCheckInTime: e.target.value })}
          />
          <button type="submit" className="btn-primary w-full">
            Save profile
          </button>
        </form>

        <form onSubmit={saveMode} className="card space-y-4">
          <h2 className="font-semibold">Profile mode</h2>
          <select
            className="input"
            value={form.profileMode}
            onChange={(e) => setForm({ ...form, profileMode: e.target.value })}
          >
            <option value="VEILED">Veiled (anonymous)</option>
            <option value="OPEN">Open (visible)</option>
          </select>
          {form.profileMode === "VEILED" && (
            <input
              className="input"
              placeholder="Anonymous alias"
              value={form.anonymousAlias}
              onChange={(e) => setForm({ ...form, anonymousAlias: e.target.value })}
            />
          )}
          <button type="submit" className="btn-primary w-full">
            Update mode
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <a href="/safety" className="text-gold hover:underline">
            Safety & reporting →
          </a>
        </p>
      </main>
    </RequireAuth>
  );
}
