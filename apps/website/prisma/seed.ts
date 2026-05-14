import { SyncService } from "../app/lib/sync";
import { prisma } from "../app/lib/prisma";

const syncService = new SyncService(prisma);

async function main() {
  console.log("Start seeding...");

  const result = await syncService.syncAll();

  console.log(`Synced ${result.packagesSynced} packages, ${result.skillsSynced} skills`);
  if (result.errors.length > 0) {
    console.warn("Errors:", result.errors);
  }

  console.log("Seeding finished.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
