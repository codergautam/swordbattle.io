import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CosmeticsService } from '../cosmetics/cosmetics.service';

/**
 * Heroku Scheduler compatible script to update skin buy counts
 * Command for Heroku Scheduler: npm run update-skin-counts
 */
async function updateSkinCounts() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const cosmeticsService = app.get(CosmeticsService);

  try {
    console.log(`[${new Date().toISOString()}] Starting skin buy count update...`);
    await cosmeticsService.computeAndStoreSkinBuyCounts();
    console.log(`[${new Date().toISOString()}] Skin buy count update completed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error updating skin buy counts:`, error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

updateSkinCounts();
