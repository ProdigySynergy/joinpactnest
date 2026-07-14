import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/NavBar";
import { fetchPublicPactList, formatCategory } from "@/lib/public-pacts";

export const metadata: Metadata = {
  title: "Explore public pacts · Vowbird",
  description:
    "Browse open accountability circles on Vowbird. See who’s winning, how long they’ve been going, and join with an account.",
  robots: { index: true, follow: true },
};

export default async function ExplorePage() {
  const pacts = await fetchPublicPactList();

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="mb-2 text-sm font-semibold tracking-wide text-gold">Discover</p>
        <h1 className="text-3xl font-bold md:text-4xl">Public pacts you can join</h1>
        <p className="mt-3 max-w-2xl text-navy/65">
          Open circles with live momentum. Create an account to join — share any pact page anywhere.
        </p>

        <div className="mt-10 space-y-4">
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
