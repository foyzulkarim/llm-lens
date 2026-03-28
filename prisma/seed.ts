import { PrismaClient } from "@prisma/client";

const MODELS = ["llama3", "mistral", "codellama"];
const USERS = [
  { userId: "user-1", weight: 0.4 },
  { userId: "user-2", weight: 0.35 },
  { userId: "user-3", weight: 0.25 },
];
const TOTAL_LOGS = 90;
const DAY_SPREAD = 14;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickUser(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const u of USERS) {
    cumulative += u.weight;
    if (r <= cumulative) return u.userId;
  }
  return USERS[USERS.length - 1].userId;
}

function generateLogs(now: Date) {
  const logs = [];
  for (let i = 0; i < TOTAL_LOGS; i++) {
    const daysAgo = randomInt(0, DAY_SPREAD - 1);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(randomInt(0, 23), randomInt(0, 59), randomInt(0, 59));

    const promptTokens = randomInt(50, 500);
    const completionTokens = randomInt(20, 300);

    logs.push({
      userId: pickUser(),
      model: MODELS[randomInt(0, MODELS.length - 1)],
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      latencyMs: randomInt(100, 3000),
      createdAt,
    });
  }
  return logs;
}

export async function seed(prisma: PrismaClient) {
  await prisma.apiKey.upsert({
    where: { key: "test-key-alice-001" },
    update: {},
    create: {
      key: "test-key-alice-001",
      userId: "user-1",
      userName: "Alice",
    },
  });

  await prisma.apiKey.upsert({
    where: { key: "test-key-bob-002" },
    update: {},
    create: {
      key: "test-key-bob-002",
      userId: "user-2",
      userName: "Bob",
    },
  });

  await prisma.apiKey.upsert({
    where: { key: "test-key-charlie-003" },
    update: {},
    create: {
      key: "test-key-charlie-003",
      userId: "user-3",
      userName: "Charlie",
    },
  });

  await prisma.apiKey.upsert({
    where: { key: "test-key-admin-004" },
    update: {},
    create: {
      key: "test-key-admin-004",
      userId: "admin-1",
      userName: "Admin",
    },
  });

  await prisma.usageLog.deleteMany();

  const logs = generateLogs(new Date());
  for (const log of logs) {
    await prisma.usageLog.create({ data: log });
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
