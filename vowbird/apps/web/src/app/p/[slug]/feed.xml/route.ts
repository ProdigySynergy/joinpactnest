import { notFound } from "next/navigation";
import { buildPactFeed, rssResponse } from "@/lib/rss";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function GET(_request: Request, { params }: Props) {
  const xml = await buildPactFeed(params.slug);
  if (!xml) notFound();
  return rssResponse(xml);
}
