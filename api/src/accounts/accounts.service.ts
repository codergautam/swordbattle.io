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
import { CosmeticsService } from 'src/cosmetics/cosmetics.service';

const usernameWaitTime = config.config.usernameWaitTime;
const clanWaitTime = config.config.clanWaitTime;


@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,
    private readonly cosmeticsService: CosmeticsService,
  ) {}


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



  async getById(id: number) {
    const account = await this.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`There isn't any account with id: ${id}`);
    }
    return account;
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

    // // Check if the skin is still available (Today's Skins)
    // const todays = await this.cosmeticsService.getTodaysSkins();
    // if (!todays.includes(itemId) && !cosmetic.event && !cosmetic.ultimate && !cosmetic.currency && !cosmetic.sale) {
    //   return { error: "Skin is no longer available in today's shop; refresh the page for new available skins" };
    // }


    // Check if the user has enough gems
    const skinPrice = cosmetic.price;
    const tokenPrice = cosmetic.tokenprice;
    if (cosmetic.event || cosmetic.eventoffsale) {
      if (user.tokens < tokenPrice) {
        return { error: 'Not enough snowtokens' };
      }
      if (user.gems < skinPrice && !cosmetic.currency) {
        return { error: 'Not enough gems' };
      }
    } else {
    if (cosmetic.ultimate) {
      if (user.mastery < skinPrice) {
        return { error: 'Not enough mastery' };
      }
    } else {
      if (user.gems < skinPrice && !cosmetic.currency) {
        return { error: 'Not enough gems' };
      }
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

    if (cosmetic.tokenprice) {
      user.tokens -= tokenPrice;
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

  async addTokens(account: Account, tokens: number, reason = "server") {
    if(tokens === 0) return account;
    account.tokens += tokens;
    await this.accountsRepository.save(account);
    const transaction = this.transactionsRepository.create({
      account: account,
      amount: tokens,
      description: reason,
      transaction_id: "tokens",
    });
    await this.transactionsRepository.save(transaction);
    return account;
  }

  async checkIn(account: Account): Promise<Account> {
    const dl = { ...account.dailyLogin };
    if (dl.checkedIn === 0) {
      dl.checkedIn = 1;
      dl.claimableTo += 1;
      account.dailyLogin = dl;
      await this.accountsRepository.save(account);
    }
    return account;
  }

  async applyPlayBonus(account: Account): Promise<Account> {
    const dl = { ...account.dailyLogin };
    if (dl.checkedIn === 0) {
      dl.checkedIn = 2;
      dl.claimableTo += 2;
    } else if (dl.checkedIn === 1) {
      dl.checkedIn = 2;
      dl.claimableTo += 1;
    }
    account.dailyLogin = dl;
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
