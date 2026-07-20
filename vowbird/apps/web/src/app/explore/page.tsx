import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/NavBar";
import { exploreFeedUrl, fetchPublicPactList, formatCategory, siteFeedUrl } from "@/lib/public-pacts";

export const metadata: Metadata = {
  title: "Explore public pacts · Vowbird",
  description:
    "Browse open accountability circles on Vowbird. See who’s winning, how long they’ve been going, and join with an account.",
  robots: { index: true, follow: true },
  alternates: {
    types: {
      "application/rss+xml": [
        { url: exploreFeedUrl(), title: "Vowbird · Explore public pacts" },
        { url: siteFeedUrl(), title: "Vowbird · Public pacts" },
      ],
    },
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchPublicVibeDuos() {
  try {
    const res = await fetch(`${API_URL}/public/vibes/matches`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.matches || []) as Array<{
      id: string;
      vowTitle: string;
      partners: Array<{ displayName: string }>;
      latestVibe: {
        label: string;
        note: string | null;
        user: { displayName: string };
      } | null;
    }>;
  } catch {
    return [];
  }
}

export default async function ExplorePage() {
  const [pacts, vibeDuos] = await Promise.all([fetchPublicPactList(), fetchPublicVibeDuos()]);

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="mb-2 text-sm font-semibold tracking-wide text-gold">Discover</p>
        <h1 className="text-3xl font-bold md:text-4xl">Public pacts & vibe duos</h1>
        <p className="mt-3 max-w-2xl text-navy/65">
          Open circles with live momentum — plus accountability pairs who made their vibes public.
        </p>
        <p className="mt-2 text-sm">
          <a href={exploreFeedUrl()} className="text-gold hover:underline">
            RSS feed
          </a>
          <span className="text-navy/40"> · </span>
          <a href={siteFeedUrl()} className="text-gold hover:underline">
            All public pacts
          </a>
        </p>

        {vibeDuos.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-bold">Public vibe duos</h2>
            <div className="space-y-3">
              {vibeDuos.map((duo) => (
                <Link
                  key={duo.id}
                  href={`/vibe/${duo.id}`}
                  className="block rounded-2xl border border-gold/30 bg-gold/5 p-5 transition hover:border-gold"
                >
                  <p className="font-semibold">
                    {duo.partners.map((p) => p.displayName).join(" & ")}
                  </p>
                  <p className="mt-1 text-sm text-navy/60">{duo.vowTitle}</p>
                  {duo.latestVibe && (
                    <p className="mt-2 text-sm">
                      Latest: {duo.latestVibe.user.displayName} · {duo.latestVibe.label}
                      {duo.latestVibe.note ? ` — ${duo.latestVibe.note}` : ""}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <h2 className="mb-4 mt-12 text-xl font-bold">Public pacts</h2>
        <div className="space-y-4">
          {pacts.length === 0 && (
            <p className="text-navy/50">No public pacts yet. Check back soon.</p>
          )}
          {pacts.map((pact) => (
            <Link
              key={pact.id}
              href={`/p/${pact.slug}`}
              className="block rounded-2xl border border-navy/10 bg-white/80 p-5 transition hover:border-gold"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="badge">{formatCategory(pact.category)}</span>
                  {pact.noJudgementZone && (
                    <span className="badge ml-2 border-sage/40 bg-sage/15 text-sage">No judgement</span>
                  )}
                  <h2 className="mt-2 text-xl font-semibold">{pact.title}</h2>
                  {pact.description && (
                    <p className="mt-1 text-sm text-navy/60">{pact.description}</p>
                  )}
                </div>
                <div className="flex gap-4 text-right text-sm">
                  <div>
                    <p className="text-lg font-bold text-navy">{pact.memberCount}</p>
                    <p className="text-navy/45">members</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-navy">{pact.successRate}%</p>
                    <p className="text-navy/45">on track</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-navy">{pact.daysLive}d</p>
                    <p className="text-navy/45">live</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
