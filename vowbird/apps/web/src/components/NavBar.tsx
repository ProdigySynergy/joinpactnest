"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vows", label: "Vows" },
  { href: "/matches", label: "Partners" },
  { href: "/pacters", label: "Pactered" },
  { href: "/letters", label: "Letters" },
  { href: "/pacts", label: "Pacts" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <header className="border-b border-navy/10 bg-navy text-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="text-xl font-bold text-gold">
          Vowbird
        </Link>
        <nav className="hidden gap-4 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm ${pathname.startsWith(l.href) ? "text-gold" : "text-cream/80 hover:text-gold"}`}
            >
              {l.label}
            </Link>
          ))}
          {user.role === "ADMIN" && (
            <Link href="/admin" className="text-sm text-gold-light hover:text-gold">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={`/u/${user.username}`}
            className="hidden text-sm text-cream/70 hover:text-gold sm:inline"
          >
            {user.displayName}
          </Link>
          <button onClick={logout} className="text-sm text-cream/70 hover:text-gold">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export function PublicNav() {
  return (
    <header className="border-b border-navy/10 bg-navy/95 text-cream backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold text-gold">
          Vowbird
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/explore" className="text-sm text-cream/80 hover:text-gold">
            Explore
          </Link>
          <Link href="/login" className="text-sm text-cream/80 hover:text-gold">
            Log in
          </Link>
          <Link href="/register" className="btn-primary py-2 text-sm">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
