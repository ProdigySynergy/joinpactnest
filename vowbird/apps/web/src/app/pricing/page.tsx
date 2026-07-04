import Link from "next/link";
import { PublicNav } from "@/components/NavBar";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <PublicNav />
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-4 text-center text-3xl font-bold">Pricing</h1>
        <p className="mb-12 text-center text-navy/70">Start free. Upgrade when you need more.</p>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-bold">Free</h2>
            <p className="mt-2 text-3xl font-bold text-gold">$0</p>
            <ul className="mt-6 space-y-2 text-sm text-navy/80">
              <li>✓ 3 active vows</li>
              <li>✓ 1 active partner match</li>
              <li>✓ Join public pacts</li>
              <li>✓ Basic check-ins</li>
              <li>✓ Basic letters</li>
            </ul>
            <Link href="/register" className="btn-secondary mt-8 block text-center">Get started</Link>
          </div>

          <div className="card border-gold/40 bg-gold/5">
            <h2 className="text-xl font-bold">Vowbird Plus</h2>
            <p className="mt-2 text-3xl font-bold text-gold">Coming soon</p>
            <ul className="mt-6 space-y-2 text-sm text-navy/80">
              <li>✓ Unlimited vows</li>
              <li>✓ More partner matches</li>
              <li>✓ Advanced streak insights</li>
              <li>✓ Custom pact themes</li>
              <li>✓ Scheduled future-self letters</li>
            </ul>
            <button disabled className="btn-primary mt-8 w-full opacity-50">Coming soon</button>
          </div>
        </div>
      </main>
    </div>
  );
}
