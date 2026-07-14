import { buildPublicPactsFeed, rssResponse } from "@/lib/rss";

export const dynamic = "force-dynamic";

export async function GET() {
  const xml = await buildPublicPactsFeed("/feed.xml");
  return rssResponse(xml);
}
