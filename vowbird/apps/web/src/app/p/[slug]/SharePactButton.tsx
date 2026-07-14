"use client";

import { useState } from "react";

type Props = {
  url: string;
  title: string;
};

export function SharePactButton({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url, text: `Join me on this Vowbird pact: ${title}` });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={share} className="btn-secondary">
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
