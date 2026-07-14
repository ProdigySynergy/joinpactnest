import {
  fetchPublicPact,
  fetchPublicPactList,
  fetchPublicPactPosts,
  publicPactShareUrl,
  siteUrl,
} from "@/lib/public-pacts";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export type RssItem = {
  title: string;
  link: string;
  guid: string;
  pubDate: Date;
  description: string;
};

export function buildRssXml(opts: {
  title: string;
  link: string;
  description: string;
  feedUrl: string;
  items: RssItem[];
}): string {
  const lastBuild =
    opts.items[0]?.pubDate.toUTCString() || new Date().toUTCString();

  const itemsXml = opts.items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <description>${cdata(item.description)}</description>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(opts.title)}</title>
    <link>${escapeXml(opts.link)}</link>
    <description>${escapeXml(opts.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${escapeXml(opts.feedUrl)}" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>
`;
}

export function rssResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

/** Site / explore feed: one item per public pact. */
export async function buildPublicPactsFeed(feedPath: "/feed.xml" | "/explore/feed.xml") {
  const pacts = await fetchPublicPactList();
  const base = siteUrl();
  const feedUrl = `${base}${feedPath}`;
  const items: RssItem[] = pacts.map((p) => ({
    title: p.title,
    link: publicPactShareUrl(p.slug),
    guid: `pact:${p.id}`,
    pubDate: p.createdAt ? new Date(p.createdAt) : new Date(),
    description: [
      p.description || "Public accountability pact on Vowbird.",
      `${p.memberCount} members · ${p.successRate}% on track · ${p.daysLive} days live`,
      p.noJudgementZone ? "No judgement zone." : "",
    ]
      .filter(Boolean)
      .join(" "),
  }));

  return buildRssXml({
    title: feedPath.startsWith("/explore")
      ? "Vowbird · Explore public pacts"
      : "Vowbird · Public pacts",
    link: feedPath.startsWith("/explore") ? `${base}/explore` : base,
    description: "Open accountability circles on Vowbird — join and stay locked in.",
    feedUrl,
    items,
  });
}

/** Per-pact feed: stats snapshot + public room posts. */
export async function buildPactFeed(slug: string): Promise<string | null> {
  const [profile, postsData] = await Promise.all([
    fetchPublicPact(slug),
    fetchPublicPactPosts(slug),
  ]);
  if (!profile) return null;

  const base = siteUrl();
  const link = publicPactShareUrl(slug);
  const feedUrl = `${base}/p/${encodeURIComponent(slug)}/feed.xml`;
  const { pact, stats, leaders } = profile;

  const items: RssItem[] = [];

  const leaderLine =
    leaders.length > 0
      ? leaders
          .slice(0, 5)
          .map((l, i) => `#${i + 1} ${l.displayName} (${l.currentStreak} streak · ${l.completionPercentage}%)`)
          .join("; ")
      : "No leaders yet.";

  items.push({
    title: pact.title,
    link,
    guid: `pact:${pact.id}`,
    pubDate: new Date(pact.createdAt),
    description: [
      pact.description || "",
      `${stats.memberCount} members · ${stats.successRate}% on track · ${stats.activeThisWeek} active this week · top streak ${stats.topStreak}`,
      `Leaders: ${leaderLine}`,
      pact.noJudgementZone ? "No judgement zone." : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  for (const post of postsData?.posts || []) {
    items.push({
      title: `${post.author.displayName} in ${pact.title}`,
      link: `${link}#post-${post.id}`,
      guid: `post:${post.id}`,
      pubDate: new Date(post.createdAt),
      description: post.body,
    });
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return buildRssXml({
    title: `Vowbird · ${pact.title}`,
    link,
    description: pact.description || `Public pact activity for ${pact.title} on Vowbird.`,
    feedUrl,
    items,
  });
}
