import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ValorAward } from './valor-award.entity';
import { ValorProfile } from './valor-profile.entity';
import { ValorController } from './valor.controller';
import { ValorService } from './valor.service';

@Module({
  imports: [TypeOrmModule.forFeature([ValorProfile, ValorAward])],
  controllers: [ValorController],
  providers: [ValorService],
  exports: [ValorService],
})
export class ValorModule {}
