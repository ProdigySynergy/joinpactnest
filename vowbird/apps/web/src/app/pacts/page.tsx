"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function PactsPage() {
  const { data: mine } = useQuery({
    queryKey: ["pacts"],
    queryFn: () =>
      api<{ pacts: Array<{ id: string; title: string; privacy: string; category: string; slug: string }> }>(
        "/pacts"
      ),
  });

  const { data: publicPacts } = useQuery({
    queryKey: ["public-pacts"],
    queryFn: () =>
      api<{
        pacts: Array<{
          id: string;
          title: string;
          slug: string;
          description: string | null;
          category: string;
        }>;
      }>("/pacts/public"),
  });

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Pacts</h1>
          <div className="flex gap-2">
            <Link href="/explore" className="btn-secondary">
              Public explore
            </Link>
            <Link href="/pacts/new" className="btn-primary">
              Create pact
            </Link>
          </div>
        </div>

        <h2 className="mb-3 font-semibold">Your pacts</h2>
        <div className="mb-8 space-y-3">
          {(mine?.pacts || []).map((p) => (
            <Link key={p.id} href={`/pacts/${p.id}`} className="card block hover:border-gold">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-navy/60">
                {p.category} · {p.privacy}
                {p.privacy === "PUBLIC" && (
                  <>
                    {" · "}
                    <span className="text-gold">share /p/{p.slug}</span>
                  </>
                )}
              </p>
            </Link>
          ))}
        </div>

        <h2 className="mb-3 font-semibold">Discover public pacts</h2>
        <div className="space-y-3">
          {(publicPacts?.pacts || []).map((p) => (
            <Link key={p.id} href={`/p/${p.slug}`} className="card block hover:border-gold">
              <h3 className="font-semibold">{p.title}</h3>
              {p.description && <p className="text-sm text-navy/60">{p.description}</p>}
              <p className="mt-1 text-xs text-gold">View public page →</p>
            </Link>
          ))}
        </div>
      </main>
    </RequireAuth>
  );
}
