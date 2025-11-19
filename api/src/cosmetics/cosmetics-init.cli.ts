import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CosmeticsService } from './cosmetics.service';

/**
 * This CLI script initializes the skin buy counts for the first time
 * Run with: npx ts-node src/cosmetics/cosmetics-init.cli.ts
 */
async function initializeSkinBuyCounts() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const cosmeticsService = app.get(CosmeticsService);

  try {
    console.log('Initializing skin buy counts...');
    await cosmeticsService.computeAndStoreSkinBuyCounts();
    console.log('Skin buy counts initialized successfully!');
  } catch (error) {
    console.error('Error initializing skin buy counts:', error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

initializeSkinBuyCounts();
