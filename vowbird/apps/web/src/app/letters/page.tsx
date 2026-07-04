"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function LettersPage() {
  const { data } = useQuery({
    queryKey: ["letters"],
    queryFn: () => api<{ letters: Array<{ id: string; subject: string; type: string; status: string; sentAt: string | null; createdAt: string }> }>("/letters/me"),
  });

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex justify-between">
          <h1 className="text-2xl font-bold font-letter">Letters</h1>
          <Link href="/letters/new" className="btn-primary">Write letter</Link>
        </div>
        <div className="space-y-3">
          {(data?.letters || []).map((l) => (
            <Link key={l.id} href={`/letters/${l.id}`} className="card block font-letter hover:border-gold">
              <div className="flex justify-between">
                <h2 className="font-semibold">{l.subject}</h2>
                <span className="badge">{l.status}</span>
              </div>
              <p className="mt-1 text-sm text-navy/60">{l.type.replace("_", " ")}</p>
            </Link>
          ))}
        </div>
      </main>
    </RequireAuth>
  );
}
