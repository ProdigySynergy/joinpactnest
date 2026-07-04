"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { VOW_CATEGORIES } from "@vowbird/shared";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function NewPactPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "FITNESS",
    privacy: "PUBLIC",
    startDate: new Date().toISOString().slice(0, 10),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const data = await api<{ pact: { id: string } }>("/pacts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push(`/pacts/${data.pact.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-lg px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Create a pact</h1>
        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input className="input" placeholder="Pact title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {VOW_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={form.privacy} onChange={(e) => setForm({ ...form, privacy: e.target.value })}>
            <option value="PUBLIC">Public</option>
            <option value="INVITE_ONLY">Invite only</option>
            <option value="PRIVATE">Private circle</option>
          </select>
          <button type="submit" className="btn-primary w-full">Create pact</button>
        </form>
      </main>
    </RequireAuth>
  );
}
