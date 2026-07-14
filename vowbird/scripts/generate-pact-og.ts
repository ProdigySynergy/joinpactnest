/**
 * Generate Open Graph share images for all public active pacts.
 * Output: uploads/og/pacts/{slug}.png (served at /uploads/og/pacts/{slug}.png)
 *
 * Usage: pnpm og:pacts
 * Cron (daily): 0 3 * * * cd /path/to/vowbird && pnpm og:pacts
 */
import { config } from "dotenv";
import { mkdir, writeFile } from "fs/promises";
import { resolve } from "path";
import QRCode from "qrcode";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const W = 1200;
const H = 630;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const REPO_ROOT = resolve(__dirname, "..");
const UPLOAD_DIR = resolve(REPO_ROOT, process.env.UPLOAD_DIR || "uploads");
const OUT_DIR = resolve(UPLOAD_DIR, "og", "pacts");

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCategory(category: string): string {
  return category
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function getWeekProgress(pactId: string) {
  const { getPactLeaderboard } = await import("../apps/api/src/services/progress");
  return getPactLeaderboard(pactId);
}

async function buildSvg(opts: {
  title: string;
  category: string;
  memberCount: number;
  leaders: Array<{ displayName: string; currentStreak: number; completionPercentage: number }>;
  pathLabel: string;
  qrDataUrl: string;
  noJudgementZone: boolean;
}): Promise<string> {
  const title = escapeXml(truncate(opts.title, 48));
  const category = escapeXml(opts.category);
  const pathLabel = escapeXml(opts.pathLabel);
  const memberLabel = `${opts.memberCount} ${opts.memberCount === 1 ? "person" : "people"} locking in`;

  const leaderRows = opts.leaders.slice(0, 5).map((l, i) => {
    const name = escapeXml(truncate(l.displayName, 28));
    const stats = `🔥 ${l.currentStreak} · ${l.completionPercentage}%`;
    const y = 320 + i * 36;
    return `
      <text x="64" y="${y}" fill="#F5F0E8" font-size="22" font-family="Georgia, serif">
        <tspan fill="#D4A853">#${i + 1}</tspan>
        <tspan dx="12">${name}</tspan>
      </text>
      <text x="1136" y="${y}" fill="#F5F0E8" font-size="20" font-family="Georgia, serif" text-anchor="end">${escapeXml(stats)}</text>
    `;
  });

  const leadersBlock =
    leaderRows.length > 0
      ? leaderRows.join("\n")
      : `<text x="64" y="340" fill="#F5F0E899" font-size="22" font-family="Georgia, serif">Be first to set the pace.</text>`;

  const judgementBadge = opts.noJudgementZone
    ? `<rect x="220" y="118" rx="16" ry="16" width="160" height="32" fill="#5A8F7B44" stroke="#5A8F7B"/>
       <text x="300" y="140" fill="#F5F0E8" font-size="14" font-family="Georgia, serif" text-anchor="middle">NO JUDGEMENT</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="g1" cx="15%" cy="0%" r="55%">
      <stop offset="0%" stop-color="#D4A853" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#D4A853" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g2" cx="90%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#5A8F7B" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#5A8F7B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#1A2B4A"/>
  <rect width="${W}" height="${H}" fill="url(#g1)"/>
  <rect width="${W}" height="${H}" fill="url(#g2)"/>

  <text x="64" y="72" fill="#D4A853" font-size="28" font-family="Georgia, serif" font-weight="700">Vowbird</text>
  <text x="64" y="100" fill="#F5F0E899" font-size="16" font-family="Georgia, serif" letter-spacing="2">PUBLIC PACT</text>

  <rect x="64" y="118" rx="16" ry="16" width="140" height="32" fill="none" stroke="#F5F0E855"/>
  <text x="134" y="140" fill="#F5F0E8" font-size="14" font-family="Georgia, serif" text-anchor="middle">${category.toUpperCase()}</text>
  ${judgementBadge}

  <text x="64" y="210" fill="#F5F0E8" font-size="52" font-family="Georgia, serif" font-weight="700">${title}</text>
  <text x="64" y="265" fill="#D4A853" font-size="32" font-family="Georgia, serif" font-weight="700">${escapeXml(memberLabel)}</text>

  <text x="64" y="300" fill="#F5F0E866" font-size="14" font-family="Georgia, serif" letter-spacing="2">LEADERS</text>
  ${leadersBlock}

  <text x="64" y="545" fill="#F5F0E866" font-size="14" font-family="Georgia, serif" letter-spacing="2">JOIN AT</text>
  <text x="64" y="580" fill="#D4A853" font-size="24" font-family="Georgia, serif" font-weight="700">${pathLabel}</text>
  <text x="64" y="608" fill="#F5F0E877" font-size="16" font-family="Georgia, serif">Keep your promise with someone beside you.</text>

  <rect x="1000" y="450" width="140" height="140" rx="12" fill="#FFFFFF"/>
  <image href="${opts.qrDataUrl}" x="1010" y="460" width="120" height="120"/>
</svg>`;
}

async function generateForPact(pact: {
  id: string;
  title: string;
  slug: string;
  category: string;
  noJudgementZone: boolean;
}) {
  const memberCount = await prisma.pactMember.count({
    where: { pactId: pact.id, leftAt: null },
  });

  let leaders: Array<{ displayName: string; currentStreak: number; completionPercentage: number }> = [];
  try {
    const board = await getWeekProgress(pact.id);
    leaders = board.slice(0, 5).map((row) => ({
      displayName: row.user.displayName,
      currentStreak: row.currentStreak,
      completionPercentage: row.completionPercentage,
    }));
  } catch (err) {
    console.warn(`Leaderboard skipped for ${pact.slug}:`, err);
  }

  const pactUrl = `${SITE}/p/${pact.slug}`;
  const pathLabel = pactUrl.replace(/^https?:\/\//, "");
  const qrDataUrl = await QRCode.toDataURL(pactUrl, {
    width: 240,
    margin: 1,
    color: { dark: "#1a2b4a", light: "#ffffff" },
  });

  const svg = await buildSvg({
    title: pact.title,
    category: formatCategory(pact.category),
    memberCount,
    leaders,
    pathLabel,
    qrDataUrl,
    noJudgementZone: pact.noJudgementZone,
  });

  const outPath = resolve(OUT_DIR, `${pact.slug}.png`);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(outPath, png);
  return outPath;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const pacts = await prisma.pact.findMany({
    where: { privacy: "PUBLIC", status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      noJudgementZone: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (pacts.length === 0) {
    console.log("No public active pacts to render.");
    return;
  }

  console.log(`Generating OG images for ${pacts.length} public pact(s) → ${OUT_DIR}`);
  for (const pact of pacts) {
    const path = await generateForPact(pact);
    console.log(`  ✓ ${pact.slug} → ${path}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
