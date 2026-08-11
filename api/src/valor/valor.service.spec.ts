import { ValorAward } from './valor-award.entity';
import { ValorProfile } from './valor-profile.entity';
import { ValorService } from './valor.service';

describe('ValorService', () => {
  it('applies an outbreak/account award once and never decreases Crests', async () => {
    const profiles = new Map<number, any>();
    const ledger = new Map<string, any>();
    const repository: any = {
      create: (data: any) => ({ ...data }),
      findOne: async ({ where }: any) => profiles.get(where.accountId) || null,
    };
    const manager: any = {
      findOne: async (entity: any, { where }: any) => entity === ValorAward
        ? ledger.get(`${where.outbreakId}:${where.accountId}`) || null
        : profiles.get(where.accountId) || null,
      insert: async (_entity: any, data: any) => {
        const key = `${data.outbreakId}:${data.accountId}`;
        if (ledger.has(key)) throw new Error('duplicate');
        ledger.set(key, { ...data });
      },
      create: (_entity: any, data: any) => ({ ...data }),
      save: async (_entity: any, data: any) => {
        profiles.set(data.accountId, { ...data });
        return data;
      },
    };
    const dataSource: any = { transaction: async (_level: string, fn: any) => fn(manager) };
    const service = new ValorService(dataSource, repository);
    const outbreakId = '11111111-1111-4111-8111-111111111111';
    const awards = [{ accountId: 5, crests: 6, zombieKills: 3, mvp: true }];

    await service.awardBatch(outbreakId, awards);
    await service.awardBatch(outbreakId, awards);

    expect(await service.profile(5)).toMatchObject({
      accountId: 5, crests: 6, outbreaksCleared: 1, zombieKills: 3, mvpCount: 1,
    });
  });
});
