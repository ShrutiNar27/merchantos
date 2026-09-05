import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed-runner";

const db = new PrismaClient();

runSeed(db)
  .then((summary) => {
    console.log(summary);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
