"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";

export type ShareLeader = {
  displayName: string;
  currentStreak: number;
  completionPercentage: number;
};

type Props = {
  url: string;
  title: string;
  category: string;
  memberCount: number;
  leaders: ShareLeader[];
  noJudgementZone?: boolean;
};

function displayHostPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function SharePactButton({
  url,
  title,
  category,
  memberCount,
  leaders,
  noJudgementZone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 180,
      margin: 1,
      color: { dark: "#1a2b4a", light: "#ffffff" },
    })
      .then((data) => {
        if (!cancelled) setQrDataUrl(data);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function downloadImage() {
    if (!cardRef.current) return;
    setBusy(true);
    setMsg("");
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#1a2b4a",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `vowbird-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}.png`;
      a.click();
      setMsg("Image downloaded — ready to post.");
    } catch {
      setMsg("Couldn’t generate image — try a screenshot of the card.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setMsg("Link copied.");
  }

  const topLeaders = leaders.slice(0, 5);
  const pathLabel = displayHostPath(url);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share pact card"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-cream p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-navy">Share this pact</h2>
              <button type="button" className="text-sm text-navy/60 hover:text-navy" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="mb-4 text-sm text-navy/65">
              Screenshot or download this card for socials. Scan the QR to open the full pact page.
            </p>

            <div
              ref={cardRef}
              className="overflow-hidden rounded-2xl bg-navy text-cream"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              <div
                className="px-6 pb-6 pt-7"
                style={{
                  background:
                    "radial-gradient(ellipse at 15% 0%, rgba(212,168,83,0.4), transparent 55%), radial-gradient(ellipse at 90% 40%, rgba(90,143,123,0.28), transparent 50%), #1a2b4a",
                }}
              >
                <p className="text-sm font-semibold tracking-wide text-gold">Vowbird</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-cream/60">Public pact</p>
                <span className="mt-4 inline-flex rounded-full border border-cream/35 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-cream">
                  {category}
                </span>
                {noJudgementZone && (
                  <span className="ml-2 inline-flex rounded-full border border-sage/50 bg-sage/20 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-cream">
                    No judgement
                  </span>
                )}
                <h3 className="mt-4 text-3xl font-bold leading-tight text-cream">{title}</h3>
                <p className="mt-3 text-2xl font-bold text-gold">
                  {memberCount} {memberCount === 1 ? "person" : "people"} locking in
                </p>
              </div>

              <div className="border-t border-cream/10 bg-cream/5 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-cream/55">Leaders</p>
                {topLeaders.length === 0 ? (
                  <p className="mt-2 text-sm text-cream/70">Be first to set the pace.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {topLeaders.map((l, i) => (
                      <li key={`${l.displayName}-${i}`} className="flex items-center justify-between text-sm">
                        <span>
                          <span className="text-gold">#{i + 1}</span> {l.displayName}
                        </span>
                        <span className="text-cream/80">
                          🔥 {l.currentStreak} · {l.completionPercentage}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-end justify-between gap-4 border-t border-cream/10 px-6 py-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cream/50">Join at</p>
                  <p className="mt-1 break-all text-sm font-semibold text-gold">{pathLabel}</p>
                  <p className="mt-2 text-xs text-cream/55">Keep your promise with someone beside you.</p>
                </div>
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR code to this pact"
                    width={112}
                    height={112}
                    className="shrink-0 rounded-lg bg-white p-1"
                  />
                ) : (
                  <div className="h-28 w-28 shrink-0 rounded-lg bg-cream/10" />
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={downloadImage} disabled={busy}>
                {busy ? "Preparing…" : "Download image"}
              </button>
              <button type="button" className="btn-secondary" onClick={copyLink}>
                Copy link
              </button>
            </div>
            {msg && <p className="mt-2 text-sm text-sage">{msg}</p>}
          </div>
        </div>
      )}
    </>
  );
}
