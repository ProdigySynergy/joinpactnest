"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/NavBar";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";

export default function LetterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useQuery({
    queryKey: ["letter", id],
    queryFn: () => api<{ letter: { subject: string; body: string; status: string; type: string; sentAt: string | null } }>(`/letters/${id}`),
  });

  const letter = data?.letter;

  return (
    <RequireAuth>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {letter && (
          <article className="card font-letter">
            <span className="badge">{letter.type.replace("_", " ")} · {letter.status}</span>
            <h1 className="mt-4 text-2xl font-bold">{letter.subject}</h1>
            <div className="mt-6 whitespace-pre-wrap leading-relaxed text-navy/80">{letter.body}</div>
            {letter.sentAt && <p className="mt-6 text-sm text-navy/50">Sent {new Date(letter.sentAt).toLocaleDateString()}</p>}
          </article>
        )}
      </main>
    </RequireAuth>
  );
}
