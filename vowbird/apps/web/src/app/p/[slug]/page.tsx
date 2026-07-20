import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicNav } from "@/components/NavBar";
import { PersonCard } from "@/components/PersonCard";
import {
  fetchPublicPact,
  formatCategory,
  pactFeedUrl,
  publicPactOgImageUrl,
  publicPactShareUrl,
  siteFeedUrl,
} from "@/lib/public-pacts";
import { PublicPactJoin } from "./PublicPactJoin";
import { PublicPactVibes, fetchPublicPactVibes } from "./PublicPactVibes";
import { SharePactButton } from "./SharePactButton";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await fetchPublicPact(params.slug);
  if (!data) {
    return { title: "Pact not found · Vowbird" };
  }

  const { pact, stats } = data;
  const description =
    pact.description ||
    `${stats.memberCount} people · ${stats.successRate}% on track · live ${stats.daysLive} days on Vowbird`;
  const url = publicPactShareUrl(pact.slug);
  const ogImage = publicPactOgImageUrl(pact.slug);
  const feed = pactFeedUrl(pact.slug);

  return {
    title: `${pact.title} · Vowbird Pact`,
    description,
    alternates: {
      canonical: url,
      types: {
        "application/rss+xml": feed,
      },
    },
    openGraph: {
      title: pact.title,
      description,
      url,
      siteName: "Vowbird",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${pact.title} on Vowbird`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: pact.title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export default async function PublicPactPage({ params }: Props) {
  const data = await fetchPublicPact(params.slug);
  if (!data?.pact || !data?.owner) notFound();

  const vibeData = await fetchPublicPactVibes(params.slug);

  const { pact, stats, leaders, owner } = data;
  const shareUrl = publicPactShareUrl(pact.slug);
  const rhythm =
    pact.frequencyType === "DAILY"
      ? "Daily check-ins"
      : `${pact.targetCountPerWeek}x per week`;

  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />

      <section className="relative overflow-hidden bg-navy px-4 pb-16 pt-14 text-cream">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(212,168,83,0.35), transparent 55%), radial-gradient(ellipse at 90% 30%, rgba(90,143,123,0.25), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl">
          <p className="mb-3 text-sm font-semibold tracking-wide text-gold">Vowbird · Public pact</p>
          <span className="inline-flex rounded-full border border-cream/35 bg-cream/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cream">
            {formatCategory(pact.category)}
          </span>
          {pact.noJudgementZone && (
            <span className="ml-2 inline-flex rounded-full border border-sage/50 bg-sage/25 px-3 py-1 text-xs font-medium uppercase tracking-wide text-cream">
              No judgement zone
            </span>
          )}
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">{pact.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-cream/75">
            {pact.description || `${rhythm}. Accountability that sticks.`}
          </p>
          {pact.noJudgementZone && (
            <p className="mt-3 max-w-2xl text-sm text-cream/60">
              This circle softens misses — encouragement over call-outs.
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <PublicPactJoin pactId={pact.id} slug={pact.slug} ownerId={owner.id} />
            <SharePactButton
              url={shareUrl}
              title={pact.title}
              category={formatCategory(pact.category)}
              memberCount={stats.memberCount}
              leaders={leaders}
              noJudgementZone={pact.noJudgementZone}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10">
        <PersonCard person={owner} roleLabel="Pact creator" variant="public" />
      </section>

      {vibeData && <PublicPactVibes data={vibeData} />}

      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="mb-2 text-2xl font-bold">Why people are locking in</h2>
        <p className="mb-8 text-navy/65">
          Live momentum from this circle — join and start checking in today.
        </p>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Days live", value: String(stats.daysLive) },
            { label: "Members", value: String(stats.memberCount) },
            { label: "On track", value: `${stats.successRate}%` },
            { label: "Avg week", value: `${stats.avgCompletionPercentage}%` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-navy/10 bg-white/70 p-4 text-center">
              <p className="text-3xl font-bold text-navy">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-navy/50">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-navy/10 bg-white/70 p-4">
            <p className="text-sm text-navy/50">Check-ins logged</p>
            <p className="mt-1 text-2xl font-bold">{stats.totalCheckIns}</p>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-white/70 p-4">
            <p className="text-sm text-navy/50">Active this week</p>
            <p className="mt-1 text-2xl font-bold">{stats.activeThisWeek}</p>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-white/70 p-4">
            <p className="text-sm text-navy/50">Top streak</p>
            <p className="mt-1 text-2xl font-bold">🔥 {stats.topStreak}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-navy/10 bg-white/40 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-2xl font-bold">Leaders in the room</h2>
          <p className="mb-6 text-navy/65">
            {rhythm} · Window {pact.checkInStartTime}–{pact.checkInEndTime}
          </p>
          {leaders.length === 0 ? (
            <p className="text-navy/50">Be the first to set the pace.</p>
          ) : (
            <ul className="space-y-3">
              {leaders.map((leader, index) => (
                <li
                  key={`${leader.displayName}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-navy/10 bg-cream/80 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{leader.displayName}</p>
                    <p className="text-sm text-navy/50">#{index + 1} this week</p>
                  </div>
                  <span className="streak">
                    🔥 {leader.currentStreak} · {leader.completionPercentage}%
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 rounded-2xl bg-navy px-6 py-8 text-cream">
            <h3 className="text-xl font-bold">Ready to keep your promise?</h3>
            <p className="mt-2 text-cream/70">
              Join the circle, check in with the room, and share the link with someone who needs this too.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PublicPactJoin pactId={pact.id} slug={pact.slug} ownerId={owner.id} />
              <Link href="/explore" className="btn-secondary border-cream/30 bg-transparent text-cream hover:border-gold">
                Browse more pacts
              </Link>
              <a
                href={pactFeedUrl(pact.slug)}
                className="btn-secondary border-cream/30 bg-transparent text-cream hover:border-gold"
              >
                RSS feed
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
