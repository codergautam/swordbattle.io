import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findOne(where: FindOneOptions<Account>) {
    const account = await this.accountsRepository.findOne(where);
    return account;
  }

  async getById(id: number) {
    const account = await this.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`There isn't any account with id: ${id}`);
    }
    return account;
  }

  async update(id: number, updates: Partial<Account>) {
    const account = await this.accountsRepository.findOneBy({ id });
    if (!account) {
      throw new NotFoundException(`There isn't any account with id: ${id}`);
    }
    this.accountsRepository.merge(account, updates);
    return this.accountsRepository.save(account);
  }

  sanitizeAccount(account: Account) {
    delete account.password;
    return account;
  }
}
