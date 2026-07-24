"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/vows", label: "Vows" },
  { href: "/matches", label: "Partners" },
  { href: "/pacters", label: "Pactered" },
  { href: "/messages", label: "Messages" },
  { href: "/letters", label: "Letters" },
  { href: "/pacts", label: "Pacts" },
  { href: "/explore", label: "Explore" },
  { href: "/notifications", label: "Alerts" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const { data: incoming } = useQuery({
    queryKey: ["partner-requests-incoming"],
    queryFn: () =>
      api<{ requests: Array<{ id: string }> }>("/partner-requests/incoming"),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: unread } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api<{ unreadCount: number }>("/notifications/unread-count"),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const inviteCount = incoming?.requests.length ?? 0;
  const unreadCount = unread?.unreadCount ?? 0;

  if (!user) return null;

  return (
    <header className="border-b border-navy/10 bg-navy text-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/dashboard" className="text-xl font-bold text-gold">
          Vowbird
        </Link>
        <nav className="hidden gap-4 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm ${pathname.startsWith(l.href) ? "text-gold" : "text-cream/80 hover:text-gold"}`}
            >
              {l.label}
              {l.href === "/matches" && inviteCount > 0 ? (
                <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-navy">
                  {inviteCount}
                </span>
              ) : null}
              {l.href === "/notifications" && unreadCount > 0 ? (
                <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-navy">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
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
            href="/notifications"
            className="relative text-sm text-cream/80 hover:text-gold lg:hidden"
          >
            Alerts
            {unreadCount > 0 ? (
              <span className="ml-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-navy">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
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
