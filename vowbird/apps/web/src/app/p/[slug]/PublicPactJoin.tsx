"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type Props = {
  pactId: string;
  slug: string;
  ownerId?: string;
};

export function PublicPactJoin({ pactId, slug, ownerId }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const next = `/p/${slug}`;
  const isOwner = Boolean(user && ownerId && user.id === ownerId);

  const { data: membership } = useQuery({
    queryKey: ["pact-membership", pactId],
    queryFn: () =>
      api<{
        pact: {
          owner: { id: string };
          members: Array<{ user: { id: string } }>;
        };
      }>(`/pacts/${pactId}`),
    enabled: Boolean(user) && !isOwner,
    retry: false,
  });

  const isMember =
    isOwner ||
    membership?.pact.owner.id === user?.id ||
    membership?.pact.members?.some((m) => m.user.id === user?.id);

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

  if (user && isMember) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/pacts/${pactId}`} className="btn-primary">
          {isOwner ? "Manage your pact" : "Open your pact"}
        </Link>
      </div>
    );
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
