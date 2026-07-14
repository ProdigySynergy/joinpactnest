"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { VOW_CATEGORIES } from "@vowbird/shared";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function NewVowPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    reason: "",
    category: "CUSTOM",
    frequencyType: "DAILY",
    targetCountPerWeek: 1,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    visibility: "PRIVATE",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        ...form,
        endDate: form.endDate || undefined,
        // Partner-facing defaults; tunable later on the match page
        noJudgementZone: false,
        leaderboardEnabled: true,
      };
      const data = await api<{ vow: { id: string } }>("/vows", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/vows/${data.vow.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Create a vow</h1>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            className="input"
            placeholder="Title (e.g. Study 2 hours every night)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            className="input"
            placeholder="Why does this matter?"
            rows={3}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <select
            className="input"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {VOW_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={form.frequencyType}
            onChange={(e) => setForm({ ...form, frequencyType: e.target.value })}
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-navy/80">Start date</span>
            <input
              className="input"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-navy/80">End date (optional)</span>
            <input
              className="input"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              min={form.startDate}
            />
          </label>

          <button type="submit" className="btn-primary w-full">
            Create vow
          </button>
        </form>
      </main>
    </RequireAuth>
  );
}
