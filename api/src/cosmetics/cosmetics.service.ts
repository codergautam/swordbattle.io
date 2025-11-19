import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SkinBuyCount } from './skinBuyCount.entity';
import { DailySkins } from './dailySkins.entity';
import { Account } from 'src/accounts/account.entity';
import * as cosmetics from '../cosmetics.json';

@Injectable()
export class CosmeticsService {
  private readonly logger = new Logger(CosmeticsService.name);
  private readonly RESET_HOUR = 23;

  constructor(
    @InjectRepository(SkinBuyCount)
    private readonly skinBuyCountRepository: Repository<SkinBuyCount>,
    @InjectRepository(DailySkins)
    private readonly dailySkinsRepository: Repository<DailySkins>,
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
  ) {}

  @Cron('0 23 * * *')
  async generateDailySkins() {
    this.logger.log('Starting daily skin generation...');
    try {
      const tomorrow = this.getTomorrowDateString();
      await this.generateAndStoreDailySkins(tomorrow, 60);
      this.logger.log(`Daily skins generated for ${tomorrow}`);
    } catch (error) {
      this.logger.error('Error generating daily skins:', error);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateSkinBuyCounts() {
    this.logger.log('Starting skin buy count update...');
    try {
      await this.computeAndStoreSkinBuyCounts();
      this.logger.log('Skin buy count update completed');
    } catch (error) {
      this.logger.error('Error updating skin buy counts:', error);
    }
  }

  async computeAndStoreSkinBuyCounts() {
    const allSkinIds = Object.values(cosmetics['skins']).map((s: any) => s.id);
    const skinCounts = await this.fetchAllSkinBuyCounts(allSkinIds);

    for (const [skinId, count] of Object.entries(skinCounts)) {
      await this.skinBuyCountRepository.upsert(
        {
          skinId: Number(skinId),
          count: count as number,
        },
        ['skinId'],
      );
    }

    this.logger.log(`Updated buy counts for ${allSkinIds.length} skins`);
  }

  private async fetchAllSkinBuyCounts(
    skinIds: number[],
  ): Promise<{ [key: number]: number }> {
    const counts: { [key: number]: number } = {};

    skinIds.forEach((id) => {
      counts[id] = 0;
    });

    for (const skinId of skinIds) {
      const result = await this.accountsRepository
        .createQueryBuilder()
        .select('COUNT(*)', 'count')
        .where("skins @> :skinId", { skinId: `{"owned": [${skinId}]}` })
        .getRawOne();

      counts[skinId] = parseInt(result?.count || 0);
    }

    return counts;
  }

  async getSkinBuyCounts(): Promise<{ [key: number]: number }> {
    const buyCountEntities = await this.skinBuyCountRepository.find();
    const result: { [key: number]: number } = {};
    buyCountEntities.forEach((entity) => {
      result[entity.skinId] = entity.count;
    });
    return result;
  }

  async getTodaysSkins(): Promise<number[]> {
    const today = this.getTodayDateString();
    const dailySkins = await this.dailySkinsRepository.findOne({
      where: { date: today },
    });

    if (!dailySkins) {
      this.logger.warn(`No daily skins found for ${today}, generating...`);
      await this.generateAndStoreDailySkins(today, 60);
      return this.getTodaysSkins();
    }

    return dailySkins.skinIds;
  }

  async generateAndStoreDailySkins(dateStr: string, count: number): Promise<void> {
    const skinIds = await this.computeDailySkinList(count);

    await this.dailySkinsRepository.upsert(
      {
        date: dateStr,
        skinIds: skinIds,
      },
      ['date'],
    );
  }

  async computeDailySkinList(count: number = 60): Promise<number[]> {
    const allSkins = Object.values(cosmetics['skins']) as any[];
    const eligible = allSkins.filter((skin: any) =>
      !skin.event &&
      !skin.og &&
      !skin.ultimate &&
      !skin.eventoffsale &&
      skin.price > 0 &&
      skin.buyable &&
      !(skin.description || '').includes('Given') &&
      !skin.currency
    );

    const sortedByPriceDesc = [...eligible].sort(
      (a, b) => (b.price || 0) - (a.price || 0),
    );

    const topCount = Math.ceil(count / 4);
    const bucketCount = Math.floor((count - topCount) / 3);
    const topSkins = sortedByPriceDesc.slice(0, topCount).map((s) => s.id);
    const topSet = new Set(topSkins);

    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const pickUnique = (
      pool: any[],
      pickCount: number,
      selected: Set<number>,
    ): number[] => {
      const candidates = shuffle(pool.map((s: any) => s.id)).filter(
        (id: number) => !selected.has(id) && !topSet.has(id),
      );
      const picked = candidates.slice(0, pickCount);
      picked.forEach((id: number) => selected.add(id));
      return picked;
    };

    const bucket1 = eligible.filter((s) => s.price >= 1 && s.price <= 500);
    const bucket2 = eligible.filter((s) => s.price > 500 && s.price <= 5000);
    const bucket3 = eligible.filter((s) => s.price > 5000);

    const selectedSet = new Set<number>();
    const picks: number[] = [];
    picks.push(...pickUnique(bucket1, bucketCount, selectedSet));
    picks.push(...pickUnique(bucket2, bucketCount, selectedSet));
    picks.push(...pickUnique(bucket3, bucketCount, selectedSet));

    const needed = count - topCount - picks.length;
    if (needed > 0) {
      const remainingPool = shuffle(eligible.map((s) => s.id)).filter(
        (id: number) => !selectedSet.has(id) && !topSet.has(id),
      );
      const fill = remainingPool.slice(0, needed);
      fill.forEach((id: number) => selectedSet.add(id));
      picks.push(...fill);
    }

    let finalList = [...picks, ...topSkins];
    if (finalList.length < count) {
      const remaining = shuffle(eligible.map((s) => s.id)).filter(
        (id: number) => !finalList.includes(id),
      );
      finalList.push(...remaining.slice(0, count - finalList.length));
    }

    const uniqueList = Array.from(new Set(finalList)).slice(0, count);
    return uniqueList.length === count ? uniqueList : finalList.slice(0, count);
  }

  getTodayDateString(): string {
    return this.getShiftedDateString(0);
  }

  getTomorrowDateString(): string {
    return this.getShiftedDateString(1);
  }

  private getShiftedDateString(dayOffset: number): string {
    const now = new Date();
    const shifted = new Date(
      now.getTime() - this.RESET_HOUR * 60 * 60 * 1000 + dayOffset * 24 * 60 * 60 * 1000,
    );
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
