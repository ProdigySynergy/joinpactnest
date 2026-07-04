import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "path";
import { generateInviteCode, slugify, VEILED_ALIASES } from "@vowbird/shared";

config({ path: resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

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

  const [alex, jordan, sam, veiled1, veiled2] = users;

  for (const u of users) {
    await prisma.notificationPreference.upsert({
      where: { userId: u.id },
      create: { userId: u.id },
      update: {},
    });
  }

  const vows = await Promise.all([
    prisma.vow.create({
      data: {
        userId: alex!.id,
        title: "Study 2 hours every night",
        reason: "Pass my certification exam",
        category: "STUDY",
        frequencyType: "DAILY",
        startDate: new Date(),
        visibility: "PARTNER",
      },
    }),
    prisma.vow.create({
      data: {
        userId: jordan!.id,
        title: "Go to the gym 4x per week",
        reason: "Build strength and consistency",
        category: "FITNESS",
        frequencyType: "WEEKLY",
        targetCountPerWeek: 4,
        startDate: new Date(),
        visibility: "PARTNER",
      },
    }),
    prisma.vow.create({
      data: {
        userId: veiled1!.id,
        title: "Pray every morning",
        reason: "Start the day grounded",
        category: "FAITH",
        frequencyType: "DAILY",
        startDate: new Date(),
        visibility: "PARTNER",
      },
    }),
    prisma.vow.create({
      data: {
        userId: sam!.id,
        title: "Read 10 pages daily",
        reason: "Finish three books this quarter",
        category: "READING",
        frequencyType: "DAILY",
        startDate: new Date(),
      },
    }),
  ]);

  const pacts = await Promise.all([
    prisma.pact.create({
      data: {
        ownerId: alex!.id,
        title: "Morning Runners Club",
        slug: slugify("Morning Runners Club"),
        description: "Daily movement accountability for early risers",
        category: "FITNESS",
        privacy: "PUBLIC",
        inviteCode: generateInviteCode(),
        startDate: new Date(),
        members: { create: { userId: alex!.id, role: "OWNER", displayModeInPact: "OPEN" } },
      },
    }),
    prisma.pact.create({
      data: {
        ownerId: jordan!.id,
        title: "Faith & Focus Circle",
        slug: slugify("Faith Focus Circle"),
        description: "Weekly spiritual check-ins",
        category: "FAITH",
        privacy: "INVITE_ONLY",
        inviteCode: generateInviteCode(),
        startDate: new Date(),
        members: { create: { userId: jordan!.id, role: "OWNER" } },
      },
    }),
    prisma.pact.create({
      data: {
        ownerId: sam!.id,
        title: "No Takeout Week",
        slug: slugify("No Takeout Week"),
        description: "Save money, cook at home",
        category: "MONEY",
        privacy: "PUBLIC",
        inviteCode: generateInviteCode(),
        startDate: new Date(),
        members: { create: { userId: sam!.id, role: "OWNER" } },
      },
    }),
  ]);

  await prisma.pactMember.createMany({
    data: [
      { pactId: pacts[0]!.id, userId: jordan!.id, displayModeInPact: "VEILED" },
      { pactId: pacts[2]!.id, userId: alex!.id, displayModeInPact: "OPEN" },
    ],
  });

  const match1 = await prisma.partnerMatch.create({
    data: {
      vowId: vows[0]!.id,
      userAId: alex!.id,
      userBId: jordan!.id,
      matchMode: "OPEN",
    },
  });

  const match2 = await prisma.partnerMatch.create({
    data: {
      vowId: vows[2]!.id,
      userAId: veiled1!.id,
      userBId: veiled2!.id,
      matchMode: "VEILED",
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.checkIn.createMany({
    data: [
      { userId: alex!.id, vowId: vows[0]!.id, checkInDate: today, note: "Studied for 2.5 hours", status: "COMPLETED" },
      { userId: alex!.id, vowId: vows[0]!.id, checkInDate: yesterday, status: "COMPLETED" },
      { userId: jordan!.id, vowId: vows[1]!.id, checkInDate: today, note: "Leg day!", status: "COMPLETED" },
      { userId: alex!.id, pactId: pacts[0]!.id, checkInDate: today, status: "COMPLETED" },
    ],
  });

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
        partnerMatchId: match2.id,
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

  await prisma.roomPost.create({
    data: {
      pactId: pacts[0]!.id,
      userId: alex!.id,
      body: "5am run done. Who's next?",
    },
  });

  await prisma.report.create({
    data: {
      reporterId: veiled2!.id,
      reportedUserId: veiled1!.id,
      reason: "Inappropriate tone",
      details: "Sample report for admin review",
      status: "OPEN",
    },
  });

  console.log("Seed complete!");
  console.log(`Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || "Admin123!@#"}`);
  console.log("Test users: alex@example.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
