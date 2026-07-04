"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function VowsListPage() {
  const { data } = useQuery({
    queryKey: ["vows"],
    queryFn: () => api<{ vows: Array<{ id: string; title: string; status: string; category: string; frequencyType: string }> }>("/vows"),
  });

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex justify-between">
          <h1 className="text-2xl font-bold">Your vows</h1>
          <Link href="/vows/new" className="btn-primary">Create vow</Link>
        </div>
        <div className="space-y-3">
          {(data?.vows || []).map((v) => (
            <Link key={v.id} href={`/vows/${v.id}`} className="card block hover:border-gold">
              <div className="flex justify-between">
                <h2 className="font-semibold">{v.title}</h2>
                <span className="badge">{v.status}</span>
              </div>
              <p className="mt-1 text-sm text-navy/60">{v.category} · {v.frequencyType}</p>
            </Link>
          ))}
        </div>
      </main>
    </RequireAuth>
  );
}
