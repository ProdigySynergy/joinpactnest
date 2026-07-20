import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "path";
import { generateInviteCode, slugify, VEILED_ALIASES } from "@vowbird/shared";

config({ path: resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

async function ensurePact(data: {
  ownerId: string;
  title: string;
  slug: string;
  description: string;
  category: "FITNESS" | "FAITH" | "MONEY";
  privacy: "PUBLIC" | "INVITE_ONLY" | "PRIVATE";
}) {
  const existing = await prisma.pact.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;

  return prisma.pact.create({
    data: {
      ownerId: data.ownerId,
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      privacy: data.privacy,
      inviteCode: generateInviteCode(),
      startDate: new Date(),
      members: {
        create: {
          userId: data.ownerId,
          role: "OWNER",
          displayModeInPact: "OPEN",
        },
      },
    },
  });
}

async function ensureVow(data: {
  userId: string;
  title: string;
  reason: string;
  category: "STUDY" | "FITNESS" | "FAITH" | "READING";
  frequencyType: "DAILY" | "WEEKLY";
  targetCountPerWeek?: number;
  visibility?: "PRIVATE" | "PARTNER" | "GROUP_PUBLIC";
}) {
  const existing = await prisma.vow.findFirst({
    where: { userId: data.userId, title: data.title },
  });
  if (existing) return existing;

  return prisma.vow.create({
    data: {
      userId: data.userId,
      title: data.title,
      reason: data.reason,
      category: data.category,
      frequencyType: data.frequencyType,
      targetCountPerWeek: data.targetCountPerWeek ?? 1,
      startDate: new Date(),
      visibility: data.visibility ?? "PRIVATE",
    },
  });
}

async function ensureMatch(data: {
  vowId: string;
  userAId: string;
  userBId: string;
  matchMode: "OPEN" | "VEILED";
}) {
  const existing = await prisma.partnerMatch.findFirst({
    where: {
      vowId: data.vowId,
      status: "ACTIVE",
      OR: [
        { userAId: data.userAId, userBId: data.userBId },
        { userAId: data.userBId, userBId: data.userAId },
      ],
    },
  });
  if (existing) return existing;

  return prisma.partnerMatch.create({ data });
}

async function main() {
  console.log("Seeding Vowbird database...");

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin123!@#", 12);

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@vowbird.app" },
    update: {},
    create: {
      name: "Vowbird Admin",
      username: "vowbird_admin",
      email: process.env.ADMIN_EMAIL || "admin@vowbird.app",
      passwordHash,
      role: "ADMIN",
      profileMode: "OPEN",
      bio: "Platform administrator",
      timezone: "America/New_York",
    },
  });

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "alex@example.com" },
      update: {},
      create: {
        name: "Alex Rivera",
        username: "alex_r",
        email: "alex@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "OPEN",
        bio: "Building habits one day at a time.",
        timezone: "America/Chicago",
      },
    }),
    prisma.user.upsert({
      where: { email: "jordan@example.com" },
      update: {},
      create: {
        name: "Jordan Lee",
        username: "jordan_l",
        email: "jordan@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "OPEN",
        timezone: "America/Los_Angeles",
      },
    }),
    prisma.user.upsert({
      where: { email: "sam@example.com" },
      update: {},
      create: {
        name: "Sam Chen",
        username: "sam_c",
        email: "sam@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "OPEN",
        timezone: "America/New_York",
      },
    }),
    prisma.user.upsert({
      where: { email: "taylor@example.com" },
      update: {},
      create: {
        name: "Taylor Brooks",
        username: "taylor_b",
        email: "taylor@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "OPEN",
        timezone: "Europe/London",
      },
    }),
    prisma.user.upsert({
      where: { email: "morgan@example.com" },
      update: {},
      create: {
        name: "Morgan Wright",
        username: "morgan_w",
        email: "morgan@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "OPEN",
        timezone: "America/Denver",
      },
    }),
    prisma.user.upsert({
      where: { email: "veiled1@example.com" },
      update: {},
      create: {
        name: "Hidden User",
        username: "quiet_falcon",
        email: "veiled1@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "VEILED",
        anonymousAlias: VEILED_ALIASES[0],
        timezone: "America/New_York",
      },
    }),
    prisma.user.upsert({
      where: { email: "veiled2@example.com" },
      update: {},
      create: {
        name: "Hidden User 2",
        username: "blue_lantern",
        email: "veiled2@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "VEILED",
        anonymousAlias: VEILED_ALIASES[1],
        timezone: "America/New_York",
      },
    }),
    prisma.user.upsert({
      where: { email: "veiled3@example.com" },
      update: {},
      create: {
        name: "Hidden User 3",
        username: "steady_pine",
        email: "veiled3@example.com",
        passwordHash: await bcrypt.hash("Password123!", 12),
        profileMode: "VEILED",
        anonymousAlias: VEILED_ALIASES[2],
        timezone: "America/Chicago",
      },
    }),
  ]);

  const [alex, jordan, sam, , , veiled1, veiled2] = users;

  for (const u of users) {
    await prisma.notificationPreference.upsert({
      where: { userId: u.id },
      create: { userId: u.id },
      update: {},
    });
  }

  const vowStudy = await ensureVow({
    userId: alex!.id,
    title: "Study 2 hours every night",
    reason: "Pass my certification exam",
    category: "STUDY",
    frequencyType: "DAILY",
    visibility: "PARTNER",
  });
  const vowGym = await ensureVow({
    userId: jordan!.id,
    title: "Go to the gym 4x per week",
    reason: "Build strength and consistency",
    category: "FITNESS",
    frequencyType: "WEEKLY",
    targetCountPerWeek: 4,
    visibility: "PARTNER",
  });
  const vowPray = await ensureVow({
    userId: veiled1!.id,
    title: "Pray every morning",
    reason: "Start the day grounded",
    category: "FAITH",
    frequencyType: "DAILY",
    visibility: "PARTNER",
  });
  await ensureVow({
    userId: sam!.id,
    title: "Read 10 pages daily",
    reason: "Finish three books this quarter",
    category: "READING",
    frequencyType: "DAILY",
  });

  const pactRunners = await ensurePact({
    ownerId: alex!.id,
    title: "Morning Runners Club",
    slug: slugify("Morning Runners Club"),
    description: "Daily movement accountability for early risers",
    category: "FITNESS",
    privacy: "PUBLIC",
  });
  await ensurePact({
    ownerId: jordan!.id,
    title: "Faith & Focus Circle",
    slug: slugify("Faith Focus Circle"),
    description: "Weekly spiritual check-ins",
    category: "FAITH",
    privacy: "INVITE_ONLY",
  });
  const pactTakeout = await ensurePact({
    ownerId: sam!.id,
    title: "No Takeout Week",
    slug: slugify("No Takeout Week"),
    description: "Save money, cook at home",
    category: "MONEY",
    privacy: "PUBLIC",
  });

  await prisma.pactMember.upsert({
    where: {
      pactId_userId: { pactId: pactRunners.id, userId: jordan!.id },
    },
    create: {
      pactId: pactRunners.id,
      userId: jordan!.id,
      displayModeInPact: "VEILED",
    },
    update: { leftAt: null },
  });
  await prisma.pactMember.upsert({
    where: {
      pactId_userId: { pactId: pactTakeout.id, userId: alex!.id },
    },
    create: {
      pactId: pactTakeout.id,
      userId: alex!.id,
      displayModeInPact: "OPEN",
    },
    update: { leftAt: null },
  });

  const match1 = await ensureMatch({
    vowId: vowStudy.id,
    userAId: alex!.id,
    userBId: jordan!.id,
    matchMode: "OPEN",
  });

  await prisma.partnerMatch.update({
    where: { id: match1.id },
    data: { vibesPublic: true, vibeLeaderboardEnabled: true },
  });

  await ensureMatch({
    vowId: vowPray.id,
    userAId: veiled1!.id,
    userBId: veiled2!.id,
    matchMode: "VEILED",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const checkInSeeds = [
    {
      userId: alex!.id,
      vowId: vowStudy.id,
      checkInDate: today,
      note: "Studied for 2.5 hours",
      status: "COMPLETED" as const,
    },
    {
      userId: alex!.id,
      vowId: vowStudy.id,
      checkInDate: yesterday,
      status: "COMPLETED" as const,
    },
    {
      userId: jordan!.id,
      vowId: vowGym.id,
      checkInDate: today,
      note: "Leg day!",
      status: "COMPLETED" as const,
    },
    {
      userId: alex!.id,
      pactId: pactRunners.id,
      checkInDate: today,
      status: "COMPLETED" as const,
    },
  ];

  for (const c of checkInSeeds) {
    try {
      await prisma.checkIn.create({ data: c });
    } catch (e: unknown) {
      // Already seeded for this user/date (MySQL date uniqueness is picky with upsert)
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }

  const letterExists = await prisma.letter.findFirst({
    where: {
      senderId: alex!.id,
      subject: "What I'm committing to this week",
    },
  });
  if (!letterExists) {
    await prisma.letter.createMany({
      data: [
        {
          senderId: alex!.id,
          recipientId: jordan!.id,
          partnerMatchId: match1.id,
          type: "PARTNER_LETTER",
          subject: "What I'm committing to this week",
          body: "This week I'm locking in on my study schedule. Hold me to it.",
          status: "SENT",
          sentAt: new Date(),
        },
        {
          senderId: veiled1!.id,
          recipientId: veiled2!.id,
          type: "PARTNER_LETTER",
          subject: "Why I started",
          body: "I wanted morning prayer to feel less lonely. Thanks for being here.",
          status: "SENT",
          sentAt: new Date(),
        },
        {
          senderId: alex!.id,
          type: "FUTURE_SELF",
          subject: "Letter to myself after 30 days",
          body: "Dear future me — I hope you kept the promise.",
          status: "SCHEDULED",
          unlockAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      ],
    });
  }

  const roomPostExists = await prisma.roomPost.findFirst({
    where: { pactId: pactRunners.id, body: "5am run done. Who's next?" },
  });
  if (!roomPostExists) {
    await prisma.roomPost.create({
      data: {
        pactId: pactRunners.id,
        userId: alex!.id,
        body: "5am run done. Who's next?",
      },
    });
  }

  const vibeExists = await prisma.vibeCheck.findFirst({
    where: { partnerMatchId: match1.id, note: "Deep work block until lunch" },
  });
  if (!vibeExists) {
    await prisma.vibeCheck.createMany({
      data: [
        {
          userId: alex!.id,
          partnerMatchId: match1.id,
          vibe: "LOCKED_IN",
          note: "Deep work block until lunch",
        },
        {
          userId: jordan!.id,
          partnerMatchId: match1.id,
          vibe: "AT_THE_GYM",
          note: "Leg day — hold me to it",
        },
        {
          userId: alex!.id,
          pactId: pactRunners.id,
          vibe: "DRIVING",
          note: "Heading to the trailhead",
        },
      ],
    });
  }

  const reportExists = await prisma.report.findFirst({
    where: {
      reporterId: veiled2!.id,
      reportedUserId: veiled1!.id,
      reason: "Inappropriate tone",
    },
  });
  if (!reportExists) {
    await prisma.report.create({
      data: {
        reporterId: veiled2!.id,
        reportedUserId: veiled1!.id,
        reason: "Inappropriate tone",
        details: "Sample report for admin review",
        status: "OPEN",
      },
    });
  }

  console.log("Seed complete!");
  console.log(`Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || "Admin123!@#"}`);
  console.log("Test users: alex@example.com / Password123!");
  console.log("Re-run safe: existing demo rows are reused, not duplicated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
