import { Injectable, NotFoundException, UnauthorizedException, Module } from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Account } from './account.entity';
import * as config from '../config';
import validateUsername from 'src/helpers/validateUsername';
import { Transaction } from 'src/transactions/transactions.entity';
import * as cosmetics from '../cosmetics.json';
import CacheObj from 'src/Cache';

const usernameWaitTime = config.config.usernameWaitTime;


@Injectable()
export class AccountsService {
  private cosmeticCountsCache = new CacheObj<{ [key: number]: number }>(7200000) // 2 hours in milliseconds

  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionsRepository: Repository<Transaction>,

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


    // Check if the user has enough gems
    const skinPrice = cosmetic.price;
    if (user.gems < skinPrice) {
      return { error: 'Not enough gems' };
    }

    // Update the 'owned' field
    skinsData.owned.push(itemId);

    // Deduct the gems from the user's account
    user.gems -= skinPrice;

    // Save the updated skins data and gems back to the user's account
    user.skins = skinsData;
    await this.accountsRepository.save(user);

    // Add to transactions table
    const transaction = this.transactionsRepository.create({
      account: user,
      amount: -skinPrice,
      description: "buy-" + type + "-" + itemId,
      transaction_id: "gems",
    });
    await this.transactionsRepository.save(transaction);

    return { success: true };
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
}
