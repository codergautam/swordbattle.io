import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ValorAward } from './valor-award.entity';
import { ValorProfile } from './valor-profile.entity';

export interface ValorAwardInput {
  accountId: number;
  crests: number;
  zombieKills?: number;
  mvp?: boolean;
}

@Injectable()
export class ValorService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ValorProfile) private readonly profiles: Repository<ValorProfile>,
  ) {}

  private blank(accountId: number): ValorProfile {
    return this.profiles.create({
      accountId,
      crests: 0,
      outbreaksCleared: 0,
      zombieKills: 0,
      mvpCount: 0,
    });
  }

  async profile(accountId: number) {
    if (!Number.isInteger(accountId) || accountId <= 0) throw new BadRequestException('Invalid account ID');
    return (await this.profiles.findOne({ where: { accountId } })) || this.blank(accountId);
  }

  async top(limit = 10) {
    const take = Math.max(1, Math.min(10, Math.floor(Number(limit)) || 10));
    const rows = await this.profiles.createQueryBuilder('valor')
      .leftJoin('accounts', 'account', 'account.id = valor.account_id')
      .select('valor.account_id', 'accountId')
      .addSelect('account.username', 'username')
      .addSelect('valor.crests', 'crests')
      .addSelect('valor.outbreaks_cleared', 'outbreaksCleared')
      .addSelect('valor.zombie_kills', 'zombieKills')
      .addSelect('valor.mvp_count', 'mvpCount')
      .orderBy('valor.crests', 'DESC')
      .addOrderBy('valor.mvp_count', 'DESC')
      .addOrderBy('valor.account_id', 'ASC')
      .limit(take)
      .getRawMany();
    return rows.map(row => ({
      accountId: Number(row.accountId), username: row.username || `Account ${row.accountId}`,
      crests: Number(row.crests), outbreaksCleared: Number(row.outbreaksCleared),
      zombieKills: Number(row.zombieKills), mvpCount: Number(row.mvpCount),
    }));
  }

  async awardBatch(outbreakId: string, inputs: ValorAwardInput[]) {
    if (!/^[0-9a-f-]{36}$/i.test(String(outbreakId || ''))) throw new BadRequestException('Invalid outbreak ID');
    if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 100) throw new BadRequestException('Invalid awards');
    const seen = new Set<number>();
    const awards = inputs.map(input => {
      const accountId = Math.floor(Number(input.accountId));
      const crests = Math.floor(Number(input.crests));
      const zombieKills = Math.max(0, Math.floor(Number(input.zombieKills) || 0));
      if (accountId <= 0 || crests <= 0 || crests > 6 || seen.has(accountId)) throw new BadRequestException('Invalid award entry');
      seen.add(accountId);
      return { accountId, crests, zombieKills, mvp: !!input.mvp };
    });

    await this.dataSource.transaction('SERIALIZABLE', async manager => {
      for (const award of awards) {
        const exists = await manager.findOne(ValorAward, { where: { outbreakId, accountId: award.accountId } });
        if (exists) continue;
        await manager.insert(ValorAward, { outbreakId, ...award });
        let profile = await manager.findOne(ValorProfile, { where: { accountId: award.accountId } });
        if (!profile) profile = manager.create(ValorProfile, this.blank(award.accountId));
        profile.crests += award.crests;
        profile.outbreaksCleared += 1;
        profile.zombieKills += award.zombieKills;
        if (award.mvp) profile.mvpCount += 1;
        await manager.save(ValorProfile, profile);
      }
    });
    return Promise.all(awards.map(award => this.profile(award.accountId)));
  }
}
