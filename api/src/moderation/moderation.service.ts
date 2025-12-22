import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SwearingIncident } from './swearingIncident.entity';
import { LogSwearingDTO } from './moderation.dto';

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(SwearingIncident)
    private readonly swearingRepository: Repository<SwearingIncident>,
  ) {}

  async logSwearing(data: LogSwearingDTO) {
    const incident = this.swearingRepository.create(data);
    return this.swearingRepository.save(incident);
  }
}
