import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CosmeticsService } from '../cosmetics/cosmetics.service';

async function generateDailySkins() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const cosmeticsService = app.get(CosmeticsService);

  const skinCount = parseInt(process.argv[2], 10) || 60;

  try {
    console.log(`[${new Date().toISOString()}] Generating ${skinCount} daily skins...`);
    await (cosmeticsService as any).generateAndStoreDailySkins(
      (cosmeticsService as any).getTodayDateString(),
      skinCount,
    );
    console.log(`[${new Date().toISOString()}] Daily skins generation completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

generateDailySkins();
