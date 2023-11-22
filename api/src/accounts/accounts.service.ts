import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Account } from './account.entity';

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
      throw new NotFoundException(`Account not found where: ${where}`);
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
