import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UpgradeSelect } from './upgradeSelect.entity';
import { UpgradeTracking } from './upgradeTracking.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(UpgradeSelect) private readonly selectsRepo: Repository<UpgradeSelect>,
    @InjectRepository(UpgradeTracking) private readonly trackingRepo: Repository<UpgradeTracking>,
  ) {}

  async logSelection(data: {
    card_id: number;
    card_name: string;
    is_major: boolean;
    card_pick_number: number;
    evolution?: number;
    coins?: number;
    level?: number;
    minor_stacks?: string;
    major_cards?: string;
    account_id?: number;
  }) {
    const select = this.selectsRepo.create(data);
    return this.selectsRepo.save(select);
  }

  async aggregate(timeWindow: string) {
    let since: Date;
    const now = new Date();

    switch (timeWindow) {
      case 'last_24h':
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7d':
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        since = new Date(0);
        break;
    }

    const selects = await this.selectsRepo.find({
      where: { created_at: MoreThan(since) },
    });

    if (selects.length === 0) return;

    const minorCounts: Record<number, number> = {};
    const majorCounts: Record<number, number> = {};
    const minorMajorCombos: Record<string, number> = {};
    const majorMajorCombos: Record<string, number> = {};
    const majorEvolCombos: Record<string, number> = {};
    const gamePickCounts: Record<number, number> = {};

    for (const s of selects) {
      if (s.is_major) {
        majorCounts[s.card_id] = (majorCounts[s.card_id] || 0) + 1;
      } else {
        minorCounts[s.card_id] = (minorCounts[s.card_id] || 0) + 1;
      }

      if (s.account_id) {
        gamePickCounts[s.account_id] = Math.max(gamePickCounts[s.account_id] || 0, s.card_pick_number);
      }

      if (!s.is_major && s.major_cards) {
        try {
          const majors = JSON.parse(s.major_cards);
          for (const majorId of majors) {
            const key = `${s.card_id}-${majorId}`;
            minorMajorCombos[key] = (minorMajorCombos[key] || 0) + 1;
          }
        } catch (e) {}
      }

      if (s.is_major && s.major_cards) {
        try {
          const existingMajors = JSON.parse(s.major_cards);
          for (const existingId of existingMajors) {
            if (existingId !== s.card_id) {
              const pair = [s.card_id, existingId].sort((a, b) => a - b);
              const key = `${pair[0]}-${pair[1]}`;
              majorMajorCombos[key] = (majorMajorCombos[key] || 0) + 1;
            }
          }
        } catch (e) {}
      }

      if (s.is_major && s.evolution) {
        const key = `${s.card_id}-${s.evolution}`;
        majorEvolCombos[key] = (majorEvolCombos[key] || 0) + 1;
      }
    }

    const minorEntries = Object.entries(minorCounts).sort((a, b) => b[1] - a[1]);
    const majorEntries = Object.entries(majorCounts).sort((a, b) => b[1] - a[1]);

    const topMinorMajor = Object.entries(minorMajorCombos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [minor, major] = key.split('-').map(Number);
        return { minor, major, count };
      });

    const topMajorMajor = Object.entries(majorMajorCombos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [major1, major2] = key.split('-').map(Number);
        return { major1, major2, count };
      });

    const topMajorEvol = Object.entries(majorEvolCombos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [major, evolution] = key.split('-').map(Number);
        return { major, evolution, count };
      });

    const pickValues = Object.values(gamePickCounts);
    const avgPicks = pickValues.length > 0 ? pickValues.reduce((a, b) => a + b, 0) / pickValues.length : 0;

    const minorNames: Record<number, string> = {
      1: 'Sharp Stabs', 2: 'Quick Swing', 3: 'Heavy Hits', 4: 'Sharpshooter',
      5: 'Defense Training', 6: 'Regenerate', 7: 'Fast Heal', 8: 'Weighted Player',
      9: 'Swiftness', 10: 'Coin Magnet', 11: 'Sniper Vision', 12: 'Throwpower', 13: 'Size Scale',
    };
    const majorNames: Record<number, string> = {
      101: 'Cleave', 102: 'Double Hit', 103: 'Aggression', 104: 'Twin Throw',
      105: 'Boomerang', 106: 'Spare Sword', 107: 'Finisher', 108: 'Regensteal',
      109: 'Boxer', 110: 'Tracking', 111: 'Ensnare', 112: 'Acceleration',
      113: 'Vampire Aspect', 114: 'Soul Harvest', 115: 'Blood Frenzy',
      116: 'Rejuvenation', 117: 'Adaptive Armor', 118: 'Disengage',
      119: 'Midas Touch', 120: 'Chest Keys', 121: 'Scavenger',
      122: 'Ceasefire', 123: 'PvE Master', 124: 'Tank Shell',
      125: 'Hunting Instinct', 126: 'Butcherer', 127: 'Boss Hunter',
      128: 'Fortress', 129: 'Regen Mastery', 130: 'Insurance',
    };

    const tracking = this.trackingRepo.create({
      time_window: timeWindow,
      total_selections: selects.length,
      minor_pick_counts: JSON.stringify(minorCounts),
      major_pick_counts: JSON.stringify(majorCounts),
      top_minor_id: minorEntries.length > 0 ? Number(minorEntries[0][0]) : null,
      top_minor_name: minorEntries.length > 0 ? minorNames[Number(minorEntries[0][0])] || null : null,
      bottom_minor_id: minorEntries.length > 0 ? Number(minorEntries[minorEntries.length - 1][0]) : null,
      bottom_minor_name: minorEntries.length > 0 ? minorNames[Number(minorEntries[minorEntries.length - 1][0])] || null : null,
      top_major_id: majorEntries.length > 0 ? Number(majorEntries[0][0]) : null,
      top_major_name: majorEntries.length > 0 ? majorNames[Number(majorEntries[0][0])] || null : null,
      top_minor_major_combos: JSON.stringify(topMinorMajor),
      top_major_major_combos: JSON.stringify(topMajorMajor),
      top_major_evolution_combos: JSON.stringify(topMajorEvol),
      avg_picks_per_game: avgPicks,
    });

    return this.trackingRepo.save(tracking);
  }

  async runAllAggregations() {
    await this.aggregate('last_24h');
    await this.aggregate('last_7d');
    await this.aggregate('all_time');
    console.log('[Analytics] Aggregation complete');
  }

  async getLatestTracking(timeWindow = 'last_24h') {
    return this.trackingRepo.findOne({
      where: { time_window: timeWindow },
      order: { created_at: 'DESC' },
    });
  }
}
