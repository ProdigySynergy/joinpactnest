"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["match", id],
    queryFn: () => api<{ match: { id: string; status: string; matchMode: string; partner: { displayName: string; id: string }; vow: { title: string; id: string } } }>(`/matches/${id}`),
  });

  const match = data?.match;

  async function endMatch() {
    if (!confirm("End this match?")) return;
    await api(`/matches/${id}/end`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["matches"] });
    router.push("/matches");
  }

  async function rematch() {
    await api(`/matches/${id}/rematch`, { method: "POST" });
    router.push("/matches");
  }

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {match && (
          <div className="card">
            <span className="badge">{match.matchMode} match</span>
            <h1 className="mt-3 text-2xl font-bold">{match.partner.displayName}</h1>
            <p className="mt-2 text-navy/70">Partner for: {match.vow.title}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/letters/new?partnerMatchId=${id}&recipientId=${match.partner.id}`} className="btn-primary">
                Write letter
              </Link>
              <Link href={`/vows/${match.vow.id}`} className="btn-secondary">View vow</Link>
              <Link
                href={`/safety?reportUser=${match.partner.id}&name=${encodeURIComponent(match.partner.displayName)}`}
                className="btn-danger"
              >
                Report user
              </Link>
              <Link
                href={`/safety?blockUser=${match.partner.id}&reportUser=${match.partner.id}&name=${encodeURIComponent(match.partner.displayName)}`}
                className="btn-danger"
              >
                Block
              </Link>
              <button onClick={rematch} className="btn-secondary">Rematch</button>
              <button onClick={endMatch} className="text-sm text-red-600">End match</button>
            </div>
          </div>
        )}
      </main>
    </RequireAuth>
  );
}
