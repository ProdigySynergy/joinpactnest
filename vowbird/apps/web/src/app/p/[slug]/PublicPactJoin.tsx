"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Props = {
  pactId: string;
  slug: string;
};

export function PublicPactJoin({ pactId, slug }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const next = `/p/${slug}`;

  async function join() {
    if (!user) {
      router.push(`/register?next=${encodeURIComponent(next)}`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api(`/pacts/${pactId}/join`, { method: "POST", body: JSON.stringify({}) });
      router.push(`/pacts/${pactId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join pact");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={join} className="btn-primary" disabled={loading}>
        {loading ? "Joining..." : user ? "Join this pact" : "Create account to join"}
      </button>
      {!user && (
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-secondary">
          Log in to join
        </Link>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
