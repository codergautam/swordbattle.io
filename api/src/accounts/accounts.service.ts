import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Account } from './account.entity';
import * as config from '../config';
import validateUsername from 'src/helpers/validateUsername';
const usernameWaitTime = config.config.usernameWaitTime;

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountsRepository: Repository<Account>,
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

  async getById(id: number) {
    const account = await this.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`There isn't any account with id: ${id}`);
    }
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
    const existingAccount = await this.findOne({ where: { username } });
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
    return account;
  }
}
