import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllowedIp } from './allowedIp.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(AllowedIp)
    private readonly allowedIpRepository: Repository<AllowedIp>,
  ) {}

  async getAllowedIps(): Promise<string[]> {
    const rows = await this.allowedIpRepository.find();
    return rows.map((r) => r.ip);
  }
}
