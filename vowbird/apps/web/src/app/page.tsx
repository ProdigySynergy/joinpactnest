import Link from "next/link";
import { PublicNav } from "@/components/NavBar";
import { BRAND } from "@vowbird/shared";

const useCases = ["Fitness", "Study", "Career", "Faith", "Money", "Wellness", "Creative work", "Business building"];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <PublicNav />

      <section className="bg-navy px-4 py-20 text-cream">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-gold">🐦 Vowbird</p>
          <h1 className="mb-6 text-4xl font-bold leading-tight md:text-5xl">{BRAND.tagline}</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-cream/80">
            Vowbird matches you with accountability partners and small goal-based circles, so you
            can check in, send letters, build streaks, and stay locked in.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register" className="btn-primary">
              Start your first vow
            </Link>
            <Link href="/register?intent=partner" className="btn-secondary border-cream/30 bg-transparent text-cream hover:border-gold">
              Find an accountability partner
            </Link>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Make a vow", desc: "Set a goal with reason, category, and rhythm." },
              { step: "2", title: "Find your person", desc: "Get matched by goals, timezone, and tone — not swipes." },
              { step: "3", title: "Stay locked in", desc: "Check in daily, send weekly letters, build streaks." },
            ].map((s) => (
              <div key={s.step} className="card text-center">
                <span className="text-3xl font-bold text-gold">{s.step}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-navy/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Choose your mode</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="card border-gold/30">
              <span className="badge">Veiled Mode</span>
              <h3 className="mt-3 text-xl font-semibold">Anonymous accountability</h3>
              <p className="mt-2 text-navy/70">
                Use an alias like &ldquo;Quiet Falcon.&rdquo; No photos, no browsing. Matched by
                goals — not dating profiles.
              </p>
            </div>
            <div className="card">
              <span className="badge">Open Mode</span>
              <h3 className="mt-3 text-xl font-semibold">Visible profile</h3>
              <p className="mt-2 text-navy/70">
                Show your name, avatar, and bio. Join public pacts and invite friends to private
                circles.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold font-letter">Send weekly letters</h2>
          <p className="text-navy/70">
            Thoughtful reflections to your partner or future self — slower and more meaningful than chat.
          </p>
        </div>
      </section>

      <section className="bg-navy/5 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Built for real goals</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {useCases.map((u) => (
              <span key={u} className="badge bg-white">{u}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl card bg-sage/10 text-center">
          <h2 className="text-2xl font-bold">Safety-first anonymous matching</h2>
          <p className="mt-3 text-navy/70">
            Report, block, and rematch anytime. Contact info is filtered in Veiled Mode. Admins review reports.
          </p>
        </div>
      </section>

      <section className="bg-navy/5 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold">Join a public pact</h2>
          <p className="mb-6 text-navy/70">
            Browse open circles with live success rates, member counts, and streaks — then join with an account.
          </p>
          <Link href="/explore" className="btn-primary">
            Explore public pacts
          </Link>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-2xl font-bold">Simple pricing</h2>
          <p className="mb-6 text-navy/70">Start free. Upgrade when you&apos;re ready.</p>
          <Link href="/pricing" className="btn-primary">View pricing</Link>
        </div>
      </section>

      <footer className="border-t border-navy/10 px-4 py-8 text-center text-sm text-navy/50">
        <p>{BRAND.secondaryTagline}</p>
        <p className="mt-2">&copy; {new Date().getFullYear()} Vowbird</p>
      </footer>
    </div>
  );
}
