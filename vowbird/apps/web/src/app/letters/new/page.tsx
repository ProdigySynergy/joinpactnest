"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, Suspense } from "react";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

function WriteLetterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: params.get("partnerMatchId") ? "PARTNER_LETTER" : "FUTURE_SELF",
    subject: "",
    body: "",
    recipientId: params.get("recipientId") || "",
    vowId: params.get("vowId") || "",
    partnerMatchId: params.get("partnerMatchId") || "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && form.recipientId === user.id) {
      setForm((f) => ({ ...f, recipientId: "" }));
      setError("You can’t address a letter to yourself.");
    }
  }, [user, form.recipientId]);

  async function handleSubmit(e: FormEvent, send: boolean) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ letter: { id: string } }>("/letters", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (send) {
        await api(`/letters/${data.letter.id}/send`, { method: "POST" });
      }
      router.push(`/letters/${data.letter.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form className="card space-y-4 font-letter">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <option value="PARTNER_LETTER">Partner letter</option>
        <option value="FUTURE_SELF">Future self</option>
        <option value="GROUP_REFLECTION">Group reflection</option>
      </select>
      <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
      <textarea className="input min-h-[200px]" placeholder="Write thoughtfully..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required />
      <div className="flex gap-3">
        <button type="button" onClick={(e) => handleSubmit(e, false)} className="btn-secondary flex-1">Save draft</button>
        <button type="button" onClick={(e) => handleSubmit(e, true)} className="btn-primary flex-1">Send letter</button>
      </div>
    </form>
  );
}

export default function NewLetterPage() {
  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold font-letter">Write a letter</h1>
        <Suspense><WriteLetterForm /></Suspense>
      </main>
    </RequireAuth>
  );
}
