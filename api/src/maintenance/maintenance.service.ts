import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AllowedIp } from './allowedIp.entity';
import { AllowedAccount } from './allowedAccount.entity';
import { Account } from '../accounts/account.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(AllowedIp)
    private readonly allowedIpRepository: Repository<AllowedIp>,
    @InjectRepository(AllowedAccount)
    private readonly allowedAccountRepository: Repository<AllowedAccount>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async getAllowedIps(): Promise<string[]> {
    const rows = await this.allowedIpRepository.find();
    return rows.map((r) => r.ip);
  }

  async getAllowedSecrets(): Promise<string[]> {
    const rows = await this.allowedAccountRepository.find();
    const ids = rows.map((r) => r.account_id).filter((id) => id != null);
    if (ids.length === 0) return [];
    const accounts = await this.accountRepository.find({
      where: { id: In(ids) },
      select: ['secret'],
    });
    return accounts.map((a) => a.secret).filter((s) => !!s);
  }
}
