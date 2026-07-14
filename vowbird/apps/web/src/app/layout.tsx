import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { siteFeedUrl } from "@/lib/public-pacts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vowbird — Keep your promise with someone beside you",
  description:
    "Accountability partners and goal-based circles. Check in, send letters, build streaks.",
  alternates: {
    types: {
      "application/rss+xml": siteFeedUrl(),
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
