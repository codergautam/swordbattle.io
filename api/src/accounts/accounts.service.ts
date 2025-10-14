import { Injectable, NotFoundException, UnauthorizedException, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Account } from './account.entity';
import * as config from '../config';
import validateUsername from 'src/helpers/validateUsername';
import validateClantag from 'src/helpers/validateClantag';
import validateUserbio from 'src/helpers/validateUserbio';
import { Transaction } from 'src/transactions/transactions.entity';
import * as cosmetics from '../cosmetics.json';
import CacheObj from 'src/Cache';

const usernameWaitTime = config.config.usernameWaitTime;
const clanWaitTime = config.config.clanWaitTime;


@Injectable()
export class AccountsService {
  private cosmeticCountsCache = new CacheObj<{ [key: number]: number }>(7200000) // 2 hours in milliseconds

  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,

  ) {}

  private timereset = 23; // 0-23 utc

  private seedFromString(s: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  private mulberry32(seed: number) {
    return function() {
      let t = (seed += 0x6D2B79F5) >>> 0;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private seededShuffle<T>(arr: T[], seedStr: string) {
    const a = arr.slice();
    const rng = this.mulberry32(this.seedFromString(seedStr));
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private getShopDayKey(now = new Date()) {
    const shifted = new Date(now.getTime() - this.timereset * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private computeGlobalSkinList(dayKey?: string): number[] {
    const shopDayKey = dayKey ?? this.getShopDayKey();
    const allSkins = Object.values((cosmetics as any)['skins']) as any[];
    const eligible = allSkins.filter((skin: any) =>
      !skin.event &&
      !skin.og &&
      !skin.ultimate &&
      !skin.eventoffsale &&
      skin.price > 0 &&
      skin.buyable &&
      !(skin.description || '').includes('Given')
    );

    const sortedByPriceDesc = [...eligible].sort((a, b) => (b.price || 0) - (a.price || 0));
    const top15 = sortedByPriceDesc.slice(0, 15).map(s => s.id);
    const topSet = new Set(top15);

    const shuffleArray = <T,>(arr: T[]) => this.seededShuffle(arr, shopDayKey);

    const pickUnique = (pool: any[], count: number, selected: Set<number>) => {
      const candidates = shuffleArray(pool.map((s: any) => s.id)).filter((id: number) => !selected.has(id) && !topSet.has(id));
      const picked = candidates.slice(0, count);
      picked.forEach((id: number) => selected.add(id));
      return picked;
    };

    const bucket1 = eligible.filter(s => s.price >= 1 && s.price <= 500);
    const bucket2 = eligible.filter(s => s.price > 500 && s.price <= 5000);
    const bucket3 = eligible.filter(s => s.price > 5000);

    const selectedSet = new Set<number>();
    const picks: number[] = [];
    picks.push(...pickUnique(bucket1, 15, selectedSet));
    picks.push(...pickUnique(bucket2, 15, selectedSet));
    picks.push(...pickUnique(bucket3, 15, selectedSet));

    const needed = 45 - picks.length;
    if (needed > 0) {
      const remainingPool = shuffleArray(eligible.map(s => s.id)).filter((id: number) => !selectedSet.has(id) && !topSet.has(id));
      const fill = remainingPool.slice(0, needed);
      fill.forEach((id: number) => selectedSet.add(id));
      picks.push(...fill);
    }

    let newSkinList = [...picks.slice(0, 45), ...top15];
    if (newSkinList.length < 60) {
      const remaining = shuffleArray(eligible.map(s => s.id)).filter((id: number) => !newSkinList.includes(id));
      newSkinList.push(...remaining.slice(0, 60 - newSkinList.length));
    }
    const uniqueList = Array.from(new Set(newSkinList)).slice(0, 60);
    const finalList = uniqueList.length === 60 ? uniqueList : newSkinList.slice(0, 60);
    return finalList;
  }

  async create(data: Partial<Account>) {
    const account = this.accountsRepository.create(data);
    return this.accountsRepository.save(account);
  }

  async findOne(where: FindOneOptions<Account>, throwException = false) {
    const account = await this.accountsRepository.findOne(where);
    if (!account && throwException) {
      throw new NotFoundException(`Account not found`);
    }
    return account;
  }

  async findOneWithLowercase(options: any): Promise<Account | undefined> {
    const queryBuilder = this.accountsRepository.createQueryBuilder('account');

    if (options.where.username) {
        queryBuilder.where('LOWER(account.username) = LOWER(:username)', { username: options.where.username });
    } else if (options.where.email) {
        queryBuilder.where('LOWER(account.email) = LOWER(:email)', { email: options.where.email });
    }

    return queryBuilder.getOne();
}

  async findAll(where?: FindOneOptions<Account>, throwException = false) {
    const accounts = await this.accountsRepository.find(where);
    if ((!accounts || accounts.length === 0) && throwException) {
      throw new NotFoundException(`Accounts not found`);
    }
    return accounts;
  }

  async findStatOfAll(where: FindOneOptions<Account>, stat: keyof Account): Promise<number> {
    const accounts = await this.findAll(where);
    return accounts.reduce((total, account) => {
      const value = account[stat];
      return typeof value === 'number' ? total + value : total;
    }, 0);
  }

  async findClanMembers(clan: string) {
    return this.findAll({ where: { clan } });
  }

  async getById(id: number) {
    const account = await this.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`There isn't any account with id: ${id}`);
    }
    return account;
  }

  async getCosmeticCnts(type: 'skins') {
    // TODO: Add support for other types cache
    // Check if cache is stale
    if (this.cosmeticCountsCache.isStale()) {
      // Fetch new data from database and update cache
      const counts = await this.fetchAndCountCosmeticsFromDB(type);
      this.cosmeticCountsCache.updateData(counts);
    }

    // Return data from cache
    return this.cosmeticCountsCache.getData();
  }

  async fetchAndCountCosmeticsFromDB(type: 'skins') {
    const skinIds = Object.values(cosmetics[type]).map((c: any) => c.id);

    // Prepare an object to hold the counts
    const counts = skinIds.reduce((acc, id) => ({ ...acc, [id]: 0 }), {});

    // Iterate over each skinId and count occurrences in the database
    for (const skinId of skinIds) {
      const countResult = await this.accountsRepository.createQueryBuilder()
        .select("COUNT(*)", "count")
        .where("skins @> :skinId", { skinId: `{"owned": [${skinId}]}` }) // Adjust the condition according to your database type and schema
        .getRawOne();

      counts[skinId] = parseInt(countResult.count);
    }

    return counts;
  }

  async equipSkin(userId: number, skinId: number) {
    // Fetch the user's current skin data
    const user = await this.accountsRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    if(typeof skinId !== 'number') {
      return { error: 'Invalid skin id' };
    }
    // Parse the 'skins' data
    let skinsData;
    try {
      skinsData = user.skins
    } catch (e) {
      return { error: 'Failed to parse skins data' };
    }

    // Check if the user owns the skin
    if (!skinsData.owned.includes(skinId)) {
      return { error: 'User does not own this skin' };
    }

    // Update the 'equipped' field
    skinsData.equipped = skinId

    // Save the updated skins data back to the user's account
    user.skins = skinsData;
    await this.accountsRepository.save(user);

    return { success: true };
  }

  async buyCosmetic(userId: number, itemId: number, type: string) {
    // Fetch the user's current skin data
    const user = await this.getById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Parse the 'skins' data
    let skinsData;
    try {
      skinsData = user.skins
    } catch (e) {
      return { error: 'Failed to parse skins data' };
    }

    // Check if the user already owns the skin
    if (skinsData.owned.includes(itemId)) {
      return { error: 'User already owns this skin' };
    }

    // Check if the skin exists
    const cosmetic: any = Object.values(cosmetics[type]).find((c: any) => c.id === itemId);
    if (!cosmetic || !cosmetic.buyable) {
      return { error: 'Invalid skin id' };
    }

    // Check if the skin is still available (Today's Skins)
    const todays = this.computeGlobalSkinList();
    if (!todays.includes(itemId) && !cosmetic.event && !cosmetic.ultimate) {
      return { error: "Skin is no longer available in today's shop; refresh the page for new available skins" };
    }


    // Check if the user has enough gems
    const skinPrice = cosmetic.price;
    if (cosmetic.ultimate) {
      if (user.mastery < skinPrice) {
        return { error: 'Not enough mastery' };
      }
    } else {
      if (user.gems < skinPrice && !cosmetic.currency) {
        return { error: 'Not enough gems' };
      }
    }

    // Check if prerequisite skins are bought
    if (cosmetic.original) {
        if (!skinsData.owned.includes(cosmetic.original)) {
          return { error: 'You need to buy the original version of this skin first' };
        }
      }



    // Update the 'owned' field
    skinsData.owned.push(itemId);

    // Deduct the gems from the user's account
    if (!cosmetic.ultimate && !cosmetic.currency) {
      user.gems -= skinPrice;
    }

    if (cosmetic.currency) {
      user.gems += skinPrice;
    }

    // Save the updated skins data and gems back to the user's account
    user.skins = skinsData;
    await this.accountsRepository.save(user);

    // Add to transactions table
    if (cosmetic.currency) {
      const transaction = this.transactionsRepository.create({
        account: user,
        amount: skinPrice,
        description: "buy-" + type + "-" + itemId,
        transaction_id: "gems",
      });

      await this.transactionsRepository.save(transaction);

       return { success: true };
    } else {
      const transaction = this.transactionsRepository.create({
        account: user,
        amount: -skinPrice,
        description: "buy-" + type + "-" + itemId,
        transaction_id: "gems",
      });

      await this.transactionsRepository.save(transaction);

      return { success: true };
    }
  }

  async addGems(account: Account, gems: number, reason = "server") {
    if(gems === 0) return account;
    account.gems += gems;
    await this.accountsRepository.save(account);
    // add to transactions table
    const transaction = this.transactionsRepository.create({
      account: account,
      amount: gems,
      description: reason,
      transaction_id: "gems",
    });
    await this.transactionsRepository.save(transaction);

    return account;
  }

  async addMastery(account: Account, mastery: number, reason = "server") {
    if(mastery === 0) return account;
    account.mastery += mastery;
    await this.accountsRepository.save(account);
    // add to transactions table
    const transaction = this.transactionsRepository.create({
      account: account,
      amount: mastery,
      description: reason,
      transaction_id: "mastery",
    });
    await this.transactionsRepository.save(transaction);

    return account;
  }

  async addXp(account: Account, xp: number) {
    if(xp === 0) return account;
    account.xp += xp;
    await this.accountsRepository.save(account);
    return account;
  }

  async getByUsername(username: string) {
    const account = await this.findOne({ where: { username: username } });
    if (!account) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeAccount(account);
  }

  async getClan(username: string) {
    const account = await this.findOne({ where: { username: username } });
    if (!account) {
      throw new NotFoundException('User not found');
    }
    this.sanitizeAccount(account);
    return account.clan || null;
  }

  async getClanById(id: number) {
    const account = await this.findOne({ where: { id: id } });
    if (!account) {
      throw new NotFoundException('User not found');
    }
    this.sanitizeAccount(account);
    return account.clan || null;
  }

  async changeUserbio(id: number, userbio: string) {
    // validate userbio
    if (validateUserbio(userbio)) {
      return { error: validateUserbio(userbio) };
    }
    const account = await this.getById(id);

    if (account.bio === ".ban") {
      return { error: "You cannot change your bio. You may get bio permissions back in the future." };
    }

    account.bio = userbio;
    try {
      await this.accountsRepository.save(account);
      return { success: true };
    } catch (e) {
      return { error: "Failed to update bio, " + e.message };
    }
  }

  async changeClantag(id: number, clantag: string) {
    // validate clantag
    if(validateClantag(clantag)) {
      return {error: validateClantag(clantag)};
    }
    const account = await this.getById(id);

    // Make sure the clantag is not changed too often
    const now = new Date();
    const lastClanChange = new Date(account.lastClanChange);
    const diff = now.getTime() - lastClanChange.getTime();
    if (diff < clanWaitTime) {

      // Human readable error time left (seconds, hours, days)
      let human = '';
      const seconds = Math.ceil((clanWaitTime - diff) / 1000);
      if (seconds < 60) {
        human = seconds + ' seconds';
      } else if (seconds < 3600) {
        human = Math.ceil(seconds / 60) + ' minutes';
      } else if (seconds < 86400) {
        human = Math.ceil(seconds / 3600) + ' hours';
      } else {
        human = Math.ceil(seconds / 86400) + ' days';
      }

     return {error: 'You can change your clan again in ' + human};
    }

    account.clan = clantag.toUpperCase();
    account.lastClanChange = new Date();
    try {
    await this.accountsRepository.save(account);
    return {success: true};
    } catch(e) {
      return {error: 'Failed to update clan, '+ e.message};
    }
  }

  async changeUsername(id: number, username: string) {
    // validate username
    if(validateUsername(username)) {
      return {error: validateUsername(username)};
    }
    const account = await this.getById(id);
    // Make sure the username is not taken
    const existingAccount = await this.findOneWithLowercase({ where: { username } });
    if (existingAccount) {
      return {error: 'Username already taken'};
    }

    // Make sure the username is not changed too often
    const now = new Date();
    const lastUsernameChange = new Date(account.lastUsernameChange);
    const diff = now.getTime() - lastUsernameChange.getTime();
    if (diff < usernameWaitTime) {

      // Human readable error time left (seconds, hours, days)
      let human = '';
      const seconds = Math.ceil((usernameWaitTime - diff) / 1000);
      if (seconds < 60) {
        human = seconds + ' seconds';
      } else if (seconds < 3600) {
        human = Math.ceil(seconds / 60) + ' minutes';
      } else if (seconds < 86400) {
        human = Math.ceil(seconds / 3600) + ' hours';
      } else {
        human = Math.ceil(seconds / 86400) + ' days';
      }

     return {error: 'You can change your name again in ' + human};
    }

    account.username = username;
    account.lastUsernameChange = new Date();
    try {
    await this.accountsRepository.save(account);
    return {success: true};
    } catch(e) {
      return {error: 'Failed to update name, '+ e.message};
    }
  }

  async update(id: number, updates: Partial<Account>) {
    const account = await this.accountsRepository.findOneBy({ id });
    if (!account) {
      throw new NotFoundException(`There isn't any account with id: ${id}`);
    }
    this.accountsRepository.merge(account, updates);
    return this.accountsRepository.save(account);
  }

  async incrementProfileViews(account: Account) {
    account.profile_views += 1;
    return this.accountsRepository.save(account);
  }

  sanitizeAccount(account: Account) {
    delete account.password;
    delete account.secret;
    delete account.email;
    return account;
  }

  /**
   * Search accounts by username prefix (case-insensitive).
   * Returns up to `limit` sanitized accounts (includes username, skins, created_at, xp, last_seen).
   */
  async searchAccountsByPrefix(prefix: string, limit = 25) {
    const p = (prefix || '').trim().toLowerCase();
    if (!p) return [];

    // Use a left join to daily_stats to try to get last seen (max date) if available.
    // This returns raw rows; normalize below.
    const rows = await this.accountsRepository.createQueryBuilder('a')
      .select([
        'a.username AS username',
        'a.skins AS skins',
        'a.created_at AS created_at',
        'a.xp AS xp',
      ])
      .leftJoin('daily_stats', 'd', 'd.account_id = a.id')
      .addSelect('MAX(d.date) AS last_seen')
      .where('LOWER(a.username) LIKE :p', { p: `${p}%` })
      .groupBy('a.id')
      .orderBy('a.username', 'ASC')
      .limit(limit)
      .getRawMany();

    // Normalize raw shapes to consistent { username, skins, created_at, xp, last_seen }
    const results = rows.map((r: any) => {
      const username = r.username ?? r.a_username ?? r.a_username;
      const skins = r.skins ?? r.a_skins ?? r.a_skins;
      const created_at = r.created_at ?? r.a_created_at ?? r.a_created_at;
      const xp = (r.xp ?? r.a_xp ?? r.a_xp) !== undefined ? Number(r.xp ?? r.a_xp ?? r.a_xp) : 0;
      const last_seen = r.last_seen ?? r.max ?? null;
      return { username, skins, created_at, xp, last_seen };
    }).filter((x: any) => x.username);

    return results;
  }
 }
