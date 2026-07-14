import { sanitizeUserForOthers } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { areUsersBlocked } from "./safety";

export async function getSharedPactPeers(userId: string) {
  const myMemberships = await prisma.pactMember.findMany({
    where: { userId, leftAt: null },
    select: { pactId: true },
  });
  const pactIds = myMemberships.map((m) => m.pactId);
  if (pactIds.length === 0) return new Map<string, { sharedPactIds: string[]; sharedPactCount: number }>();

  const peers = await prisma.pactMember.findMany({
    where: {
      pactId: { in: pactIds },
      leftAt: null,
      userId: { not: userId },
    },
    select: { userId: true, pactId: true },
  });

  const map = new Map<string, { sharedPactIds: string[]; sharedPactCount: number }>();
  for (const row of peers) {
    const existing = map.get(row.userId) || { sharedPactIds: [], sharedPactCount: 0 };
    if (!existing.sharedPactIds.includes(row.pactId)) {
      existing.sharedPactIds.push(row.pactId);
      existing.sharedPactCount = existing.sharedPactIds.length;
    }
    map.set(row.userId, existing);
  }
  return map;
}

export async function listPacterNetwork(userId: string) {
  const [pactPeers, accepted, mutes, blocks] = await Promise.all([
    getSharedPactPeers(userId),
    prisma.pacterRequest.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
    }),
    prisma.pacterMute.findMany({
      where: { userId },
      select: { mutedUserId: true },
    }),
    prisma.block.findMany({
      where: {
        OR: [{ blockerId: userId }, { blockedUserId: userId }],
      },
    }),
  ]);

  const muted = new Set(mutes.map((m) => m.mutedUserId));
  const blocked = new Set(
    blocks.map((b) => (b.blockerId === userId ? b.blockedUserId : b.blockerId))
  );

  const byUser = new Map<
    string,
    {
      viaPact: boolean;
      viaRequest: boolean;
      sharedPactCount: number;
      sharedPactIds: string[];
    }
  >();

  for (const [peerId, info] of pactPeers) {
    byUser.set(peerId, {
      viaPact: true,
      viaRequest: false,
      sharedPactCount: info.sharedPactCount,
      sharedPactIds: info.sharedPactIds,
    });
  }

  for (const req of accepted) {
    const peerId = req.fromUserId === userId ? req.toUserId : req.fromUserId;
    const existing = byUser.get(peerId) || {
      viaPact: false,
      viaRequest: false,
      sharedPactCount: 0,
      sharedPactIds: [],
    };
    existing.viaRequest = true;
    byUser.set(peerId, existing);
  }

  const peerIds = [...byUser.keys()].filter((id) => !muted.has(id) && !blocked.has(id));
  if (peerIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: peerIds }, isSuspended: false },
  });

  return users
    .map((u) => {
      const meta = byUser.get(u.id)!;
      return {
        user: sanitizeUserForOthers(u),
        viaPact: meta.viaPact,
        viaRequest: meta.viaRequest,
        sharedPactCount: meta.sharedPactCount,
        muted: false,
      };
    })
    .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName));
}

export async function getPacterRelation(viewerId: string, otherUserId: string) {
  if (viewerId === otherUserId) {
    return { isSelf: true as const };
  }

  const [pactPeers, outgoing, incoming, mute, blocked] = await Promise.all([
    getSharedPactPeers(viewerId),
    prisma.pacterRequest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: viewerId, toUserId: otherUserId } },
    }),
    prisma.pacterRequest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: otherUserId, toUserId: viewerId } },
    }),
    prisma.pacterMute.findUnique({
      where: { userId_mutedUserId: { userId: viewerId, mutedUserId: otherUserId } },
    }),
    areUsersBlocked(viewerId, otherUserId),
  ]);

  const pactInfo = pactPeers.get(otherUserId);
  const accepted =
    outgoing?.status === "ACCEPTED" || incoming?.status === "ACCEPTED";

  return {
    isSelf: false as const,
    viaPact: !!pactInfo,
    sharedPactCount: pactInfo?.sharedPactCount || 0,
    viaRequest: accepted,
    muted: !!mute,
    blocked,
    outgoingRequest: outgoing
      ? { id: outgoing.id, status: outgoing.status }
      : null,
    incomingRequest: incoming
      ? { id: incoming.id, status: incoming.status }
      : null,
  };
}
