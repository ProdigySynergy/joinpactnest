import { scanForContactInfo } from "@vowbird/shared";
import { prisma } from "../lib/prisma";

export function validateVeiledContent(text: string, profileMode: string): { ok: boolean; message?: string } {
  if (profileMode !== "VEILED") return { ok: true };
  const issues = scanForContactInfo(text);
  if (issues.length > 0) {
    return {
      ok: false,
      message: `For safety in Veiled Mode, please remove ${issues.join(", ")} from your message.`,
    };
  }
  return { ok: true };
}

export async function areUsersBlocked(userA: string, userB: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userA, blockedUserId: userB },
        { blockerId: userB, blockedUserId: userA },
      ],
    },
  });
  return !!block;
}

export async function assertNotSuspended(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.isSuspended) throw new Error("Account suspended");
  return user;
}
