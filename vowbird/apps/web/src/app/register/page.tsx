"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, Suspense } from "react";
import { PublicNav } from "@/components/NavBar";
import { useAuth } from "@/lib/auth-context";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    profileMode: params.get("intent") === "partner" ? "VEILED" : "VEILED",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    preferredCheckInTime: "09:00",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-2 text-navy/70">Start your first vow in minutes.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" type="password" placeholder="Password (8+ chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <div>
          <label className="text-sm font-medium">Profile mode</label>
          <div className="mt-2 flex gap-3">
            {(["VEILED", "OPEN"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setForm({ ...form, profileMode: m })}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm ${form.profileMode === m ? "border-gold bg-gold/10" : "border-navy/15"}`}
              >
                {m === "VEILED" ? "Veiled (anonymous)" : "Open (visible)"}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-navy/60">
        Have an account? <Link href="/login" className="text-gold hover:underline">Log in</Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <div className="mx-auto max-w-md px-4 py-16">
        <Suspense><RegisterForm /></Suspense>
      </div>
    </div>
  );
}
