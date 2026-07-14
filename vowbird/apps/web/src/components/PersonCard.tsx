"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export type PersonSummary = {
  id: string;
  username: string;
  displayName: string;
  tagline?: string | null;
  profileMode?: string;
};

type Props = {
  person: PersonSummary;
  roleLabel: string;
  /** Hide interaction when viewing yourself (also auto-detected via auth) */
  isSelf?: boolean;
  /** Authenticated mutual-match context — enables letter */
  partnerMatchId?: string;
  /** Public page: only profile + soft CTAs to sign in */
  variant?: "full" | "public";
};

export function PersonCard({
  person,
  roleLabel,
  isSelf = false,
  partnerMatchId,
  variant = "full",
}: Props) {
  const { user } = useAuth();
  const viewingSelf =
    isSelf ||
    (!!user && (user.id === person.id || user.username === person.username));

  const profileHref = `/u/${person.username}`;
  const safetyName = encodeURIComponent(person.displayName);

  return (
    <div className="rounded-2xl border border-navy/10 bg-white/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-navy/45">{roleLabel}</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={profileHref} className="text-lg font-semibold text-navy hover:text-gold">
            {person.displayName}
          </Link>
          <p className="text-sm text-navy/50">@{person.username}</p>
          {person.tagline && <p className="mt-1 text-sm text-navy/65">{person.tagline}</p>}
        </div>
        {!viewingSelf && (
          <div className="flex flex-wrap gap-2">
            {variant === "public" ? (
              <>
                <Link
                  href={user ? profileHref : `/login?next=${encodeURIComponent(profileHref)}`}
                  className="btn-secondary py-2 text-sm"
                >
                  View profile
                </Link>
                {!user && (
                  <Link
                    href={`/register?next=${encodeURIComponent(profileHref)}`}
                    className="btn-primary py-2 text-sm"
                  >
                    Join to connect
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href={profileHref} className="btn-secondary py-2 text-sm">
                  Profile
                </Link>
                {partnerMatchId && (
                  <Link
                    href={`/letters/new?partnerMatchId=${partnerMatchId}&recipientId=${person.id}`}
                    className="btn-primary py-2 text-sm"
                  >
                    Write letter
                  </Link>
                )}
                <Link href={`/messages/${person.id}`} className="btn-secondary py-2 text-sm">
                  Message
                </Link>
                <Link
                  href={`/safety?reportUser=${person.id}&name=${safetyName}`}
                  className="btn-danger py-2 text-sm"
                >
                  Report
                </Link>
                <Link
                  href={`/safety?blockUser=${person.id}&reportUser=${person.id}&name=${safetyName}`}
                  className="btn-danger py-2 text-sm"
                >
                  Block
                </Link>
              </>
            )}
          </div>
        )}
        {viewingSelf && <p className="text-sm text-navy/50">That’s you</p>}
      </div>
    </div>
  );
}
